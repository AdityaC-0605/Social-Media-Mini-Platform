const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dental_admin:akash2004@cluster0.nz99qzc.mongodb.net/SocialMedia?retryWrites=true&w=majority&tls=true';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  connectTimeoutMS: 30000, // Connection timeout
  socketTimeoutMS: 45000, // Socket timeout
})
.then(() => console.log('MongoDB Atlas connected successfully!'))
.catch(err => {
  console.error('MongoDB Atlas connection error:', err.message);
  console.error('Please check:');
  console.error('1. MongoDB Atlas cluster is running (not paused)');
  console.error('2. Network connectivity to MongoDB Atlas');
  console.error('3. IP whitelist allows your current IP');
  process.exit(1); // Exit if DB connection fails
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/chat', require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ],
    credentials: true
  }
});

const wrap = (middleware) => (socket, next) => {
  const res = {
    getHeader() { return undefined; },
    setHeader() {},
    end() {}
  };
  middleware(socket.request, res, next);
};

io.use(wrap(sessionMiddleware));

io.use(async (socket, next) => {
  try {
    const User = require('./models/User');
    const userId = socket.request.session && socket.request.session.userId;
    if (!userId) {
      return next(new Error('Authentication required'));
    }
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.user._id.toString()}`);

  socket.on('conversation:join', async ({ conversationId }) => {
    try {
      const Conversation = require('./models/Conversation');
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;
      const isMember = conversation.members.some((m) => m.equals(socket.user._id));
      if (!isMember) return;
      socket.join(`conversation:${conversationId}`);
    } catch (e) {
      return;
    }
  });

  socket.on('conversation:typing', async ({ conversationId, isTyping }) => {
    socket.to(`conversation:${conversationId}`).emit('conversation:typing', {
      conversationId,
      userId: socket.user._id,
      isTyping: Boolean(isTyping)
    });
  });

  socket.on('message:send', async ({ conversationId, body }, ack) => {
    try {
      const Conversation = require('./models/Conversation');
      const Message = require('./models/Message');

      if (!body || String(body).trim().length === 0) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Message body is required' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Conversation not found' });
        return;
      }

      const isMember = conversation.members.some((m) => m.equals(socket.user._id));
      if (!isMember) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Not authorized' });
        return;
      }

      const message = await Message.create({
        conversation: conversation._id,
        sender: socket.user._id,
        body: String(body).trim(),
        readBy: [{ user: socket.user._id, readAt: new Date() }]
      });

      conversation.lastMessageAt = new Date();
      await conversation.save();

      await message.populate('sender', 'username name profilePicture');

      io.to(`conversation:${conversationId}`).emit('message:new', { message });
      if (typeof ack === 'function') ack({ ok: true, message });
    } catch (error) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Failed to send message' });
    }
  });

  socket.on('message:read', async ({ messageId }, ack) => {
    try {
      const Conversation = require('./models/Conversation');
      const Message = require('./models/Message');

      const message = await Message.findById(messageId);
      if (!message) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Message not found' });
        return;
      }

      const conversation = await Conversation.findById(message.conversation);
      if (!conversation) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Conversation not found' });
        return;
      }

      const isMember = conversation.members.some((m) => m.equals(socket.user._id));
      if (!isMember) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Not authorized' });
        return;
      }

      const alreadyRead = message.readBy.some((r) => r.user.equals(socket.user._id));
      if (!alreadyRead) {
        message.readBy.push({ user: socket.user._id, readAt: new Date() });
        await message.save();
      }

      io.to(`conversation:${conversation._id.toString()}`).emit('message:read', {
        messageId: message._id,
        userId: socket.user._id,
        readAt: new Date()
      });

      if (typeof ack === 'function') ack({ ok: true });
    } catch (error) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Failed to mark as read' });
    }
  });
});

server.listen(PORT, 'localhost', () => {
  console.log(`Server running on port ${PORT}`);
});

