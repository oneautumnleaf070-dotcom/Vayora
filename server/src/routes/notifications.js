// Mirrors internal/notifications/notifications.go (src/services/notificationService.ts).
const express = require('express');
const { asyncHandler } = require('../middleware');
const util = require('../util');

function rowToNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: row.read,
    link: row.link || undefined,
    createdAt: row.created_at,
  };
}

async function create(db, userId, title, message, type, link) {
  const id = util.newNotificationID();
  await db.query(
    `INSERT INTO notifications (id, user_id, title, message, type, link, read) VALUES ($1,$2,$3,$4,$5,$6,FALSE)`,
    [id, userId, title, message, type, link]
  );
  return { id, userId, title, message, type, link, read: false };
}

async function getByUser(db, userId) {
  const { rows } = await db.query(
    `SELECT id, user_id, title, message, type, read, link, created_at
     FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return rows.map(rowToNotification);
}

async function markRead(db, id) {
  await db.query(`UPDATE notifications SET read=TRUE WHERE id=$1`, [id]);
}

async function markAllRead(db, userId) {
  await db.query(`UPDATE notifications SET read=TRUE WHERE user_id=$1`, [userId]);
}

function buildRouter(db, hub) {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(await getByUser(db, req.userId));
    })
  );

  // Registered before /:id/read so it isn't swallowed by the param route.
  router.patch(
    '/read-all',
    asyncHandler(async (req, res) => {
      await markAllRead(db, req.userId);
      hub.emit('vayora_notifs_updated');
      res.json({ success: true });
    })
  );

  router.patch(
    '/:id/read',
    asyncHandler(async (req, res) => {
      await markRead(db, req.params.id);
      hub.emit('vayora_notifs_updated');
      res.json({ success: true });
    })
  );

  return router;
}

module.exports = { create, getByUser, markRead, markAllRead, buildRouter };
