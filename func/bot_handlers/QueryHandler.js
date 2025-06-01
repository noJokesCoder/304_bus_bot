const { loadUserData, saveUserData } = require('../../utils/dbFuncs');
const { BOT_QUERIES } = require('../../dict/botTexts');
const { getAllStopsBtnList, getFavoritesBtnList } = require('../../utils/favorites');
const { getSearchResults } = require('../../utils/getSearchResults');

/** @typedef {import('node-telegram-bot-api')} TelegramBot */

class QueryHandler {
    /** @param {TelegramBot} bot - Telegram Bot instance */
    constructor(bot) {
        /** @private @type {TelegramBot} */
        this.bot = bot;
    }

    initialize() {
        this.bot.on('callback_query', async query => {
            await this.handleQueries(query);
        });
    }

    async handleQueries(query) {
        switch (query.data) {
            case BOT_QUERIES.ADD_FAVORITES:
            case BOT_QUERIES.DELETE_FAVORITES:
            case String(query.data.match(/^#[^#]+#$/)):
            case String(query.data.match(/^#!.+!#$/)):
                await this.handleFavorites(query);
                break;
            case BOT_QUERIES.LANG_EN:
            case BOT_QUERIES.LANG_NL:
            case BOT_QUERIES.LANG_UK:
                await this.handleLang(query);
                break;
            case BOT_QUERIES.APELDOORN:
            case BOT_QUERIES.ZWOLLE:
                await this.handleDirection(query);
                break;
            case BOT_QUERIES.GO:
                await this.handleGo(query);
                break;
            case BOT_QUERIES.CANCEL:
                await this.handleCancel(query);
                break;
            case BOT_QUERIES.GUESS_CORRECT:
            case BOT_QUERIES.GUESS_INCORRECT:
                await this.handleGuess(query);
                break;
            default:
                await this.bot.sendMessage(query.message.chat.id, 'Sorry, this command is unknown');
                break;
        }
    }

    async handleFavorites({
        from: { id: userId },
        data,
        message: {
            date,
            chat: { id: chatId },
        },
        ...rest
    }) {
        // show list for saving:
        if (data === BOT_QUERIES.ADD_FAVORITES) {
            const btnList = getAllStopsBtnList();

            await this.bot.sendMessage(
                chatId,
                'Choose from the list, and I will remember it for you, so next time you take a bus you can get it faster',
                {
                    reply_markup: {
                        inline_keyboard: btnList,
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                }
            );
        }
        // show list for deleting:
        if (data === BOT_QUERIES.DELETE_FAVORITES) {
            const { favorite_stops } = await loadUserData(userId);

            const favoriteBtns = getFavoritesBtnList(favorite_stops, true);

            await this.bot.sendMessage(chatId, 'Choose the stops to delete from your favorites:', {
                reply_markup: { inline_keyboard: favoriteBtns },
            });
        }
        // save to favorites:
        if (/^\+[^+]+\+$/.test(data)) {
            const selectedStop = data.replace(/#/g, '');

            const { favorite_stops = [] } = await loadUserData(userId);

            await saveUserData(userId, {
                // @ts-ignore
                favorite_stops: Array.from(new Set([...favorite_stops, selectedStop])),
            });
            await this.bot.sendMessage(
                chatId,
                `Great! I will remember *${selectedStop}* as your favorite bus stop. Now you may select more stops or start searching`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: 'Start search', callback_data: '_go' }]],
                    },
                }
            );
        }
        // delete from favorites:
        if (/^#!.+!#$/.test(data)) {
            const selectedStop = data.replace(/^#!|!#$/g, '');

            const { favorite_stops = [] } = await loadUserData(userId);

            await saveUserData(userId, {
                // @ts-ignore
                favorite_stops: favorite_stops.filter(stop => stop !== selectedStop),
            });

            await this.bot.sendMessage(chatId, `*${selectedStop}* was deleted from favorites`, {
                parse_mode: 'Markdown',
            });
        }
        // start search from favorites:
        if (/^#[^#]+#$/.test(data)) {
            const busStop = data.replace(/\#/g, '');
            const { direction } = await loadUserData(userId);
            const searchResult = await getSearchResults({ stop: busStop, date, direction });

            await this.bot.sendMessage(chatId, searchResult, {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [[{ text: 'Done' }]],
                    remove_keyboard: true,
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            });
        }
    }

    async handleLang({
        from: { id: userId },
        data,
        message: {
            chat: { id: chatId },
        },
    }) {
        const replyText = {
            [BOT_QUERIES.LANG_EN]: 'English language selected',
            [BOT_QUERIES.LANG_NL]: 'Nederlands taal geselecteerd',
            [BOT_QUERIES.LANG_UK]: 'Вибрано українську мову',
        };

        await this.bot.sendMessage(chatId, replyText[data], {
            reply_markup: { inline_keyboard: [[{ text: 'New Search 🔍', callback_data: '_go' }]] },
        });
        await saveUserData(userId, { language_code: data.replace('_', '') });
    }

    async handleDirection({
        from: { id: userId },
        data,
        message: {
            chat: { id: chatId },
        },
    }) {
        const { favorite_stops = [] } = await loadUserData(userId);
        let btnStops;

        // @ts-ignore
        if (favorite_stops.length) {
            btnStops = getFavoritesBtnList(favorite_stops);
        }
        await this.bot.sendMessage(
            chatId,
            'Ok, now type in the bus stop where you *depart from*:',
            {
                parse_mode: 'Markdown',
                ...(btnStops && { reply_markup: { inline_keyboard: btnStops } }),
            }
        );

        await saveUserData(userId, { direction: data.replace('_', '') });
    }

    async handleGo({ message }) {
        await this.bot.sendMessage(
            message.chat.id,
            'Choose the bus direction. Going towards Zwolle or Apeldoorn',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Zwolle', callback_data: '_zwolle' },
                            { text: 'Apeldoorn', callback_data: '_apeldoorn' },
                        ],
                    ],
                },
            }
        );
    }
    async handleCancel({ message }) {
        await this.bot.sendMessage(
            message.chat.id,
            'Okay, bye 👋' + '\n' + 'If you change your mind - open menu and hit /start command 😉',
            { parse_mode: 'Markdown' }
        );
    }
    async handleGuess({
        from: { id: userId },
        data,
        message: {
            date,
            text,
            chat: { id: chatId },
        },
    }) {
        if (data === BOT_QUERIES.GUESS_CORRECT) {
            // get text surrounded by *
            const stop = text.match(/(?<=\*)(.*?)(?=\*)/)[0].trim();
            await this.bot.sendMessage(chatId, '👌. Start searching for the bus from your stop');

            const { direction } = await loadUserData(userId);
            const searchResult = await getSearchResults({ stop, date, direction });

            await this.bot.sendMessage(chatId, searchResult, {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [[{ text: 'Done' }]],
                    remove_keyboard: true,
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            });
        }
        if (data === BOT_QUERIES.GUESS_INCORRECT) {
            await this.bot.sendMessage(chatId, 'Sorry. Try typing the bus stop again');
        }
    }
}

module.exports = QueryHandler;
