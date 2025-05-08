import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directories exist
const createDirs = () => {
  const audioDir = path.join(process.cwd(), "uploads/audio");
  const imageDir = path.join(process.cwd(), "uploads/images");

  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }
};

createDirs();

// Configure storage for audio files
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "audio_file") {
      cb(null, path.join(process.cwd(), "uploads/audio"));
    } else if (file.fieldname === "cover_image") {
      cb(null, path.join(process.cwd(), "uploads/images"));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === "audio_file" ? "audio" : "image";
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "audio_file") {
    // Audio file filter
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/x-m4a",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid audio file format. Supported formats: MP3, WAV, OGG, M4A"
        )
      );
    }
  } else if (file.fieldname === "cover_image") {
    // Image file filter
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid image format. Supported formats: JPG, PNG, WEBP"));
    }
  } else {
    cb(new Error("Unexpected field"));
  }
};

// Set up multer for music files
const upload = multer({
  storage: audioStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for audio files
  },
});

// Middleware to handle file uploads for music
export const uploadMusicFiles = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: "audio_file", maxCount: 1 },
    { name: "cover_image", maxCount: 1 },
  ]);

  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    // Log the uploaded files for debugging
    console.log("Uploaded files:", req.files);

    next();
  });
};
