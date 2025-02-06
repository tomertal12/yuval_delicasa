const express = require('express');
const router = express.Router();
const db = require('../database/db');
const fs = require('fs');
const path = require('path');
const bot = require('../services/telegramBot');

// Helper: send Telegram message to multiple chat IDs
const sendTelegramMessage = (chatIds, message) => {
  return Promise.all(
    chatIds.map(chatId =>
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
        .then(() => console.log(`Message sent to chat ID: ${chatId}`))
        .catch(err => {
          console.error(`Error sending message to chat ID ${chatId}:`, err.message);
          throw new Error('Telegram message failed');
        })
    )
  );
};

// Helper: format a Date object into "YYYY-MM-DD HH:mm:ss" in Asia/Jerusalem
function formatLocalDateTime(dateObj) {
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jerusalem',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('en-CA', options)
    .formatToParts(dateObj)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

// Helper: get next notification time
function getNextNotificationTime(notifyMethod, noticeInterval, noticeTime) {
  const now = new Date();
  if (notifyMethod === 'interval') {
    now.setHours(now.getHours() + noticeInterval);
  } else if (notifyMethod === 'fixed' && noticeTime) {
    const [hours, minutes] = noticeTime.split(':').map(Number);
    now.setHours(hours, minutes, 0, 0);

    // If that time today is already in the past, move it to tomorrow
    if (now <= new Date()) {
      now.setDate(now.getDate() + 1);
    }
  } else {
    return null;
  }
  return formatLocalDateTime(now);
}

// -----------------------------------------------------------------------
// Existing GET by date (e.g. /api/tasks/2025-02-06 )
// -----------------------------------------------------------------------
router.get('/:date', (req, res) => {
    const viewDate = req.params.date; // 'YYYY-MM-DD'
    const query = `
      SELECT *
      FROM tasks
      WHERE status != 'Done'
        AND (
          (duration = 'daily' 
            AND DATE(creationDate) = ?
          )
          OR
          (duration = 'weekly'
            AND DATE(creationDate) <= ?
            AND DATE(creationDate, '+6 days') >= ?
          )
          OR
          (duration = 'monthly'
            AND DATE(creationDate) <= ?
            AND DATE(creationDate, '+29 days') >= ?
          )
        );
    `;
    // We'll pass the same 'viewDate' multiple times for the placeholders:
    db.all(query, [viewDate, viewDate, viewDate, viewDate, viewDate], (err, rows) => {
      if (err) {
        console.error('DayView query error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.json(rows);
    });
  });
  

// -----------------------------------------------------------------------
// NEW: GET /api/tasks?duration=XXX
//   - If duration is provided (daily|weekly|monthly), filter by that
//   - Otherwise return all tasks
// Example: /api/tasks?duration=daily
// -----------------------------------------------------------------------
router.get('/', (req, res) => {
  const { duration } = req.query; // e.g. 'daily', 'weekly', 'monthly', or undefined

  let query = 'SELECT * FROM tasks';
  const params = [];

  if (duration) {
    query += ' WHERE duration = ?';
    params.push(duration);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json(rows);
  });
});

// -----------------------------------------------------------------------
// NEW: GET /api/tasks/id/:id  (fetch a single task by ID)
// -----------------------------------------------------------------------
router.get('/id/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM tasks WHERE id = ?';
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.json(row);
  });
});

// -----------------------------------------------------------------------
// Load chat IDs from JSON file (existing logic)
// -----------------------------------------------------------------------
const chatIdsFilePath = path.join(__dirname, '../database/chat_ids.json');
function getChatIds() {
  try {
    return JSON.parse(fs.readFileSync(chatIdsFilePath, 'utf8'));
  } catch (error) {
    console.error('Error reading chat IDs:', error);
    return [];
  }
}

