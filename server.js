require('dotenv').config();
if (!process.env.JWT_SECRET || !String(process.env.JWT_SECRET).trim()) {
  console.error('[SERVER] JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db/db'); // Point to the db/db.js connection pool
const { db: firestore } = require('./db/firebase'); // Firebase Firestore connection
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
const aiTutorController = require('./public/src/controller/aiTutorController');
const initApplicationTables = require('./db/init_applications');
const NotificationService = require('./public/src/services/notificationService');

const app = express();
app.set('trust proxy', 1); // Enable proxy trust for Render / reverse proxies

const PORT = process.env.PORT || 4000;
const IP = process.env.IP || 'localhost';  // Network IP or fallback to localhost

// Safe helper for directory creation in serverless (e.g. Vercel read-only FS)
const ensureDir = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    // In serverless environments, file system outside /tmp is read-only
  }
};

// Ensure upload directories exist
const uploadDir = 'uploads/textbooks/';
const pfpDir = 'uploads/pfp/';
const appUploadDir = 'uploads/applications/';
ensureDir(uploadDir);
ensureDir(pfpDir);
ensureDir(appUploadDir);

// Initialize all database tables, multi-parent, and notification schemas on server startup (local/dedicated server only)
const initializeAllDatabaseTables = require('./db/init_full_schema');
const createAiConversationsTables = require('./db/create_ai_conversations_tables');
const createGelezaAiTables = require('./db/create_geleza_ai_tables');
const createRagKnowledgeTables = require('./db/create_rag_knowledge_tables');
const emailService = require('./public/src/services/emailService');
const gelezaEarlyWarningJob = require('./public/src/services/gelezaEarlyWarningJob');
const feeReminderJob = require('./public/src/services/feeReminderJob');
const gelezaAutomationJob = require('./public/src/services/ai/gelezaAutomationJob');

if (!process.env.VERCEL) {
  (async () => {
    try {
      await initializeAllDatabaseTables();
      await initApplicationTables();
      const { createParentApplicationsTable } = require('./db/create_parent_applications_table');
      await createParentApplicationsTable();
      const { migrateParentApplicationsTwins } = require('./db/migrate_parent_applications_twins');
      await migrateParentApplicationsTwins();
      await NotificationService.initSchema();
      const WebPushService = require('./public/src/services/webPushService');
      await WebPushService.init();
      await createAiConversationsTables();
      await createGelezaAiTables();
      await createRagKnowledgeTables();
      const migrateSportsCoachEvents = require('./db/migrate_sports_coach_events');
      await migrateSportsCoachEvents();
      const { migrateSchoolOnboardingAndCleanRoster } = require('./db/migrate_school_onboarding_and_clean_roster');
      await migrateSchoolOnboardingAndCleanRoster();
      const migrateTextbookInventorySchema = require('./db/migrate_textbook_inventory_schema');
      await migrateTextbookInventorySchema();
      const migrateLeaveAndExamSchema = require('./db/migrate_leave_and_exam_schema');
      await migrateLeaveAndExamSchema();
      console.log('[DB BOOTSTRAP] All database tables, schemas, and security verified successfully.');
      if (firestore) {
        console.log('[FIREBASE BOOTSTRAP] Firebase Cloud Firestore & Admin SDK initialized and active.');
      }
      // Pre-warm and verify email delivery transport in background
      emailService.verifyConnection().catch(() => {});
      // Start automated daily background risk audit for student performance
      gelezaEarlyWarningJob.startPeriodicRiskAudit();
      feeReminderJob.startPeriodicFeeReminders();
      // Start proactive Geleza AI school workflow automation
      gelezaAutomationJob.startPeriodicAutomation();
    } catch (err) {
      console.error('[DB BOOTSTRAP] Initialization error:', err.message);
    }
  })();
}

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
ensureDir(msgUploadDir);

const messageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'documents';
    const m = (file.mimetype || '').toLowerCase();
    if (m.startsWith('image/')) subfolder = 'images';
    else if (m.startsWith('audio/') || m.includes('ogg') || m.includes('webm') || m.includes('mp4') || m.includes('wav')) subfolder = 'voice';
    const targetDir = path.join('uploads', 'messages', subfolder);
    ensureDir(targetDir);
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
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
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

const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Contact Admin / support submissions
  message: { error: 'Too many support requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false }
});

app.use('/api/login', authLimiter);
app.use('/api/webauthn/login', authLimiter);
app.use('/api/auth/webauthn/login', authLimiter);
app.use('/api/forgot-password', authLimiter);
app.use('/api/verify-otp', authLimiter);
app.use('/api/reset-password', authLimiter);
app.use('/api/register', authLimiter);
// Limit only public support submissions (not admin inbox GETs)
app.post('/api/support/tickets', supportLimiter);
app.use('/api/', apiLimiter);

