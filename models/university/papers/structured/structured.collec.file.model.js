
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const structuredQuestionCollectionSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, required: true, ref: 'PastPaperItem' },
    isDeleted: { type: Boolean, default: false },
    structuredQuestions: [{ type: Schema.Types.ObjectId, ref: 'StructuredQuestion' }],
}, { timestamps: true, _id: false, });

const StructuredQuestionCollection = mongoose.model('StructuredQuestionCollection', structuredQuestionCollectionSchema);
export default StructuredQuestionCollection;
