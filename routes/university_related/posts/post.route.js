const express = require("express");
const PostsCollection = require("../../../models/society/post/collection/post.collection.model");
const Post = require("../../../models/society/post/post.model");
const SocietyPostAndCommentVote = require("../../../models/society/post/vote/vote.post.community.model");
const mongoose = require("mongoose");
const User = require("../../../models/user/user.model");
const { getUserDetails } = require("../../../utils/utils");
const { uploadPostMedia } = require("../../../utils/aws.bucket.utils");
const upload = require("../../../utils/multer.utils");
const PostCommentCollection = require("../../../models/society/post/comment/post.comment.collect.model");
const PostComment = require("../../../models/society/post/comment/post.comment.model");
const PersonalPostsCollection = require("../../../models/society/post/collection/single.post.colletion.model");
const router = express.Router();


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
router.post("/create", upload.array('file'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
        const { title, body, societyId, author } = req.body;
        const files = req.files;

        console.log("/create ", { title, body, files, societyId, author })

        if (!title || !societyId || !author) {
            return res.status(400).json("All fields are required");
        }
        if (!body && !files) return res.status(400).json({ message: 'Body or image/video is required' })

        let postContent = {
            title: title,
            author: author,
            society: societyId,
            "references.role": role,
            "references.campusOrigin": campusOrigin,
            "references.universityOrigin": universityOrigin,
        };
        if (body) {
            postContent.body = body;
        }
        else if (files) {
            // const { url, type } = await uploadPostMedia(societyId, file, req)
            // console.log("DTA IN ", url, type)

            if (files && files.length > 0) {
                let mediaArray = [];
                for (let file of files) {
                    const { url, type } = await uploadPostMedia(societyId, file, req);
                    mediaArray.push({ type, url });
                }
                postContent.media = mediaArray;
            }
        }
        // console.log(title, body, societyId, author);
        const post = new Post(postContent);
        await post.save({ session });

        const postCommentId = new SocietyPostAndCommentVote({
            postId: post._id,
        });
        await postCommentId.save({ session });
        post.voteId = postCommentId._id;


        const postCommentCollection = new PostCommentCollection({
            _id: post._id,
        });
        postCommentCollection.save({ session })
        post.comments = postCommentCollection._id

        await post.save({ session });


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
            { new: true, upsert: true, session } // ToRemember: `upsert` ensures a new document is created if it doesn't exist
        ).populate('societyId');

        const user = await User.findByIdAndUpdate({ _id: userId },
            { $addToSet: { "profile.posts": post._id } },
            { new: true, session }
        )
        if (!user) return res.status(409).json({ error: "User not found" })
        // console.log("here", societyPostCollection);


        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Post Created", society: societyId, societyName: societyPostCollection.societyId.name, postId: post._id, postTitle: post.title });
    } catch (error) {
        console.error("Error in posts.route.js /create", error);
        res.status(500).json("Internal Server Error");
    }
});




//////////////////////////////////////////////////////////////

router.post("/create-indiv", upload.array('file'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
        const { title, body, } = req.body;
        const files = req.files;

        console.log("/create-indiv ", { title, body, files, });

        if (!title) {
            return res.status(400).json("Title are required");
        }
        if (!body && !files) {
            return res.status(400).json({ message: 'Body or image/video is required' });
        }

        let postContent = {
            title: title,
            author: userId,
            isPersonalPost: true,
            "references.role": role,
            "references.campusOrigin": campusOrigin,
            "references.universityOrigin": universityOrigin,
        };

        if (body) {
            postContent.body = body;
        }
        if (files && files.length > 0) {
            let mediaArray = [];
            for (let file of files) {
                const { url, type } = await uploadPostMedia(userId, file, req);
                mediaArray.push({ type, url });
            }
            postContent.media = mediaArray;
        }

        const post = new Post(postContent);
        await post.save({ session });

        const postCommentId = new SocietyPostAndCommentVote({
            postId: post._id,
        });
        await postCommentId.save({ session });
        post.voteId = postCommentId._id;

        const postCommentCollection = new PostCommentCollection({
            _id: post._id,
        });
        await postCommentCollection.save({ session });
        post.comments = postCommentCollection._id;

        await post.save({ session });

        const user = await User.findByIdAndUpdate(
            { _id: userId },
            { $addToSet: { "profile.personalPosts": post._id } },
            { new: true, session }
        );
        if (!user) return res.status(409).json({ error: "User not found" });


        const societyPostCollection = await PersonalPostsCollection.findByIdAndUpdate(
            { _id: userId },
            {
                $addToSet: {
                    posts: { postId: post._id }, // Ensure the structure matches the schema
                },
                $setOnInsert: {
                    "references.universityOrigin": universityOrigin,
                    "references.campusOrigin": campusOrigin,
                },
            },
            { new: true, upsert: true, session } // ToRemember: `upsert` ensures a new document is created if it doesn't exist
        )

        if (!societyPostCollection) return res.status(304).json({ error: "The Personal Post Collection could not be set or updated" })
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Post Created", postId: post._id, postTitle: post.title });
    } catch (error) {
        console.error("Error in /create-indiv", error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json("Internal Server Error");
    }
});



