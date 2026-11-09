require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  ownerId: process.env.OWNER_ID || null,
  lastfmApiKey: process.env.LASTFM_API_KEY || null,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID || null,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET || null,
  openaiApiKey: process.env.OPENAI_API_KEY || null,
  embedColor: 0x2b2d31,
  currency: '🪙',
};
