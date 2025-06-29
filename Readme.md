# Telegram Bot for Bus #304 (Zwolle <=> Apeldoorn) Timetables

![Selenium](https://img.shields.io/badge/Selenium-43B02A?style=flat&logo=selenium&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat&logo=express&logoColor=61DAFB)
![Telegram](https://img.shields.io/badge/Telegram_Bot_API-26A5E4?style=flat&logo=telegram&logoColor=white)
![i18n](https://img.shields.io/badge/i18n-localization-blueviolet?style=flat&logo=translate)
![Cron](https://img.shields.io/badge/Cron-Scheduled%20Task-9cf?style=flat&logo=cron)

A Telegram bot that helps users quickly find departure times for bus #304 running between Zwolle and Apeldoorn (Netherlands). The bot fetches real-time data from the official RRReis website using Selenium automation.

## Features

- Real-time bus departure times
- Favorite stops management
- Multi-language support (🇺🇸 English, 🇳🇱 Dutch, 🇺🇦 Ukrainian)
- Quick access to official timetable website

## Bot Commands

- `/start` - Start interaction with the bot
- `/about` - Get information about bot features
- `/lang` - Set your preferred language
- `/favorites` - Manage your favorite bus stops
- `/link` - Get the official RRReis timetable link

## How It Works

1. Select your preferred language
2. Choose your departure stop (or save it as a favorite)
3. Select direction (Zwolle or Apeldoorn)
4. Get the next available departure times

The bot will show you:

- Upcoming departures for the current hour
- Next available departures for the following hour
- Special messages for off-hours (1 AM - 4 AM)

## Technologies

- Node.js
- Selenium WebDriver
- Telegram Bot API

## Try It Out

Search for "@bus_304_bot" on Telegram or click 👉 [here](https://t.me/bus_304_bot) to start using the bot.
