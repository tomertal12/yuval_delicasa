const cron = require('node-cron');
const db = require('../database/db');
const bot = require('../services/telegramBot');
const path = require('path');
const fs = require('fs');

// Load chat IDs
const chatIdsFilePath = path.join(__dirname, '../database/chat_ids.json');
function getChatIds() {
  try {
    return JSON.parse(fs.readFileSync(chatIdsFilePath, 'utf8'));
  } catch (error) {
    console.error('Error reading chat IDs:', error);
    return [];
  }
}

function hebrewRoles(role) {
  const roleTranslations = {
    Management: 'הנהלה',
    Waiters: 'מלצר',
    Bar: 'בר',
    Cooks: 'טבח',
  };
  return roleTranslations[role] || 'תפקיד לא ידוע';
}

// Helper: current Jerusalem datetime (YYYY-MM-DD HH:mm:ss)
function getJerusalemNowString() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jerusalem',
    hour12: false,
  })
    .format(now)
    .replace(',', '')
    .replace(/\//g, '-');
}

// Helper: format next notification time in DB-friendly string
function formatNextTime(dateObj) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jerusalem',
    hour12: false,
  })
    .format(dateObj)
    .replace(',', '')
    .replace(/\//g, '-');
}

/**
 * Group tasks by role, then sub-group by duration: daily, weekly, monthly.
 * Returns an object of shape:
 *
 * {
 *   "Management": {
 *     daily: [...],
 *     weekly: [...],
 *     monthly: [...],
 *   },
 *   "Waiters": { ... },
 *   ...
 * }
 */
function groupByRoleAndDuration(tasks) {
  const roleMap = {};
  tasks.forEach((task) => {
    const r = task.role;
    if (!roleMap[r]) {
      roleMap[r] = {
        daily: [],
        weekly: [],
        monthly: [],
      };
    }

    if (task.duration === 'daily') {
      roleMap[r].daily.push(task);
    } else if (task.duration === 'weekly') {
      roleMap[r].weekly.push(task);
    } else if (task.duration === 'monthly') {
      roleMap[r].monthly.push(task);
    } else {
      // If you had other durations or a fallback, handle here
    }
  });
  return roleMap;
}

// -------------- CRON #1: Check every minute for tasks to notify -------------- //

cron.schedule('* * * * *', async () => {
  console.log('Checking for pending task notifications...');

  const now = getJerusalemNowString();
  console.log('Current time:', now);

  // We'll query *all* tasks that aren't done,
  // then decide if we owe them a first-time message or a notice message.
  const query = `
    SELECT *
    FROM tasks
    WHERE status != 'Done'
  `;

  db.all(query, [], (err, tasks) => {
    if (err) {
      console.error('Error fetching tasks:', err.message);
      return;
    }

    if (!tasks || tasks.length === 0) {
      console.log('No tasks found for notification check.');
      return;
    }

    const tasksToSendFirstTime = [];
    const tasksToNotify = [];

    for (let task of tasks) {
      // If we haven't sent first-time message yet, check if it's due
      if (task.firstTimeMessageSent === 0 && task.firstTimeMessageMethod !== 'none') {
        if (isFirstTimeMessageDue(task, now)) {
          tasksToSendFirstTime.push(task);
        }
      }
      // Else, if first-time is sent, check if nextNotificationTime is up
      else if (task.firstTimeMessageSent === 1 && task.nextNotificationTime) {
        if (task.nextNotificationTime <= now) {
          tasksToNotify.push(task);
        }
      }
    }

    // Handle first-time messages
    if (tasksToSendFirstTime.length > 0) {
      console.log('Tasks needing first-time message:', tasksToSendFirstTime.map((t) => t.id));
      sendFirstTimeMessages(tasksToSendFirstTime).catch((e) =>
        console.error('Error sending first-time messages:', e)
      );
    }

    // Handle subsequent notifications
    if (tasksToNotify.length > 0) {
      console.log('Tasks needing notice messages:', tasksToNotify.map((t) => t.id));
      sendNoticeMessages(tasksToNotify).catch((e) =>
        console.error('Error sending notice messages:', e)
      );
    }

    if (tasksToSendFirstTime.length === 0 && tasksToNotify.length === 0) {
      console.log('No pending notifications.');
    }
  });
});

