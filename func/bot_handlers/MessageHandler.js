const { BOT_COMMANDS } = require('../../dict/botTexts');
const findStop = require('../../utils/findStop');

/** @typedef {import('node-telegram-bot-api')} TelegramBot */

class MessageHandler {
    /** @param {TelegramBot} bot - Telegram Bot instance */
    constructor(bot) {
        /** @private @type {TelegramBot} */
        this.bot = bot;
    }

    initialize() {
        this.bot.on('message', async msg => {
            // skip handling menu commands:
            if (Object.values(BOT_COMMANDS).includes(msg.text)) {
                return;
            }
            if (/^Done$/.test(msg.text)) {
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
        await this.bot.sendMessage(
            chatId,
            `Great! I hope I was helpful, ${first_name}!` +
                ' If you need to search for another bus stop, just hit New Search button.',
            {
                reply_markup: {
                    inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]],
                },
            }
        );
    }
    async handleRest(msg) {
        const {
            text,
            chat: { id: chatId },
        } = msg;
        const { result, isExact } = findStop(text);

        if (!result) {
            // TODO: think on a better approach for unknown commands & queries
            await this.bot.sendMessage(chatId, `You said: ${text}. I dont know such a command`);
        } else {
            await this.bot.sendMessage(
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
}

module.exports = MessageHandler;
