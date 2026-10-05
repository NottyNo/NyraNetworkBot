# NyraNetworkBot

Personal Discord bot built with [discord.js](https://discord.js.org/) for a friends' server: moderation, leveling, giveaways and utility commands.

## Setup

1. Install dependencies: `npm install`
2. Copy `src/config/config.example.json` to `src/config/config.json` and fill in your values.
3. Copy `src/config/bannedWords.example.json` to `src/config/bannedWords.json` and add your words.
4. Edit `src/config/xpMultipliers.json` (role IDs) and `src/config/settings.json` (level-up channel ID).
5. Register the slash commands: `npm run deploy:guild` (or `npm run deploy:global`).
6. Start the bot: `npm start`

## Features

### Moderation
- `/ban target [reason]` - Ban a user from the server
- `/timeout target duration [reason]` - Temporarily timeout a user
- `/warn target reason` - Warn a user
- `/unwarn target [warn_id] [all] [type]` - Remove one or more warnings
- `/cleanchat amount` - Remove a number of recent messages from a channel
- `/addxp target amount` - Add XP to a user
- `/removexp target amount` - Remove XP from a user
- `/mute target` - Voice mute a user
- `/unmute target` - Remove a voice mute
- `/giveaway create|end|reroll|list` - Create and manage giveaways with entry requirements
- `/setwelcomechannel channel` - Set where welcome messages are sent
- `/setupstats` - Create the stats channels (members, bots, server IP, invite)
- `/refreshstats` - Sync stats channels with the current config

### Utility
- `/leaderboard` - Top 10 users by XP
- `/rank [target]` - Level and XP info for yourself or another user
- `/server [target]` - Minecraft server IP
- `/user [target]` - Info about a user
- `/warnings target` - A user's warning history
- `/help` - List all commands
- `/getajob [user]` - Get a j*b

### Automod
- Banned word filter (whole-word matching) and spam detection
- Moderators (Moderate Members permission) are exempt
- Three warnings result in a 10 minute timeout

## Roadmap

- [x] Leveling system (XP gain, level-ups, leaderboard)
- [x] Additional moderation tools
- [x] More utility commands
- [x] Giveaway functionality
- [x] Welcome messages
