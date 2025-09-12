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
// Simplified CORS configuration that always works
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow all origins for now (can be restricted later)
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('CORS: Allowing origin:', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
    console.log('CORS: Allowing all origins (no origin header)');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS: Handling preflight request for:', req.url);
    res.status(200).end();
    return;
  }
  
  next();
});

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
