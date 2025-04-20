const express = require("express");
const Discussion = require("../../../models/university/papers/discussion/discussion");
const User = require("../../../models/user/user.model");
const { getUserDetails } = require("../../../utils/utils");
const { DiscussionComment } = require("../../../models/university/papers/discussion/discussion.comment");
const DiscussionCommentVote = require("../../../models/university/papers/discussion/vote.comment.discussion");
const { PastPaperItem } = require("../../../models/university/papers/pastpaper.item.model");
const { default: mongoose } = require("mongoose");
const DiscussionChat = require("../../../models/university/papers/discussion/chat/discussion.chat");
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

// Add comment to discussion
router.post('/comment/add-comment', async (req, res) => {
    const { toBeDiscussedId, commentContent, type } = req.body;
    const { userId } = getUserDetails(req);

    try {

        // // Find discussion and validate structured question if provided
        // const discussion = await Discussion.findOne({ discussion_of: toBeDiscussedId });
        // if (!discussion) {
        //     return res.status(404).json({ message: "Discussion not found" });
        // }

        const pastPaperItem = await PastPaperItem.findById(toBeDiscussedId);
        if (!pastPaperItem) {
            return res.status(404).json({ message: "Past paper not found" });
        }


        let structuredQuestionId = null;
        if (type === 'answer') {
            const paper = await PastPaperItem.findById(toBeDiscussedId);
            if (!paper) {
                return res.status(404).json({ message: "Past paper not found" });
            }

            // Find or create structured question
            const question = await paper.addStructuredQuestion(
                questionTag.level,
                questionTag.type,
                questionTag.content,
                questionTag.parentId
            );
            structuredQuestionId = question._id;
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
                type: questionTag?.isAnswer ? 'answer' : 'discussionComment',
                paperId: toBeDiscussedId,
                structuredQuestionId,
                questionTag: questionTag ? {
                    level: questionTag.level,
                    type: questionTag.type,
                    content: questionTag.content,
                    isAnswer: questionTag.isAnswer
                } : null,
                voteId: voteDoc[0]._id
            });

            // Save comment
            savedComment = await comment.save({ session });

            // Update discussion
            discussion.discussioncomments.push(savedComment._id);
            await discussion.save({ session });

            // If this is an answer, link it to the structured question
            if (questionTag?.isAnswer && structuredQuestionId) {
                const paper = await PastPaperItem.findById(toBeDiscussedId);
                await paper.linkAnswerToQuestion(structuredQuestionId, savedComment._id);
            }

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
    const { commentId, replyContent, questionTag } = req.body;
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
            questionTag: questionTag && {
                ...questionTag,
                isAnswer: true
            }
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

// Update comment tag
router.post("/comment/update-tag/:commentId", asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { questionTag } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const comment = await DiscussionComment.findById(commentId).session(session);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const wasAnswer = comment.questionTag?.isAnswer;
        comment.questionTag = questionTag;
        await comment.save({ session });
        await comment.updateAnswerStatus();

        // Update pastpaper item's answer count if needed
        if (!wasAnswer && questionTag.isAnswer) {
            const discussion = await Discussion.findOne({ discussioncomments: commentId }).session(session);
            if (discussion) {
                await PastPaperItem.findByIdAndUpdate(
                    discussion.discussion_of,
                    { $inc: { 'metadata.answers': 1 } },
                    { session }
                );
            }
        }

        await session.commitTransaction();
        res.status(200).json({ message: "Comment tag updated successfully", comment });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

// Get answers for a specific question
router.get("/answers/:commentId", asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { questionNumber, part } = req.query;

    const comment = await DiscussionComment.findById(commentId)
        .populate({
            path: 'replies',
            match: {
                'questionTag.questionNumber': questionNumber,
                ...(part && { 'questionTag.part': part }),
                'questionTag.isAnswer': true
            },
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
        });

    if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
    }

    // Sort answers by votes (approved answers first, then by vote count)
    const sortedAnswers = comment.replies.sort((a, b) => {
        if (a.isApprovedAnswer !== b.isApprovedAnswer) {
            return b.isApprovedAnswer ? 1 : -1;
        }
        return (b.voteId.upVotesCount - b.voteId.downVotesCount) -
            (a.voteId.upVotesCount - a.voteId.downVotesCount);
    });

    res.status(200).json({ answers: sortedAnswers });
}));

