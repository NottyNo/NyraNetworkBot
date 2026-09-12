# NyraNetworkBot

Personal Discord bot built with [discord.js](https://discord.js.org/) for my own server - moderation and utility commands, with a leveling system on the way.

##  Features

###  Moderation
- `/ban` - Ban a user from the server, with an optional reason
- `/timeout` - Temporarily timeout a user

###  Utility
- `/echo` - Replies with your input (optionally ephemeral)
- `/ping` - Check the bot's latency
- `/server` - Get information about the current server
- `/user` - Get information about a user

###  In progress
- **Leveling system** - XP and level tracking for server members

##  Project structure

```
src/
├── commands/
│   ├── moderation/
│   │   ├── banUser.js
│   │   └── timeoutUser.js
│   └── utility/
│       ├── echo.js
│       ├── ping.js
│       ├── server.js
│       └── user.js
├── events/
│   ├── interactionCreate.js
│   └── ready.js
├── deploy-commands-global.js
├── deploy-commands-guild.js
├── delete-commands.js
└── index.js
```

- **`commands/`** - Slash command files, grouped by category. Each one exports `data` (command definition) and `execute` (handler).
- **`events/`** - Event listeners (bot ready, interaction handling).
- **`deploy-commands-guild.js`** - Registers commands to my server only (instant, used for day-to-day dev/testing).
- **`deploy-commands-global.js`** - Registers commands globally (rarely needed, propagation takes up to an hour).
- **`delete-commands.js`** - Unregisters commands when cleaning up.
- **`index.js`** - Bot entry point.

##  Local setup notes

1. `npm install`
2. `.env` needs:
   ```env
   DISCORD_TOKEN=...
   CLIENT_ID=...
   GUILD_ID=...
   ```
3. Adjust `config.json` as needed.
4. Deploy commands: `node src/deploy-commands-guild.js`
5. Run: `node src/index.js`

## Roadmap

- [ ] Leveling system (XP gain, level-ups, leaderboard)
- [ ] Additional moderation tools
- [ ] More utility commands
