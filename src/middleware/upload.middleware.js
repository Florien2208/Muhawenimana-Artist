import multer from "multer";
import path from "path";
import fs from "fs";

// Create directories if they don't exist
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create required directories
const audioUploadDir = path.join(process.cwd(), "uploads/audio");
const imageUploadDir = path.join(process.cwd(), "uploads/images");
createDir(audioUploadDir);
createDir(imageUploadDir);

// Audio file storage configuration
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `music-${uniqueSuffix}${ext}`);
  },
});

// Image file storage configuration
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  },
});

// File filter for audio files
const audioFilter = (req, file, cb) => {
  const allowedTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid audio file type. Only MP3, WAV, OGG, FLAC, and AAC are allowed."
      ),
      false
    );
  }
};

// File filter for image files
const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid image file type. Only JPG, PNG, and WebP are allowed."
      ),
      false
    );
  }
};

// Set up Multer for audio files
const audioUpload = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max size
});

// Set up Multer for image files
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max size
});

// Middleware to handle file uploads
export const uploadMusicFiles = (req, res, next) => {
  const upload = multer().fields([
    { name: "audioFile", maxCount: 1 },
    { name: "backgroundImage", maxCount: 1 },
  ]);

  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred
      return res.status(500).json({ message: `Server error: ${err.message}` });
    }

    try {
      // Process audio file if uploaded
      if (req.files.audioFile) {
        const audioFile = req.files.audioFile[0];
        const result = await processAudioFile(audioFile);
        req.files.audioFile[0] = result;
      }

      // Process image file if uploaded
      if (req.files.backgroundImage) {
        const imageFile = req.files.backgroundImage[0];
        const result = await processImageFile(imageFile);
        req.files.backgroundImage[0] = result;
      }

      next();
    } catch (error) {
      return res
        .status(500)
        .json({ message: `File processing error: ${error.message}` });
    }
  });
};

// Process audio file (save to disk with proper validation)
const processAudioFile = async (file) => {
  if (!audioFilter({}, file, () => {})) {
    throw new Error("Invalid audio file type");
  }

  const filename = `music-${Date.now()}-${Math.round(
    Math.random() * 1e9
  )}${path.extname(file.originalname)}`;
  const filePath = path.join(audioUploadDir, filename);

  await fs.promises.writeFile(filePath, file.buffer);

  return {
    ...file,
    filename: filename,
  };
};

// Process image file (save to disk with proper validation)
const processImageFile = async (file) => {
  if (!imageFilter({}, file, () => {})) {
    throw new Error("Invalid image file type");
  }

  const filename = `image-${Date.now()}-${Math.round(
    Math.random() * 1e9
  )}${path.extname(file.originalname)}`;
  const filePath = path.join(imageUploadDir, filename);

  await fs.promises.writeFile(filePath, file.buffer);

  return {
    ...file,
    filename: filename,
  };
};
