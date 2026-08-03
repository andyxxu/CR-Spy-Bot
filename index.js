const djs = require("discord.js");
const { MessageEmbed } = require('discord.js');
const client = new djs.Client({
    intents: [
        "GUILDS",
        "GUILD_MESSAGES",
        "DIRECT_MESSAGES"
    ]
});
const config = require('./config');
const fetch = require("node-fetch");
const myInit = {
    method: 'GET',
    headers: {
        "Authorization": "Bearer " + config.cr_key,
    },
    mode: 'cors',
    cache: 'default'
};
const pfp = 'https://cdn.discordapp.com/avatars/958103047886766120/f9f7d78383a2a01e43f0b8f36eda4c52.png';
const helpEmbed = new MessageEmbed()
    .setAuthor({ name: 'HEHEHEHA', iconURL: pfp })
    .setTitle("Command List")
    .setDescription('c!spy, c!stop, c!list')
    .setThumbnail(pfp)
    .addFields(
        { name: '\u200B', value: '\u200B' },
        { name: 'c!spy', value: 'Add a player to your watchlist: `c!spy <tag>`', inline: true },
        { name: 'c!stop', value: 'Stop watching a player: `c!stop <tag>`', inline: true },
        { name: 'c!list', value: 'List your current targets', inline: true },
    )
    .setFooter({ text: 'HEHEHEHA', iconURL: pfp });
const listEmbed = new MessageEmbed()
    .setColor(0x0099FF)
    .setTitle("Current Watchlist")
    .setThumbnail(pfp);
const db = require('./db');
const msPerMin = 60000;

process.on('unhandledRejection', (err) => {
    console.error('Unhandled promise rejection:', err);
    process.exit(1); // let PM2 restart cleanly
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

async function spy(player_tag) {
    const cooldown = await checkTarget(player_tag);
    console.log(`Cooldown (m) for ${player_tag}: ${cooldown/msPerMin}`);
    setTimeout(spy, cooldown, player_tag);
}
const player_tags = db.getPlayerTags();
for (let i = 0; i < player_tags.length; i++) {
    setTimeout(spy, 5000, player_tags[i]); // wait 5 seconds on startup
}

async function checkTarget(target) {
    let minuteDiff = 5;
    try {
        const json = await fetch("https://api.clashroyale.com/v1/players/%23" + target + "/battlelog", myInit).then(safeParseJSON);
        if (json.length > 0) {
            minuteDiff = getMinDiff(json);
            console.log(`Minute difference for ${target}: ${minuteDiff}`);
        } else {
            console.log(`Target ${target} has not played for over a month`);
            return msPerMin * 60;
        }
        // Message watchers if target played recently
        if (minuteDiff < 5) {
            const ign = await getPlayerName(target);
            const msg = `${ign} (${target}) has played a ${json[0]["type"]} match in the last 5 minutes!`;
            console.log(msg);
            const users = db.getWatchers(target);
            for (let i = 0; i < users.length; i++) {
                const user = await client.users.fetch(users[i]);
                if (!user) {
                    console.log("User not found");
                    return 30 * msPerMin;
                }
                user.send(msg).catch(() => {
                    console.log("User has DMs closed or no mutual servers with the bot");
                    return;
                });
            }
            return 30 * msPerMin; // half hour cooldown if target played recently
        }
    } catch (err) {
        return 30 * msPerMin;
    }
    return 3 * msPerMin; // 3 min cooldown default
}

async function safeParseJSON(response) {
    const body = await response.text();
    try {
        return JSON.parse(body);
    } catch (err) {
        console.error("Error:", err);
        console.error("Response body:", body);
        // throw err
        return ReE(response, err.message, 500);
    }
}

function getMinDiff(json) {
    const battleTime = json[0]["battleTime"];
    const present = new Date();
    const year = parseInt(battleTime.substring(0, 4));
    const month = parseInt(battleTime.substring(4, 6)) - 1; // account for 0 indexed months
    const day = parseInt(battleTime.substring(6, 8));
    const hour = parseInt(battleTime.substring(9, 11)) - 4; // convert to UTC
    const minute = parseInt(battleTime.substring(11, 13));
    const second = parseInt(battleTime.substring(13, 15));
    const lastBattle = new Date(year, month, day, hour, minute, second);
    // console.log("Current time:", present);
    // console.log("Last battle time:", lastBattle);
    minuteDiff = (present - lastBattle) / 1000; // timeDiff in seconds
    return Math.round((minuteDiff / 60.0) * 100) / 100;
}

async function getPlayerName(playerTag) {
    try {
        const playerJson = await fetch("https://api.clashroyale.com/v1/players/%23" + playerTag, myInit).then(safeParseJSON);
        return playerJson.name;
    } catch (err) {
        console.error('Error fetching player name:', err);
        return null;
    }
}

client.on('ready', () => {
    client.user.setActivity("Clash Royale players", { type: "WATCHING" });
    console.log(client.user.username, 'is online.');
});

client.on('error', (err) => {
    console.error('Discord client error:', err);
});

client.on('shardDisconnect', () => {
    console.warn('Bot disconnected from Discord — attempting to reconnect...');
});

client.on('messageCreate', async (msg) => {
    if (!msg.content.startsWith(config.prefix) || msg.author.bot) return;
    // if (msg.author.bot || msg.channel.type === "dm")
    //   return;
    const messageArray = msg.content.split(' ');
    const cmd = messageArray[0].substring(2);
    let arg1 = msg.content.substring(msg.content.indexOf(' ') + 1).toUpperCase();

    switch (cmd) {
        case 'ping':
            msg.channel.send('pong!');
            break;
        case 'help':
            helpEmbed.setColor("RANDOM").setTimestamp();
            // msg.channel.send("My prefix is `c!`. Type `c!spy <tag>` to watch a player, `c!stop <tag>` to stop watching a player, and `c!list` to see your current targets!");
            msg.channel.send({ embeds: [helpEmbed] });
            break;
        case 'spy':
            if (arg1.charAt(0) == '#') {
                arg1 = arg1.substring(1);
            }
            const playerName = await getPlayerName(arg1);
            const validPlayerTag = (playerName != null);
            if (validPlayerTag) {
                const playerTags = db.getPlayerTags();
                added = db.addWatcher(arg1, msg.author.id);
                if (added) {
                    msg.channel.send(`New target ${playerName} (${arg1}) added!`);
                    if (!playerTags.includes(arg1)) {
                        spy(arg1);
                    }
                } else {
                    msg.channel.send(`Target ${playerName} (${arg1}) already tracked!`);
                }
            } else {
                msg.channel.send("Invalid player tag! Usage: `c!spy <tag>`");
            }
            break;
        case 'stop':
            deleted = db.deleteWatcher(arg1, msg.author.id);
            if (deleted) {
                msg.channel.send(`Tag ${arg1} deleted!`);
            } else {
                msg.channel.send(`Tag ${arg1} is not tracked!`);
            }
            break;
        case 'list':
            targets = db.getTargets(msg.author.id);
            if (targets.length > 0) {
                listEmbed.setAuthor({ name: `${msg.author.username}`, iconURL: msg.author.displayAvatarURL() })
                listEmbed.setDescription(targets.join(", ")).setTimestamp();
                listEmbed.setFooter({ text: `User ID: ${msg.author.id}` });
                msg.channel.send({ embeds: [listEmbed] });
                // msg.channel.send(targets.join(", "));
            } else {
                msg.channel.send("You have no targets!");
            }
            break;
    }
});

client.login(config.token);
