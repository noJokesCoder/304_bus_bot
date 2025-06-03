const express = require('express');
const TelegramBot = require('./func/304_bot');

const TOKEN = process.env.TOKEN;
const URL = process.env.URL;
const isDevelopment = process.env.NODE_ENV === 'development';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
const bot = new TelegramBot({ token: TOKEN, isDevelopment, url: URL }).getBot();

app.use(express.json());

if (isDevelopment) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Development server running on port ${PORT}`);
        console.log(process.env);
    });
} else {
    app.post(`/bot`, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