// General Middleware
const productionOrigins = [
  'https://fusion-high-app.web.app',
  'https://fusion-high-app.firebaseapp.com',
];
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.APP_URL) allowedOrigins.push(process.env.APP_URL.trim());
if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL.trim());
for (const origin of productionOrigins) {
  if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    try {
      const url = new URL(origin);
      if (
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        /^192\.168\./.test(url.hostname) ||
        /^10\./.test(url.hostname) ||
        url.hostname.endsWith('.web.app') ||
        url.hostname.endsWith('.firebaseapp.com') ||
        url.hostname.endsWith('.vercel.app') ||
        url.hostname.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }
    } catch (_) {}
    callback(null, true); // Permissive fallback so browser clients are never blocked by CORS
  },
  credentials: true,
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(normalizePayload);

// Serve client build if available (production SPA)
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Static Assets & Uploads: Serve media, audio voice notes, profile pictures, and learning resources publicly with CORS & byte ranges
const setStaticMediaHeaders = (res, filePath) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Accept-Ranges', 'bytes');
  if (filePath.endsWith('.webm')) res.setHeader('Content-Type', 'audio/webm');
  else if (filePath.endsWith('.ogg')) res.setHeader('Content-Type', 'audio/ogg');
  else if (filePath.endsWith('.mp3')) res.setHeader('Content-Type', 'audio/mpeg');
  else if (filePath.endsWith('.m4a') || filePath.endsWith('.mp4')) res.setHeader('Content-Type', 'audio/mp4');
  else if (filePath.endsWith('.wav')) res.setHeader('Content-Type', 'audio/wav');
  else if (filePath.endsWith('.pdf')) res.setHeader('Content-Type', 'application/pdf');
};

app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads'), { setHeaders: setStaticMediaHeaders }));

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), { setHeaders: setStaticMediaHeaders }));
app.use(express.static('public'));

// Smart resolver for /uploads/messages/ supporting both flat filenames and nested folders (/voice, /images, /documents)
const resolveMessageFile = (req, res, next) => {
  const sub = req.params.subfolder || '';
  const file = req.params.filename || '';
  const targetName = path.basename(file || sub);

  const searchPaths = [
    path.join(__dirname, 'uploads', 'messages', sub, file),
    path.join(__dirname, 'uploads', 'messages', 'voice', targetName),
    path.join(__dirname, 'uploads', 'messages', 'images', targetName),
    path.join(__dirname, 'uploads', 'messages', 'documents', targetName),
    path.join(__dirname, 'uploads', 'messages', targetName),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      setStaticMediaHeaders(res, p);
      return res.sendFile(p);
    }
  }
  next();
};

app.get('/uploads/messages/:subfolder/:filename', resolveMessageFile);
app.get('/uploads/messages/:filename', resolveMessageFile);

app.use('/downloads', express.static(path.join(__dirname, 'public', 'downloads')));

// Ensure CAPS curriculum archives and textbook directories exist
const capsArchiveDir = path.join(__dirname, 'public', 'assets', 'caps_archive');
ensureDir(capsArchiveDir);
const textbooksDir = path.join(__dirname, 'uploads', 'textbooks');
ensureDir(textbooksDir);

const { generateCapsDocumentPdf } = require('./public/src/services/capsDocumentGenerator');

// Dedicated handler to serve or dynamically synthesize and download CAPS resources / past papers
const handleCapsResourceDownload = async (req, res) => {
  try {
    const rawFilename = req.params.filename || req.query.file || 'Curriculum_Resource.pdf';
    const cleanFilename = path.basename(decodeURIComponent(rawFilename));
    const isView = req.query.view === 'true' || req.query.inline === 'true' || req.query.preview === 'true';
    const disposition = isView ? 'inline' : 'attachment';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Check if file exists in capsArchiveDir or textbooksDir
    let filePath = path.join(capsArchiveDir, cleanFilename);
    if (!fs.existsSync(filePath)) {
      const altPath = path.join(textbooksDir, cleanFilename);
      if (fs.existsSync(altPath)) filePath = altPath;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${cleanFilename}"`);
      return res.sendFile(filePath);
    }

    // Lookup metadata from textbooks table in database if available
    let title = cleanFilename.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    let subject = 'Curriculum';
    let grade = 10;
    let year = 2024;
    let resourceType = 'past_paper';

    try {
      const dbRes = await db.query(
        `SELECT subject, grade, title, year, resource_type FROM textbooks 
         WHERE file_name ILIKE $1 OR file_path ILIKE $2 LIMIT 1`,
        [cleanFilename, `%${cleanFilename}%`]
      );
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        if (row.title) title = row.title;
        if (row.subject) subject = row.subject;
        if (row.grade) grade = row.grade;
        if (row.year) year = row.year;
        if (row.resource_type) resourceType = row.resource_type;
      } else {
        const m = cleanFilename.match(/([A-Za-z_]+)_Gr(\d+)_([A-Za-z0-9_]+)/);
        if (m) {
          subject = m[1].replace(/_/g, ' ');
          grade = parseInt(m[2], 10);
        }
      }
    } catch (_) {}

    // Generate to disk cache and stream response
    const targetPath = path.join(capsArchiveDir, cleanFilename);
    const doc = generateCapsDocumentPdf({ title, subject, grade, year, resourceType }, targetPath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${cleanFilename}"`);
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error('Error downloading CAPS resource:', err);
    res.status(500).json({ error: 'Failed to download curriculum document.' });
  }
};