// Get existing question tags for a discussion
router.get("/tags/:discussionId", asyncHandler(async (req, res) => {
    const { discussionId } = req.params;

    const discussion = await Discussion.findById(discussionId)
        .populate({
            path: 'discussioncomments',
            match: {
                'questionTag.isAnswer': true
            },
            select: 'questionTag'
        });

    if (!discussion) {
        return res.status(404).json({ error: "Discussion not found" });
    }

    // Extract unique question tags
    const tags = discussion.discussioncomments.reduce((acc, comment) => {
        if (comment.questionTag) {
            const tagKey = `${comment.questionTag.questionNumber}-${comment.questionTag.part || ''}`;
            if (!acc.some(tag =>
                tag.questionNumber === comment.questionTag.questionNumber &&
                tag.part === comment.questionTag.part
            )) {
                acc.push(comment.questionTag);
            }
        }
        return acc;
    }, []);

    // Sort tags by question number and part
    const sortedTags = tags.sort((a, b) => {
        if (a.questionNumber !== b.questionNumber) {
            return a.questionNumber - b.questionNumber;
        }
        return (a.part || '').localeCompare(b.part || '');
    });

    res.status(200).json({ tags: sortedTags });
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

// Get structured questions for a past paper
router.get('/structured-questions/:paperId', async (req, res) => {
    try {
        const paper = await PastPaperItem.findById(req.params.paperId)
            .populate({
                path: 'structuredQuestions',
                populate: {
                    path: 'answerId',
                    populate: [
                        { path: 'user', select: 'name email profilePicture' },
                        { path: 'voteId' }
                    ]
                }
            });

        if (!paper) {
            return res.status(404).json({ message: "Past paper not found" });
        }

        return res.json({
            questions: paper.structuredQuestions
        });

    } catch (error) {
        console.error("Error fetching structured questions:", error);
        return res.status(500).json({
            message: "Error fetching structured questions",
            error: error.message
        });
    }
});

// Create a structured question
router.post('/structured-question/create', asyncHandler(async (req, res) => {
    const { paperId, level, type, content, parentId } = req.body;

    try {
        const paper = await PastPaperItem.findById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Past paper not found" });
        }

        const question = await paper.addStructuredQuestion(level, type, content, parentId);
        await question.populate({
            path: 'answerId',
            populate: [
                { path: 'user', select: 'name email profilePicture' },
                { path: 'voteId' }
            ]
        });

        return res.status(201).json({
            message: "Structured question created successfully",
            question
        });
    } catch (error) {
        console.error("Error creating structured question:", error);
        return res.status(500).json({
            message: "Error creating structured question",
            error: error.message
        });
    }
}));

// Get question hierarchy
router.get('/structured-questions/:paperId/hierarchy', async (req, res) => {
    try {
        const paper = await PastPaperItem.findById(req.params.paperId)
            .populate({
                path: 'structuredQuestions',
                populate: [
                    {
                        path: 'subQuestions',
                        populate: {
                            path: 'subQuestions'
                        }
                    },
                    {
                        path: 'answerId',
                        populate: [
                            { path: 'user', select: 'name email profilePicture' },
                            { path: 'voteId' }
                        ]
                    }
                ]
            });

        if (!paper) {
            return res.status(404).json({ message: "Past paper not found" });
        }

        // Build hierarchy
        const buildHierarchy = (questions) => {
            const questionMap = new Map();
            const rootQuestions = [];

            questions.forEach(q => {
                questionMap.set(q._id.toString(), {
                    ...q.toObject(),
                    children: []
                });
            });

            questions.forEach(q => {
                const questionObj = questionMap.get(q._id.toString());
                if (q.parent) {
                    const parent = questionMap.get(q.parent.toString());
                    if (parent) {
                        parent.children.push(questionObj);
                    }
                } else {
                    rootQuestions.push(questionObj);
                }
            });

            return rootQuestions;
        };

        const hierarchy = buildHierarchy(paper.structuredQuestions);

        return res.json({
            questions: hierarchy
        });

    } catch (error) {
        console.error("Error fetching question hierarchy:", error);
        return res.status(500).json({
            message: "Error fetching question hierarchy",
            error: error.message
        });
    }
});

// Get next available question level
router.get('/structured-questions/:paperId/next-level', async (req, res) => {
    try {
        const { type, currentLevel, parentId } = req.query;
        const paper = await PastPaperItem.findById(req.params.paperId);

        if (!paper) {
            return res.status(404).json({ message: "Past paper not found" });
        }

        const StructuredQuestion = mongoose.model('StructuredQuestion');
        const nextLevel = await StructuredQuestion.getNextLevel(type, currentLevel);

        return res.json({
            nextLevel,
            type
        });

    } catch (error) {
        console.error("Error getting next question level:", error);
        return res.status(500).json({
            message: "Error getting next question level",
            error: error.message
        });
    }
});

// Update structured question
router.put('/structured-question/:questionId', asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const { content } = req.body;

    try {
        const StructuredQuestion = mongoose.model('StructuredQuestion');
        const question = await StructuredQuestion.findById(questionId);

        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        question.content = content;
        await question.save();

        await question.populate({
            path: 'answerId',
            populate: [
                { path: 'user', select: 'name email profilePicture' },
                { path: 'voteId' }
            ]
        });

        return res.json({
            message: "Question updated successfully",
            question
        });

    } catch (error) {
        console.error("Error updating question:", error);
        return res.status(500).json({
            message: "Error updating question",
            error: error.message
        });
    }
}));

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

