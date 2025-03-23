const { Schema } = require("mongoose");
const mongoose = require("mongoose");
const PastPaperItem = require("./pastpaper.item.model");


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
const PastpapersCollectionByYear = mongoose.model("PastpapersCollectionByYear", pastpapersCollectionByYearSchema);

module.exports = { PastpapersCollectionByYear };
