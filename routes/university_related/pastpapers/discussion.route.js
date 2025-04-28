const express = require("express");
const Discussion = require("../../../models/university/papers/discussion/discussion");
const User = require("../../../models/user/user.model");
const { getUserDetails } = require("../../../utils/utils");
const { DiscussionComment } = require("../../../models/university/papers/discussion/discussion.comment");
const DiscussionCommentVote = require("../../../models/university/papers/discussion/vote.comment.discussion");
const { PastPaperItem, StructuredQuestion } = require("../../../models/university/papers/pastpaper.item.model");
const { default: mongoose } = require("mongoose");
const DiscussionChat = require("../../../models/university/papers/discussion/chat/discussion.chat");
const StructuredQuestionCollection = require("../../../models/university/papers/structured/structured.collec.file.model");
const StructuredAnswer = require("../../../models/university/papers/structured/answers.structured.model");
const StructuredVote = require("../../../models/university/papers/structured/vote.answers.model");
const path = require("path");
const { StructuredComment } = require("../../../models/university/papers/structured/comment.answers.structure.model");
const router = express.Router();

// Error handler middleware
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// const populateReplies = (path, depth) => {
//     if (depth === 0) {
//         return { path };
//     }
//     return {
//         path,
//         populate: [{
//             path: 'replies',
//             populate: populateReplies('replies', depth - 1)
//         },
//         {
//             path: 'user',
//             select: 'name profile username'
//         },
//         {
//             path: "voteId",
//             select: "_id upVotesCount downVotesCount userVotes",
//         }
//         ]
//     };
// };

// Get or create discussion for a pastpaper item

router.post("/create-get", asyncHandler(async (req, res) => {
    const { toBeDisccusedId } = req.query;

    try {
        // Verify that the pastpaper item exists
        const pastPaperItem = await PastPaperItem.findById(toBeDisccusedId);
        if (!pastPaperItem) {
            return res.status(404).json({ error: "Past paper item not found" });
        }

        const chat = await DiscussionChat.findByIdAndUpdate(
            toBeDisccusedId,
            {}, // no update
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );


        let discussion = await Discussion.findOne({ discussion_of: toBeDisccusedId })
            .populate({
                path: 'discussioncomments',
                populate: [
                    {
                        path: 'user',
                        select: 'name profile username'
                    },
                    {
                        path: "voteId",
                        select: "_id upVotesCount downVotesCount userVotes"
                    },
                    {
                        path: 'replies',
                        populate: [
                            {
                                path: 'user',
                                select: 'name profile username'
                            },
                            {
                                path: 'voteId',
                                select: '_id upVotesCount downVotesCount userVotes'
                            }
                        ]
                    }
                ],
                options: {
                    limit: 10,
                    sort: { createdAt: -1 }
                }
            });



        if (discussion) {
            return res.status(200).json({ discussion });
        }

        // Create new discussion if it doesn't exist
        discussion = await Discussion.create({
            discussion_of: toBeDisccusedId,
            _id: toBeDisccusedId
        });


        res.status(201).json({ discussion });

    } catch (error) {
        console.error("Error in create-get discussion:", error);
        return res.status(500).json({
            message: "Error creating/getting discussion",
            error: error.message
        });
    }
}));


router.post('/create/question', async (req, res) => {
    const {
        toBeDiscussedId, questionLevel, questionNumberOrAlphabet, questionContent
        , parentId, fullPath
    } = req.body;

    const { userId } = getUserDetails(req);

    try {
        const pastPaperItem = await PastPaperItem.findById(toBeDiscussedId);
        if (!pastPaperItem) {
            return res.status(404).json({ message: "Past paper not found" });
        }

        const data = {
            structuredQuestionCollectionId: toBeDiscussedId,
            level: questionLevel,
            questionNumberOrAlphabet,
            questionContent,
            fullPath: fullPath,
            createdBy: userId
        }
        if (parentId) {
            data.parent = parentId;
        }


        const createQuestion = await StructuredQuestion.create(data);

        await createQuestion.save();

        if (parentId) {
            const parentQuestion = await StructuredQuestion.findByIdAndUpdate(parentId, { subQuestions: createQuestion._id }, { new: true });
        }
        let addToCollection = await StructuredQuestionCollection.findByIdAndUpdate(
            toBeDiscussedId,
            { $addToSet: { structuredQuestions: createQuestion._id } }, // or $push
            { new: true }
        );

        if (!addToCollection) {
            addToCollection = await StructuredQuestionCollection.create({ _id: toBeDiscussedId, structuredQuestions: [createQuestion._id] });
            addToCollection.save()
        }

        return res.status(201).json({
            message: "Question created successfully",
            data: createQuestion
        });
    }
    catch (error) {
        console.error("Error in create question in  discussion:", error);
        return res.status(500).json({
            message: "Error creating question in  discussion",
            error: error.message
        });
    }
});

