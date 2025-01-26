const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const allUniversitySchema = new Schema({
  name: {
    // only one entry. in this all universities with their campuses will be aavailable
    type: String,
    required: true,
  },
  universities: [
    {
      name: String,
      location: String,
      type: Schema.ObjectId,
      ref: "University",
    },
  ],

  allSocities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
    },
  ],
  allSubSocities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubSociety",
    },
  ],
});

const AllUniversity = mongoose.model("AllUniversity", allUniversitySchema);

module.exports = AllUniversity;
