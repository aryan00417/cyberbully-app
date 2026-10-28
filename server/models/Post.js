import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "", maxlength: 500 },
    image: { type: String, default: null }, // base64 data URL
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    flagged: { type: Boolean, default: false },
    category: { type: String, default: "none" },
    confidence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);