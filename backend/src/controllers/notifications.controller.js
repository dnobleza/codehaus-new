const logger = require('../utils/logger');
const { toHttpError } = require('../utils/httpError');
const notificationsService = require('../services/notifications.service');
const TAG = '[NOTIFICATIONS-CONTROLLER]';

// The caller's own inbox. userId always comes from the verified JWT subject,
// never from the request, so there is no way to read someone else's.
exports.list = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      notificationsService.listForUser(req.user.id),
      notificationsService.countUnreadForUser(req.user.id),
    ]);
    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: { notifications, unreadCount },
    });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const notification = await notificationsService.markReadForUser(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Notification marked read', data: notification });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const count = await notificationsService.markAllReadForUser(req.user.id);
    logger.info(`${TAG} Marked ${count} notifications read for user ${req.user.id}`);
    res.status(200).json({ success: true, message: 'All notifications marked read', data: { count } });
  } catch (error) {
    next(toHttpError(error));
  }
};
