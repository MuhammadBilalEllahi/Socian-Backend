const express = require("express");
const PostsCollection = require("../../../models/society/post/collection/post.collection.model");
const Post = require("../../../models/society/post/post.model");
const indivPost = require("../../../models/society/post/indivPost.model");
const SocietyPostAndCommentVote = require("../../../models/society/post/vote/vote.post.community.model");
const mongoose = require("mongoose");
const User = require("../../../models/user/user.model");
const { getUserDetails } = require("../../../utils/utils");
const { uploadPostMedia } = require("../../../utils/aws.bucket.utils");
const { upload } = require("../../../utils/multer.utils");
const PostCommentCollection = require("../../../models/society/post/comment/post.comment.collect.model");
const PostComment = require("../../../models/society/post/comment/post.comment.model");
const Society = require("../../../models/society/society.model");
const DeletedDataCollection = require("../../../models/deleted/deletedmodels");
const Notification = require("../../../models/notification/notification.model");
const { sendNotification } = require("../../../socket/socket");
const AwsQueueService = require("../../../utils/aws/sqs");
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






router.get("/universities/all", async (req, res) => {
    try {
        const { role, universityOrigin, campusOrigin } = getUserDetails(req);
        console.log("/universites/all", role, universityOrigin, campusOrigin)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [posts, totalCount] = await Promise.all([
            Post.find({
                'references.role': role,
                // 'references.campusOrigin': campusOrigin,
                'status.isDeleted': false,
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate([
                    {
                        path: "author",
                        select: 'name username role super_role university profile.picture',
                        populate: {
                            path: 'university',
                            populate: {
                                path: 'universityId departmentId campusId',
                                select: 'name'
                            }
                        }
                    },
                    "society",
                    "subSociety",
                    "voteId"
                ]),
            Post.countDocuments({
                'references.role': role,
                'status.isDeleted': false,
            })
        ]);

        res.status(200).json({
            data: posts,
            pagination: {
                total: totalCount,
                page,
                limit,
                hasNextPage: page * limit < totalCount
            }
        });
    } catch (error) {
        console.error("Error in posts.route.js /campus/all", error);
        res.status(500).json("Internal Server Error");
    }
});


router.get("/campuses/all", async (req, res) => {
    try {
        const { role, universityOrigin, campusOrigin } = getUserDetails(req);
        console.log("/campus-es/all", role, universityOrigin, campusOrigin)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [posts, totalCount] = await Promise.all([
            Post.find({
                'references.role': role,
                'references.universityOrigin': universityOrigin,
                'status.isDeleted': false,
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate([
                    {
                        path: "author",
                        select: 'name username role super_role university profile.picture',
                        populate: {
                            path: 'university',
                            populate: {
                                path: 'universityId departmentId campusId',
                                select: 'name'
                            }
                        }
                    },
                    "society",
                    "subSociety",
                    "voteId"
                ]),
            Post.countDocuments({
                'references.role': role,
                'references.universityOrigin': universityOrigin,
                'status.isDeleted': false,
            })
        ]);

        res.status(200).json({
            data: posts,
            pagination: {
                total: totalCount,
                page,
                limit,
                hasNextPage: page * limit < totalCount
            }
        });
    } catch (error) {
        console.error("Error in posts.route.js /campus/all", error);
        res.status(500).json("Internal Server Error");
    }
});

router.get("/campus/all", async (req, res) => {
    try {
        const { role, universityOrigin, campusOrigin } = getUserDetails(req);
        console.log("/campus/all", role, universityOrigin, campusOrigin)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [posts, totalCount] = await Promise.all([
            Post.find({
                'references.role': role,
                'references.campusOrigin': campusOrigin,
                'status.isDeleted': false,
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate([
                    {
                        path: "author",
                        select: 'name username role super_role university profile.picture',
                        populate: {
                            path: 'university',
                            populate: {
                                path: 'universityId departmentId campusId',
                                select: 'name'
                            }
                        }
                    },
                    "society",
                    "subSociety",
                    "voteId"
                ]),
            Post.countDocuments({
                'references.role': role,
                'references.campusOrigin': campusOrigin,
                'status.isDeleted': false,
            })
        ]);

        res.status(200).json({
            data: posts,
            pagination: {
                total: totalCount,
                page,
                limit,
                hasNextPage: page * limit < totalCount
            }
        });
    } catch (error) {
        console.error("Error in posts.route.js /campus/all", error);
        res.status(500).json("Internal Server Error");
    }
});

// /**
//  * get latest posts in a university section
//  */
// router.get("/campus/all", async (req, res) => {
//     try {
//         // console.log("here")
//         const { role, universityOrigin, campusOrigin } = getUserDetails(req)
//         console.log("/campus/all", role, universityOrigin, campusOrigin)

//         const posts = await Post.find({
//             'references.role': role,
//             // 'references.universityOrigin': universityOrigin,
//             'references.campusOrigin': campusOrigin,
//             'status.isDeleted': false,
//         })
//             .sort({ createdAt: -1 })
//             .populate([
//                 {
//                     path: "author",
//                     select: 'name username role  super_role university profile.picture',
//                     populate: {
//                         path: 'university',
//                         populate: {
//                             path: 'universityId departmentId campusId ',
//                             select: 'name'
//                         }
//                     }
//                 },
//                 "society",
//                 "subSociety",
//                 "voteId"
//             ]);

//         // const posts = await PostsCollection.find({
//         //     'references.role': role,
//         //     'references.universityOrigin': universityOrigin,
//         //     'references.campusOrigin': campusOrigin
//         // })
//         //     .populate([  // 'postsCollectionRef',

//         //         {
//         //             path: 'posts.postId',
//         //             model: 'Post',
//         //             populate: [{
//         //                 path: 'author',
//         //                 model: 'User',
//         //             }, {
//         //                 path: 'voteId',
//         //                 model: 'SocietyPostAndCommentVote',
//         //             }],
//         //         },
//         //     ]);

//         // console.log("posts", posts)

//         if (!posts) return res.status(304).json("Posts Collection null");

//         res.status(200).json(posts);
//     } catch (error) {
//         console.error("Error in posts.route.js /all", error);
//         res.status(500).json("Internal Server Error");
//     }
// });








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
        if (!body && files) return res.status(400).json({ message: 'Body is required' })


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
        if (files) {
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



        if (postContent.media && postContent.media.length > 0) {
            try {
                const awsQueueService = new AwsQueueService();

                for (const media of postContent.media) {
                    await awsQueueService.sendNSFWScanMessage(
                        post._id.toString(),
                        media.url,
                        media.type

                    );
                    console.log("[SQS] NSFW scan message sent for media:", media.url);
                }
            } catch (error) {
                console.warn("[SQS] Failed to send one or more NSFW scan messages:", error.message);
            }
        }




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

router.get('/admin/profile/posts', async (req, res) => {
    try {
  
        const query = {};
        
            query["postByAdmin"]= true
            query["adminSetStatus.isArchived"]= { $ne: true }// exclude archived posts
      
        console.log("query", query)
        const latestPost = await Post.find(query)
            .sort({ createdAt: -1 })
            .populate([
                {
                    path: "author",
                    select: 'name username role super_role university profile.picture',
                    populate: {
                        path: 'university',
                        populate: {
                            path: 'universityId departmentId campusId',
                            select: 'name'
                        }
                    }
                },
                // "society",
                // "subSociety",
                "voteId"
            ])
        console.log("ADMIN POST", JSON.stringify(latestPost, null, 2))

        if (!latestPost) {
            return res.status(404).json({ message: "No active admin post found" });
        }

        return res.status(200).json({ posts: latestPost });
    } catch (error) {
        console.error("Error fetching latest admin post:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get('/admin/post', async (req, res) => {
    try {
        let { requestCampus = false, requestUniversity = false, allUniversities = false } = req.query;
        console.log(
            "requestCampus", requestCampus, "requestUniversity", requestUniversity, "allUniversities", allUniversities
        )
        requestCampus = Boolean(requestCampus);
        requestUniversity = Boolean(requestUniversity);
        allUniversities = Boolean(allUniversities)
        console.log(
            "requestCampus", requestCampus, "requestUniversity", requestUniversity, "allUniversities", allUniversities
        )
        const { campusOrigin, universityOrigin } = getUserDetails(req)

        const query = {};
        
            query["postByAdmin"]= true
            query["adminSetStatus.isArchived"]= { $ne: true }// exclude archived posts
        if (requestCampus === true) {
            query["references.campusOrigin"] = new mongoose.Types.ObjectId(campusOrigin);
            query["forCampus"] = true
        };
        if (requestUniversity === true) {
            query["references.universityOrigin"] = new mongoose.Types.ObjectId(universityOrigin);
            query["forUniversity"] = true
        };

        if (allUniversities === true) query['forAllUniversites'] = true;
        console.log("query", query)
        const latestPost = await Post.findOne(query)
            .sort({ createdAt: -1 })
            .populate([
                {
                    path: "author",
                    select: 'name username role super_role university profile.picture',
                    populate: {
                        path: 'university',
                        populate: {
                            path: 'universityId departmentId campusId',
                            select: 'name'
                        }
                    }
                },
                // "society",
                // "subSociety",
                "voteId"
            ])
        console.log("ADMIN POST", JSON.stringify(latestPost, null, 2))

        if (!latestPost) {
            return res.status(404).json({ message: "No active admin post found" });
        }

        return res.status(200).json({ post: latestPost });
    } catch (error) {
        console.error("Error fetching latest admin post:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});



//////////////////////////////////////////////////////////////
//to create an individual post. not in a society
router.post("/create-indiv", upload.array('file'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
        const { title, body, author = userId } = req.body;
        const files = req.files;

        console.log("/create-indiv ", { title, body, files, author });

        if (!title || !author) {
            return res.status(400).json("Title and author are required");
        }
        if (!body && !files) {
            return res.status(400).json({ message: 'Body or image/video is required' });
        }

        let postContent = {
            title: title,
            author: author,
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
        postContent.isPersonalPost = true; // Mark as personal post

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
            { $addToSet: { "profile.posts": post._id } },
            { new: true, session }
        );
        if (!user) return res.status(409).json({ error: "User not found" });

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



//////////with new schema
// router.post("/create-indiv", upload.array('file'), async (req, res) => {
//     try {
//       console.log('/create-indiv ', req.body);
//       const { title, author, body, societyId } = req.body;
//       const files = req.files;

//       if (!title || !author) {
//         return res.status(400).json({ message: "Title and author are required" });
//       }

//       const user = await User.findById(author);
//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       const postDetails = {
//         title,
//         author,
//         body,
//         isPersonalPost: true,
//         media: [],
//       };

//       if (files && files.length > 0) {
//         const mediaUrls = files.map((file) => ({
//           type: file.mimetype,
//           url: file.path,
//         }));
//         postDetails.media = mediaUrls;
//       }

//       const newPost = new indivPost(postDetails);
//       const savedPost = await newPost.save();

//       return res.status(201).json({
//         message: "Post Created",
//         postId: savedPost._id,
//         postTitle: savedPost.title,
//       });
//     } catch (error) {
//       console.warn("Error in /create-indiv", error);
//       return res.status(500).json({ message: error.message });
//     }
//   });

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
                {
                    path: "author",
                    select: 'name username role  super_role university profile.picture',
                    populate: {
                        path: 'university',
                        populate: {
                            path: 'universityId departmentId campusId ',
                            select: 'name'
                        }
                    }
                },
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
        const { userId, name, role, universityOrigin, campusOrigin } = getUserDetails(req);

        if (!postId) return res.status(400).json({ message: "No postId in body" });
        if (!comment || !comment.trim()) return res.status(400).json({ message: "No valid comment provided" });

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Create comment document
        const postComment = new PostComment({
            postId,
            author: userId,
            comment: comment,
            references: { universityOrigin, campusOrigin, role }
        });

        // inside your message event
        // if (message.includes("@username123")) {
        //   sendNotification("123456userId", {
        //     title: "You were mentioned!",
        //     body: `${user.name} mentioned you in a message.`,
        //     type: "mention",
        //     link: `/discussion/${discussionId}`,
        //   });
        // }


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

        if (post.author.toString() !== userId) {
            const notification = await Notification.create({
                type: "comment",
                recipient: post?.author,
                sender: userId,
                post: postId,
                message: `${name} commented on your post`,
            })
            notification.save();

            sendNotification(post?.author, {
                title: "New Comment",
                body: "You have a new comment in the discussion.",
                type: "message",
                link: `/discussion/abc123`,
            }
            )
        }
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


router.delete("/post/comment", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { commentId } = req.query;
        const { userId } = getUserDetails(req);

        const comment = await PostComment.findByIdAndUpdate(
            commentId,
            { $set: { isDeleted: true } },
            { session, new: true }
        );

        if (!comment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Comment not found" });
        }

        await Post.findByIdAndUpdate(
            comment.postId,
            { $inc: { commentsCount: -1 } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error in post('/comment')", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete("/post/reply/comment", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { replyId } = req.query;
        const { userId } = getUserDetails(req);

        const reply = await PostComment.findByIdAndUpdate(
            replyId,
            { $set: { isDeleted: true } },
            { session, new: true }
        );

        if (!reply) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Reply not found" });
        }

        await Post.findByIdAndUpdate(
            reply.postId,
            { $inc: { commentsCount: -1 } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Reply deleted successfully" });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error in post('/reply/comment')", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.patch("/post/comment", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { commentId, comment } = req.body;
        const { userId } = getUserDetails(req);

        // First find the comment to check authorization
        const existingComment = await PostComment.findById(commentId).session(session);
        if (!existingComment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Comment not found" });
        }

        // Check if user is authorized to update this comment
        if (existingComment.author.toString() !== userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: "You are not authorized to update this comment" });
        }

        // Update the comment
        const updatedComment = await PostComment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    comment: comment,
                    isEdited: true,
                    editedAt: new Date()
                }
            },
            { new: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ comment: updatedComment });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error in patch('/post/comment')", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.post('/post/repost/personal', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { title, body, postId, repostWithoutTitleAndBody } = req.body;
        const { userId, role, universityOrigin, campusOrigin } = getUserDetails(req);

        if (!repostWithoutTitleAndBody && (!title?.trim() || !body?.trim())) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Title and body are required" });
        }
        // Check if the post exists
        const post = await Post.findById(postId).populate("author", "profile");
        if (!post) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Post not found" });
        }

        if (!post.author.profile.preferences.allowRepost && post.author._id.toString() !== userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: "You are not allowed to repost this post" });
        }

        const d = {
            author: userId,
            isRepost: true,
            isPersonalPost: true,
            repostedPost: postId,
            references: {
                universityOrigin: universityOrigin,
                campusOrigin: campusOrigin,
                role: role
            }
        };
        if (!repostWithoutTitleAndBody) {
            d.title = title;
            d.body = body;
        }
        const newPost = new Post(d);
        await newPost.save({ session, validateBeforeSave: false });
        await PostsCollection.findByIdAndUpdate(post.postsCollectionRef, { $addToSet: { posts: newPost._id } }, { session });


        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Post reposted successfully" });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error in post('/post/repost')", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.post('/post/repost/society', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { title, body, societyId, postId, postInSameSociety, repostWithoutTitleAndBody } = req.body;
        const { userId, role, universityOrigin, campusOrigin } = getUserDetails(req);

        if (!repostWithoutTitleAndBody && (!title?.trim() || !body?.trim())) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Title and body are required" });
        }
        // Check if the post exists
        const post = await Post.findById(postId);
        if (!post) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Post not found" });
        }

        const society = await Society.findById(societyId).populate("societyType members");
        if (!society) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Society not found" });
        }
        if (society.societyType.societyType !== "public") {
            if (!society.members.includes(userId)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(403).json({ message: "You are not a member of this society" });
            }
        }

        const d = {
            author: userId,
            isRepost: true,
            society: postInSameSociety ? post.society._id : societyId,
            references: {
                universityOrigin: universityOrigin,
                campusOrigin: campusOrigin,
                role: role
            }
        };
        if (!repostWithoutTitleAndBody) {
            d.title = title;
            d.body = body;
        }

        const newPost = new Post(d);
        await newPost.save({ session, validateBeforeSave: false });

        await PostsCollection.findByIdAndUpdate(post.postsCollectionRef, { $addToSet: { posts: newPost._id } }, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Post reposted successfully" });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error in post('/post/repost/society')", error);
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



router.delete("/delete", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { postId } = req.query;
        const { userId } = getUserDetails(req);

        // Find the post
        const post = await Post.findById(postId).session(session);
        if (!post) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if the user is the author
        if (post.author.toString() !== userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: "You are not authorized to delete this post" });
        }

        // Delete the post
        await Post.findByIdAndUpdate(postId, { 'status.isDeleted': true }, { session });

        // Remove post from PostsCollection
        await PostsCollection.findOneAndUpdate(
            { societyId: post.society },
            { $pull: { posts: { postId } } },
            { session }
        );

        // Remove post from User's profile.posts
        await User.findByIdAndUpdate(
            userId,
            { $pull: { "profile.posts": postId } },
            { session }
        );

        // Delete associated votes
        await SocietyPostAndCommentVote.findOneAndUpdate(
            { postId },
            { isDeleted: true },
            { session }
        );

        // Delete associated comments and their votes
        const commentCollection = await PostCommentCollection.findById(postId).session(session);
        if (commentCollection) {
            for (const commentId of commentCollection.comments) {
                await PostComment.findByIdAndUpdate(commentId, { isDeleted: true }, { session });
                await SocietyPostAndCommentVote.findOneAndUpdate(
                    { commentId: commentId },
                    { isDeleted: true },
                    { session }
                );
            }
            await PostCommentCollection.findByIdAndUpdate(postId, { isDeleted: true }, { session });
        }
        const addToDeletedData = await DeletedDataCollection.findByIdAndUpdate(userId, {
            $push: {
                deletedPosts: {
                    postId,
                    deletedAt: new Date()
                }
            }
        });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error in delete('/posts/delete')", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.put("/post/edit/:postId", upload.array('file'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const { postId } = req.params;
    const { title, body, mediaList } = req.body;
    const { userId } = getUserDetails(req);
    const files = req.files;

    try {
        const post = await Post.findById(postId).session(session);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (userId !== post.author.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        post.title = title;
        post.body = body;
        post.isEdited = true;
        post.editedAt = new Date();

        // Normalize mediaList to array of objects
        let mediaListArray = [];
        if (typeof mediaList === 'string') {
            mediaListArray = [JSON.parse(mediaList)]; // if mediaList is a single object as a string
        } else if (Array.isArray(mediaList)) {
            mediaListArray = mediaList.map(m => typeof m === 'string' ? JSON.parse(m) : m);
        }

        const mediaListUrls = mediaListArray.map(m => m.url);

        // Identify and store removed media (media in post.media but not in mediaList)
        if (post.media && post.media.length > 0) {
            const removedMedia = post.media.filter(m => !mediaListUrls.includes(m.url));

            if (removedMedia.length > 0) {
                await DeletedDataCollection.findByIdAndUpdate(
                    userId,
                    {
                        postId,
                        $push: { removedMedia }
                    },
                    { new: true, upsert: true } // upsert in case the document doesn't exist yet
                );
            }

            // Retain only the media that is still present
            post.media = post.media.filter(m => mediaListUrls.includes(m.url));
        }

        // Add newly uploaded media
        if (files && files.length > 0) {
            const mediaArray = [];
            for (const file of files) {
                const { url, type } = await uploadPostMedia(userId, file, req);
                mediaArray.push({ url, type });
            }
            post.media.push(...mediaArray);
        }

        await post.save({ session });
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({ message: "Post updated successfully", post });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error editing post:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


// router.put("/post/edit/:postId", upload.array('file'), async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     const { postId } = req.params;
//     const { title, body, mediaList } = req.body;
//     const { userId } = getUserDetails(req);
//     const files = req.files;

//     console.log("\nDATA:", req.body, "\nFiles:", files, "\nPOST ID:", postId)


//     try {
//         const post = await Post.findById(postId).session(session);
//         if (!post) return res.status(404).json({ message: "Post not found" });
//         if (userId !== post.author.toString()) {
//             return res.status(403).json({ message: "Unauthorized" });
//         }

//         post.title = title;
//         post.body = body;
//         post.isEdited = true;
//         post.editedAt = new Date();

//         // Ensure mediaList is always an array
//         let mediaListArray = [];
//         // if (typeof mediaList === 'string') {
//         //     mediaListArray = [mediaList];
//         // } else if (Array.isArray(mediaList)) {
//         //     mediaListArray = mediaList;
//         // }

//         console.log("mediaListArray", mediaList)


//         console.log("post.media", post.media)

//         // Identify and store removed media
//         const removedMedia = post?.media?.filter(m => !mediaListArray.includes(m.url));
//         console.log("removedMedia", removedMedia)
//         if (removedMedia.length > 0) {
//             await DeletedDataCollection.findByIdAndUpdate(userId,{
//                 postId,
//                 $push:{
//                     removedMedia
//                 },
//             }, {new:true});
//         }

//         // Retain only current media
//         post.media = post.media.filter(m => mediaListArray.includes(m.url));

//         console.log("\n after post.media", post.media)
//         // return res.status(200).json({message: "ok"});
//         // Add newly uploaded media
//         if (files && files.length > 0) {
//             const mediaArray = [];
//             for (const file of files) {
//                 const { url, type } = await uploadPostMedia(userId, file, req);
//                 mediaArray.push({ url, type });
//             }
//             post.media.push(...mediaArray);
//         }

//         await post.save({ session });
//         await session.commitTransaction();
//         session.endSession();

//         return res.status(200).json({ message: "Post updated successfully", post });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         console.error("Error editing post:", error);
//         return res.status(500).json({ error: "Internal Server Error" });
//     }
// });


// router.put("/post/edit/:postId", upload.array('file'), async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     const {postId} = req.params;
//     const {title, body, mediaList} = req.body;
//     const {userId} = getUserDetails(req);
//     const files = req.files;

//     console.log("\nDATA:", req.body, "\nFiles:",files, "\nPOST ID:", postId)
//     // return res.status(200).json({message: "ok"});

//     try {
//         const post = await Post.findById(postId).session(session);
//         if(!post) return res.status(404).json({message: "Post not found"});
//         if(userId !== post.author.toString()) return res.status(403).json({message: "You are not authorized to edit this post"});

//         post.title = title;
//         post.body = body;
//         post.isEdited = true;
//         post.editedAt = new Date();
//         if(mediaList && mediaList.length > 0){
//             const saveMediaToSeperateStorage = await DeletedDataCollection.findByIdAndUpdate(userId, {
//                 $push: {
//                     removedMedia: mediaList
//                 }
//             }, {session});
//         }
//         // remove media from post collection which is not passed in the request, even though it existed before
//         if(mediaList && mediaList.length > 0){
//             post.media = mediaList.map((url) => {
//                post.media.filter((mediaurl) => mediaurl.url !== url);
//             })
//         }
//         if(files && files.length > 0){
//             const mediaArray = [];
//             for(let file of files){
//                 const {url, type} = await uploadPostMedia(userId, file, req);
//                 mediaArray.push({type, url});
//             }
//             post.media.push(mediaArray);
//         }
//         await post.save({session});

//         await session.commitTransaction();
//         session.endSession();

//        return res.status(200).json({message: "Post updated successfully", post: post});

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         console.error("Error in put('/post/edit')", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }

// })






module.exports = router;