router.post('/questions/all', async (req, res) => {
    const {
        toBeDiscussedId
    } = req.body;
    // console.log("DISUSSION ID ",)

    try {

        const questions = await StructuredQuestionCollection.findById(toBeDiscussedId).populate("structuredQuestions")
        if (!questions) {
            return res.status(404).json({ message: "Questions not found", data: [] });
        }

        return res.status(200).json({
            message: "Questions fetched successfully",
            data: questions.structuredQuestions
        });

    }
    catch (error) {
        console.error("Error in create-get discussion:", error);
        return res.status(500).json({
            message: "Error creating/getting discussion",
            error: error.message
        });
    }
});


router.post('/questions/populated/all', async (req, res) => {
    const {
        toBeDiscussedId
    } = req.body;
    // console.log("DISUSSION ID ", toBeDiscussedId)

    try {

        const questions = await StructuredQuestionCollection.findById(toBeDiscussedId, {isDeleted: false}).populate(
            [
                {
                    path: "structuredQuestions",
                    match: { isDeleted: false },
                    populate: [{
                        path: "answers",
                        match: { isDeleted: false },
                        populate: [{ path: "voteId" }, { path: "answeredByUser", select: "name profile username" }]
                    },
                    { path: "createdBy", select: "name profile username" },
                    ]
                }
            ]
        )
        // console.log("QUESTIONS ", JSON.stringify(questions, null, 2))
        if (!questions) {
            return res.status(404).json({ message: "Questions not found", data: [] });
        }

        return res.status(200).json({
            message: "Questions fetched successfully",
            answers: questions.structuredQuestions
        });

    }
    catch (error) {
        console.error("Error in create-get discussion:", error);
        return res.status(500).json({
            message: "Error creating/getting discussion",
            error: error.message
        });
    }
});

// async function populateSubQuestions(question, parentPrefix = '') {
//     const populated = await StructuredQuestion.findById(question._id).populate('subQuestions');

//     if (!populated) return question;

//     const currentPrefix = parentPrefix
//         ? `${parentPrefix}.${populated.questionNumberOrAlphabet}`
//         : populated.questionNumberOrAlphabet;

//     // Assign the full hierarchical prefix
//     populated.fullPath = currentPrefix;

//     populated.subQuestions = await Promise.all(
//         populated.subQuestions.map(subQ => populateSubQuestions(subQ, currentPrefix))
//     );

//     return populated;
// }


router.post('/parent-questions/populated/all', async (req, res) => {
    const { toBeDiscussedId } = req.body;

    try {
        const parentQuestions = await StructuredQuestion.find({
            structuredQuestionCollectionId: toBeDiscussedId,
            parent: { $exists: false }, isDeleted: false
        }).populate({path:'subQuestions', match:{isDeleted:false}});

        if (!parentQuestions || parentQuestions.length === 0) {
            return res.status(404).json({ message: "Questions not found", data: [] });
        }

        // const fullyPopulated = await Promise.all(
        //     parentQuestions.map(question => populateSubQuestions(question))
        // );
        // console.log("FULLY POPULATED ", JSON.stringify(fullyPopulated, null, 2))

        return res.status(200).json({
            message: "Questions fetched successfully",
            data: parentQuestions
        });

    } catch (error) {
        console.error("Error in create-get discussion:", error);
        return res.status(500).json({
            message: "Error creating/getting discussion",
            error: error.message
        });
    }
});



