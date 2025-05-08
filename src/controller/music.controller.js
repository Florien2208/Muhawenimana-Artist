import { Music } from "../model/music.model.js";
import path from "path";
import fs from "fs";

/**
 * @desc    Create a new music entry
 * @route   POST /api/v1/music
 * @access  Private
 */
export const createMusic = async (req, res) => {
  try {
    console.log("checked");
    const { title, description, genre, is_public } = req.body;
    const audioFile = req.files?.audio_file?.[0]?.filename;
    const backgroundImage = req.files?.cover_image?.[0]?.filename;
    // console.log(req.files);
    //     console.log(req.body);
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

    // Set status based on is_public flag
    const status =
      is_public === "true" || is_public === true ? "published" : "draft";
    const publishedAt = status === "published" ? new Date() : null;

    // Create music entry
    const newMusic = await Music.create({
      title,
      description,
      audioFile,
      backgroundImage: backgroundImage || undefined,
      user: req.user.id,
      genre,
      status,
      publishedAt,
    });

    // Format response to match frontend expectations
    const formattedMusic = {
      id: newMusic._id,
      title: newMusic.title,
      description: newMusic.description,
      backgroundImage: newMusic.backgroundImage,
      status: newMusic.status,
      is_public: newMusic.status === "published",
      createdAt: newMusic.createdAt,
      play_count: 0,
      like_count: 0,
    };

    res.status(201).json(formattedMusic);
  } catch (error) {
    console.error(`Error in createMusic: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get all published music
 * @route   GET /api/v1/music
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

    // Format response to match frontend expectations
    const formattedMusic = music.map((track) => ({
      _id: track._id,
      title: track.title,
      description: track.description,
      backgroundImage: track.backgroundImage,
      play_count: track.plays,
      like_count: track.likes.length,
      is_public: track.status === "published",
      createdAt: track.createdAt,
      user: track.user,
    }));

    const total = await Music.countDocuments(query);

    res.status(200).json(formattedMusic);
  } catch (error) {
    console.error(`Error in getPublishedMusic: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get music by ID
 * @route   GET /api/v1/music/:id
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

    // Format response to match frontend expectations
    const formattedMusic = {
      _id: music._id,
      title: music.title,
      description: music.description,
      audioFile: music.audioFile,
      backgroundImage: music.backgroundImage,
      user: music.user,
      status: music.status,
      is_public: music.status === "published",
      createdAt: music.createdAt,
      publishedAt: music.publishedAt,
      genre: music.genre,
      play_count: music.plays,
      like_count: music.likes.length,
      likes: music.likes,
    };

    res.status(200).json(formattedMusic);
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
 * @route   GET /api/v1/music/user/mymusic
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

    // Format response to match frontend expectations
    const formattedMusic = music.map((track) => ({
      _id: track._id,
      title: track.title,
      description: track.description,
      backgroundImage: track.backgroundImage,
      play_count: track.plays,
      like_count: track.likes.length,
      is_public: track.status === "published",
      createdAt: track.createdAt,
      status: track.status,
    }));

    res.status(200).json(formattedMusic);
  } catch (error) {
    console.error(`Error in getMyMusic: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Update music
 * @route   PUT /api/v1/music/:id
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

    const { title, description, genre, is_public } = req.body;
    const audioFile = req.files?.audio_file?.[0]?.filename;
    const backgroundImage = req.files?.cover_image?.[0]?.filename;

    // Update fields if provided
    if (title) music.title = title;
    if (description) music.description = description;
    if (genre) music.genre = genre;

    // Handle status change if is_public flag is provided
    if (is_public !== undefined) {
      const newStatus =
        is_public === "true" || is_public === true ? "published" : "draft";

      // If changing from draft to published, update publishedAt
      if (newStatus === "published" && music.status === "draft") {
        music.publishedAt = new Date();
      }

      music.status = newStatus;
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

    // Format response to match frontend expectations
    const formattedMusic = {
      _id: updatedMusic._id,
      title: updatedMusic.title,
      description: updatedMusic.description,
      backgroundImage: updatedMusic.backgroundImage,
      status: updatedMusic.status,
      is_public: updatedMusic.status === "published",
      createdAt: updatedMusic.createdAt,
      play_count: updatedMusic.plays,
      like_count: updatedMusic.likes.length,
    };

    res.status(200).json(formattedMusic);
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
 * @route   PUT /api/v1/music/:id/publish
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

    // Format response to match frontend expectations
    const formattedMusic = {
      _id: publishedMusic._id,
      title: publishedMusic.title,
      description: publishedMusic.description,
      backgroundImage: publishedMusic.backgroundImage,
      status: publishedMusic.status,
      is_public: true,
      createdAt: publishedMusic.createdAt,
      play_count: publishedMusic.plays,
      like_count: publishedMusic.likes.length,
    };

    res.status(200).json(formattedMusic);
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
 * @route   DELETE /api/v1/music/:id
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
 * @route   PUT /api/v1/music/:id/like
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
      like_count: music.likes.length,
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
 * @route   GET /api/v1/music/admin
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

    // Format response to match frontend expectations
    const formattedMusic = music.map((track) => ({
      _id: track._id,
      title: track.title,
      description: track.description,
      backgroundImage: track.backgroundImage,
      play_count: track.plays,
      like_count: track.likes.length,
      is_public: track.status === "published",
      createdAt: track.createdAt,
      user: track.user,
    }));

    const total = await Music.countDocuments(query);

    res.status(200).json({
      music: formattedMusic,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(`Error in getAllMusic: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
