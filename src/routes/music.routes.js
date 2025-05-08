import express from "express";
import {
  createMusic,
  getPublishedMusic,
  getMusicById,
  getMyMusic,
  updateMusic,
  publishMusic,
  deleteMusic,
  toggleLike,
  getAllMusic,
} from "../controller/music.controller.js";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import { uploadMusicFiles } from "../middleware/upload.middleware.js";

const MusicRouter = express.Router();

// Public routes
MusicRouter.get("/", getPublishedMusic);
MusicRouter.get("/:id", getMusicById);

// Protected routes
MusicRouter.post("/", protect, uploadMusicFiles, createMusic);
MusicRouter.get("/user/mymusic", protect, getMyMusic);
MusicRouter.put("/:id", protect, uploadMusicFiles, updateMusic);
MusicRouter.put("/:id/publish", protect, publishMusic);
MusicRouter.delete("/:id", protect, deleteMusic);
MusicRouter.put("/:id/like", protect, toggleLike);

// Admin routes
MusicRouter.get("/admin/all", protect, isAdmin, getAllMusic);

export default MusicRouter;