router.post('/parent-questions/all', async (req, res) => {
    const {
        toBeDiscussedId
    } = req.body;
    // console.log("DISUSSION ID ",)

    try {

        const questions = await StructuredQuestion.find({ structuredQuestionCollectionId: toBeDiscussedId, parent: { $exists: false }, isDeleted: false });
        // console.log("QUESTIONS ", questions)
        if (!questions) {
            return res.status(404).json({ message: "Questions not found", data: [] });
        }

        return res.status(200).json({
            message: "Questions fetched successfully",
            data: questions
        });

    }
    catch (error) {
        console.error("Error in create-get discussion:", error);
        return res.status(500).json({
            message: "Error creating/getting discussion",
            error: error.message
        });
    }
});

router.post('/sub-questions/all', async (req, res) => {
    const {
        toBeDiscussedId,
        parentId
    } = req.body;
    console.log("DISUSSION ID ",)

    try {

        const questions = await StructuredQuestion.find({ parent: parentId, isDeleted: false });
        if (!questions) {
            return res.status(404).json({ message: "Questions not found", data: [] });
        }

        return res.status(200).json({
            message: "Questions fetched successfully",
            data: questions
        });

    }
    catch (error) {
        console.error("Error in create-get discussion:", error);
        return res.status(500).json({
            message: "Error creating/getting discussion",
            error: error.message
        });
    }
});

router.post('/create/answer', async (req, res) => {
    const { toBeDiscussedId, questionId, answer } = req.body;
    const { userId } = getUserDetails(req);

    console.log("TO BE DISCUSSED ID ", toBeDiscussedId, "QUESTION ID ", questionId, "ANSWER ", answer)
    try {

        const answerData = {
            questionId: questionId,
            paperId: toBeDiscussedId,
            content: answer,
            answeredByUser: userId
        }
        const createAnswer = await StructuredAnswer.create(answerData);
        await createAnswer.save();

        if (createAnswer) {
            const createStructuredCommentVote = await StructuredVote.create({ answerId: createAnswer._id });
            await createStructuredCommentVote.save();
        }

        const question = await StructuredQuestion.findByIdAndUpdate(questionId, { $push: { answers: createAnswer._id } }, { new: true });
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }




        return res.status(200).json({
            message: "Answer added successfully",
            data: createAnswer
        });
    } catch (error) {
        console.error("Error in adding answer to question:", error);
        return res.status(500).json({
            message: "Error adding answer to question",
            error: error.message
        });
    }
})

router.post('/answer/edit', async (req, res) => {
    const {  answerId, editedContent, userIdRef } = req.body;
    const { userId } = getUserDetails(req);

    try {
        if(userIdRef !== userId) {
            return res.status(403).json({ message: "You are not authorized to edit this answer" });
        }
        const answer = await StructuredAnswer.findByIdAndUpdate(answerId, { content: editedContent, isEdited: true }, { new: true });
        if (!answer) {
            return res.status(404).json({ message: "Answer not found or could't edit" });
        }


        return res.status(200).json({
            message: "Answer added successfully",
            data: answer
        });
    } catch (error) {
        console.error("Error in adding answer to question:", error);
        return res.status(500).json({
            message: "Error adding answer to question",
            error: error.message
        });
    }
})


router.post('/answer/delete', async (req, res) => {
    const {  answerId, editedContent, userIdRef } = req.body;
    const { userId } = getUserDetails(req);

    try {
        if(userIdRef !== userId) {
            return res.status(403).json({ message: "You are not authorized to edit this answer" });
        }
        const answer = await StructuredAnswer.findByIdAndUpdate(answerId, { isDeleted: true }, { new: true });
        
        if (!answer) {
            return res.status(404).json({ message: "Answer not found or could't delete" });
        }

        return res.status(200).json({
            message: "Answer deleted successfully",
        });
    } catch (error) {
        console.error("Error in adding answer to question:", error);
        return res.status(500).json({
            message: "Error adding answer to question",
            error: error.message
        });
    }
})



