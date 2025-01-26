const mongoose = require("mongoose");
const { Schema, model } = mongoose.Schema;

const schema = new Schema({});

const ExtOrg = model("ExtOrg");
module.exports = ExtOrg;
