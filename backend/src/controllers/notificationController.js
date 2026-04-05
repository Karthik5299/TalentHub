const Notification = require('../models/Notification');
const ApiResponse  = require('../utils/apiResponse');

// GET /api/notifications — get my notifications
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { recipient: req.user.id };
    if (unreadOnly === 'true') query.isRead = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user.id, isRead: false }),
    ]);

    return ApiResponse.success(res, { notifications, total, unreadCount }, 'Notifications fetched');
  } catch (error) { next(error); }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    return ApiResponse.success(res, { count }, 'Unread count fetched');
  } catch (error) { next(error); }
};

// PUT /api/notifications/:id/read — mark one as read
exports.markRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return ApiResponse.error(res, 'Notification not found', 404);
    return ApiResponse.success(res, { notification: notif }, 'Marked as read');
  } catch (error) { next(error); }
};

// PUT /api/notifications/read-all — mark all as read
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    return ApiResponse.success(res, {}, 'All notifications marked as read');
  } catch (error) { next(error); }
};

// DELETE /api/notifications/:id — delete one
exports.deleteOne = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    return ApiResponse.success(res, {}, 'Notification deleted');
  } catch (error) { next(error); }
};

// DELETE /api/notifications/clear-all — clear all
exports.clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    return ApiResponse.success(res, {}, 'All notifications cleared');
  } catch (error) { next(error); }
};