// Add comment to discussion
router.post('/comment/add-comment', async (req, res) => {
    const { toBeDiscussedId, commentContent } = req.body;
    const { userId } = getUserDetails(req);

    try {

        const discussion = await Discussion.findOne({ discussion_of: toBeDiscussedId });
        if (!discussion) {
            return res.status(404).json({ message: "Discussion not found" });
        }

        const pastPaperItem = await PastPaperItem.findById(toBeDiscussedId);
        if (!pastPaperItem) {
            return res.status(404).json({ message: "Past paper not found" });
        }

        // Start transaction
        const session = await mongoose.startSession();
        let savedComment;

        await session.withTransaction(async () => {
            // Create vote document
            const voteDoc = await DiscussionCommentVote.create([{
                upVotesCount: 0,
                downVotesCount: 0
            }], { session });

            // Create comment
            const comment = new DiscussionComment({
                content: commentContent,
                user: userId,
                type: 'discussionComment',
                paperId: toBeDiscussedId,
                voteId: voteDoc[0]._id
            });

            // Save comment
            savedComment = await comment.save({ session });

            // Update discussion
            discussion.discussioncomments.push(savedComment._id);
            await discussion.save({ session });

            // Populate comment
            await savedComment.populate([
                { path: 'user', select: 'name email profilePicture' },
                { path: 'voteId' },
                {
                    path: 'replies',
                    populate: [
                        { path: 'user', select: 'name email profilePicture' },
                        { path: 'voteId' }
                    ]
                }
            ]);
        });

        // Return populated comment
        return res.status(201).json({
            message: "Comment added successfully",
            comment: savedComment
        });

    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({
            message: "Error adding comment",
            error: error.message
        });
    }
});

