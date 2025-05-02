# Music Posting API

A robust Node.js/Express API for music uploading, management, and sharing with draft/publish workflow.

## Features

- **Complete User Authentication** with JWT
- **Music Upload & Management**
  - Upload audio files with metadata (title, description, genre)
  - Custom background images
  - Draft/publish workflow
  - Play count tracking and likes
- **Role-Based Access Control**
  - User permissions for own content
  - Admin capabilities for all content
- **Advanced Search & Filtering**
  - Text search on title/description
  - Genre filtering
  - Pagination support

## Tech Stack

- Node.js & Express
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login user |
| GET | `/api/users/profile` | Get user profile |

### Music (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/music` | Get all published music |
| GET | `/api/music/:id` | Get specific music |

### Music (User)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/music` | Create music (draft) |
| GET | `/api/music/user/mymusic` | Get my music |
| PUT | `/api/music/:id` | Update my music |
| PUT | `/api/music/:id/publish` | Publish my music |
| DELETE | `/api/music/:id` | Delete my music |
| PUT | `/api/music/:id/like` | Like/unlike music |

### Music (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/music/admin/all` | Get all music |
| PUT | `/api/music/:id` | Update any music |
| DELETE | `/api/music/:id` | Delete any music |

## Quick Start

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/music-posting-api.git
   cd music-posting-api
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   JWT_EXPIRES_IN=30d
   ```

4. Run the server
   ```bash
   npm start
   ```

## File Upload Specifications

- **Audio**: MP3, WAV, OGG, FLAC, AAC (Max: 20MB)
- **Images**: JPG, PNG, WebP (Max: 5MB)

## Project Structure

```
├── controllers/       # Route controllers
├── middleware/        # Custom middleware
├── models/           # Mongoose models
├── routes/           # API routes
├── uploads/          # Uploaded files
│   ├── audio/        # Audio files
│   └── images/       # Image files
├── utils/            # Utility functions
├── .env              # Environment variables
├── package.json      # Dependencies
└── server.js         # Entry point
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- File type validation
- Ownership verification for operations
- Admin role protection

## License

MIT

## Author

Your Name