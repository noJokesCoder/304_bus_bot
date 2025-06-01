const { saveUserData, loadUserData } = require('../../utils/dbFuncs');
const { BOT_COMMANDS } = require('../../dict/botTexts');
const SELENIUM_URL = process.env.SELENIUM_URL;

class CommandHandler {
    constructor(bot) {
        this.bot = bot;
    }

    initialize() {
        this.handleStart();
        this.handleAbout();
        this.handleLanguage();
        this.handleFavorites();
        this.handleLink();
    }

    handleStart() {
        const regex = new RegExp(`^${BOT_COMMANDS.START}$`);
        this.bot.onText(regex, async msg => {
            const {
                message_id,
                chat: { id: chatId },
                from: { id: userId, first_name = 'buddy', language_code },
            } = msg;

            await this.bot.sendMessage(
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
            await saveUserData(userId, { first_name, language_code: userLang });
        });
    }

    handleAbout() {
        const regex = new RegExp(`^${BOT_COMMANDS.ABOUT}$`);
        this.bot.onText(regex, async msg => {
            await this.bot.sendMessage(
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
                    reply_markup: {
                        inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]],
                    },
                }
            );
        });
    }

    handleLanguage() {
        const regex = new RegExp(`^${BOT_COMMANDS.LANG}$`);
        this.bot.onText(regex, async msg => {
            await this.bot.sendMessage(
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
    }

    handleLink() {
        const regex = new RegExp(`^${BOT_COMMANDS.LINK}$`);
        this.bot.onText(regex, async msg => {
            await this.bot.sendMessage(
                msg.chat.id,
                'You can find the official website for bus #304 (Apeldoorn - Zwolle) here: ' +
                    '\n' +
                    `${SELENIUM_URL}`,
                {
                    reply_markup: {
                        inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]],
                    },
                }
            );
        });
    }

    handleFavorites() {
        const regex = new RegExp(`^${BOT_COMMANDS.FAVORITES}$`);
        this.bot.onText(regex, async msg => {
            const { favorite_stops } = await loadUserData(msg.from.id);
            const favoritesLen = favorite_stops ? favorite_stops.length : 0;

            await this.bot.sendMessage(
                msg.chat.id,
                'Use favorite bus stops for a faster selection'
            );

            if (favoritesLen) {
                await this.bot.sendMessage(msg.chat.id, `You have ${favoritesLen} favorite stops:`);

                const messagePromises = favorite_stops.map((stop, indx) => {
                    return new Promise(resolve => {
                        setTimeout(async () => {
                            await this.bot.sendMessage(msg.chat.id, `**${stop}**`, {
                                parse_mode: 'Markdown',
                            });
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

            await this.bot.sendMessage(
                msg.chat.id,
                'Do you want to add favorite bus stops or delete them?',
                { reply_markup: { inline_keyboard: [actionBtns] } }
            );
        });
    }
}

module.exports = CommandHandler;
