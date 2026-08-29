require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db/db'); // Point to the db/db.js connection pool
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { auth: authenticateToken, isAdmin } = require('./authMiddleware');

// Route and Controller Imports
const authController = require('./public/src/controller/authController');
const userController = require('./public/src/controller/userController');
const eventController = require('./public/src/controller/eventController');
const timetableSwapController = require('./public/src/controller/timetableSwapController');
const teacherRoutes = require('./public/src/routes/teacherRoutes');
const authRoutes = require('./public/src/routes/authRoutes');
const learnerRoutes = require('./public/src/routes/learnerRoutes');
const parentRoutes = require('./public/src/routes/parentRoutes');
const otherRoutes = require('./public/src/routes/otherRoutes');
const applicationRoutes = require('./public/src/routes/applicationRoutes');
const notificationRoutes = require('./public/src/routes/notificationRoutes');
const initApplicationTables = require('./db/init_applications');
const NotificationService = require('./public/src/services/notificationService');

const app = express();
app.set('trust proxy', 1); // Enable proxy trust for Render / reverse proxies

const PORT = process.env.PORT || 4000;
const IP = process.env.IP || 'localhost';  // Network IP or fallback to localhost

// Ensure upload directories exist
const uploadDir = 'uploads/textbooks/';
const pfpDir = 'uploads/pfp/';
const appUploadDir = 'uploads/applications/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(pfpDir)) fs.mkdirSync(pfpDir, { recursive: true });
if (!fs.existsSync(appUploadDir)) fs.mkdirSync(appUploadDir, { recursive: true });

// Initialize all 40 database tables, multi-parent, and notification schemas on server startup
const initializeAllDatabaseTables = require('./db/init_full_schema');
const runAllTables = require('./db/verify_and_run_all_tables');
const { fixAllUserPasswords } = require('./db/fix_all_user_passwords');
(async () => {
  try {
    await initializeAllDatabaseTables();
    await runAllTables();
    await initApplicationTables();
    await NotificationService.initSchema();
    await fixAllUserPasswords();
    console.log('[DB BOOTSTRAP] All database tables and schemas verified successfully.');
  } catch (err) {
    console.error('[DB BOOTSTRAP] Initialization error:', err.message);
  }
})();

const normalizePayload = require('./public/src/middleware/normalizePayload');

// Configure Multer for profile picture storage with security limits
const pfpStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/pfp/'),
  filename: (req, file, cb) => cb(null, `${req.user ? req.user.id : 'user'}-${Date.now()}${path.extname(file.originalname)}`)
});
const uploadPfp = multer({ 
  storage: pfpStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed for profile pictures.'));
    }
  }
});

// Configure Multer for chat message attachments (images, voice notes, documents)
const msgUploadDir = 'uploads/messages/';
if (!fs.existsSync(msgUploadDir)) fs.mkdirSync(msgUploadDir, { recursive: true });

const messageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'documents';
    const m = (file.mimetype || '').toLowerCase();
    if (m.startsWith('image/')) subfolder = 'images';
    else if (m.startsWith('audio/') || m.includes('ogg') || m.includes('webm') || m.includes('mp4') || m.includes('wav')) subfolder = 'voice';
    const targetDir = path.join('uploads', 'messages', subfolder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ((file.mimetype || '').startsWith('audio/') ? '.webm' : '');
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${req.user ? req.user.id : 'user'}-${Date.now()}-${cleanBase}${ext}`);
  }
});

const uploadChatMessage = multer({
  storage: messageStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Flexible for local dev and embedded icons
  crossOriginEmbedderPolicy: false
}));

// Rate Limiters (configured with validate.xForwardedForHeader = false for reverse proxy compatibility)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 auth attempts per 15 minutes
  message: { error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 minutes
  message: { error: 'API rate limit exceeded. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false }
});

app.use('/api/login', authLimiter);
app.use('/api/forgot-password', authLimiter);
app.use('/api/verify-otp', authLimiter);
app.use('/api/reset-password', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/', apiLimiter);

// General Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(normalizePayload);

// Serve client build if available (production SPA)
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/uploads', express.static('uploads'));
app.use('/downloads', express.static(path.join(__dirname, 'public', 'downloads')));

// Comprehensive System Documentation Download Endpoint
app.get('/api/documentation/download', (req, res) => {
  const pdfPath = path.join(__dirname, 'public', 'downloads', 'Fusion_High_System_Architecture_and_Development_Documentation.pdf');
  if (fs.existsSync(pdfPath)) {
    res.download(pdfPath, 'Fusion_High_System_Architecture_and_Development_Documentation.pdf');
  } else {
    res.status(404).json({ error: 'System documentation PDF not found.' });
  }
});

// Auth & Profile
app.use('/api', authRoutes);
app.get('/api/profile', authenticateToken, userController.getProfile);
app.put('/api/profile', authenticateToken, userController.updateProfile);
app.post('/api/profile/picture', authenticateToken, uploadPfp.single('profilePicture'), userController.uploadProfilePicture);
app.post('/api/messages/read', authenticateToken, userController.markMessagesAsRead);
app.get('/api/messages/unread-count', authenticateToken, userController.getUnreadMessageCount);
app.get('/api/messages/contacts', authenticateToken, userController.getCommunicationContacts);
app.get('/api/messages/conversation/:recipientId', authenticateToken, userController.getConversationHistory);
app.get('/api/messages', authenticateToken, userController.getMessages);
app.post('/api/messages', authenticateToken, userController.sendMessage);
app.post('/api/messages/upload', authenticateToken, uploadChatMessage.single('file'), userController.uploadMessageAttachment);
app.post('/api/change-password', authenticateToken, userController.changePassword);

// Calendar Events Endpoints
app.get('/api/events', authenticateToken, eventController.getEvents);
app.post('/api/events', authenticateToken, eventController.createEvent);
app.post('/api/events/sync-dbe', authenticateToken, eventController.syncOfficialCalendar);
app.put('/api/events/:id', authenticateToken, eventController.updateEvent);
app.delete('/api/events/:id', authenticateToken, eventController.deleteEvent);

// Timetable Slot Swap Endpoints
app.post('/api/teacher/timetable/swap-request', authenticateToken, timetableSwapController.createSwapRequest);
app.get('/api/teacher/timetable/swap-requests', authenticateToken, timetableSwapController.getSwapRequests);
app.post('/api/teacher/timetable/swap-requests/:id/respond', authenticateToken, timetableSwapController.respondToSwapRequest);


// Import and use route modules
app.use('/api/teacher', teacherRoutes);
app.use('/api/learner', learnerRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/ptc', require('./public/src/routes/ptcRoutes'));
app.use('/api/conduct', require('./public/src/routes/conductRoutes'));
app.use('/api/exam-seating', require('./public/src/routes/examSeatingRoutes'));
app.use('/api/extracurricular', require('./public/src/routes/extracurricularRoutes'));
app.use('/api/textbooks', require('./public/src/routes/textbookRoutes'));
app.use('/api/leave-relief', require('./public/src/routes/leaveReliefRoutes'));
app.use('/api/matric-analytics', require('./public/src/routes/matricAnalyticsRoutes'));
app.use('/api/applications', applicationRoutes);
app.use('/api/finance', require('./public/src/routes/financeRoutes'));
app.use('/api/bursaries', require('./public/src/routes/bursaryRoutes'));
app.use('/api/assignments', require('./public/src/routes/assignmentRoutes'));
app.use('/api', otherRoutes); // For progress, announcements etc.

// Admin Routes (now imported from adminRoutes.js)
app.use('/api/admin', require('./public/src/routes/adminRoutes.js'));
app.use('/api/schools', require('./public/src/routes/schoolRoutes'));



// Serve dashboard index & legacy static fallbacks
// Auth Page Routes
app.get('/', (req, res) => {
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  res.sendFile(__dirname + '/public/auth/index.html');
});

app.get('/register', (req, res) => {
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  res.sendFile(__dirname + '/public/auth/registrationForm.html');
});

app.get('/forgot-password', (req, res) => {
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  res.sendFile(__dirname + '/public/auth/ForgotPassword.html');
});

// Serve dashboard index
app.get('/dashboard/:role', (req, res) => {
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  const role = req.params.role;
  const fileName = role.toLowerCase().endsWith('.html') ? role : `${role}.html`;
  res.sendFile(path.join(__dirname, 'public', 'dashboards', fileName));
});

// Health check endpoint for Render/Cloud load balancers
app.get('/healthz', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'healthy', uptime: process.uptime() }));

// SPA Catch-all route (supports React Router client-side routes)
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const spaIndex = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(spaIndex)) {
    return res.sendFile(spaIndex);
  }
  const authIndex = path.join(__dirname, 'public', 'auth', 'index.html');
  if (fs.existsSync(authIndex)) {
    return res.sendFile(authIndex);
  }
  res.status(200).send('Fusion High School Management System backend is active.');
});

const http = require('http');
const https = require('https');
const selfsigned = require('selfsigned');

const isProduction = process.env.NODE_ENV === 'production';

let sslOptions = null;
if (!isProduction) {
  try {
    const sslDir = path.join(__dirname, '.ssl');
    if (!fs.existsSync(sslDir)) fs.mkdirSync(sslDir, { recursive: true });

    const certPath = path.join(sslDir, 'cert.pem');
    const keyPath = path.join(sslDir, 'key.pem');

    const certValid = fs.existsSync(certPath) && fs.statSync(certPath).size > 0;
    const keyValid = fs.existsSync(keyPath) && fs.statSync(keyPath).size > 0;

    if (!certValid || !keyValid) {
      const attrs = [
        { name: 'commonName', value: 'FusionHighApp' },
        { name: 'organizationName', value: 'Fusion High School' }
      ];
      const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });
      const certData = pems.cert || pems.certificate;
      const keyData = pems.private || pems.key || pems.clientprivate;

      if (certData && keyData) {
        fs.writeFileSync(certPath, certData);
        fs.writeFileSync(keyPath, keyData);
      }
    }

    if (fs.existsSync(certPath) && fs.existsSync(keyPath) && fs.statSync(certPath).size > 0 && fs.statSync(keyPath).size > 0) {
      sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
    }
  } catch (sslErr) {
    console.warn('[SSL] Could not initialize local HTTPS certificate:', sslErr.message);
  }
}

const httpServer = http.createServer(app);
let retryCount = 0;
const MAX_RETRIES = 2;

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.warn(`[SERVER] Port ${PORT} is currently busy. Retrying in 1s (${retryCount}/${MAX_RETRIES})...`);
      setTimeout(() => {
        try {
          httpServer.close();
        } catch {}
        httpServer.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.warn(`[SERVER] Port ${PORT} is already running. Exiting retry loop.`);
      process.exit(0);
    }
  } else {
    console.error('[SERVER ERROR]', err);
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running successfully!`);
  console.log(`- Listening on 0.0.0.0:${PORT}`);
  console.log(`- HTTP Local:     http://localhost:${PORT}`);
});

let httpsServer = null;
if (sslOptions && !isProduction) {
  const HTTPS_PORT = process.env.HTTPS_PORT || (parseInt(PORT, 10) + 1);
  httpsServer = https.createServer(sslOptions, app);
  httpsServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[SSL WARNING] HTTPS Port ${HTTPS_PORT} is in use.`);
    }
  });
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`- Local HTTPS (Camera Enabled): https://localhost:${HTTPS_PORT}`);
  });
}

const gracefulShutdown = () => {
  try {
    httpServer.close(() => {
      if (httpsServer) httpsServer.close(() => process.exit(0));
      else process.exit(0);
    });
  } catch {
    process.exit(0);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.once('SIGUSR2', () => {
  try {
    httpServer.close(() => {
      if (httpsServer) httpsServer.close(() => process.kill(process.pid, 'SIGUSR2'));
      else process.kill(process.pid, 'SIGUSR2');
    });
  } catch {
    process.kill(process.pid, 'SIGUSR2');
  }
});

module.exports = app;