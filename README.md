# Fqce Tool

A Discord bot by **fqce** - utility, media, fun, games, social lookups, music, family, giveaways and server tools in one package.

## Features

- **Fun** - `/fun` - 8ball, roast, rizz, rate, ship, say, coinflip, math, urban dictionary, lyrics, emojimix, petpet
- **Games** - `/games` - tictactoe, rock-paper-scissors, cookie clicker (button-based, multiplayer)
- **Social** - `/social` - Roblox (user, avatar, game, past usernames, groups), TikTok user lookup, YouTube search
- **Media** - `/media` - grayscale, invert, blur, pixelate, flip, meme, deepfry, spin (GIF)
- **Music** - `/lastfm` - now playing, latest scrobbles, top artists/tracks/albums, artist plays (needs a Last.fm API key)
- **Utility** - `/util` - define, translate, base64, QR codes, color inspector, crypto prices, weather, polls, reminders, custom tags
- **Family** - `/family` - marry, divorce, adopt, disown, runaway, family profiles, relationships, family trees
- **Giveaway** - `/giveaway` - start, end, reroll, cancel, list (button entry)
- **Info** - `/info` - ping, about, credits, avatar, banner, serverinfo, userinfo, invite, help
- **Customize** - `/customize` - bot nickname per server
- **Staff** - `/staff` - lock/unlock commands, DM users, analytics, blacklist (owner)

## Setup

1. Install Node.js 18.17+ (Node 20+ recommended).
2. `npm install`
3. Copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN` - from the [Discord Developer Portal](https://discord.com/developers/applications) -> your app -> Bot -> Reset Token
   - `CLIENT_ID` - your app -> General Information -> Application ID
   - Optional: `GUILD_ID` (instant command registration in one test server), `OWNER_ID`, `LASTFM_API_KEY`, `SPOTIFY_CLIENT_ID`/`SECRET`, `OPENAI_API_KEY`
4. In the Developer Portal -> Bot, enable the **Message Content**, **Server Members** and **Presence** privileged intents.
5. Register the slash commands: `npm run deploy`
6. Run the bot: `npm start`
7. Invite it with: `https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands`

## Keeping it online (hosting)

The bot needs a machine that stays on:

- **Railway / Render / Fly.io** - easiest; free or ~$5/mo tiers. Push this folder, set the env vars in their dashboard, done.
- **A VPS** (Hetzner, Oracle free tier, ~$4/mo) - full control; run with `pm2 start src/index.js --name fqce-tool`.
- **A Raspberry Pi or old laptop at home** - free; run with pm2 and it restarts on boot.

Credit: built and maintained by **fqce**.
