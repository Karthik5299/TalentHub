require('dotenv').config();

const validateEnv = require('./config/validateEnv');
validateEnv();

const express       = require('express');
const http          = require('http');          // ← needed for socket.io
const cors          = require('cors');
const helmet        = require('helmet');
const morgan        = require('morgan');
const cookieParser  = require('cookie-parser');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const authRoutes     = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const { deptRouter, attRouter, leaveRouter, kinRouter, payrollRouter } = require('./routes/index');
const { initSocket } = require('./socket');    // ← socket module

connectDB();

const app        = express();
const httpServer = http.createServer(app);     // ← wrap express in http server

// ── Init Socket.io ────────────────────────────────────────
initSocket(httpServer);

// ── Security ──────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(mongoSanitize());

// ── Rate limiting ─────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
}));

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin:         process.env.CLIENT_URL || 'http://localhost:3000',
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body / cookies ────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── Dev logging ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── Health ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({
  success:     true,
  message:     'TalentHub API is running',
  environment: process.env.NODE_ENV || 'development',
  timestamp:   new Date().toISOString(),
}));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/employees',   employeeRoutes);
app.use('/api/departments', deptRouter);
app.use('/api/attendance',  attRouter);
app.use('/api/leaves',      leaveRouter);
app.use('/api/kin',         kinRouter);
app.use('/api/payroll',     payrollRouter);

// ── 404 ───────────────────────────────────────────────────
app.all('*', (req, res) => res.status(404).json({
  success: false,
  message: `Route ${req.method} ${req.originalUrl} not found.`,
}));

// ── Error handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Start — listen on httpServer not app ──────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀  TalentHub API  →  http://localhost:${PORT}`);
  console.log(`🔌  Socket.io      →  ws://localhost:${PORT}`);
  console.log(`📋  Environment    →  ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📌  First time? POST /api/auth/bootstrap  { name, email, password }\n`);
});

module.exports = app;
