const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Named routes before /:id
router.get('/',              ctrl.getMyNotifications);
router.get('/unread-count',  ctrl.getUnreadCount);
router.put('/read-all',      ctrl.markAllRead);
router.delete('/clear-all',  ctrl.clearAll);
router.put('/:id/read',      ctrl.markRead);
router.delete('/:id',        ctrl.deleteOne);

module.exports = router;
