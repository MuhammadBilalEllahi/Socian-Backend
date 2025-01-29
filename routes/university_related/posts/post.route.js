const express = require("express");
const PostsCollection = require("../../../models/society/post/collection/post.collection.model");
const Post = require("../../../models/society/post/post.model");
const SocietyPostAndCommentVote = require("../../../models/society/post/vote/vote.post.community.model");
const mongoose = require("mongoose");
const User = require("../../../models/user/user.model");
const { getUserDetails } = require("../../../utils/utils");
const router = express.Router();

/**
 * Extracts user details based on the platform and session or user data.
 * @param {Object} req - The request object
 * @returns {Object} - The user details, including userId, role, universityId, and campusId
 */
// const getUserDetails = (req) => {
//     let userId, role, universityOrigin, campusOrigin;

//     const platform = req.headers["x-platform"];

//     if (platform === "web") {
//         userId = req.session.user._id;
//         role = req.session.user.role;
//         if (role !== "ext_org") {
//             universityOrigin = req.session.user.university.universityId._id;
//             campusOrigin = req.session.user.university.campusId._id;
//         }
//     } else if (platform === "app") {
//         userId = req.user._id;
//         role = req.user.role;
//         if (role !== "ext_org") {
//             universityOrigin = req.user.university.universityId._id;
//             campusOrigin = req.user.university.campusId._id;
//         }
//     }

//     return { userId, role, universityOrigin, campusOrigin };
// };







/**
 * get latest posts in a university section
 */
router.get("/universities/all", async (req, res) => {
    try {
        // console.log("here")
        const { role, universityOrigin, campusOrigin } = getUserDetails(req)

        const posts = await Post.find({
            'references.role': role
        })
            .sort({ createdAt: -1 })
            .populate([
                "author",
                "society",
                "subSociety",
                "voteId"
            ]);


        // console.log("posts", posts)

        if (!posts) return res.status(304).json("Posts Collection null");

        res.status(200).json(posts);
    } catch (error) {
        console.error("Error in posts.route.js /all", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * get latest posts in a university section
 */
router.get("/campuses/all", async (req, res) => {
    try {
        // console.log("here")
        const { role, universityOrigin, campusOrigin } = getUserDetails(req)

        const posts = await Post.find({
            'references.role': role,
            'references.universityOrigin': universityOrigin,
        })
            .sort({ createdAt: -1 })
            .populate([
                "author",
                "society",
                "subSociety",
                "voteId"
            ]);



        // console.log("posts", posts)

        if (!posts) return res.status(304).json("Posts Collection null");

        res.status(200).json(posts);
    } catch (error) {
        console.error("Error in posts.route.js /all", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * get latest posts in a university section
 */
router.get("/campus/all", async (req, res) => {
    try {
        // console.log("here")
        const { role, universityOrigin, campusOrigin } = getUserDetails(req)
        console.log("/campus/all", role, universityOrigin, campusOrigin)

        const posts = await Post.find({
            'references.role': role,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin
        })
            .sort({ createdAt: -1 })
            .populate([
                "author",
                "society",
                "subSociety",
                "voteId"
            ]);

        // const posts = await PostsCollection.find({
        //     'references.role': role,
        //     'references.universityOrigin': universityOrigin,
        //     'references.campusOrigin': campusOrigin
        // })
        //     .populate([  // 'postsCollectionRef',

        //         {
        //             path: 'posts.postId',
        //             model: 'Post',
        //             populate: [{
        //                 path: 'author',
        //                 model: 'User',
        //             }, {
        //                 path: 'voteId',
        //                 model: 'SocietyPostAndCommentVote',
        //             }],
        //         },
        //     ]);

        // console.log("posts", posts)

        if (!posts) return res.status(304).json("Posts Collection null");

        res.status(200).json(posts);
    } catch (error) {
        console.error("Error in posts.route.js /all", error);
        res.status(500).json("Internal Server Error");
    }
});








/**
 * @function flows: posts in a society-> societyId needed
 * @ -> create a post on id of society -> attach post to collection inside postcollection of society
 */

/**
 * post in a society
 */
router.post("/create", async (req, res) => {
    try {
        const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
        const { title, body, societyId, author } = req.body;

        if (!title || !body || !societyId || !author) {
            return res.status(400).json("All fields are required");
        }

        // console.log(title, body, societyId, author);
        const post = new Post({
            title: title,
            body: body,
            author: author,
            society: societyId,
            "references.role": role,
            "references.campusOrigin": campusOrigin,
            "references.universityOrigin": universityOrigin,
        });
        await post.save();

        const postCommentId = new SocietyPostAndCommentVote({
            postId: post._id,
        });
        await postCommentId.save();
        post.voteId = postCommentId._id;
        await post.save();

        // const societyPostCollection = await PostsCollection.findOneAndUpdate(
        //     { societyId: societyId },
        //     {
        //         $addToSet: {
        //             posts: [
        //                 {
        //                     postId: post._id,
        //                 },
        //             ],
        //         },
        //     }
        // );

        const societyPostCollection = await PostsCollection.findOneAndUpdate(
            { societyId: societyId },
            {
                $addToSet: {
                    posts: { postId: post._id }, // Ensure the structure matches the schema
                },
                $setOnInsert: {
                    societyId: societyId,
                    "references.universityOrigin": universityOrigin,
                    "references.campusOrigin": campusOrigin,
                },
            },
            { new: true, upsert: true } // ToRemember: `upsert` ensures a new document is created if it doesn't exist
        );

        const user = await User.findByIdAndUpdate({ _id: userId },
            { $addToSet: { "profile.posts": post._id } },
            { new: true }
        )
        if (!user) return res.status(409).json({ error: "User not found" })
        // console.log("here", societyPostCollection);

        res.status(200).json("Post Created");
    } catch (error) {
        console.error("Error in posts.route.js /create", error);
        res.status(500).json("Internal Server Error");
    }
});
/**
 * post in a sub society
 */
// router.post()


/***
 * VOTE IN A POST
 * @param {voteType} String e.g upvote,downvote
 * @param {postId} ObjectId 
 */

router.post("/vote-post", async (req, res) => {
    const { postId, voteType } = req.body;

    try {
        const { userId } = getUserDetails(req);

        const session = await mongoose.startSession();

        await session.withTransaction(async () => {
            // Use `findAndModify` or `updateOne` with atomic operations
            const voteDoc = await SocietyPostAndCommentVote.findOne({ postId }).session(session);

            // Ensure the document exists
            if (!voteDoc) {
                throw new Error("Post not found.");
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
                const voteDocUpdated = await SocietyPostAndCommentVote.findOneAndUpdate({ postId }, updateOps, { session, new: true });

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

                const voteDocUpdated = await SocietyPostAndCommentVote.findOneAndUpdate({ postId }, updateOps, { session, new: true });

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

            const voteDocUpdated = await SocietyPostAndCommentVote.findOneAndUpdate({ postId }, updateOps, { session, new: true });

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
