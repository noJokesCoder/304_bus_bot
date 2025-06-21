const { loadUserData, saveUserData } = require('../../utils/dbFuncs');
const { BOT_QUERIES } = require('../../dict/botTexts');
const { DIRECTIONS } = require('../../dict/seleniumTexts');
const { getAllStopsBtnList, getFavoritesBtnList } = require('../../utils/favorites');
const { getSearchResults } = require('../../utils/getSearchResults');
const { normalizeBusStop } = require('../../utils/normalizeBusStop');
const i18n = require('i18n');

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
        const userData = await loadUserData(query.from.id);

        switch (query.data) {
            case BOT_QUERIES.ADD_FAVORITES:
            case BOT_QUERIES.DELETE_FAVORITES:
            case String(query.data.match(/^#{2}.+#{2}$/)):
            case String(query.data.match(/^#!.+!#$/)):
            case String(query.data.match(/^\+[^+]+\+$/)):
                await this.handleFavorites(query, userData);
                break;
            case BOT_QUERIES.LANG_EN:
            case BOT_QUERIES.LANG_NL:
            case BOT_QUERIES.LANG_UK:
                await this.handleLang(query);
                break;
            case BOT_QUERIES.APELDOORN:
            case BOT_QUERIES.ZWOLLE:
                await this.handleDirection(query, userData);
                break;
            case BOT_QUERIES.GO:
                await this.handleGo(query, userData);
                break;
            case BOT_QUERIES.CANCEL:
                await this.handleCancel(query, userData);
                break;
            case BOT_QUERIES.GUESS_CORRECT:
            case BOT_QUERIES.GUESS_INCORRECT:
                await this.handleGuess(query, userData);
                break;
            default:
                await this.bot.sendMessage(
                    query.message.chat.id,
                    i18n.__({
                        phrase: 'query_unknown',
                        locale:
                            userData?.language_code ||
                            ['en', 'uk', 'nl'].includes(query.from.language_code)
                                ? query.from.language_code
                                : 'en',
                    })
                );
                break;
        }
    }

    async handleFavorites(query, userData) {
        const {
            from: { id: userId },
            data,
            message: {
                date,
                chat: { id: chatId },
            },
        } = query;
        const { language_code = 'en', favorite_stops = [], direction } = userData;

        // show list for saving:
        if (data === BOT_QUERIES.ADD_FAVORITES) {
            const btnList = getAllStopsBtnList();

            await this.bot.sendMessage(
                chatId,
                i18n.__({ phrase: 'query_add_favorites', locale: language_code }),
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
            const favoriteBtns = getFavoritesBtnList(favorite_stops, true);

            await this.bot.sendMessage(
                chatId,
                i18n.__({ phrase: 'query_delete_from_favorites', locale: language_code }),
                { reply_markup: { inline_keyboard: favoriteBtns } }
            );
        }
        // save to favorites:
        if (/^\+[^+]+\+$/.test(data)) {
            const selectedStop = data.replace(/\+/g, '');

            await saveUserData(userId, {
                favorite_stops: Array.from(new Set([...favorite_stops, selectedStop])),
            });
            await this.bot.sendMessage(
                chatId,
                i18n.__(
                    { phrase: 'query_save_to_favorites', locale: language_code },
                    { selectedStop: normalizeBusStop(selectedStop) }
                ),
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: i18n.__({
                                        phrase: 'btn_start_search',
                                        locale: language_code,
                                    }),
                                    callback_data: '_go',
                                },
                            ],
                        ],
                    },
                }
            );
        }
        // delete from favorites:
        if (/^#!.+!#$/.test(data)) {
            const selectedStop = data.replace(/^#!|!#$/g, '');

            await saveUserData(userId, {
                favorite_stops: favorite_stops.filter(stop => stop !== selectedStop),
            });

            await this.bot.sendMessage(
                chatId,
                i18n.__(
                    { phrase: 'query_confirm_delete_from_favorites', locale: language_code },
                    { selectedStop: normalizeBusStop(selectedStop) }
                ),
                { parse_mode: 'Markdown' }
            );
        }
        // start search from favorites:
        if (/^#{2}.+#{2}$/.test(data)) {
            const busStop = data.replace(/\#/g, '');

            const [_, searchResult] = await Promise.all([
                this.bot.sendMessage(chatId, '👌'),
                getSearchResults({ stop: busStop, date, direction, lang: language_code }),
            ]);

            await this.bot.sendMessage(chatId, searchResult, {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [[{ text: i18n.__({ phrase: 'btn_done', locale: language_code }) }]],
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
            reply_markup: {
                inline_keyboard: [[{ text: i18n.__('btn_new_search'), callback_data: '_go' }]],
            },
        });
        await saveUserData(userId, { language_code: data.replace('_', '') });
    }

    async handleDirection(query, userData) {
        const {
            from: { id: userId },
            data,
            message: {
                chat: { id: chatId },
            },
        } = query;
        const { language_code = 'en', favorite_stops = [] } = userData;
        let btnStops;

        // @ts-ignore
        if (favorite_stops.length) {
            btnStops = getFavoritesBtnList(favorite_stops);
        }
        await this.bot.sendMessage(
            chatId,
            i18n.__({ phrase: 'query_set_depart_from', locale: language_code }),
            {
                parse_mode: 'Markdown',
                ...(btnStops && { reply_markup: { inline_keyboard: btnStops } }),
            }
        );

        await saveUserData(userId, { direction: data.replace('_', '') });
    }

    async handleGo(query, userData) {
        const { message } = query;
        const { language_code = 'en' } = userData;

        await this.bot.sendMessage(
            message.chat.id,
            i18n.__({ phrase: 'query_go', locale: language_code }),
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: DIRECTIONS.ZWOLLE.toUpperCase(), callback_data: '_zwolle' },
                            {
                                text: DIRECTIONS.APELDOORN.toUpperCase(),
                                callback_data: '_apeldoorn',
                            },
                        ],
                    ],
                },
            }
        );
    }
    async handleCancel(query, userData) {
        const { message } = query;
        const { language_code = 'en' } = userData;

        await Promise.all([
            this.bot.sendMessage(message.chat.id, '👌'),
            this.bot.sendMessage(
                message.chat.id,
                i18n.__({ phrase: 'query_cancel', locale: language_code })
            ),
        ]);
    }
    async handleGuess(query, userData) {
        const {
            from: { id: userId },
            data,
            message: {
                date,
                text,
                chat: { id: chatId },
            },
        } = query;
        const { language_code = 'en', direction } = userData;

        if (data === BOT_QUERIES.GUESS_CORRECT) {
            // get text surrounded by *
            const stop = text.match(/(?<=\*)(.*?)(?=\*)/)[0].trim();
            await Promise.all([
                this.bot.sendMessage(chatId, '👌'),
                this.bot.sendMessage(
                    chatId,
                    i18n.__({ phrase: 'query_guess_correct', locale: language_code })
                ),
            ]);
            const searchResult = await getSearchResults({
                stop,
                date,
                direction,
                lang: language_code,
            });

            await this.bot.sendMessage(chatId, searchResult, {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [[{ text: i18n.__({ phrase: 'btn_done', locale: language_code }) }]],
                    remove_keyboard: true,
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            });
        }
        if (data === BOT_QUERIES.GUESS_INCORRECT) {
            await this.bot.sendMessage(
                chatId,
                i18n.__({ phrase: 'query_guess_incorrect', locale: language_code })
            );
        }
    }
}

module.exports = QueryHandler;
