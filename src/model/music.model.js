import mongoose from "mongoose";

const musicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Music title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    audioFile: {
      type: String,
      required: [true, "Audio file is required"],
    },
    backgroundImage: {
      type: String,
      default: "default-music-background.jpg",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    genre: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    plays: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add text index for search functionality
musicSchema.index({ title: "text", description: "text" });

export const Music = mongoose.model("Music", musicSchema);
