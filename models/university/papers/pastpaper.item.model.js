const mongoose = require("mongoose");
const { Schema } = mongoose;

// File Schema
const fileSchema = new Schema({
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
});

// PastPaperItem Schema - Optimized for querying
const pastPaperItemSchema = new Schema({
    paperId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "PastPaper",
        index: true
    },
    subjectId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Subject",
        index: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL', 'SESSIONAL'],
        index: true
    },
    sessionType: {
        type: String,
        enum: ['1', '2'],
        required: function () {
            return this.type === 'SESSIONAL';
        }
    },
    category: {
        type: String,
        enum: ['LAB', 'THEORY'],
        index: true
    },
    term: {
        type: String,
        enum: ['FALL', 'SPRING'],
        // required: function () {
        //     return this.type === 'MIDTERM' || this.type === 'FINAL';
        // },
        index: true
    },
    academicYear: {
        type: Number,
        required: true,
        index: true
    },
    teachers: [{
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        index: true
    }],
    file: fileSchema,
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
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            required: true,
            index: true
        }
    },
    metadata: {
        views: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 },
        lastAccessed: { type: Date, default: Date.now }
    }
}, {
    timestamps: true,
    // Add compound indexes for common query patterns
    indexes: [
        { academicYear: 1, type: 1 },
        { subjectId: 1, type: 1 },
        { subjectId: 1, academicYear: 1 },
        { 'references.departmentId': 1, type: 1 },
        { 'references.campusOrigin': 1, type: 1 },
        { academicYear: 1, type: 1, subjectId: 1 }
    ]
});

// Methods for querying
pastPaperItemSchema.statics = {
    // Find papers by subject and type
    async findBySubjectAndType(subjectId, type) {
        return this.find({
            subjectId,
            type: type.toUpperCase()
        }).sort({ academicYear: -1 });
    },

    // Find papers by subject and year
    async findBySubjectAndYear(subjectId, year) {
        return this.find({
            subjectId,
            academicYear: year
        }).sort({ type: 1 });
    },

    // Find papers by department
    async findByDepartment(departmentId) {
        return this.find({
            'references.departmentId': departmentId
        }).sort({ academicYear: -1 });
    },

    // Get papers statistics
    async getSubjectStats(subjectId) {
        return this.aggregate([
            { $match: { subjectId } },
            {
                $group: {
                    _id: {
                        type: '$type',
                        sessionType: '$sessionType'
                    },
                    count: { $sum: 1 },
                    totalViews: { $sum: '$metadata.views' },
                    totalDownloads: { $sum: '$metadata.downloads' }
                }
            },
            {
                $project: {
                    _id: 0,
                    type: '$_id.type',
                    sessionType: '$_id.sessionType',
                    count: 1,
                    totalViews: 1,
                    totalDownloads: 1
                }
            }
        ]);
    }
};

// Methods for updating metadata
pastPaperItemSchema.methods = {
    async incrementViews() {
        this.metadata.views += 1;
        this.metadata.lastAccessed = new Date();
        return this.save();
    },

    async incrementDownloads() {
        this.metadata.downloads += 1;
        this.metadata.lastAccessed = new Date();
        return this.save();
    }
};

const PastPaperItem = mongoose.model("PastPaperItem", pastPaperItemSchema);

module.exports = PastPaperItem; 