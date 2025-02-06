const bot = require('../services/telegramBot');

exports.receiveUpdate = (req, res) => {
  bot.processUpdate(req.body);
  return res.sendStatus(200);
};

exports.sendMessage = async (req, res) => {
  const { chatId, text } = req.body;

  if (!chatId || !text) {
    return res.status(400).json({ error: 'Missing chatId or text' });
  }

  try {
    await bot.sendMessage(chatId, text);
    res.json({ ok: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Telegram send error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
