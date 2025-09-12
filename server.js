const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Make upload available to routes
app.upload = upload;

// CORS Middleware - MUST be before all routes
const allowedOrigins = [
  'http://localhost:3000', 
  'http://127.0.0.1:3000',
  'https://mood-front.vercel.app', // Frontend production URL
  process.env.FRONTEND_URL // Allow custom frontend URL from environment
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Routes
app.use('/api/auth', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/auth`);
});