// Get answers for a specific question
router.get("/structured-question/:questionId/answers", asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const { includeSubQuestions = false } = req.query;

    const question = await StructuredQuestion.findById(questionId);
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    const answers = await question.getAllAnswers(includeSubQuestions === 'true');
    res.status(200).json(answers);
}));

// Get answers by question path
router.get("/paper/:paperId/answers/:path", asyncHandler(async (req, res) => {
    const { paperId, path } = req.params;

    const paper = await PastPaperItem.findById(paperId)
        .populate({
            path: 'structuredQuestions',
            match: { fullPath: path },
            populate: {
                path: 'answers.answerId',
                populate: [
                    { path: 'user', select: 'name email profilePicture' },
                    { path: 'voteId' }
                ]
            }
        });

    if (!paper || !paper.structuredQuestions.length) {
        return res.status(404).json({ message: "Question not found" });
    }

    const question = paper.structuredQuestions[0];
    res.status(200).json({
        question,
        answers: question.answers
    });
}));

// Add answer to structured question
router.post('/structured-question/:questionId/answer', asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const { answerId } = req.body;
    const { userId } = getUserDetails(req);

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
        const question = await StructuredQuestion.findById(questionId).session(session);
        if (!question) {
            throw new Error("Question not found");
        }

        await question.addAnswer(answerId);

        // Update the comment to mark it as an answer
        await DiscussionComment.findByIdAndUpdate(answerId, {
            $set: {
                type: 'answer',
                'questionTag.isAnswer': true
            }
        }).session(session);

        const updatedQuestion = await question.populate('answers.answerId');
        res.status(200).json({
            message: "Answer added successfully",
            question: updatedQuestion
        });
    });

    await session.endSession();
}));

module.exports = router;