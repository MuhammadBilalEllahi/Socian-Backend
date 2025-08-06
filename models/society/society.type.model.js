import mongoose from "mongoose";
const Schema = mongoose.Schema;

const societyTypeSchema = new Schema({
  societyType: {
    type: String,
    enum: ["public", "private", "restricted"],
    unique: true,
    required: true,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
});

const SocietyType = mongoose.model("SocietyType", societyTypeSchema);
export default SocietyType;
