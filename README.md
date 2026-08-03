# CR-Spy-Bot
Discord bot written in Node.js that constantly checks if any friends recently played a match through the official Clash Royale API.
If the bot finds that a friend played recently, it sends a direct message notification on Discord. Friend lists for each user are saved through a SQLite database.


## Running the application
Download the source code from the repository and compile all the source code, rename config-example.js to config.js, fill in the data in config.js, then run index.js.

* config.token: [Discord bot token](https://discord.com/developers/docs/getting-started)
* config.cr_key: [Clash Royale API key](https://developer.clashroyale.com/#/getting-started)
* Run in background on Linux (recommended): `pm2 start cr-spy-bot-pm2.json`
* Run (not recommended): `node index.js`


## Dependencies
* [Node.js](https://nodejs.org/en/)
* [Discord.js](https://discord.js.org/#/)
* [Node Fetch](https://www.npmjs.com/package/node-fetch)
* [Better SQLite3](https://www.npmjs.com/package/better-sqlite3)
* [PM2](https://www.npmjs.com/package/pm2) (optional)
