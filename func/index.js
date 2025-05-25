const serverless = require('serverless-http');
const express = require('express');
const Bot = require('node-telegram-bot-api');

const findStop = require('../utils/findStop');
const runSeleniumScript = require('../utils/selenium_script');
const { saveUserData, loadUserData } = require('../utils/db_funcs');

const TOKEN = process.env.TOKEN;
const URL = process.env.URL;
const SELENIUM_URL = process.env.SELENIUM_URL;
const isDevelopment = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 3000;

const app = express();
const bot = new Bot(TOKEN, { polling: isDevelopment, webHook: !isDevelopment });

app.use(express.json());

if (isDevelopment) {
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

// Menu commands:
bot.setMyCommands([
    { command: '/about', description: 'Get info about this bot' },
    { command: '/lang', description: 'Set the language for bots replies' },
    { command: '/favorites', description: 'Set favorite stops for quick search' },
    { command: '/link', description: 'Get the link for an official #304 bus website' },
]);

// Hanldle menu commands:
bot.onText(/^\/link$/, msg => {
    bot.sendMessage(
        msg.chat.id,
        'You can find the official website for bus #304 (Apeldoorn - Zwolle) here: ' +
            '\n' +
            `${SELENIUM_URL}`
    );
});
bot.onText(/^\/lang$/, msg => {
    bot.sendMessage(
        msg.chat.id,
        '🇺🇸 Please choose the language for the bot replies:' +
            '\n' +
            '🇳🇱 Kies de taal voor de bot antwoorden:' +
            '\n' +
            '🇺🇦 Будь ласка, виберіть мову для відповідей бота:',
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🇺🇸 English', callback_data: '_en' },
                        { text: '🇳🇱 Nederlandse', callback_data: '_nl' },
                        { text: '🇺🇦 Українська', callback_data: '_uk' },
                    ],
                ],
            },
            reply_to_message_id: msg.message_id,
        }
    );
});
bot.onText(/^\/about$/, msg => {
    bot.sendMessage(
        msg.chat.id,
        '🚌 *Bus #304 Timetable Bot*\n\n' +
            'This bot helps you quickly find the next departure time for bus #304 (Zwolle – Apeldoorn) from your chosen stop. ' +
            'Key features:\n' +
            '• Set your preferred language for replies (/lang)\n' +
            '• Get official timetable info directly from the RRReis website\n' +
            '• Always receive the bus departure time closest to your requested time\n' +
            '• Save your favorite stops for even faster access\n\n' +
            'Just type the name of your stop or use the menu commands to get started!',
        { parse_mode: 'Markdown' }
    );
});

bot.on('callback_query', async query => {
    const {
        from: { id: userId, first_name },
        data,
        message: {
            chat: { id: chatId },
        },
    } = query;

    let message = '';
    let messageOptions = {};

    switch (data) {
        // set lang:
        case '_en':
            message = 'English language selected';
            break;
        case '_nl':
            message = 'Nederlands taal geselecteerd';
            break;
        case '_ua':
            message = 'Вибрано українську мову';
            break;
        // welcome msg:
        case '_go':
            message = 'Choose the bus direction. Going towards Zwolle or Apeldoorn';
            messageOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Zwolle', callback_data: '_zwolle' },
                            { text: 'Apeldoorn', callback_data: '_apeldoorn' },
                        ],
                    ],
                },
            };
            break;
        case '_cancel':
            message = 'Okay, bye 👋';
            break;
        // set directions:
        case '_zwolle':
        case '_apeldoorn':
            message = 'Ok, now type in the bus stop where you depart from:';
            messageOptions = { direction: data.replace('_', '') };
            break;
        // guess the departure stop:
        case '_guess_correct':
            message = '👌. Start searching for the bus from your stop';
            break;
        case '_guess_incorrect':
            message = 'Sorry. Try typing the bus stop again';
            break;
        default:
            message = 'Command is unknown';
            break;
    }

    bot.sendMessage(chatId, message, { ...messageOptions });

    // save lang to db_json:
    if (['_en', '_nl', '_ua'].includes(data)) {
        await saveUserData(userId, { first_name, language_code: data.replace('_', '') });
    }
    if (['_zwolle', '_apeldoorn'].includes(data)) {
        await saveUserData(userId, { direction: data.replace('_', '') });
    }
    if ('_guess_correct' === data) {
        const busStop = query.message.text
            .match(/\*[^*]+\*/g)[0]
            .replaceAll('*', '')
            .trim();
        const { date } = query.message;
        const hours = new Date(date * 1000).getHours();
        const minutes = new Date(date * 1000).getMinutes();
        const day = new Date(date * 1000).getDay();

        // No buses in between: 01:00 and 04:00
        if (hours >= 1 && hours < 5) {
            bot.sendMessage(
                chatId,
                'Now is too late for buses.' +
                    'The Bot looks for buses at current and next hour,' +
                    'e.g. if it is 7:00 AM the Bot would provide results for buses at 7 and 8.'
            );

            return;
        }
        const { direction } = await loadUserData(userId);
        const results = await runSeleniumScript({
            time: { hours, minutes, day },
            direction,
            busStop,
        });

        const replyText =
            results.busesForCurrentHour.length || results.busesForNextHour.length ?
                `Buses departing from *${busStop}* at ${hours}:${minutes}:\n\n` +
                `*${results.busesForCurrentHour.join('*, *')}*` +
                `*${results.busesForNextHour.join('*, *')}*`
            :   `No buses departing from *${busStop}* at ${hours}:${minutes}.\n\n`;

        bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
    }
});

bot.on('message', async msg => {
    if (['/about', '/favorites', '/link', '/lang'].includes(msg.text)) return;

    const {
        text,
        from: { id: userId, first_name = 'buddy', language_code },
        chat: { id: chatId },
    } = msg;

    if (text === '/start') {
        bot.sendMessage(
            chatId,
            `Welcome, ${first_name}! This bot knows the time-table for Bus #304 (Zwolle - Apeldorn)` +
                ' and gives you the earliest bus departing from the chosen bus stop.' +
                ' You may save the bus stops you use the most as your favourites.' +
                ' Ready to try it?',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Yes, let's try!", callback_data: '_go' },
                            { text: '❌ Nope', callback_data: '_cancel' },
                        ],
                    ],
                },
                reply_to_message_id: msg.message_id,
            }
        );
        const userLang = ['en', 'nl', 'ua'].includes(language_code) ? language_code : 'en';
        await saveUserData(userId, { first_name, user_lang: userLang });
    } else {
        const search = findStop(text);

        if (!search.result) {
            bot.sendMessage(chatId, `You said: ${text}`);
        }
        if (search.result && !search.isExact) {
            bot.sendMessage(chatId, `Not sure. Did you mean:  *${search.result}*?`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Yes!', callback_data: '_guess_correct' },
                            { text: '❌ Nope', callback_data: '_guess_incorrect' },
                        ],
                    ],
                },
            });
        }
    }
});

// Handle errors:
bot.on('webhook_error', error => {
    console.error('Webhook error:', error);
});
bot.on('polling-error', error => {
    console.error('Webhook error:', error);
});

module.exports.handler = serverless(app);
