// models/ModUserCollection.js
import mongoose from "mongoose";

const modUserCollectionSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
  },
  nowModUsers: [
    {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModUser',
  }
  ],
  prevModUsers: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      startTime: { type: Date },
      predefinedEndTime: {type:Date},
      endTime: { type: Date },
    },
  ],
});

export default mongoose.model("ModUserCollection", modUserCollectionSchema);
