const serverless = require('serverless-http');
const express = require('express');
const Bot = require('node-telegram-bot-api');

const findStop = require('../utils/findStop.js');
const runSeleniumScript = require('../utils/seleniumScript.js');
const { saveUserData, loadUserData } = require('../utils/dbFuncs.js');
const { getAllStopsBtnList, getFavoritesBtnList } = require('../utils/favorites.js');

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
    { command: '/start', description: 'Search for a bus from your bus-stop' },
    { command: '/about', description: 'Get info about this bot' },
    { command: '/lang', description: 'Set the language for bots replies' },
    { command: '/favorites', description: 'Set favorite stops for quick search' },
    { command: '/link', description: 'Get the link for an official #304 bus website' },
]);

// Hanldle menu commands:
bot.onText(
    /^\/start$/,
    async ({
        message_id,
        chat: { id: chatId },
        from: { id: userId, first_name = 'buddy', language_code },
    }) => {
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
                reply_to_message_id: message_id,
            }
        );
        const userLang = ['en', 'nl', 'uk'].includes(language_code) ? language_code : 'en';
        await saveUserData(userId, { first_name, user_lang: userLang });
    }
);
bot.onText(/^\/link$/, msg => {
    bot.sendMessage(
        msg.chat.id,
        'You can find the official website for bus #304 (Apeldoorn - Zwolle) here: ' +
            '\n' +
            `${SELENIUM_URL}`,
        { reply_markup: { inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]] } }
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
            'You are all set now!',
        {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]] },
        }
    );
});
bot.onText(/^\/favorites$/, async msg => {
    const { favorite_stops } = await loadUserData(msg.from.id);
    const favoritesLen = favorite_stops ? favorite_stops.length : 0;

    bot.sendMessage(msg.chat.id, 'Use favorite bus stops for a faster selection');

    if (favoritesLen) {
        await bot.sendMessage(msg.chat.id, `You have ${favoritesLen} favorite stops:`);

        const messagePromises = favorite_stops.map((stop, indx) => {
            return new Promise(resolve => {
                setTimeout(async () => {
                    await bot.sendMessage(msg.chat.id, `**${stop}**`, { parse_mode: 'Markdown' });
                    resolve();
                }, 1000 * indx);
            });
        });

        await Promise.all(messagePromises);
    }

    const actionBtns = favoritesLen
        ? [
              { text: 'Add favorites', callback_data: '_add_favorites' },
              { text: 'Delete favorites', callback_data: '_delete_favorites' },
          ]
        : [{ text: 'Add favorites', callback_data: '_add_favorites' }];

    bot.sendMessage(msg.chat.id, 'Do you want to add favorite bus stops or delete them?', {
        reply_markup: { inline_keyboard: [actionBtns] },
    });
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

    console.log('Callback query received:');
    console.log(query);

    console.log('Regex', data.match(/^#.+#$/));

    switch (data) {
        // adding favorites:
        case '_add_favorites':
            const btnList = getAllStopsBtnList();
            message = 'Choose from the list, and I will remember it for you.';
            messageOptions = {
                reply_markup: {
                    inline_keyboard: btnList,
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            };

            break;
        // saving favourites:
        case String(data.match(/^#[^#]+#$/)):
            console.log('CATCHA!');
            console.log('Adding favorite bus stop:', data);
            const selectedStop = data.replace(/#/g, '');

            const { favorite_stops } = await loadUserData(userId);

            message = `Great! I will remember *${selectedStop}* as your favorite bus stop.`;
            messageOptions = {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [['Start search']],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            };
            await saveUserData(userId, {
                favorite_stops: Array.from(new Set([...(favorite_stops || []), selectedStop])),
            });
            break;
        // delete favorites:
        case '_delete_favorites':
            console.log('DO IT');
            break;
        // start search from favourite:
        case String(data.match(/^#{2}.+#{2}$/)):
            message = '👌. Start searching for the bus from your stop';
            break;
        // set lang:
        case '_en':
            message = 'English language selected';
            messageOptions = {
                reply_markup: {
                    inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]],
                },
            };
            break;
        case '_nl':
            message = 'Nederlands taal geselecteerd';
            messageOptions = {
                reply_markup: {
                    inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]],
                },
            };
            break;
        case '_uk':
            message = 'Вибрано українську мову';
            messageOptions = {
                reply_markup: {
                    inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]],
                },
            };
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
            message =
                'Okay, bye 👋' +
                '\n' +
                'If you change your mind - open menu and hit /start command 😉';
            messageOptions = { parse_mode: 'Markdown' };
            break;
        // set directions:
        case '_zwolle':
        case '_apeldoorn':
            const { favorite_stops: savedStops } = await loadUserData(userId);
            if (savedStops && savedStops.length) {
                const btnStops = getFavoritesBtnList(savedStops);

                messageOptions = { reply_markup: { inline_keyboard: btnStops } };
            }
            message = 'Ok, now type in the bus stop where you depart from:';
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
    if (['_en', '_nl', '_uk'].includes(data)) {
        await saveUserData(userId, { first_name, language_code: data.replace('_', '') });
    }
    if (['_zwolle', '_apeldoorn'].includes(data)) {
        await saveUserData(userId, { direction: data.replace('_', '') });
    }
    if ('_guess_correct' === data) {
        const busStop = query.message.text
            .match(/\*[^*]+\*/g)[0]
            .replace(/\*/g, '')
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
                    'e.g. if it is 7:00 AM the Bot would provide results for buses at 7 AM and 8 AM.'
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
            results.busesForCurrentHour.length || results.busesForNextHour.length
                ? `Buses departing from *${busStop}* at ${hours}:${minutes} or later:\n\n` +
                  (results.busesForCurrentHour.length
                      ? `*Departing soon:* \[ ${results.busesForCurrentHour.join(' \| ')} \] \n`
                      : '') +
                  (results.busesForNextHour.length
                      ? `*Departing later:* \[ ${results.busesForNextHour.join(' \| ')} \] \n`
                      : '')
                : `No buses departing from *${busStop}* at ${hours}:${minutes}.\n\n`;

        bot.sendMessage(chatId, replyText, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [['Done ✅']],
                remove_keyboard: true,
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }
    // --------------- TODO: Fix!! -------
    if (data.match(/^#{2}.+#{2}$/)) {
        const busStop = data.replace(/\#/g, '');
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
                    'e.g. if it is 7:00 AM the Bot would provide results for buses at 7 AM and 8 AM.'
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
            results.busesForCurrentHour.length || results.busesForNextHour.length
                ? `Buses departing from *${busStop}* at ${hours}:${minutes} or later:\n\n` +
                  (results.busesForCurrentHour.length
                      ? `*Departing soon:* \[ ${results.busesForCurrentHour.join(' \| ')} \] \n`
                      : '') +
                  (results.busesForNextHour.length
                      ? `*Departing later:* \[ ${results.busesForNextHour.join(' \| ')} \] \n`
                      : '')
                : `No buses departing from *${busStop}* at ${hours}:${minutes}.\n\n`;

        bot.sendMessage(chatId, replyText, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [['Done ✅']],
                remove_keyboard: true,
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }
});

bot.on('message', async msg => {
    if (['/start', '/about', '/favorites', '/link', '/lang'].includes(msg.text)) return;

    console.log(msg);

    const {
        text,
        from: { id: userId, first_name = 'buddy', language_code },
        chat: { id: chatId },
    } = msg;

    if (text.startsWith('Done')) {
        bot.sendMessage(
            chatId,
            `Great! I hope I was helpful, ${first_name}!` +
                ' If you need to search for another bus stop, just hit New Search button.',
            {
                reply_markup: {
                    inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]],
                },
            }
        );
    } else if (text === 'Start search') {
        // TODO: add search
        bot.sendMessage(chatId, '👌');
    } else {
        const { result, isExact } = findStop(text);

        if (!result) {
            // TODO: temporary! remove or change later
            bot.sendMessage(chatId, `You said: ${text}`);
        } else {
            bot.sendMessage(
                chatId,
                isExact
                    ? '👌. Start searching for the bus from your stop'
                    : `Not sure. Did you mean:  *${result}*?`,
                {
                    ...(isExact
                        ? {}
                        : {
                              reply_markup: {
                                  inline_keyboard: [
                                      [
                                          { text: '✅ Yes!', callback_data: '_guess_correct' },
                                          { text: '❌ Nope', callback_data: '_guess_incorrect' },
                                      ],
                                  ],
                              },
                          }),
                }
            );
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
