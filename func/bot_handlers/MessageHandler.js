const { BOT_COMMANDS } = require('../../dict/botTexts');
const findStop = require('../../utils/findStop');
const { loadUserData } = require('../../utils/dbFuncs');
const i18n = require('i18n');

/** @typedef {import('node-telegram-bot-api')} TelegramBot */

class MessageHandler {
    /** @param {TelegramBot} bot - Telegram Bot instance */
    constructor(bot) {
        /** @private @type {TelegramBot} */
        this.bot = bot;
    }

    initialize() {
        this.bot.on('message', async msg => {
            const { language_code } = await loadUserData(msg.from.id);
            i18n.setLocale(language_code || 'en');
            // skip handling menu commands:
            if (Object.values(BOT_COMMANDS).includes(msg.text)) {
                return;
            }
            if (['Done', 'Готово', 'Klaar'].includes(msg.text)) {
                await this.handleDone(msg);
            } else {
                await this.handleRest(msg);
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
    async handleRest(msg) {
        const {
            text,
            chat: { id: chatId },
        } = msg;
        const { result, isExact } = findStop(text);

        if (!result) {
            await this.bot.sendMessage(chatId, i18n.__('query_unknown'));
        } else {
            let msgOption = {};
            let msgText = '';

            if (isExact) {
                msgText = i18n.__('query_guess_correct');
            } else {
                msgText = `${i18n.__('msg_not_sure')} *${result}*`;
                msgOption = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: i18n.__('btn_yes'), callback_data: '_guess_correct' },
                                { text: i18n.__('btn_no'), callback_data: '_guess_incorrect' },
                            ],
                        ],
                    },
                };
            }

            await this.bot.sendMessage(chatId, msgText, msgOption);
        }
    }
}

module.exports = MessageHandler;
