const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const User       = require('./models/User');

let io;

// ── Events enum — single source of truth ──────────────────
const EVENTS = {
  // Leave
  LEAVE_APPLIED:   'leave:applied',    // employee → admin
  LEAVE_REVIEWED:  'leave:reviewed',   // admin → employee
  LEAVE_CANCELLED: 'leave:cancelled',  // employee → admin

  // Attendance
  CLOCK_IN:        'attendance:clockIn',
  CLOCK_OUT:       'attendance:clockOut',

  // Payroll
  PAYROLL_GENERATED: 'payroll:generated', // admin → employee

  // General
  REFRESH:         'refresh',           // tell client to reload a section
};

// ── Init: attach socket.io to HTTP server ──────────────────
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
      methods:     ['GET', 'POST'],
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  // ── Auth middleware — verify JWT on connect ──────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id).select('_id role name employeeId isActive');

      if (!user || !user.isActive) return next(new Error('Unauthorized'));

      socket.userId     = String(user._id);
      socket.userRole   = user.role;
      socket.userName   = user.name;
      socket.employeeId = user.employeeId ? String(user.employeeId) : null;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ────────────────────────────────────────────
  io.on('connection', (socket) => {
    // Each user joins their personal room + role room
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);   // role:admin  or  role:employee
    if (socket.employeeId) {
      socket.join(`emp:${socket.employeeId}`); // emp:<mongoId>
    }

    console.log(`🔌 [Socket] ${socket.userName} (${socket.userRole}) connected — ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket] ${socket.userName} disconnected — ${reason}`);
    });
  });

  return io;
}

// ── Emitters — called from controllers ────────────────────

/** Notify all admins */
function emitToAdmins(event, data) {
  if (!io) return;
  io.to('role:admin').emit(event, data);
}

/** Notify a specific employee by their Employee._id */
function emitToEmployee(employeeId, event, data) {
  if (!io || !employeeId) return;
  io.to(`emp:${String(employeeId)}`).emit(event, data);
}

/** Notify a specific user by User._id */
function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, data);
}

/** Broadcast to everyone */
function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

function getIO() { return io; }

module.exports = { initSocket, emitToAdmins, emitToEmployee, emitToUser, emitToAll, getIO, EVENTS };
