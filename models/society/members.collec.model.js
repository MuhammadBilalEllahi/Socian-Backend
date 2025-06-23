const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

const membersSchema = new Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Society",
    // required: true,
  },

  subSocietyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubSociety",
    // required: true,
  },

  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
});



const Members = mongoose.model("Members", membersSchema);
module.exports = Members;
