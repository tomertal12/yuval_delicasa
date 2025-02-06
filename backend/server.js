// server.js
require('dotenv').config();
require('./services/cronJobs');
const express = require('express');
const bodyParser = require('body-parser');
const telegramRoutes = require('./routes/telegramRoutes');
const tasksRouter = require('./routes/tasks');
const cors = require('cors');


const bot = require('./services/telegramBot'); // your Telegram bot stuff

const app = express();

app.use(cors());

// Middleware
app.use(bodyParser.json());

// Use the tasks router
app.use('/api/tasks', tasksRouter);

// Also your Telegram routes
app.use('/api/telegram', telegramRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  if (process.env.MODE === 'webhook') {
    const domain = 'https://my-production-domain.com'; // or your ngrok domain
    const path = '/api/telegram/webhook';
    try {
      await bot.setWebHook(`${domain}${path}`);
      console.log(`Webhook set to ${domain}${path}`);
    } catch (error) {
      console.error('Error setting webhook:', error);
    }
  }
});
