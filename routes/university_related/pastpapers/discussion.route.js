const express = require("express");
const Discussion = require("../../../models/university/papers/discussion/discussion");
const User = require("../../../models/user/user.model");
const DiscussionComment = require("../../../models/university/papers/discussion/discussion.comment");
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
        }]
    };
};


router.post("/create-get", async (req, res) => {
    const { toBeDisccusedId } = req.query
    console.log(toBeDisccusedId)

    try {
        const discussion = await Discussion.findOne({ discussion_of: toBeDisccusedId }).populate({
            path: 'discussioncomments',
            populate: [{
                path: 'user',
                select: 'name profile username universityEmail personalEmail universityEmailVerified updatedAt personalEmailVerified '
            },

            populateReplies("replies", 10)]
        })

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
    const { toBeDiscussedId, userId, commentContent } = req.body

    console.log(" toBeDiscussedId, userId, commentContent: ", toBeDiscussedId, userId, commentContent)

    try {
        const user = await User.findById(userId);
        // console.log(user)
        if (!user) {
            throw new Error('User not found');
        }

        const comment = new DiscussionComment({ content: commentContent, user: user._id });
        await comment.save();
        comment.populate({
            "path": "user",
            "select": "_id name username profile"
        })
        // console.log("comemtns", comment)

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
    const { commentId, replyContent, userId } = req.body;
    console.log(commentId, replyContent, userId)
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const reply = new DiscussionComment({ content: replyContent, user: user._id });
        await reply.save();
        const comment = await DiscussionComment.findById(commentId);
        comment.replies.push(reply._id);
        await comment.save();
        res.status(200).json(reply)
    } catch (error) {
        throw new Error(`Error adding reply to comment: ${error.message}`);
    }
})


router.post("/comment/up-vote", async (req, res) => {
    const { commentId, userId } = req.body;
    let downVoteBool = false;
    let upVoteBool = false;
    try {
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ error: "User does not exist" })

        const comment = await DiscussionComment.findById(commentId)
        if (!comment) return res.status(404).json({ error: "Comment does not exist" })

        const hasDownvoted = comment.downvotes.includes(userId);
        if (hasDownvoted) {
            comment.downvotes.pull(userId);
            downVoteBool = false;
        }

        const hasUpvoted = comment.upvotes.includes(userId);
        if (hasUpvoted) {

            comment.upvotes.pull(userId);
            upVoteBool = false
        } else {

            comment.upvotes.push(userId);
            upVoteBool = true
        }

        const updatedComment = await comment.save();
        const upVoteCount = updatedComment.upvotes.length;
        const downVoteCount = updatedComment.downvotes.length * -1;

        return res.status(200).json({ downVoteCount: downVoteCount, upVoteCount: upVoteCount, downVoteBool: downVoteBool, upVoteBool: upVoteBool });

    } catch (error) {
        res.status(500, error.message)
    }
})
router.post("/comment/down-vote", async (req, res) => {
    try {
        const { commentId, userId } = req.body;
        let downVoteBool = false;
        let upVoteBool = false;
        try {

            const user = await User.findById(userId)
            if (!user) return res.status(404).json({ error: "User does not exist" })

            const comment = await DiscussionComment.findById(commentId)
            if (!comment) return res.status(404).json({ error: "Comment does not exist" })


            const hasUpvoted = comment.upvotes.includes(userId);
            if (hasUpvoted) {
                comment.upvotes.pull(userId);
                upVoteBool = false
            }
            const hasDownvoted = comment.downvotes.includes(userId);

            if (hasDownvoted) {

                comment.downvotes.pull(userId);
                downVoteBool = false;
            } else {

                comment.downvotes.push(userId);
                downVoteBool = true;
            }

            const updatedComment = await comment.save();
            const downVoteCount = updatedComment.downvotes.length * -1;
            const upVoteCount = updatedComment.upvotes.length;

            return res.status(200).json({ downVoteCount: downVoteCount, upVoteCount: upVoteCount, downVoteBool: downVoteBool, upVoteBool: upVoteBool });


        } catch (error) {
            res.status(500, error.message)
        }
    } catch (error) {
        res.status(500, error.message)
    }
})


module.exports = router;