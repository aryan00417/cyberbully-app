import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 300 },
    flagged: { type: Boolean, default: false },
    category: { type: String, default: "none" }, // religion | age | gender | ethnicity | harassment_other | none
    confidence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);
