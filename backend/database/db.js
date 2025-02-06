const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to your SQLite database file
const dbPath = path.join(__dirname, 'tasks.db');

// Connect to SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// 1) Set a busy timeout (in ms) to wait for locks to clear instead of failing
db.run('PRAGMA busy_timeout = 5000', (err) => {
  if (err) {
    console.error('Error setting busy_timeout:', err.message);
  } else {
    console.log('SQLite busy_timeout set to 5000ms');
  }
});

module.exports = db;