app.get('/assets/caps_archive/:filename', handleCapsResourceDownload);
app.get('/uploads/textbooks/:filename', handleCapsResourceDownload);
app.get('/api/resources/download', handleCapsResourceDownload);
app.get('/api/resources/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const dbRes = await db.query('SELECT * FROM textbooks WHERE id = $1 LIMIT 1', [id]);
    if (dbRes.rows.length > 0) {
      const row = dbRes.rows[0];
      req.params.filename = row.file_name || path.basename(row.file_path || 'document.pdf');
      return handleCapsResourceDownload(req, res);
    }
    res.status(404).json({ error: 'Resource not found.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to download resource.' });
  }
});

// Comprehensive System Documentation Download Endpoint
app.get('/api/documentation/download', (req, res) => {
  const pdfPath = path.join(__dirname, 'public', 'downloads', 'Fusion_High_System_Architecture_and_Development_Documentation.pdf');
  if (fs.existsSync(pdfPath)) {
    res.download(pdfPath, 'Fusion_High_System_Architecture_and_Development_Documentation.pdf');
  } else {
    res.status(404).json({ error: 'System documentation PDF not found.' });
  }
});

app.get('/api/campus-weather', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const latitude = Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : -26.2041;
  const longitude = Number.isFinite(lon) && lon >= -180 && lon <= 180 ? lon : 28.0473;
  try {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weather_code,cloud_cover,precipitation&timezone=auto&forecast_days=2`;
    const response = await fetch(forecastUrl);
    if (!response.ok) {
      res.status(502).json({ error: 'Weather is unavailable.' });
      return;
    }
    const data = await response.json();
    const nearCampus = Math.abs(latitude + 26.2041) < 0.35 && Math.abs(longitude - 28.0473) < 0.35;
    let place = nearCampus ? 'Johannesburg' : 'Your area';
    if (!nearCampus) {
      try {
        const geo = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        if (geo.ok) {
          const body = await geo.json();
          place = body.city || body.locality || body.principalSubdivision || place;
        }
      } catch {
        /* The forecast still stands without a place name. */
      }
    }
    const times = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
    res.json({
      place,
      utcOffsetSeconds: Number(data?.utc_offset_seconds) || 2 * 3600,
      hours: times.map((time, index) => ({
        time,
        code: Number(data.hourly.weather_code?.[index] ?? 0),
        cover: Number(data.hourly.cloud_cover?.[index] ?? 0),
        rain: Number(data.hourly.precipitation?.[index] ?? 0),
        temp: Number(data.hourly.temperature_2m?.[index] ?? 0),
      })),
    });
  } catch {
    res.status(502).json({ error: 'Weather is unavailable.' });
  }
});

// Auth & Profile
app.use('/api', authRoutes);
app.use('/api/auth', authRoutes);
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

// User Presence (Heartbeat & Logout Status - 90-second threshold)
app.post('/api/user/heartbeat', authenticateToken, userController.heartbeat);
app.post('/api/user/logout-status', authenticateToken, userController.updateLogoutStatus);

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

// Universal 24/7 AI Chat Assistant Endpoint Auth Helper
const optionalTokenAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    req.user = { id: null, role: 'visitor' };
    return next();
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    req.user = (!err && user) ? user : { id: null, role: 'visitor' };
    next();
  });
};

// Mount Universal Geleza AI Intelligent Subsystem
const aiRoutes = require('./public/src/routes/aiRoutes');
app.use('/api/ai', aiRoutes);

app.post('/api/ai/legacy-chat', optionalTokenAuth, aiTutorController.sendChatMessage);
app.get('/api/ai/physics/topics', optionalTokenAuth, aiTutorController.getPhysicalSciencesTopics);
app.post('/api/ai/physics/evaluate', optionalTokenAuth, aiTutorController.evaluatePhysicalSciencesAnswer);
app.get('/api/ai/physics-grade10/topics', optionalTokenAuth, aiTutorController.getPhysicalSciencesGrade10Topics);
app.post('/api/ai/physics-grade10/evaluate', optionalTokenAuth, aiTutorController.evaluatePhysicalSciencesAnswer);
app.get('/api/ai/physical-sciences/topics', optionalTokenAuth, aiTutorController.getPhysicalSciencesTopics);
app.post('/api/ai/physical-sciences/evaluate', optionalTokenAuth, aiTutorController.evaluatePhysicalSciencesAnswer);
app.get('/api/ai/math/topics', optionalTokenAuth, aiTutorController.getMathematicsTopics);
app.post('/api/ai/math/evaluate', optionalTokenAuth, aiTutorController.evaluateMathematicsAnswer);
app.get('/api/ai/mathematics/topics', optionalTokenAuth, aiTutorController.getMathematicsTopics);
app.post('/api/ai/mathematics/evaluate', optionalTokenAuth, aiTutorController.evaluateMathematicsAnswer);
app.get('/api/ai/life-sciences/topics', optionalTokenAuth, aiTutorController.getLifeSciencesTopics);
app.post('/api/ai/life-sciences/evaluate', optionalTokenAuth, aiTutorController.evaluateLifeSciencesAnswer);
app.get('/api/ai/lifesciences/topics', optionalTokenAuth, aiTutorController.getLifeSciencesTopics);
app.post('/api/ai/lifesciences/evaluate', optionalTokenAuth, aiTutorController.evaluateLifeSciencesAnswer);

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
app.use('/api/matric', require('./public/src/routes/matricAnalyticsRoutes'));
app.use('/api/applications', applicationRoutes);
app.use('/api/finance', require('./public/src/routes/financeRoutes'));
app.use('/api/bursaries', require('./public/src/routes/bursaryRoutes'));
app.use('/api/assignments', require('./public/src/routes/assignmentRoutes'));
app.use('/api/notifications', notificationRoutes);
app.use('/api', otherRoutes); // For progress, announcements etc.

// Admin Routes (now imported from adminRoutes.js)
app.use('/api/admin', require('./public/src/routes/adminRoutes.js'));
app.use('/api/support', require('./public/src/routes/supportRoutes.js'));
app.use('/api/schools', require('./public/src/routes/schoolRoutes'));
app.use('/api/inter-school', require('./public/src/routes/interSchoolRoutes'));
app.use('/api/consultations', require('./public/src/routes/consultationRoutes'));
app.use('/api/report-cards', require('./public/src/routes/reportCardRoutes'));
app.use('/api/ml/behavior', require('./public/src/routes/behaviorMlRoutes'));
app.use('/api/ai-advisor', require('./public/src/routes/aiAdvisorRoutes'));
app.use('/api/system', require('./public/src/routes/systemRoutes'));
app.use('/api/staff-invites', require('./public/src/routes/staffInviteRoutes'));



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
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const testRes = await db.query('SELECT 1 as connected');
    if (testRes.rows.length > 0) dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }
  let emailRelay = false;
  try {
    emailRelay = await require('./public/src/services/emailService').relayReady();
  } catch (_) {}
  res.status(200).json({ status: 'healthy', database: dbStatus, emailRelay, uptime: process.uptime() });
});

// Database schema auto-bootstrap endpoint (safe & idempotent)
app.all('/api/init-db', async (req, res) => {
  try {
    await initializeAllDatabaseTables();
    await initApplicationTables();
    res.json({ success: true, message: 'Database schema initialized. Existing user passwords were not changed.' });
  } catch (err) {
    console.error('[INIT-DB ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Global Express error handler to ensure JSON errors always return a clean string message
app.use((err, req, res, next) => {
  console.error('[EXPRESS GLOBAL ERROR HANDLER]:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  const message = typeof err === 'string' ? err : (err.message || 'An internal server error occurred.');
  res.status(status).json({
    success: false,
    error: message,
    message: message
  });
});

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

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

let sslOptions = null;
if (!isProduction && !process.env.VERCEL) {
  try {
    const sslDir = path.join(__dirname, '.ssl');
    ensureDir(sslDir);

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

// Only start standalone HTTP/HTTPS listeners when not running inside Vercel serverless functions
if (!process.env.VERCEL && require.main === module) {
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
    try {
      const logger = require('./public/src/services/logger');
      logger.info('Server running', { port: PORT, env: process.env.NODE_ENV || 'development' });
    } catch (_) {
      console.log(`Server running successfully!`);
    }
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
}

module.exports = app;