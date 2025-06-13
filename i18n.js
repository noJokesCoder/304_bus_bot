const i18n = require('i18n');
const path = require('path');

i18n.configure({
    locales: ['en', 'nl', 'uk'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'en',
    objectNotation: true,
    register: global,
    missingKeyFn: (locale, value) => {
        // Handle missing translations
        console.warn(`Missing translation for key "${value}" in locale "${locale}"`);
        return value;
    },
});

module.exports = i18n;
