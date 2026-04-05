/**
 * notify.js — Central notification utility
 * Creates DB record + emits real-time socket event simultaneously
 */
const Notification = require('../models/Notification');
const { emitToUser, emitToAdmins, emitToEmployee } = require('../socket');

const NOTIF_EVENT = 'notification:new';

/**
 * Create a notification for a specific user (by User._id)
 * and emit it in real-time via socket
 */
async function notifyUser(userId, payload) {
  try {
    const notif = await Notification.create({
      recipient: userId,
      ...payload,
    });
    emitToUser(String(userId), NOTIF_EVENT, { notification: notif });
    return notif;
  } catch (e) {
    console.error('[notify] notifyUser error:', e.message);
  }
}

/**
 * Create notifications for ALL admin users
 */
async function notifyAllAdmins(payload) {
  try {
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    const docs = admins.map(a => ({ recipient: a._id, ...payload }));
    if (!docs.length) return;
    await Notification.insertMany(docs);
    emitToAdmins(NOTIF_EVENT, { notification: { ...payload, recipientRole: 'admin' } });
  } catch (e) {
    console.error('[notify] notifyAllAdmins error:', e.message);
  }
}

/**
 * Create a notification for the user linked to a specific Employee._id
 */
async function notifyEmployee(employeeId, payload) {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ employeeId, isActive: true }).select('_id');
    if (!user) return;
    const notif = await Notification.create({ recipient: user._id, ...payload });
    emitToEmployee(String(employeeId), NOTIF_EVENT, { notification: notif });
    return notif;
  } catch (e) {
    console.error('[notify] notifyEmployee error:', e.message);
  }
}

module.exports = { notifyUser, notifyAllAdmins, notifyEmployee, NOTIF_EVENT };
