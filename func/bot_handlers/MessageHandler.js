const { BOT_COMMANDS } = require('../../dict/botTexts');
const findStop = require('../../utils/findStop');
const { loadUserData } = require('../../utils/dbFuncs');
const i18n = require('i18n');
const { getSearchResults } = require('../../utils/getSearchResults');

/** @typedef {import('node-telegram-bot-api')} TelegramBot */

class MessageHandler {
    /** @param {TelegramBot} bot - Telegram Bot instance */
    constructor(bot) {
        /** @private @type {TelegramBot} */
        this.bot = bot;
    }

    initialize() {
        this.bot.on('message', async msg => {
            const userData = await loadUserData(msg.from.id);
            // skip handling menu commands:
            if (Object.values(BOT_COMMANDS).includes(msg.text)) {
                return;
            }
            if (['Done', 'Готово', 'Klaar'].includes(msg.text)) {
                await this.handleDone(msg, userData);
            } else {
                await this.handleRest(msg, userData);
            }
        });
    }

    async handleDone(msg, userData) {
        const {
            from: { first_name = 'buddy' },
            chat: { id: chatId },
        } = msg;
        await this.bot.sendMessage(
            chatId,
            i18n.__(
                { phrase: 'msg_done', locale: userData?.language_code || 'en' },
                { first_name }
            ),
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: i18n.__({
                                    phrase: 'btn_new_search',
                                    locale: userData?.language_code || 'en',
                                }),
                                callback_data: '_go',
                            },
                        ],
                    ],
                },
            }
        );
    }
    async handleRest(msg, userData) {
        const {
            text,
            chat: { id: chatId },
            date,
        } = msg;
        const { direction, language_code = 'en' } = userData;

        const { result, isExact } = findStop(text);

        if (!result) {
            await this.bot.sendMessage(
                chatId,
                i18n.__({ phrase: 'query_unknown', locale: language_code })
            );
        } else {
            if (isExact) {
                const [_, searchResult] = await Promise.all([
                    this.bot.sendMessage(
                        chatId,
                        i18n.__({ phrase: 'query_guess_correct', locale: language_code })
                    ),
                    getSearchResults({ date, direction, stop: text, lang: language_code }),
                ]);
                await this.bot.sendMessage(chatId, searchResult, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [
                            [{ text: i18n.__({ phrase: 'btn_done', locale: language_code }) }],
                        ],
                        remove_keyboard: true,
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                });
            } else {
                await this.bot.sendMessage(
                    chatId,
                    `${i18n.__({ phrase: 'msg_not_sure', locale: language_code })} *${result}*`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: i18n.__({ phrase: 'btn_yes', locale: language_code }),
                                        callback_data: '_guess_correct',
                                    },
                                    {
                                        text: i18n.__({ phrase: 'btn_no', locale: language_code }),
                                        callback_data: '_guess_incorrect',
                                    },
                                ],
                            ],
                        },
                    }
                );
            }
        }
    }
}

module.exports = MessageHandler;
