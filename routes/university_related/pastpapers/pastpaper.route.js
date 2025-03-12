const express = require('express');
const Subject = require('../../../models/university/department/subject/subject.department.model');
const { PastPaper, PastpapersCollectionByYear } = require('../../../models/university/papers/pastpaper.subject.model');
const PastPaperItem = require('../../../models/university/papers/pastpaper.item.model');
const { getUserDetails } = require('../../../utils/utils');
const router = express.Router();
const redisClient = require("../../../db/reddis.js");
const mongoose = require('mongoose');

// Cache configuration
const CACHE_TTL = 3600; // 1 hour in seconds
const CACHE_KEYS = {
    PAPER_BY_TYPE: (paperId, type) => `paper_${type}_${paperId}`,
    ALL_PAPERS: (subjectId) => `all_papers_${subjectId}`,
    PAPER_STATS: (subjectId) => `paper_stats_${subjectId}`
};

// Error handler middleware
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware
const validatePaperUpload = (req, res, next) => {
    const { name, type, category, term, year, subjectId, file } = req.body;
    if (!name || !type || !year || !subjectId || !file?.url) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    next();
};

// Cache middleware
const cacheMiddleware = (keyGenerator) => async (req, res, next) => {
    try {
        const cacheKey = keyGenerator(req);
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }
        next();
    } catch (error) {
        next(error);
    }
};

// Get all papers for a subject
router.get('/all-pastpapers-in-subject/:subjectId',
    // cacheMiddleware(req => CACHE_KEYS.ALL_PAPERS(req.params.subjectId)),
    asyncHandler(async (req, res) => {
        const { subjectId } = req.params;

        // Get all papers for the subject using PastPaperItem
        const papers = await PastPaperItem.find({ subjectId })
            .sort({ academicYear: -1, type: 1 })
            .populate([{ path: 'teachers', select: 'name email' }, { path: 'references', select: 'subjectId universityOrigin campusOrigin departmentId' }
                , { path: 'paperId', populate: { path: 'papers' } }
            ]);

        // Get the subject name
        const subject = await Subject.findById(subjectId).select('name');
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // Group papers by academic year
        const papersByYear = papers.reduce((acc, paper) => {
            const year = paper.academicYear;
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(paper);
            return acc;
        }, {});

        // Transform the data for the frontend
        const response = {
            subjectName: subject.name,
            papers: Object.entries(papersByYear).map(([year, papers]) => ({
                academicYear: parseInt(year),
                papers: papers
            })).sort((a, b) => b.academicYear - a.academicYear)
        };

        // Cache the response
        await redisClient.setex(
            CACHE_KEYS.ALL_PAPERS(subjectId),
            CACHE_TTL,
            JSON.stringify(response)
        );

        res.json(response);
    })
);

// Get papers by type for a subject
router.get('/:type/:subjectId',
    cacheMiddleware(req => CACHE_KEYS.PAPER_BY_TYPE(req.params.subjectId, req.params.type)),
    asyncHandler(async (req, res) => {
        const { type, subjectId } = req.params;

        // Get papers using the PastPaperItem model
        const papers = await PastPaperItem.findBySubjectAndType(subjectId, type);

        // Get the subject name
        const subject = await Subject.findById(subjectId).select('name');
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // Group papers by academic year
        const papersByYear = papers.reduce((acc, paper) => {
            const year = paper.academicYear;
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(paper);
            return acc;
        }, {});

        // Transform the data for the frontend
        const response = {
            subjectName: subject.name,
            papers: Object.entries(papersByYear).map(([year, papers]) => ({
                academicYear: parseInt(year),
                papers: papers
            })).sort((a, b) => b.academicYear - a.academicYear)
        };

        // Cache the response
        await redisClient.setex(
            CACHE_KEYS.PAPER_BY_TYPE(subjectId, type),
            CACHE_TTL,
            JSON.stringify(response)
        );

        res.json(response);
    })
);

// Upload new paper
router.post('/upload', validatePaperUpload, asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, type, category, term, year, subjectId, file } = req.body;
        const { userId, universityOrigin, campusOrigin, departmentId } = getUserDetails(req);

        // Create entry in PastPaperItem collection
        const pastPaperItem = new PastPaperItem({
            subjectId,
            name,
            type: type.toUpperCase(),
            category: category?.toUpperCase(),
            term: term?.toUpperCase(),
            academicYear: parseInt(year),
            teachers: [userId],
            file,
            references: {
                universityOrigin,
                campusOrigin,
                departmentId
            }
        });

        // Save the PastPaperItem
        await pastPaperItem.save({ session });

        // Find or create pastpaper document
        let pastPaper = await PastPaper.findOne({
            'references.subjectId': subjectId,
            academicYear: parseInt(year)
        }).session(session);

        if (!pastPaper) {
            pastPaper = new PastPaper({
                academicYear: parseInt(year),
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin
                },
                papers: []
            });
        }

        // Add paper reference
        pastPaper.papers.push(pastPaperItem._id);
        await pastPaper.save({ session });

        // Update or create collection reference
        let collection = await PastpapersCollectionByYear.findById(subjectId).session(session);
        if (!collection) {
            collection = new PastpapersCollectionByYear({
                _id: subjectId,
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin
                },
                pastpapers: [pastPaper._id]
            });
        } else if (!collection.pastpapers.includes(pastPaper._id)) {
            collection.pastpapers.push(pastPaper._id);
        }

        await collection.save({ session });

        // Invalidate cache
        await Promise.all([
            redisClient.del(CACHE_KEYS.PAPER_BY_TYPE(subjectId, type)),
            redisClient.del(CACHE_KEYS.ALL_PAPERS(subjectId)),
            redisClient.del(CACHE_KEYS.PAPER_STATS(subjectId))
        ]);

        await session.commitTransaction();
        res.status(201).json({
            message: 'Paper uploaded successfully',
            pastPaperItem,
            pastPaper,
            collection
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

// Get papers statistics
router.get('/stats/:subjectId',
    cacheMiddleware(req => CACHE_KEYS.PAPER_STATS(req.params.subjectId)),
    asyncHandler(async (req, res) => {
        const { subjectId } = req.params;
        const stats = await PastPaperItem.getSubjectStats(subjectId);

        // Cache the response
        await redisClient.setex(
            CACHE_KEYS.PAPER_STATS(subjectId),
            CACHE_TTL,
            JSON.stringify(stats)
        );

        res.json(stats);
    })
);

// Track paper view
router.post('/view/:paperId', asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const paper = await PastPaperItem.findById(paperId);
    if (!paper) {
        return res.status(404).json({ message: "Paper not found" });
    }
    await paper.incrementViews();
    res.json({ message: "View counted successfully" });
}));

// Track paper download
router.post('/download/:paperId', asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const paper = await PastPaperItem.findById(paperId);
    if (!paper) {
        return res.status(404).json({ message: "Paper not found" });
    }
    await paper.incrementDownloads();
    res.json({ message: "Download counted successfully" });
}));

module.exports = router;