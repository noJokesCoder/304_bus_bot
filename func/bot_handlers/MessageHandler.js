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
            i18n.setLocale(userData?.language_code || 'en');
            // skip handling menu commands:
            if (Object.values(BOT_COMMANDS).includes(msg.text)) {
                return;
            }
            if (['Done', 'Готово', 'Klaar'].includes(msg.text)) {
                await this.handleDone(msg);
            } else {
                await this.handleRest(msg, userData);
            }
        });
    }

    async handleDone(msg) {
        const {
            from: { first_name = 'buddy' },
            chat: { id: chatId },
        } = msg;
        await this.bot.sendMessage(chatId, i18n.__('msg_done', { first_name }), {
            reply_markup: {
                inline_keyboard: [[{ text: i18n.__('btn_new_search'), callback_data: '_go' }]],
            },
        });
    }
    async handleRest(msg, userData) {
        const {
            text,
            chat: { id: chatId },
            date,
        } = msg;
        const { direction, language_code = 'en' } = userData;

        const { result, isExact } = findStop(text);

        console.log(msg);

        if (!result) {
            await this.bot.sendMessage(chatId, i18n.__('query_unknown'));
        } else {
            if (isExact) {
                const [_, searchResult] = await Promise.all([
                    this.bot.sendMessage(chatId, i18n.__('query_guess_correct')),
                    getSearchResults({ date, direction, stop: text, lang: language_code }),
                ]);
                await this.bot.sendMessage(chatId, searchResult, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [[{ text: i18n.__('btn_done') }]],
                        remove_keyboard: true,
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                });
            } else {
                await this.bot.sendMessage(chatId, `${i18n.__('msg_not_sure')} *${result}*`, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: i18n.__('btn_yes'), callback_data: '_guess_correct' },
                                { text: i18n.__('btn_no'), callback_data: '_guess_incorrect' },
                            ],
                        ],
                    },
                });
            }
        }
    }
}

module.exports = MessageHandler;
