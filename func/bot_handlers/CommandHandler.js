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

            await this.bot.sendMessage(
                chatId,
                i18n.__({ phrase: 'command_start', locale: userLang }, { first_name }),
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: i18n.__({ phrase: 'btn_yes', locale: userLang }),
                                    callback_data: '_go',
                                },
                                {
                                    text: i18n.__({ phrase: 'btn_no', locale: userLang }),
                                    callback_data: '_cancel',
                                },
                            ],
                        ],
                    },
                    reply_to_message_id: message_id,
                }
            );

            await saveUserData(userId, { first_name, language_code: userLang });
        });
    }

    handleAbout() {
        const regex = new RegExp(`^${BOT_COMMANDS.ABOUT}$`);
        this.bot.onText(regex, async msg => {
            const { language_code = 'en' } = await loadUserData(msg.from.id);

            await this.bot.sendMessage(
                msg.chat.id,
                i18n.__({ phrase: 'command_about', locale: language_code }),
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: i18n.__({
                                        phrase: 'btn_new_search',
                                        locale: language_code,
                                    }),
                                    callback_data: '_go',
                                },
                            ],
                        ],
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
            const { language_code = 'en' } = await loadUserData(msg.from.id);

            await this.bot.sendMessage(
                msg.chat.id,
                `${i18n.__({ phrase: 'command_link', locale: language_code })} ${SELENIUM}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: i18n.__({
                                        phrase: 'btn_new_search',
                                        locale: language_code,
                                    }),
                                    callback_data: '_go',
                                },
                            ],
                        ],
                    },
                }
            );
        });
    }

    handleFavorites() {
        const regex = new RegExp(`^${BOT_COMMANDS.FAVORITES}$`);
        this.bot.onText(regex, async msg => {
            const { language_code = 'en' } = await loadUserData(msg.from.id);

            const { favorite_stops } = await loadUserData(msg.from.id);
            const favoritesLen = favorite_stops ? favorite_stops.length : 0;

            await this.bot.sendMessage(
                msg.chat.id,
                i18n.__({ phrase: 'command_favorites', locale: language_code })
            );

            if (favoritesLen) {
                await this.bot.sendMessage(
                    msg.chat.id,
                    i18n.__(
                        { phrase: 'command_favorites_length', locale: language_code },
                        { length: `${favoritesLen}` }
                    )
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
                      {
                          text: i18n.__({ phrase: 'btn_add_favorites', locale: language_code }),
                          callback_data: '_add_favorites',
                      },
                      {
                          text: i18n.__({ phrase: 'btn_delete_favorites', locale: language_code }),
                          callback_data: '_delete_favorites',
                      },
                  ]
                : [
                      {
                          text: i18n.__({ phrase: 'btn_add_favorites', locale: language_code }),
                          callback_data: '_add_favorites',
                      },
                  ];

            await this.bot.sendMessage(
                msg.chat.id,
                i18n.__({ phrase: 'command_favorites_add_or_delete', locale: language_code }),
                { reply_markup: { inline_keyboard: [actionBtns] } }
            );
        });
    }
}

module.exports = CommandHandler;
