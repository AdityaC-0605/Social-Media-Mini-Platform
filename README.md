# Social Media Mini Platform

A full-stack social media platform built with React (frontend) and Node.js + Express + MongoDB (backend).

## Features

- **User Authentication**: Register, login, and session management
- **News Feed**: View posts from users you follow
- **Post Creation**: Create text posts with optional image uploads
- **Like System**: Like and unlike posts
- **Comments**: Add and delete comments on posts
- **Follow System**: Follow and unfollow other users
- **Notifications**: Real-time notifications for likes, comments, and follows
- **User Profiles**: View user profiles with posts, followers, and following lists
- **Search**: Search for users by username or email

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Express Session for authentication
- Multer for file uploads
- bcryptjs for password hashing

### Frontend
- React
- React Router for navigation
- Axios for API calls
- React Icons for icons

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (recommended) or local MongoDB

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory (MongoDB Atlas connection already configured):
```bash
PORT=5000
MONGODB_URI=mongodb+srv://dental_admin:akash2004@cluster0.nz99qzc.mongodb.net/SocialMedia?retryWrites=true&w=majority&tls=true
JWT_SECRET=your_secret_key_here
SESSION_SECRET=your_session_secret_here
NODE_ENV=development
```

4. The app is configured to use MongoDB Atlas (no local MongoDB setup needed)
   - Backend runs on port 5000

5. Start the backend server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. Start MongoDB (if running locally)
2. Start the backend server (`cd backend && npm start`)
3. Start the frontend server (`cd frontend && npm start`)
4. Open `http://localhost:3000` in your browser
5. Register a new account or login
6. Start creating posts, following users, and interacting!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Posts
- `GET /api/posts/feed` - Get news feed (posts from followed users)
- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get a single post
- `POST /api/posts` - Create a new post
- `POST /api/posts/:id/like` - Like/unlike a post
- `DELETE /api/posts/:id` - Delete a post

### Comments
- `POST /api/comments` - Create a comment
- `GET /api/comments/post/:postId` - Get comments for a post
- `DELETE /api/comments/:id` - Delete a comment

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/:id/follow` - Follow/unfollow a user
- `GET /api/users/search/:query` - Search users

### Notifications
- `GET /api/notifications` - Get all notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

## Project Structure

```
social_media/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth and upload middleware
│   ├── uploads/         # Uploaded images
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── App.js       # Main app component
│   │   └── index.js     # Entry point
│   └── public/          # Static files
└── README.md
```

## URLs
- **Backend API**: http://localhost:5000
- **Frontend App**: http://localhost:3000

## Notes

- Images are stored locally in `backend/uploads/`
- Session-based authentication is used
- CORS is configured to allow requests from `http://localhost:3000`
- The app is configured to use MongoDB Atlas