/** Decide if it's time to send the first-time message */
function isFirstTimeMessageDue(task, nowString) {
  // If firstTimeMessageMethod='now', it's immediate
  if (task.firstTimeMessageMethod === 'now') {
    return true;
  }
  // If 'fixed', compare firstTimeMessageTime (HH:mm) to current time
  if (task.firstTimeMessageMethod === 'fixed' && task.firstTimeMessageTime) {
    const currentHHmm = nowString.slice(11, 16); // e.g. "12:18"
    const firstHHmm = task.firstTimeMessageTime;
    return currentHHmm >= firstHHmm;
  }
  return false; // 'none' or not set
}

/** Send first-time messages for tasks, grouping by role -> duration */
async function sendFirstTimeMessages(tasks) {
  const chatIds = getChatIds();
  const roleMap = groupByRoleAndDuration(tasks);

  // For each role, build a single message with sections for daily/weekly/monthly
  for (const [role, durationsObj] of Object.entries(roleMap)) {
    let message = `\u200F📢 *משימות חדשות לתפקיד ${hebrewRoles(role)}*:\n\n`;

    // Add subsection for daily tasks
    if (durationsObj.daily.length > 0) {
      message += `*משימות יומיות:*\n`;
      durationsObj.daily.forEach((task, i) => {
        message += `${task.taskNumber}. ${task.title}\n📄 ${task.details}\n\n`;
      });
    }

    // Add subsection for weekly tasks
    if (durationsObj.weekly.length > 0) {
      message += `*משימות שבועיות:*\n`;
      durationsObj.weekly.forEach((task, i) => {
        message += `${task.taskNumber}. ${task.title}\n📄 ${task.details}\n\n`;
      });
    }

    // Add subsection for monthly tasks
    if (durationsObj.monthly.length > 0) {
      message += `*משימות חודשיות:*\n`;
      durationsObj.monthly.forEach((task, i) => {
        message += `${task.taskNumber}. ${task.title}\n📄 ${task.details}\n\n`;
      });
    }

    // Send to all chat IDs
    for (let chatId of chatIds) {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // Update DB: firstTimeMessageSent=1, set nextNotificationTime
    for (let arrayOfTasks of Object.values(durationsObj)) {
      for (let task of arrayOfTasks) {
        const newNextTime = calcNextNotificationTime(task);
        db.run(
          `UPDATE tasks SET firstTimeMessageSent = 1, nextNotificationTime = ? WHERE id = ?`,
          [newNextTime, task.id],
          (err) => {
            if (err) {
              console.error(`Error updating firstTimeMessageSent for task ${task.id}:`, err.message);
            } else {
              console.log(`First-time message sent for task ${task.id}. Next = ${newNextTime}`);
            }
          }
        );
      }
    }
  }
}

/** Send subsequent notice messages for tasks, grouping by role -> duration */
async function sendNoticeMessages(tasks) {
  const chatIds = getChatIds();
  const roleMap = groupByRoleAndDuration(tasks);

  // Build message by role + duration
  for (const [role, durationsObj] of Object.entries(roleMap)) {
    let message = `\u200F📢 *תזכורות חדשות לתפקיד ${hebrewRoles(role)}:*\n\n`;

    // Daily tasks
    if (durationsObj.daily.length > 0) {
      message += `*משימות יומיות:*\n`;
      durationsObj.daily.forEach((task, i) => {
        message += `${task.taskNumber}. ${task.title}\n📄 ${task.details}\n\n`;
      });
    }

    // Weekly tasks
    if (durationsObj.weekly.length > 0) {
      message += `*משימות שבועיות:*\n`;
      durationsObj.weekly.forEach((task, i) => {
        message += `${task.taskNumber}. ${task.title}\n📄 ${task.details}\n\n`;
      });
    }

    // Monthly tasks
    if (durationsObj.monthly.length > 0) {
      message += `*משימות חודשיות:*\n`;
      durationsObj.monthly.forEach((task, i) => {
        message += `${task.taskNumber}. ${task.title}\n📄 ${task.details}\n\n`;
      });
    }

    // Send the grouped message
    for (let chatId of chatIds) {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // Update nextNotificationTime
    for (let arrayOfTasks of Object.values(durationsObj)) {
      for (let task of arrayOfTasks) {
        const newNextTime = calcNextNotificationTime(task);
        db.run(
          `UPDATE tasks SET nextNotificationTime = ? WHERE id = ?`,
          [newNextTime, task.id],
          (err) => {
            if (err) {
              console.error(`Error updating nextNotificationTime for task ${task.id}:`, err.message);
            } else {
              console.log(`Updated next notification time for task ${task.id} to ${newNextTime}`);
            }
          }
        );
      }
    }
  }
}

/** Calculate the *next* notification time after we send a message */
function calcNextNotificationTime(task) {
  if (task.notifyMethod === 'none') {
    return null; // no future notifications
  }

  const now = new Date();
  if (task.notifyMethod === 'interval') {
    const hours = task.noticeInterval || 1;
    now.setHours(now.getHours() + hours);
    return formatNextTime(now);
  } else if (task.notifyMethod === 'fixed' && task.noticeTime) {
    const [h, m] = task.noticeTime.split(':').map(Number);
    now.setHours(h, m, 0, 0);
    if (now <= new Date()) {
      // If today's time is already past, push to tomorrow
      now.setDate(now.getDate() + 1);
    }
    return formatNextTime(now);
  }
  return null;
}

// -------------- CRON #2: Daily rollover at midnight -------------- //

// Helper for "yesterday" in YYYY-MM-DD (Jerusalem):
function getYesterdayJerusalem() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now.toISOString().split('T')[0]; // e.g. '2025-02-05'
}

// Runs every day at midnight in Jerusalem time
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily rollover cron...');
  const yesterday = getYesterdayJerusalem();

  // 1) Find daily tasks from "yesterday" that are not done
  const query = `
    SELECT * FROM tasks
    WHERE duration = 'daily'
      AND DATE(creationDate) = ?
      AND status != 'Done'
  `;

  db.all(query, [yesterday], (err, tasks) => {
    if (err) {
      console.error('Daily rollover error:', err);
      return;
    }
    if (!tasks || tasks.length === 0) {
      console.log('No undone daily tasks from yesterday.');
    } else {
      // 2) Notify manager or do something about these undone tasks
      tasks.forEach(task => {
        console.log(`Task ID ${task.id} was not completed yesterday. (Would notify manager)`);
      });

      // 3) Archive or close them
      tasks.forEach(task => {
        db.run(
          `UPDATE tasks SET status = 'Archived' WHERE id = ?`,
          [task.id],
          err2 => {
            if (err2) {
              console.error(`Failed to archive daily task ${task.id}`, err2);
            } else {
              console.log(`Task ${task.id} archived.`);
            }
          }
        );
      });
    }

    // 4) (Optional) Create brand-new daily tasks for "today"
    //    This example clones them exactly.
    //    If you only want specific tasks repeated, you'd filter them or store "template" tasks.
    if (tasks && tasks.length > 0) {
      tasks.forEach(oldTask => {
        const insertQuery = `
          INSERT INTO tasks (
            title, details, status, role, 
            notifyMethod, noticeInterval, noticeTime,
            firstTimeMessageMethod, firstTimeMessageTime,
            duration,
            firstTimeMessageSent
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertQuery, [
          oldTask.title,
          oldTask.details,
          'In Progress', // new daily tasks start fresh
          oldTask.role,
          oldTask.notifyMethod,
          oldTask.noticeInterval,
          oldTask.noticeTime,
          oldTask.firstTimeMessageMethod,
          oldTask.firstTimeMessageTime,
          'daily',
          0 // first-time message not yet sent for the new row
        ], function(err3) {
          if (err3) {
            console.error('Failed to create new daily task for today:', err3);
          } else {
            console.log(`New daily task created for today with ID = ${this.lastID}`);
          }
        });
      });
    }
  });

  console.log('Daily rollover complete.');
});

console.log('Notification cron job started...');
