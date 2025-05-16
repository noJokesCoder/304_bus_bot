const serverless = require('serverless-http');
const express = require('express');
const Bot = require('node-telegram-bot-api');

const TOKEN = process.env.TOKEN;
const URL = process.env.URL;
const isDevelopment = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || '3000';

console.log('isDevelopment', isDevelopment);
console.log('NODE_ENV', process.env.NODE_ENV);
console.log('_ENV', process.env);

const app = express();
const bot = new Bot(TOKEN, { polling: isDevelopment, webHook: !isDevelopment });

app.use(express.json());

if (isDevelopment) {
    // Running in DEVELOPMENT:
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Development server running on port ${PORT}`);
        console.log(process.env);
    });
} else {
    // Running in PRODUCTION:
    const webhookUrl = `${URL}/bot`;
    bot.setWebHook(webhookUrl);

    // Handle incoming updates
    app.post(`/bot`, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

bot.on('message', msg => {
    console.log(msg);

    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        bot.sendMessage(chatId, 'Welcome to the bot!');
    } else {
        bot.sendMessage(chatId, `You said: ${text}`);
    }
});

// Handle error:
bot.on('webhook_error', error => {
    console.error('Webhook error:', error);
});

module.exports.handler = serverless(app);
