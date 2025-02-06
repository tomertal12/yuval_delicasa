const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const db = require('../database/db'); // If needed for finishing tasks

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('Telegram bot token not found in .env');
}

const bot = new TelegramBot(token, { polling: true });
console.log('Telegram Bot started in POLLING mode');

// Path to the JSON file
const chatIdsFilePath = path.join(__dirname, '../database/chat_ids.json');

// Functions to load/save chat IDs
function loadChatIds() {
  try {
    const data = fs.readFileSync(chatIdsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading chat IDs:', error);
    return [];
  }
}

function saveChatIds(chatIds) {
  fs.writeFileSync(chatIdsFilePath, JSON.stringify(chatIds, null, 2));
}

function isRegistered(chatId) {
  const chatIds = loadChatIds();
  return chatIds.includes(chatId);
}

function registerChatId(chatId) {
  const chatIds = loadChatIds();
  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId);
    saveChatIds(chatIds);
    console.log(`New chat ID saved: ${chatId}`);
    return true;
  }
  return false;
}

// Example function to mark task as done
async function markTaskAsDone(taskNumber, role = 'Management') {
  return new Promise((resolve, reject) => {
    const sql = `
    UPDATE tasks
    SET status = 'Done'
    WHERE id IN (
      SELECT id
      FROM tasks
      WHERE role = ?
        AND taskNumber = ?
        AND status != 'Done'
      ORDER BY id DESC
      LIMIT 1
    )
  `;
  
    db.run(sql, [role, taskNumber], function (err) {
      if (err) return reject(err);
      resolve(this.changes > 0); // true if at least 1 row updated
    });
  });
}

// Main message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  console.log('New message:', text, 'from chat:', chatId);

  // 1) If user is not registered, register + greet, then stop.
  if (!isRegistered(chatId)) {
    registerChatId(chatId);
    // Greet only now, do NOT proceed to the rest of logic
    await bot.sendMessage(chatId, 'נרשמת בהצלחה :D');
    return; 
  }

  // 2) If user is already registered, let's check if it's a "finish task" command
  const finishRegex = /(?:סיימתי משימה|done|finish|משימה)?\s*(\d+)$/i;
  const match = text.match(finishRegex);

  if (match) {
    // The user wants to finish a task
    const taskNumber = parseInt(match[1], 10);
    try {
      const updated = await markTaskAsDone(taskNumber);
      if (updated) {
        await bot.sendMessage(chatId, `משימה מספר ${taskNumber}# בוצעה בצלחה ✅`);
      } else {
        await bot.sendMessage(chatId, `משימה מספר ${taskNumber} לא נמצאה`);
      }
    } catch (err) {
      console.error('Error finishing task:', err);
      await bot.sendMessage(chatId, 'קרתה בעיה, נסה שוב ');
    }
  } else {
    // 3) If it's not a finish-task command, handle any other messages you like.
    // Possibly a default response, or no response at all.
    await bot.sendMessage(chatId, 'הודעה לא מזוהה, אנא הקלד "סיימתי משימה x" או פשוט מספר המשימה כדי לסיים משימה.');
  }
});

module.exports = bot;
