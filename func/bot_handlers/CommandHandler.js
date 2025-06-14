const { saveUserData, loadUserData } = require('../../utils/dbFuncs');
const { BOT_COMMANDS } = require('../../dict/botTexts');
const SELENIUM = process.env.SELENIUM;
const i18n = require('i18n');

/** @typedef {import('node-telegram-bot-api')} TelegramBot */

class CommandHandler {
    /** @param {TelegramBot} bot - Telegram Bot instance */
    constructor(bot) {
        /** @private @type {TelegramBot} */
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
            const userLang = ['en', 'nl', 'uk'].includes(language_code) ? language_code : 'en';
            i18n.setLocale(userLang);

            await this.bot.sendMessage(chatId, i18n.__('command_start', { first_name }), {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: i18n.__('btn_yes'), callback_data: '_go' },
                            { text: i18n.__('btn_no'), callback_data: '_cancel' },
                        ],
                    ],
                },
                reply_to_message_id: message_id,
            });

            await saveUserData(userId, { first_name, language_code: userLang });
        });
    }

    handleAbout() {
        const regex = new RegExp(`^${BOT_COMMANDS.ABOUT}$`);
        this.bot.onText(regex, async msg => {
            const { language_code } = await loadUserData(msg.from.id);
            i18n.setLocale(language_code || 'en');

            await this.bot.sendMessage(msg.chat.id, i18n.__('command_about'), {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: i18n.__('btn_new_search'), callback_data: '_go' }]],
                },
            });
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
            const { language_code } = await loadUserData(msg.from.id);
            i18n.setLocale(language_code || 'en');

            await this.bot.sendMessage(msg.chat.id, `${i18n.__('command_link')} ${SELENIUM}`, {
                reply_markup: {
                    inline_keyboard: [[{ text: i18n.__('btn_new_search'), callback_data: '_go' }]],
                },
            });
        });
    }

    handleFavorites() {
        const regex = new RegExp(`^${BOT_COMMANDS.FAVORITES}$`);
        this.bot.onText(regex, async msg => {
            const { language_code } = await loadUserData(msg.from.id);
            i18n.setLocale(language_code || 'en');
            const { favorite_stops } = await loadUserData(msg.from.id);
            const favoritesLen = favorite_stops ? favorite_stops.length : 0;

            await this.bot.sendMessage(msg.chat.id, i18n.__('command_favorites'));

            if (favoritesLen) {
                await this.bot.sendMessage(
                    msg.chat.id,
                    i18n.__('command_favorites_length', { length: `${favoritesLen}` })
                );

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
                      { text: i18n.__('btn_add_favorites'), callback_data: '_add_favorites' },
                      { text: i18n.__('btn_delete_favorites'), callback_data: '_delete_favorites' },
                  ]
                : [{ text: i18n.__('btn_add_favorites'), callback_data: '_add_favorites' }];

            await this.bot.sendMessage(msg.chat.id, i18n.__('command_favorites_add_or_delete'), {
                reply_markup: { inline_keyboard: [actionBtns] },
            });
        });
    }
}

module.exports = CommandHandler;