//////////////////////////////////////////////////////////////

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


router.get("/single/post", async (req, res) => {
    try {
        // console.log("here")
        const { postId } = req.query;
        const { role, universityOrigin, campusOrigin } = getUserDetails(req)

        const post = await Post.findOne({
            _id: postId,
            'references.role': role
        })
            .sort({ createdAt: -1 })
            .populate([
                "author",
                "society",
                "subSociety",
                "voteId",
                {
                    path: "comments",
                    populate: {
                        path: "comments",
                        populate: [
                            {
                                path: 'author',
                                populate: {
                                    path: 'university.departmentId university.campusId',
                                    select: 'name'
                                },
                                select: 'name username profile.picture university.departmentId university.campusId ',
                            },
                            "voteId"
                        ],
                        options: { sort: { createdAt: -1 } }
                    },
                }
            ]);


        // console.log("post", post)

        if (!post) return res.status(304).json({ message: "No Post" });

        res.status(200).json(post);
    } catch (error) {
        console.error("Error in posts.route.js /all", error);
        res.status(500).json("Internal Server Error");
    }
});


router.get("/post/comments", async (req, res) => {
    try {
        // console.log("here")
        const { postId } = req.query;
        const { role, universityOrigin, campusOrigin } = getUserDetails(req)

        const comments = await PostCommentCollection.find({ _id: postId })
            .sort({ createdAt: -1 })
            .populate([
                {
                    path: "comments",
                    populate: [
                        {
                            path: "author",
                            populate: {
                                path: 'university.departmentId university.campusId',
                                select: 'name'
                            },
                            select: 'name username profile.picture university.departmentId university.campusId ',
                        },
                        "voteId",
                    ],
                    options: { sort: { createdAt: -1 } }

                }
            ]);


        // console.log("comments", comments)

        if (!comments) return res.status(204).json([]);

        res.status(200).json(comments);
    } catch (error) {
        console.error("Error in posts.route.js /all", error);
        res.status(500).json("Internal Server Error");
    }
});


router.get("/post/comment/replies", async (req, res) => {
    try {
        // console.log("here")
        const { commentId } = req.query;
        // const { role, universityOrigin, campusOrigin } = getUserDetails(req)

        const replies = await PostComment.find({ parentComment: commentId })
            .sort({ createdAt: -1 })
            .populate([
                {
                    path: "author",
                    populate: {
                        path: 'university.departmentId university.campusId',
                        select: 'name'
                    },
                    select: 'name username profile.picture university.departmentId university.campusId ',
                },
                "voteId"
            ]);


        console.log("replies", replies)

        if (!replies) return res.status(204).json([]);

        res.status(200).json(replies);
    } catch (error) {
        console.error("Error in posts.route.js /all", error);
        res.status(500).json("Internal Server Error");
    }
});



// router.post('/comment', async (req, res) => {
//     try {
//         const session = mongoose.startSession()
//         const { postId, comment } = req.body;
//         const { userId, role, universityOrigin, campusOrigin } = getUserDetails(req)

//         if (!postId) return res.status(404).json({ message: "No PostId with body" });
//         if (comment === '') return res.status(404).json({ message: "No Comment with body" });


//         const postComment = new PostComment({
//             postId: postId,
//             author: userId,
//             comment: comment,

//             references: {
//                 universityOrigin,
//                 campusOrigin,
//                 role
//             }
//         })

//         const voteSchema = new SocietyPostAndCommentVote({
//             commentId: postComment._id
//         })

//         postComment.vote = voteSchema._id;

//         const postCommentCollection = await PostCommentCollection.findByIdAndUpdate(postId, {
//             $addToSet: {
//                 comments: postComment._id
//             }
//         });

//         res.status(200).json({ comment: postComment })


//     } catch (error) {
//         console.error("Error in post('/comment')", error)
//         res.status(500).json({ error: "Internal Server Error" })
//     }
// })


