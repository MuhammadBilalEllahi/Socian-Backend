// models/nonUniversityEmail.model.js
const mongoose = require('mongoose');

const nonUniversityEmailSchema = new mongoose.Schema({
    email: { type: String, default: '' },
    sub: { type: String, default: '' },
    name: { type: String, default: '' },
    given_name: { type: String, default: '' },
    family_name: { type: String, default: '' },
    picture: { type: String, default: '' },
    email_verified: { type: Boolean, default: false },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('NonUniversityEmail', nonUniversityEmailSchema);