// -----------------------------------------------------------------------
// Existing POST /addTask (create a new task)
// -----------------------------------------------------------------------
router.post('/addTask', (req, res) => {
  const {
    title,
    details,
    status,
    shouldAddImage,
    notifyMethod,
    noticeInterval,
    noticeTime,
    firstTimeMessageMethod,
    firstTimeMessageTime,
    role,
    duration,
  } = req.body;

  const nextNotificationTime = getNextNotificationTime(notifyMethod, noticeInterval, noticeTime);
  const today = new Date().toLocaleDateString('en-CA'); // e.g. "2025-02-06"

  // We'll fetch the taskNumber based on role & creationDate
  const findTaskNumberQuery = `
    SELECT COALESCE(MAX(taskNumber), 0) + 1 AS nextTaskNumber
    FROM tasks
    WHERE role = ?
      AND DATE(creationDate) = ?
  `;

  db.run('BEGIN TRANSACTION', (beginErr) => {
    if (beginErr) {
      console.error('Failed to start transaction:', beginErr.message);
      return res.status(500).json({ error: 'Transaction start failed' });
    }

    // 1. get nextTaskNumber
    db.get(findTaskNumberQuery, [role, today], (numberErr, row) => {
      if (numberErr) {
        console.error('Error determining task number:', numberErr.message);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to get task number' });
      }

      const nextTaskNumber = row ? row.nextTaskNumber : 1;

      // 2. Insert new task
      const insertQuery = `
        INSERT INTO tasks (
          title, details, status, shouldAddImage,
          notifyMethod, noticeInterval, noticeTime,
          firstTimeMessageMethod, firstTimeMessageTime,
          role, duration, taskNumber, nextNotificationTime
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(
        insertQuery,
        [
          title,
          details,
          status,
          shouldAddImage ? 1 : 0,
          notifyMethod,
          noticeInterval,
          noticeTime,
          firstTimeMessageMethod,
          firstTimeMessageTime,
          role,
          duration,
          nextTaskNumber,
          nextNotificationTime,
        ],
        function (insertErr) {
          if (insertErr) {
            console.error('Error inserting task:', insertErr.message);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to add task' });
          }

          const taskId = this.lastID;
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('Failed to commit transaction:', commitErr.message);
              return res.status(500).json({ error: 'Failed to finalize task addition' });
            }
            return res
              .status(201)
              .json({ id: taskId, taskNumber: nextTaskNumber });
          });
        }
      );
    });
  });
});

// -----------------------------------------------------------------------
// NEW: PUT /api/tasks/:id (or PATCH if you prefer partial updates)
// Updates an existing task. We'll just do a simple approach here.
// -----------------------------------------------------------------------
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    title,
    details,
    status,
    shouldAddImage,
    notifyMethod,
    noticeInterval,
    noticeTime,
    firstTimeMessageMethod,
    firstTimeMessageTime,
    role,
    duration,
  } = req.body;

  const nextNotificationTime = getNextNotificationTime(notifyMethod, noticeInterval, noticeTime);

  // Build the query
  const updateQuery = `
    UPDATE tasks
    SET
      title = ?,
      details = ?,
      status = ?,
      shouldAddImage = ?,
      notifyMethod = ?,
      noticeInterval = ?,
      noticeTime = ?,
      firstTimeMessageMethod = ?,
      firstTimeMessageTime = ?,
      role = ?,
      duration = ?,
      nextNotificationTime = ?
    WHERE id = ?
  `;

  db.run(
    updateQuery,
    [
      title,
      details,
      status,
      shouldAddImage ? 1 : 0,
      notifyMethod,
      noticeInterval,
      noticeTime,
      firstTimeMessageMethod,
      firstTimeMessageTime,
      role,
      duration,
      nextNotificationTime,
      id,
    ],
    function (err) {
      if (err) {
        console.error('Error updating task:', err.message);
        return res.status(500).json({ error: 'Failed to update task' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Task not found or no changes made' });
      }
      return res.json({ message: 'Task updated successfully', id });
    }
  );
});

// -----------------------------------------------------------------------
// NEW: DELETE /api/tasks/:id
// -----------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleteQuery = `DELETE FROM tasks WHERE id = ?`;

  db.run(deleteQuery, [id], function (err) {
    if (err) {
      console.error('Error deleting task:', err.message);
      return res.status(500).json({ error: 'Failed to delete task' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.json({ message: 'Task deleted successfully', id });
  });
});

module.exports = router;
