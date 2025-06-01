const Bot = require('node-telegram-bot-api');
const QueryHandler = require('./bot_handlers/QueryHandler');
const MessageHandler = require('./bot_handlers/MessageHandler');
const CommandHandler = require('./bot_handlers/CommandHandler');

class TelegramBot {
    constructor({ token, isDevelopment, url }) {
        this.bot = new Bot(token, { polling: isDevelopment, webHook: !isDevelopment });
        this.webhookUrl = url ? `${url}/bot` : '';

        // Initialize handlers
        this.commandHandler = new CommandHandler(this.bot);
        this.queryHandler = new QueryHandler(this.bot);
        this.messageHandler = new MessageHandler(this.bot);

        this.initializeBot(isDevelopment);
    }

    initializeBot(isDevelopment) {
        this.setCommands();
        this.setEventHandlers();
        this.setErrorHandlers();
        // only on PROD:
        !isDevelopment && this.setWebhook();
    }

    setCommands() {
        // Menu commands:
        this.bot.setMyCommands([
            { command: '/start', description: 'Search for a bus from your bus-stop' },
            { command: '/about', description: 'Get info about this bot' },
            { command: '/lang', description: 'Set the language for bots replies' },
            { command: '/favorites', description: 'Set favorite stops for quick search' },
            { command: '/link', description: 'Get the link for an official #304 bus website' },
        ]);
    }

    setEventHandlers() {
        this.commandHandler.initialize();
        this.queryHandler.initialize();
        this.messageHandler.initialize();
    }

    setErrorHandlers() {
        this.bot.on('webhook_error', error => {
            console.error('Webhook error:', error);
        });

        this.bot.on('polling-error', error => {
            console.error('Polling error:', error);
        });
    }

    setWebhook() {
        if (this.webhookUrl) {
            this.bot.setWebHook(this.webhookUrl);
        }
    }

    getBot() {
        return this.bot;
    }
}

module.exports = TelegramBot;
