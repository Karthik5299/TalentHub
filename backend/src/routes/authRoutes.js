const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Public
router.post('/bootstrap', ctrl.bootstrap);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refreshToken);

// Private
router.use(protect);
router.post('/logout', ctrl.logout);
router.get('/me', ctrl.getMe);
router.put('/change-password', ctrl.changePassword);

// Admin only
router.post('/register', authorize('admin'), ctrl.register);
router.put('/link-employee', authorize('admin'), ctrl.linkEmployee);
router.get('/users', authorize('admin'), ctrl.getAllUsers);
router.put('/users/:id/toggle', authorize('admin'), ctrl.toggleUser);
router.put('/users/:id/reset-password', authorize('admin'), ctrl.resetUserPassword);

module.exports = router;    