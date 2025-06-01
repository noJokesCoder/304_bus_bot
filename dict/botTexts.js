const BOT_COMMANDS = {
    START: '/start',
    LINK: '/link',
    ABOUT: '/about',
    FAVORITES: '/favorites',
    LANG: '/lang',
};

const BOT_QUERIES = {
    ADD_FAVORITES: '_add_favorites',
    DELETE_FAVORITES: '_delete_favorites',
    GO: '_go',
    CANCEL: '_cancel',
    LANG_EN: '_en',
    LANG_NL: '_nl',
    LANG_UK: '_uk',
    ZWOLLE: '_zwolle',
    APELDOORN: '_apeldoorn',
    GUESS_CORRECT: '_guess_correct',
    GUESS_INCORRECT: '_guess_incorrect',
    // Special patterns for dynamic queries
    FAVORITE_STOP: '#stop#', // matches #anytext#
    SELECT_FAVORITE: '##stop##', // matches ##anytext##
};

module.exports = { BOT_COMMANDS, BOT_QUERIES };
