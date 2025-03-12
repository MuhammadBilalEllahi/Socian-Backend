const mongoose = require("mongoose");
const Campus = require("../campus.university.model");
const { Schema } = mongoose;

// Main PastPaper Schema
const pastpaperSchema = new Schema({
    academicYear: {
        type: Number,
        required: true,
        index: true
    },
    papers: [{ type: Schema.Types.ObjectId, ref: 'PastPaperItem' }],
    references: {
        universityOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'University',
            required: true,
            index: true
        },
        campusOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'Campus',
            required: true,
            index: true
        },
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
            index: true
        }
    },
    stats: {
        totalPapers: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
    }
}, {
    timestamps: true,
    // Add compound indexes for common queries
    indexes: [
        { 'references.subjectId': 1, academicYear: -1 },
        { 'references.campusOrigin': 1, 'references.subjectId': 1 },
        { academicYear: 1, 'references.subjectId': 1 }
    ]
});

// Pre-save middleware to update stats
pastpaperSchema.pre('save', async function (next) {
    try {
        // Update total papers count
        this.stats.totalPapers = this.papers.length;
        this.stats.lastUpdated = new Date();

        // Validate academic format
        const campus = await Campus.findById(this.references.campusOrigin)
            .populate('academic.FormatId')
            .select('academic.FormatId');

        if (!campus || !campus.academic.FormatId) {
            throw new Error('Campus academic format not found');
        }

        // Validate paper types based on campus format
        const allowedType = campus.academic.FormatId.formatType;
        const hasInvalidPapers = this.papers.some(paper => {
            if (allowedType === 'MIDTERM' && paper.type === 'SESSIONAL') return true;
            if (allowedType === '2_SESSIONAL' && paper.type === 'MIDTERM') return true;
            return false;
        });

        if (hasInvalidPapers) {
            throw new Error(`Only ${allowedType} papers are allowed for this campus`);
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Methods for common operations
pastpaperSchema.methods = {
    async addPaper(paperData) {
        this.papers.push(paperData);
        this.stats.lastUpdated = new Date();
        return this.save();
    },

    async getPapersByType(type, year) {
        return this.papers.filter(p => p.type === type && (!year || p.year === year));
    },

    async getPapersByYear(year) {
        return this.papers.filter(p => p.year === year);
    }
};

// Static methods for querying
pastpaperSchema.statics = {
    async findBySubject(subjectId) {
        return this.find({ 'references.subjectId': subjectId })
            .sort({ academicYear: -1 });
    },

    async findByYearAndType(subjectId, year, type) {
        return this.findOne({
            'references.subjectId': subjectId,
            academicYear: year,
            'papers.type': type
        });
    }
};

// Collection by Year Schema
const pastpapersCollectionByYearSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Subject",
        index: true
    },
    references: {
        universityOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'University',
            required: true,
            index: true
        },
        campusOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'Campus',
            required: true,
            index: true
        },
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
            index: true
        }
    },
    pastpapers: [{
        type: Schema.Types.ObjectId,
        ref: 'PastPaper'
    }],
    stats: {
        totalPapers: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
    }
}, {
    timestamps: true,
    indexes: [
        { 'references.subjectId': 1 },
        { 'references.campusOrigin': 1, 'references.subjectId': 1 }
    ]
});

// Pre-save middleware to update stats and set _id
pastpapersCollectionByYearSchema.pre('save', function (next) {
    if (!this._id) {
        this._id = this.references.subjectId;
    }
    this.stats.totalPapers = this.pastpapers.length;
    this.stats.lastUpdated = new Date();
    next();
});

const PastPaper = mongoose.model("PastPaper", pastpaperSchema);

const PastpapersCollectionByYear = mongoose.model("PastpapersCollectionByYear", pastpapersCollectionByYearSchema);

module.exports = { PastPaper, PastpapersCollectionByYear };