// Reply to a comment
router.post('/comment/reply-to-comment', asyncHandler(async (req, res) => {
    const { commentId, replyContent } = req.body;
    const { userId } = getUserDetails(req);

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const reply = new DiscussionComment({
            content: replyContent,
            user: user._id,
            type: 'discussionComment',
        });
        await reply.save({ session });

        const comment = await DiscussionComment.findById(commentId).session(session);
        if (!comment) {
            throw new Error('Parent comment not found');
        }

        comment.replies.push(reply._id);
        await comment.save({ session });

        await session.commitTransaction();

        await reply.populate([
            {
                path: "user",
                select: "_id name username profile"
            },
            {
                path: "voteId",
                select: "_id upVotesCount downVotesCount userVotes"
            },
            {
                path: 'replies',
                populate: [
                    {
                        path: 'user',
                        select: 'name profile username'
                    },
                    {
                        path: 'voteId',
                        select: '_id upVotesCount downVotesCount userVotes'
                    }
                ]
            }
        ]);

        res.status(201).json(reply);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));
// Vote on a comment
router.post("/comment/vote", asyncHandler(async (req, res) => {
    const { commentId, voteType } = req.body;

    try {
        const { userId } = getUserDetails(req);
        const session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const voteDoc = await DiscussionCommentVote.findById(commentId).session(session);
            if (!voteDoc) {
                throw new Error("Comment vote not found");
            }

            const currentVote = voteDoc.userVotes.get(userId) || null;

            if (currentVote !== null && currentVote !== voteType) {
                const updateOps = {
                    $set: { [`userVotes.${userId}`]: voteType }
                };

                if (currentVote === 'upvote') {
                    updateOps.$inc = { upVotesCount: -1 };
                } else if (currentVote === 'downvote') {
                    updateOps.$inc = { downVotesCount: -1 };
                }

                if (voteType === 'upvote') {
                    updateOps.$inc = { ...updateOps.$inc, upVotesCount: 1 };
                } else if (voteType === 'downvote') {
                    updateOps.$inc = { ...updateOps.$inc, downVotesCount: 1 };
                }

                const voteDocUpdated = await DiscussionCommentVote.findByIdAndUpdate(
                    commentId,
                    updateOps,
                    { session, new: true }
                );

                return res.status(200).json({
                    message: "Vote reprocessed successfully",
                    upVotesCount: voteDocUpdated.upVotesCount,
                    downVotesCount: voteDocUpdated.downVotesCount
                });
            }

            if (currentVote === voteType) {
                const updateOps = {
                    $set: { [`userVotes.${userId}`]: null }
                };

                if (voteType === 'upvote') {
                    updateOps.$inc = { upVotesCount: -1 };
                } else if (voteType === 'downvote') {
                    updateOps.$inc = { downVotesCount: -1 };
                }

                const voteDocUpdated = await DiscussionCommentVote.findByIdAndUpdate(
                    commentId,
                    updateOps,
                    { session, new: true }
                );

                return res.status(200).json({
                    message: "Vote removed successfully",
                    upVotesCount: voteDocUpdated.upVotesCount,
                    downVotesCount: voteDocUpdated.downVotesCount,
                    noneSelected: true
                });
            }

            const updateOps = {
                $set: { [`userVotes.${userId}`]: voteType }
            };

            if (voteType === 'upvote') {
                updateOps.$inc = { upVotesCount: 1 };
            } else if (voteType === 'downvote') {
                updateOps.$inc = { downVotesCount: 1 };
            }

            const voteDocUpdated = await DiscussionCommentVote.findByIdAndUpdate(
                commentId,
                updateOps,
                { session, new: true }
            );

            return res.status(200).json({
                message: "Vote processed successfully",
                upVotesCount: voteDocUpdated.upVotesCount,
                downVotesCount: voteDocUpdated.downVotesCount
            });
        });

        session.endSession();
    } catch (error) {
        console.error("Error processing vote:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

// Delete a comment
router.delete("/comment/:commentId", asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { userId } = getUserDetails(req);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const comment = await DiscussionComment.findById(commentId).session(session);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        // Check if user owns the comment
        if (comment.user.toString() !== userId) {
            return res.status(403).json({ error: "Not authorized to delete this comment" });
        }

        // If it was an answer, decrement the pastpaper item's answer count
        if (comment.questionTag?.isAnswer) {
            const discussion = await Discussion.findOne({ discussioncomments: commentId }).session(session);
            if (discussion) {
                await PastPaperItem.findByIdAndUpdate(
                    discussion.discussion_of,
                    { $inc: { 'metadata.answers': -1 } },
                    { session }
                );
            }
        }

        // Remove comment from discussion
        await Discussion.updateMany(
            { discussioncomments: commentId },
            { $pull: { discussioncomments: commentId } },
            { session }
        );

        // Remove comment and its vote document
        await DiscussionCommentVote.findByIdAndDelete(comment.voteId).session(session);
        await comment.deleteOne({ session });

        await session.commitTransaction();
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));



// Add comment to discussion
router.post('/answer/comment/add-comment', async (req, res) => {
    const { answerId, commentContent } = req.body;
    const { userId } = getUserDetails(req);

    try {

        const answer = await StructuredAnswer.findById(answerId);
        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }
        const createComment = await StructuredComment.create({
            content: commentContent,
            user: userId,
        });

        createComment.save();
        answer.replies.push(createComment._id);
        answer.save();


        // Return populated comment
        return res.status(201).json({
            message: "Comment added successfully",
            comment: createComment
        });

    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({
            message: "Error adding comment",
            error: error.message
        });
    }
});
// Add comment to answer
router.post('/answer/comment/add-reply', async (req, res) => {
    const { commentId, commentContent, mentions =[] } = req.body;
    const { userId } = getUserDetails(req);

    try {

        const answer = await StructuredComment.findById(commentId);
        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }
        const createComment = await StructuredComment.create({
            content: commentContent,
            user: userId,
            mentions: mentions,
            replyToUser: answer.user,
        });

        createComment.save();
        answer.replies.push(createComment._id);
        answer.save();


        // Return populated comment
        return res.status(201).json({
            message: "Comment added successfully",
            comment: createComment
        });

    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({
            message: "Error adding comment",
            error: error.message
        });
    }
});

router.post("/answer/vote", asyncHandler(async (req, res) => {
    const { answerId, voteType } = req.body;

    try {
        const { userId } = getUserDetails(req);
        const session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const voteDoc = await StructuredVote.findOne({answerId:answerId}).session(session);
            if (!voteDoc) {
                throw new Error("Comment vote not found");
            }

            const currentVote = voteDoc.userVotes.get(userId) || null;

            if (currentVote !== null && currentVote !== voteType) {
                const updateOps = {
                    $set: { [`userVotes.${userId}`]: voteType }
                };

                if (currentVote === 'upvote') {
                    updateOps.$inc = { upVotesCount: -1 };
                } else if (currentVote === 'downvote') {
                    updateOps.$inc = { downVotesCount: -1 };
                }

                if (voteType === 'upvote') {
                    updateOps.$inc = { ...updateOps.$inc, upVotesCount: 1 };
                } else if (voteType === 'downvote') {
                    updateOps.$inc = { ...updateOps.$inc, downVotesCount: 1 };
                }
                
                const voteDocUpdated = await StructuredVote.findOneAndUpdate(
                    {answerId:answerId},
                    updateOps,
                    { session, new: true }
                );

                return res.status(200).json({
                    message: "Vote reprocessed successfully",
                    upVotesCount: voteDocUpdated.upVotesCount,
                    downVotesCount: voteDocUpdated.downVotesCount
                });
            }

            if (currentVote === voteType) {
                const updateOps = {
                    $set: { [`userVotes.${userId}`]: null }
                };

                if (voteType === 'upvote') {
                    updateOps.$inc = { upVotesCount: -1 };
                } else if (voteType === 'downvote') {
                    updateOps.$inc = { downVotesCount: -1 };
                }

                const voteDocUpdated = await  StructuredVote.findOneAndUpdate(
                    {answerId:answerId},
                    updateOps,
                    { session, new: true }
                );

                return res.status(200).json({
                    message: "Vote removed successfully",
                    upVotesCount: voteDocUpdated.upVotesCount,
                    downVotesCount: voteDocUpdated.downVotesCount,
                    noneSelected: true
                });
            }

            const updateOps = {
                $set: { [`userVotes.${userId}`]: voteType }
            };

            if (voteType === 'upvote') {
                updateOps.$inc = { upVotesCount: 1 };
            } else if (voteType === 'downvote') {
                updateOps.$inc = { downVotesCount: 1 };
            }

            const voteDocUpdated = await  StructuredVote.findOneAndUpdate(
                {answerId:answerId},
                updateOps,
                { session, new: true }
            );

            return res.status(200).json({
                message: "Vote processed successfully",
                upVotesCount: voteDocUpdated.upVotesCount,
                downVotesCount: voteDocUpdated.downVotesCount
            });
        });

        session.endSession();
    } catch (error) {
        console.error("Error processing vote:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}))

// Vote on a comment
router.post("/answer/comment/vote", asyncHandler(async (req, res) => {
    const { commentId, voteType } = req.body;

    try {
        const { userId } = getUserDetails(req);
        const session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const voteDoc = await StructuredVote.findOne({commentId:commentId}).session(session);
            if (!voteDoc) {
                throw new Error("Comment vote not found");
            }

            const currentVote = voteDoc.userVotes.get(userId) || null;

            if (currentVote !== null && currentVote !== voteType) {
                const updateOps = {
                    $set: { [`userVotes.${userId}`]: voteType }
                };

                if (currentVote === 'upvote') {
                    updateOps.$inc = { upVotesCount: -1 };
                } else if (currentVote === 'downvote') {
                    updateOps.$inc = { downVotesCount: -1 };
                }

                if (voteType === 'upvote') {
                    updateOps.$inc = { ...updateOps.$inc, upVotesCount: 1 };
                } else if (voteType === 'downvote') {
                    updateOps.$inc = { ...updateOps.$inc, downVotesCount: 1 };
                }
                
                const voteDocUpdated = await StructuredVote.findOneAndUpdate(
                    {commentId:commentId},
                    updateOps,
                    { session, new: true }
                );

                return res.status(200).json({
                    message: "Vote reprocessed successfully",
                    upVotesCount: voteDocUpdated.upVotesCount,
                    downVotesCount: voteDocUpdated.downVotesCount
                });
            }

            if (currentVote === voteType) {
                const updateOps = {
                    $set: { [`userVotes.${userId}`]: null }
                };

                if (voteType === 'upvote') {
                    updateOps.$inc = { upVotesCount: -1 };
                } else if (voteType === 'downvote') {
                    updateOps.$inc = { downVotesCount: -1 };
                }

                const voteDocUpdated = await  StructuredVote.findOneAndUpdate(
                    {commentId:commentId},
                    updateOps,
                    { session, new: true }
                );

                return res.status(200).json({
                    message: "Vote removed successfully",
                    upVotesCount: voteDocUpdated.upVotesCount,
                    downVotesCount: voteDocUpdated.downVotesCount,
                    noneSelected: true
                });
            }

            const updateOps = {
                $set: { [`userVotes.${userId}`]: voteType }
            };

            if (voteType === 'upvote') {
                updateOps.$inc = { upVotesCount: 1 };
            } else if (voteType === 'downvote') {
                updateOps.$inc = { downVotesCount: 1 };
            }

            const voteDocUpdated = await  StructuredVote.findOneAndUpdate(
                {commentId:commentId},
                updateOps,
                { session, new: true }
            );

            return res.status(200).json({
                message: "Vote processed successfully",
                upVotesCount: voteDocUpdated.upVotesCount,
                downVotesCount: voteDocUpdated.downVotesCount
            });
        });

        session.endSession();
    } catch (error) {
        console.error("Error processing vote:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));


router.get('/answer', async (req, res) => {
    const { answerId } = req.query;
    const { userId } = getUserDetails(req);

    try {

        const answer = await StructuredAnswer.findById(answerId, {isDeleted: false}).populate([{path:'answeredByUser',  select:'name profile username'}, {path:'voteId'}]);

        console.log("fetched  ANSWER ", answer)

        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }


        // Return populated comment
        return res.status(201).json({
            message: "Comment fetched successfully",
            data: answer
        });

    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({
            message: "Error adding comment",
            error: error.message
        });
    }
});
// Add comment to discussion
router.get('/answer/comments', async (req, res) => {
    const { answerId } = req.query;
    const { userId } = getUserDetails(req);
    // console.log("ANSWER ID ", answerId)

    try {

        const answer = await StructuredAnswer.findById(answerId, {isDeleted: false})
            .populate({ path: "replies",
                
                match: { isDeleted: false },
                 populate: [{ path: "user", select: "name profile username", },
                 { path: "voteId" }] });
// console.log("ANSWER ", answer)
        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }

        // console.log("REPLIES ", answer.replies)

        // Return populated comment
        return res.status(201).json({
            message: "Comment fetched successfully",
            comment: answer.replies
        });

    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({
            message: "Error adding comment",
            error: error.message
        });
    }
});

router.get('/answer/comment/replies', async (req, res) => {
    const { commentId } = req.query;
    const { userId } = getUserDetails(req);

    try {

        const answer = await StructuredComment.findById(commentId)
            .populate({ path: "replies",
                
                match: { isDeleted: false },
                 populate: [{ path: "user", select: "name profile username" }, { path: "voteId" }] });

        if (!answer) {
            return res.status(404).json({ message: "Answer not found" });
        }


        // Return populated comment
        return res.status(201).json({
            message: "replies fetched successfully",
            comment: answer.replies
        });

    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({
            message: "Error adding comment",
            error: error.message
        });
    }
});







// Get paginated discussion comments
router.get('/comments/:discussionId', asyncHandler(async (req, res) => {
    const { discussionId } = req.params;
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;

    const depth = 0;
    const path = 'replies';

    try {
        const discussion = await Discussion.findById(discussionId);
        if (!discussion) {
            return res.status(404).json({ error: "Discussion not found" });
        }

        const totalComments = discussion.discussioncomments.length;
        const totalPages = Math.ceil(totalComments / limit);
        const skip = (page - 1) * limit;

        const comments = await DiscussionComment.find({
            _id: { $in: discussion.discussioncomments }
        })
            .sort({ [sort]: order })
            .skip(skip)
            .limit(parseInt(limit))
            .populate([
                { path: 'user', select: 'name email profilePicture' },
                { path: 'voteId' },

                {
                    path: 'replies',
                    populate: [
                        { path: 'user', select: 'name email profilePicture' },
                        { path: 'voteId' }
                    ]
                }
            ]);

        return res.json({
            comments,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalComments,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error("Error fetching comments:", error);
        return res.status(500).json({
            message: "Error fetching comments",
            error: error.message
        });
    }
}));


// Get paginated discussion comments
router.get('/comment/reply/:commentId', asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;

    try {
        const comment = await DiscussionComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const totalReplies = comment.replies.length;
        const totalPages = Math.ceil(totalReplies / limit);
        const skip = (page - 1) * limit;

        const replies = await DiscussionComment.find({
            _id: { $in: comment.replies }
        })
            .sort({ [sort]: order })
            .skip(skip)
            .limit(parseInt(limit))
            .populate([
                { path: 'user', select: 'name email profilePicture' },
                { path: 'voteId' },
                {
                    path: 'replies',
                    populate: [
                        { path: 'user', select: 'name email profilePicture' },
                        { path: 'voteId' }
                    ]
                }
            ]);

        return res.json({
            replies,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalReplies,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error("Error fetching replies:", error);
        return res.status(500).json({
            message: "Error fetching replies",
            error: error.message
        });
    }
}));



module.exports = router;