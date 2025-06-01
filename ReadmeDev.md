# Information for developer:

## Callback Data:

**Is mostly used for inline buttons (the ones attached to a bot message).**

- all queries, exceppt ones dealing with favorites, start with '\_' (underscore)
- when query starts & ends with '#' - it's a query for saving a favorite stop to DB
- when query starts & ends with '##' - it's a query for starting a search based on a favorite stop
- when query starts with '#!' & ends with '!#' - it's a query for deleting a favorite stop from DB

---

_Example for query handler:_

```js
bot.on('callback_query', query => {}); // handle query
```

---

## Bot Commands:

**May be found in bot menu:**

- `/start` - starts interaction with a bot
- `/about` - information about the bot
- `/lang` - sets a language for bot replies. Supported languages are: _Ukrainian_, _English_ and _Dutch_,
- `/favorites` - saves favorite stops to DB for a faster search
- `/link` - returns a link from where the bus departure times are parsed

---

_Example for command handler:_

```js
bot.on('message', msg => {}); // handle message
```

---

### Post deployment action:

**Run the command to set up a webhook:**

```bash
curl -F "url={APP_URL}/bot" https://api.telegram.org/{TOKEN}/setWebhook
```
