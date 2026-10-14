# NyraNetworkBot

Private Discord bot for NyraNetwork. Built with Node.js, discord.js v14 and better-sqlite3, it handles moderation, activity-based leveling, giveaways, welcome messages and server statistics.

This repository is maintained for NyraNetwork only and is not intended for public deployment.

## Commands

`<argument>` means required; `[argument]` means optional. Names below match the slash commands in the code.

### Moderation

| Command | Behavior | Default member permission |
| --- | --- | --- |
| `/ban <target> [reason]` | Ban a member. | Ban Members |
| `/timeout <target> <duration> [reason]` | Apply a timeout using a preset duration. | Moderate Members |
| `/warn <target> <reason>` | Store a manual warning. | Moderate Members |
| `/unwarn <target> [warn_id] [all] [type]` | Remove a specific warning, the latest matching warning, or all matching warnings. | Moderate Members |
| `/cleanchat <amount>` | Delete up to 100 recent messages, skipping messages older than 14 days. | Manage Messages |
| `/mute <target>` | Server-mute a member in voice. | Mute Members |
| `/unmute <target>` | Remove a server voice mute. | Mute Members |
| `/addxp <target> <amount>` | Add XP and recalculate the level. | Moderate Members |
| `/removexp <target> <amount>` | Remove XP without going below zero and recalculate the level. | Moderate Members |

Timeout choices range from 60 seconds to two weeks. Warning types are `manual`, `spam` and `bannedword`.

### Server management

These commands declare Manage Server as their default member permission.

| Command | Behavior |
| --- | --- |
| `/setlevelchannel <channel>` | Save the destination for text and voice level-up messages. |
| `/setwelcomechannel <channel>` | Save the destination for welcome messages. |
| `/setupstats` | Create the configured statistics channels if none are recorded for the server. |
| `/refreshstats` | Create, rename or remove statistics channels to match the configuration. |

Both announcement destinations are stored per server and survive restarts. Level-up messages remain off until a level channel is selected; XP still accumulates. Welcome messages require a selected welcome channel.

### Giveaways

Giveaway commands declare Manage Server as their default member permission.

| Command | Behavior |
| --- | --- |
| `/giveaway create <prize> <duration> [options]` | Post a giveaway with an entry button in the current channel. |
| `/giveaway end <giveaway_id>` | End an active giveaway early. |
| `/giveaway reroll <giveaway_id> [count]` | Select replacement winners, excluding previously selected winners. |
| `/giveaway list` | List active giveaways in the server. |

Durations accept seconds, minutes, hours and days, such as `30m`, `12h` or `1d12h`, with a minimum of 10 seconds. The default winner count is one.

Optional creation fields:

| Option | Purpose |
| --- | --- |
| `winners` | Number of winners to select. |
| `role` | Required server role. |
| `min_level` | Minimum stored level. |
| `min_messages_today` | Minimum messages sent during the current UTC day. |
| `min_account_age_days` | Minimum account age in days. |
| `min_server_age_days` | Minimum time since joining the server, in days. |

Requirements are checked when a member enters. Winner selection uses the stored entries. The scheduler checks for expired giveaways every 30 seconds while the bot is running.

### Utility

| Command | Behavior |
| --- | --- |
| `/help` | List loaded commands by folder category. |
| `/rank [target]` | Show level, total XP and progress toward the next level; defaults to the caller. |
| `/leaderboard` | Show the server's 10 highest XP totals. |
| `/warnings <target>` | Show stored warnings, newest first, with at most 20 displayed. |
| `/user [target] [ephemeral]` | Show user information, with an optional private reply. |
| `/server [target]` | Show `play.nyra.network`, optionally mentioning a user. |
| `/getajob [user]` | Send the job image and mention the selected user, or the caller if omitted. |

## Automatic behavior

### Text and voice leveling

- Text messages award 15 to 25 XP at the default multiplier, with a 60-second cooldown per user per server.
- Voice sessions award 5 base XP per minute when a member leaves voice. Sessions shorter than one minute earn nothing.
- Both sources use the highest applicable role multiplier, with the configured default as the minimum. Multipliers do not stack.
- XP is cumulative. Advancing from level `L` requires `5 * L^2 + 50 * L + 100` additional XP.
- Text and voice level-ups send announcements to the saved level channel. Manual XP commands reply to the command instead.
- On startup, voice tracking restarts for connected members. Time from before the restart is not carried forward.

Daily message counts are tracked separately from the XP cooldown and use UTC dates for giveaway requirements.

### Automod

Bots and members with Moderate Members permission are exempt. Automod attempts to delete triggering messages, stores warnings and sends the member a DM.

| Trigger | Response |
| --- | --- |
| A configured banned word or phrase | Record a `bannedword` warning. At three or more total stored warnings, attempt a 10-minute timeout. |
| More than five messages within five seconds | Record a `spam` warning and attempt a one-minute timeout. |
| Three consecutive identical nonempty messages within five seconds | Record a `spam` warning and attempt a one-minute timeout. |

Banned-word matching is case-insensitive and checks letter/number boundaries. Spam triggers have a 10-second cooldown. Spam warnings are scheduled for deletion five minutes after the latest spam trigger; these timers exist only while the process is running.

### Welcome messages and statistics

New members receive a welcome embed in the saved welcome channel, using `src/images/welcome.png`. The greeting text is defined in `src/events/guildMemberAdd-welcome.js`.

Statistics channels display member and bot counts alongside the configured Minecraft IP and invite text. Member joins and departures trigger count updates. A guild-join event also attempts to create the statistics channels.

## Configuration and storage

| Location | Contents |
| --- | --- |
| `src/config/config.json` | Local bot token, application ID and guild deployment ID; ignored by Git. |
| `src/config/bannedWords.json` | Local `words` array used by automod; ignored by Git. |
| `src/config/xpMultipliers.json` | Role multipliers and the default multiplier. |
| `src/config/statChannels.json` | Statistics category, counters and static channel labels. |
| `src/config/colors.json` | Shared embed color. |
| `data/nyra.db` | SQLite database; the data directory is ignored by Git. |

The database stores warnings, XP and levels, voice sessions, statistics channel IDs, giveaways, entries, daily message counts and server settings. The level-channel schema upgrade preserves existing welcome-channel settings.

Configuration is read from JSON files directly. The `/server` IP and welcome greeting are defined in source code, independently of the statistics labels. Announcement channel choices are stored in the database rather than JSON.

## Repository structure

```text
src/
  commands/moderation/   Moderation, giveaways and server management
  commands/utility/     Help, ranks, user information and image commands
  config/               JSON configuration
  database/             SQLite initialization and schema upgrades
  events/               Discord event handlers and scheduled work
  images/               Welcome and job images
  scripts/              Command deletion and level recalculation tools
  utils/                Shared XP, moderation, giveaway and statistics logic
  index.js              Client initialization and command/event loading
  deploy-commands-guild.js
  deploy-commands-global.js
tests/
  level-channel.test.js  Database upgrade and level-channel regression tests
```

The level-channel tests cover migration, per-server channel selection, channel permission rejection, and text/voice announcement routing without connecting to Discord. The level repair script recalculates stored levels from total XP.
