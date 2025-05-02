import { Music } from "../model/music.model.js";
import path from "path";
import fs from "fs";

/**
 * @desc    Create a new music entry (draft by default)
 * @route   POST /api/music
 * @access  Private
 */
export const createMusic = async (req, res) => {
  try {
    const { title, description, genre } = req.body;
    const audioFile = req.files?.audioFile?.[0]?.filename;
    const backgroundImage = req.files?.backgroundImage?.[0]?.filename;

    // Validate input
    if (!title || !audioFile) {
      // Remove uploaded files if validation fails
      if (audioFile) {
        fs.unlinkSync(path.join(process.cwd(), "uploads/audio", audioFile));
      }
      if (backgroundImage) {
        fs.unlinkSync(
          path.join(process.cwd(), "uploads/images", backgroundImage)
        );
      }
      return res
        .status(400)
        .json({ message: "Title and audio file are required" });
    }

    // Create music entry
    const newMusic = await Music.create({
      title,
      description,
      audioFile,
      backgroundImage: backgroundImage || undefined,
      user: req.user.id,
      genre,
      // Status defaults to "draft" from schema
    });

    res.status(201).json({
      message: "Music saved as draft",
      music: newMusic,
    });
  } catch (error) {
    console.error(`Error in createMusic: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get all published music
 * @route   GET /api/music
 * @access  Public
 */
export const getPublishedMusic = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search
      ? { $text: { $search: req.query.search } }
      : {};

    const genre = req.query.genre ? { genre: req.query.genre } : {};

    // Only get published music
    const query = {
      status: "published",
      ...search,
      ...genre,
    };

    const music = await Music.find(query)
      .populate("user", "name")
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Music.countDocuments(query);

    res.status(200).json({
      music,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(`Error in getPublishedMusic: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get music by ID
 * @route   GET /api/music/:id
 * @access  Public for published, Private for draft (owner only)
 */
export const getMusicById = async (req, res) => {
  try {
    const music = await Music.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!music) {
      return res.status(404).json({ message: "Music not found" });
    }

    // Check if music is draft and if user is the owner
    if (
      music.status === "draft" &&
      (!req.user || music.user._id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        message: "Not authorized to access this draft",
      });
    }

    // Increment plays count if music is published
    if (music.status === "published") {
      music.plays += 1;
      await music.save();
    }

    res.status(200).json(music);
  } catch (error) {
    console.error(`Error in getMusicById: ${error.message}`);

    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid music ID" });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get all music by current user (drafts and published)
 * @route   GET /api/music/mymusic
 * @access  Private
 */
export const getMyMusic = async (req, res) => {
  try {
    const status = req.query.status;
    const query = { user: req.user.id };

    // If status filter is provided
    if (status && ["draft", "published"].includes(status)) {
      query.status = status;
    }

    const music = await Music.find(query).sort({ createdAt: -1 });

    res.status(200).json(music);
  } catch (error) {
    console.error(`Error in getMyMusic: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Update music
 * @route   PUT /api/music/:id
 * @access  Private (owner or admin)
 */
export const updateMusic = async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);

    if (!music) {
      return res.status(404).json({ message: "Music not found" });
    }

    // Check ownership or admin role
    if (music.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, description, genre, status } = req.body;
    const audioFile = req.files?.audioFile?.[0]?.filename;
    const backgroundImage = req.files?.backgroundImage?.[0]?.filename;

    // Update fields if provided
    music.title = title || music.title;
    music.description = description || music.description;
    music.genre = genre || music.genre;

    // Handle status change from draft to published
    if (status && status === "published" && music.status === "draft") {
      music.status = "published";
      music.publishedAt = new Date();
    }

    // Handle audio file update
    if (audioFile) {
      // Delete old audio file
      if (music.audioFile) {
        const oldFilePath = path.join(
          process.cwd(),
          "uploads/audio",
          music.audioFile
        );
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      music.audioFile = audioFile;
    }

    // Handle background image update
    if (backgroundImage) {
      // Delete old image if it's not the default
      if (
        music.backgroundImage &&
        music.backgroundImage !== "default-music-background.jpg"
      ) {
        const oldImagePath = path.join(
          process.cwd(),
          "uploads/images",
          music.backgroundImage
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      music.backgroundImage = backgroundImage;
    }

    const updatedMusic = await music.save();

    res.status(200).json({
      message: "Music updated successfully",
      music: updatedMusic,
    });
  } catch (error) {
    console.error(`Error in updateMusic: ${error.message}`);

    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid music ID" });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Publish music (change status from draft to published)
 * @route   PUT /api/music/:id/publish
 * @access  Private (owner or admin)
 */
export const publishMusic = async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);

    if (!music) {
      return res.status(404).json({ message: "Music not found" });
    }

    // Check ownership or admin role
    if (music.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Check if music is already published
    if (music.status === "published") {
      return res.status(400).json({ message: "Music is already published" });
    }

    // Update status to published
    music.status = "published";
    music.publishedAt = new Date();

    const publishedMusic = await music.save();

    res.status(200).json({
      message: "Music published successfully",
      music: publishedMusic,
    });
  } catch (error) {
    console.error(`Error in publishMusic: ${error.message}`);

    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid music ID" });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Delete music
 * @route   DELETE /api/music/:id
 * @access  Private (owner or admin)
 */
export const deleteMusic = async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);

    if (!music) {
      return res.status(404).json({ message: "Music not found" });
    }

    // Check ownership or admin role
    if (music.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Delete associated files
    if (music.audioFile) {
      const audioPath = path.join(
        process.cwd(),
        "uploads/audio",
        music.audioFile
      );
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }

    if (
      music.backgroundImage &&
      music.backgroundImage !== "default-music-background.jpg"
    ) {
      const imagePath = path.join(
        process.cwd(),
        "uploads/images",
        music.backgroundImage
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Music.deleteOne({ _id: music._id });

    res.status(200).json({ message: "Music deleted successfully" });
  } catch (error) {
    console.error(`Error in deleteMusic: ${error.message}`);

    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid music ID" });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Like or unlike music
 * @route   PUT /api/music/:id/like
 * @access  Private
 */
export const toggleLike = async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);

    if (!music) {
      return res.status(404).json({ message: "Music not found" });
    }

    // Check if music is published
    if (music.status !== "published") {
      return res.status(400).json({ message: "Cannot like unpublished music" });
    }

    // Check if user already liked the music
    const isLiked = music.likes.includes(req.user.id);

    if (isLiked) {
      // Unlike: Remove user ID from likes array
      music.likes = music.likes.filter(
        (userId) => userId.toString() !== req.user.id
      );
    } else {
      // Like: Add user ID to likes array
      music.likes.push(req.user.id);
    }

    await music.save();

    res.status(200).json({
      message: isLiked ? "Music unliked" : "Music liked",
      likes: music.likes.length,
    });
  } catch (error) {
    console.error(`Error in toggleLike: ${error.message}`);

    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid music ID" });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get all music (admin access)
 * @route   GET /api/music/admin
 * @access  Private/Admin
 */
export const getAllMusic = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const status = req.query.status;
    const userId = req.query.userId;

    const query = {};

    // If status filter is provided
    if (status && ["draft", "published"].includes(status)) {
      query.status = status;
    }

    // If user filter is provided
    if (userId) {
      query.user = userId;
    }

    const music = await Music.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Music.countDocuments(query);

    res.status(200).json({
      music,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(`Error in getAllMusic: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