router.post('/post/comment', async (req, res) => {
    const session = await mongoose.startSession(); // Await the session creation
    session.startTransaction(); // Start a transaction

    try {
        const { postId, comment } = req.body;
        const { userId, role, universityOrigin, campusOrigin } = getUserDetails(req);

        if (!postId) return res.status(400).json({ message: "No postId in body" });
        if (!comment || !comment.trim()) return res.status(400).json({ message: "No valid comment provided" });

        // Create comment document
        const postComment = new PostComment({
            postId,
            author: userId,
            comment: comment,
            references: { universityOrigin, campusOrigin, role }
        });

        // Create vote schema for the comment
        const voteSchema = new SocietyPostAndCommentVote({
            commentId: postComment._id
        });

        // Link vote ID to comment
        postComment.voteId = voteSchema._id;

        // Save both documents in the transaction
        await postComment.save({ session });
        await voteSchema.save({ session });

        // Add comment reference to the post
        const updatedPost = await PostCommentCollection.findByIdAndUpdate(
            postId,
            { $addToSet: { comments: postComment._id } },
            { new: true, session }
        );

        if (!updatedPost) {
            throw new Error("Post not found");
        }
        await Post.findByIdAndUpdate(postId, {
            $inc: {
                commentsCount: 1
            }
        })
        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ comment: postComment });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error in post('/comment')", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});





router.post('/post/reply/comment', async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const { postId, commentId, comment } = req.body;
            const { userId, role, universityOrigin, campusOrigin } = getUserDetails(req);

            if (!postId) throw new Error("No postId in body");
            if (!commentId) throw new Error("No commentId in body");
            if (!comment || !comment.trim()) throw new Error("No valid comment provided");

            // Fetch the parent comment
            const postCommentParent = await PostComment.findById(commentId).session(session);
            if (!postCommentParent) throw new Error("Parent comment not found");

            // Create reply comment
            const postComment = new PostComment({
                postId,
                author: userId,
                parentComment: postCommentParent._id,
                comment: comment.trim(),
                references: { universityOrigin, campusOrigin, role }
            });

            // Create vote schema for the reply
            const voteSchema = new SocietyPostAndCommentVote({
                commentId: postComment._id
            });

            // Link vote ID to reply
            postComment.voteId = voteSchema._id;

            // Save both documents
            await postComment.save({ session });
            await voteSchema.save({ session });

            // Update parent comment with reply reference
            postCommentParent.replies.push(postComment._id);
            await postCommentParent.save({ session });

            // Return success response
            res.status(200).json({ comment: postComment });
        });
    } catch (error) {
        console.error("Error in post('/reply/comment'):", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    } finally {
        session.endSession();
    }
});



router.post("/post/comment/vote", async (req, res) => {
    const { commentId, voteType } = req.body;

    try {
        const { userId } = getUserDetails(req);

        const session = await mongoose.startSession();

        await session.withTransaction(async () => {
            // Use `findAndModify` or `updateOne` with atomic operations
            const voteDoc = await SocietyPostAndCommentVote.findOne({ commentId }).session(session);

            // Ensure the document exists
            if (!voteDoc) {
                throw new Error("CommentId not found.");
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
                const voteDocUpdated = await SocietyPostAndCommentVote.findOneAndUpdate({ commentId }, updateOps, { session, new: true });

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

                const voteDocUpdated = await SocietyPostAndCommentVote.findOneAndUpdate({ commentId }, updateOps, { session, new: true });

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

            const voteDocUpdated = await SocietyPostAndCommentVote.findOneAndUpdate({ commentId }, updateOps, { session, new: true });

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






// router.post('/reply/comment', async (req, res) => {
//     const session = await mongoose.startSession(); // Await the session creation
//     session.startTransaction(); // Start a transaction

//     try {
//         const { postId, commentId, comment } = req.body;
//         const { userId, role, universityOrigin, campusOrigin } = getUserDetails(req);

//         if (!postId) return res.status(400).json({ message: "No postId in body" });
//         if (!comment || !comment.trim()) return res.status(400).json({ message: "No valid comment provided" });
//         if (!commentId) return res.status(400).json({ message: "No commentId in body" });

//         const postCommentParent = await PostComment.findById(commentId)
//         // Create comment document
//         const postComment = new PostComment({
//             postId,
//             author: userId,
//             parentComment: postCommentParent._id,
//             comment: comment,
//             references: { universityOrigin, campusOrigin, role }
//         });

//         // Create vote schema for the comment
//         const voteSchema = new SocietyPostAndCommentVote({
//             commentId: postComment._id
//         });

//         // Link vote ID to comment
//         postComment.vote = voteSchema._id;

//         // Save both documents in the transaction
//         await postComment.save({ session });
//         await voteSchema.save({ session });

//         postCommentParent.replies.push(postComment._id)
//         await postCommentParent.save({session})


//         // Commit transaction
//         await session.commitTransaction();
//         session.endSession();

//         res.status(200).json({ comment: postComment });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();

//         console.error("Error in post('/reply/comment')", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });











module.exports = router;
