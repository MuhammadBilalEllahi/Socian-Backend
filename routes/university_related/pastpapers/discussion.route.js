const express = require("express");
const Discussion = require("../../../models/university/papers/discussion/discussion");
const User = require("../../../models/user/user.model");
const { getUserDetails } = require("../../../utils/utils");
const DiscussionComment = require("../../../models/university/papers/discussion/discussion.comment");
const DiscussionCommentVote = require("../../../models/university/papers/discussion/vote.comment.discussion");
const { default: mongoose } = require("mongoose");
const router = express.Router()



const populateReplies = (path, depth) => {
    if (depth === 0) {
        return { path };
    }
    return {
        path,
        populate: [{
            path: 'replies',
            populate: populateReplies('replies', depth - 1)
        },
        {
            path: 'user',
            select: 'name profile username universityEmail personalEmail universityEmailVerified updatedAt createdAt personalEmailVerified __v'
        },
        {
            path: "voteId",
            select: "_id upVotesCount downVotesCount userVotes",
        }
        ]
    };
};


router.post("/create-get", async (req, res) => {
    const { toBeDisccusedId } = req.query
    // console.log(toBeDisccusedId)

    try {
        const discussion = await Discussion.findOne({ discussion_of: toBeDisccusedId }).populate({
            path: 'discussioncomments',
            populate: [{
                path: 'user',
                select: 'name profile username universityEmail personalEmail universityEmailVerified updatedAt personalEmailVerified '
            },
            {
                path: "voteId",
                select: "_id upVotesCount downVotesCount userVotes",
            },

            populateReplies("replies", 10)]
        })
        console.log(discussion)

        if (discussion) return res.status(200).json({ discussion })
        console.log(discussion)
        const createDiscussion = await Discussion.create({
            discussion_of: toBeDisccusedId
        })
        console.log(createDiscussion)

        res.status(200).json({ createDiscussion })

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message })
    }
}
)

router.get("/", async (req, res) => {

    try {
        const discussion = await Discussion.find()
        if (!discussion) return res.status(404).json({ message: "No Discussion Found" })
        res.status(200).json({ discussion })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})
router.post("/:id", async (req, res) => {
    const { id } = req.params
    try {
        const discussion = await Discussion.findOne({ discussion_of: id })
        if (!discussion) return res.status(404).json({ message: "No Discussion Found" })

        res.status(200).json({ discussion })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post('/comment/add-comment', async (req, res) => {
    const { toBeDiscussedId, commentContent } = req.body

    console.log(" toBeDiscussedId, userId, commentContent: ", toBeDiscussedId, commentContent)

    const { userId } = getUserDetails(req)
    try {
        const user = await User.findById(userId);
        // console.log(user)
        if (!user) {
            throw new Error('User not found');
        }

        const comment = new DiscussionComment({ content: commentContent, user: user._id });
        await comment.save();
        comment.populate([{
            "path": "user",
            "select": "_id name username profile"
        },
        {
            path: "voteId",
            select: "_id upVotesCount downVotesCount userVotes",
        },
        ])

        console.log("comemtns", comment)

        const discussion = await Discussion.findOneAndUpdate({ discussion_of: toBeDiscussedId }, {
            $addToSet: {
                "discussioncomments": comment._id
            }
        });
        // console.log("Dis ", discussion)

        // discussion.discussioncomments.push(comment._id);
        await discussion.save();
        res.status(200).json(comment)


    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message })
    }
}
)

router.post('/comment/reply-to-comment', async (req, res) => {
    const { commentId, replyContent } = req.body;
    const { userId } = getUserDetails(req)

    console.log(commentId, replyContent, userId)
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const reply = new DiscussionComment({ content: replyContent, user: user._id });
        await reply.save();
        reply.populate([{
            "path": "user",
            "select": "_id name username profile"
        },
        {
            path: "voteId",
            select: "_id upVotesCount downVotesCount userVotes",
        },
        ])
        const comment = await DiscussionComment.findById(commentId);
        comment.replies.push(reply._id);
        await comment.save();
        res.status(200).json(reply)
    } catch (error) {
        throw new Error(`Error adding reply to comment: ${error.message}`);
    }
})




/***
 * VOTE IN A DISCUSSION COMMENT
 * @param {voteType} String e.g upvote,downvote
 * @param {commentId} ObjectId 
 */

router.post("/comment/vote", async (req, res) => {
    const { commentId, voteType } = req.body;

    // console.log("COM vote,", commentId, voteType)

    try {
        const { userId } = getUserDetails(req);

        const session = await mongoose.startSession();

        await session.withTransaction(async () => {
            // Use `findAndModify` or `updateOne` with atomic operations
            const voteDoc = await DiscussionCommentVote.findById({ _id: commentId }).session(session);

            // Ensure the document exists
            if (!voteDoc) {
                throw new Error("Vote not found.");
            }

            // Fetch current vote status
            const currentVote = voteDoc.userVotes.get(userId) || null;

            // If the user has already voted and is changing their vote
            if (currentVote !== null && currentVote !== voteType) {
                const updateOps = {
                    $set: { [`userVotes.${userId}`]: voteType }
                };

                // Remove the old vote first (decrement the respective vote count)
                if (currentVote === 'upvote') {
                    updateOps.$inc = { upVotesCount: -1 };
                } else if (currentVote === 'downvote') {
                    updateOps.$inc = { downVotesCount: -1 };
                }

                // Apply the new vote and increment the respective vote count
                if (voteType === 'upvote') {
                    updateOps.$inc = { ...updateOps.$inc, upVotesCount: 1 };
                } else if (voteType === 'downvote') {
                    updateOps.$inc = { ...updateOps.$inc, downVotesCount: 1 };
                }

                // Perform the update with the changes
                const voteDocUpdated = await DiscussionCommentVote.findOneAndUpdate({ commentId }, updateOps, { session, new: true });

                return res.status(200).json({
                    message: "Vote reprocessed successfully.",
                    upVotesCount: voteDocUpdated.upVotesCount,
                    downVotesCount: voteDocUpdated.downVotesCount,
                });
            }

            // Skip processing if the vote is unchanged
            if (currentVote === voteType) {
                const updateOps = {
                    $set: { [`userVotes.${userId}`]: null }
                };

                // If the user is undoing the vote, decrement the vote count accordingly
                if (voteType === 'upvote') {
                    updateOps.$inc = { upVotesCount: -1 };
                } else if (voteType === 'downvote') {
                    updateOps.$inc = { downVotesCount: -1 };
                }

                const voteDocUpdated = await DiscussionCommentVote.findOneAndUpdate({ commentId }, updateOps, { session, new: true });

                return res.status(200).json({
                    message: "Vote already registered.",
                    upVotesCount: voteDocUpdated.upVotesCount,
                    downVotesCount: voteDocUpdated.downVotesCount,
                    noneSelected: true

                });
            }

            // Handle the initial vote if the user hasn't voted yet
            const updateOps = {
                $set: { [`userVotes.${userId}`]: voteType }
            };

            if (voteType === 'upvote') {
                updateOps.$inc = { upVotesCount: 1 };
            } else if (voteType === 'downvote') {
                updateOps.$inc = { downVotesCount: 1 };
            }

            const voteDocUpdated = await DiscussionCommentVote.findOneAndUpdate({ commentId }, updateOps, { session, new: true });

            return res.status(200).json({
                message: "Vote processed successfully.",
                upVotesCount: voteDocUpdated.upVotesCount,
                downVotesCount: voteDocUpdated.downVotesCount,
            });
        });

        session.endSession();
    } catch (error) {
        console.error("Error processing vote:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = router;