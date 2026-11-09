const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../db');
const config = require('../../config');
const { embed, errorEmbed } = require('../../utils');

async function lastfm(method, params = {}) {
  if (!config.lastfmApiKey) return null;
  const qs = new URLSearchParams({ method, api_key: config.lastfmApiKey, format: 'json', ...params });
  return fetch(`https://ws.audioscrobbler.com/2.0/?${qs}`).then(r => r.json()).catch(() => null);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lastfm')
    .setDescription('Last.fm integration')
    .addSubcommand(s => s.setName('login').setDescription('Link your Last.fm account').addStringOption(o => o.setName('username').setDescription('Last.fm username').setRequired(true)))
    .addSubcommand(s => s.setName('logout').setDescription('Unlink your Last.fm account'))
    .addSubcommand(s => s.setName('nowplaying').setDescription('Get your current playing track').addStringOption(o => o.setName('username').setDescription('Last.fm username')))
    .addSubcommand(s => s.setName('latest').setDescription('View your latest scrobbles').addStringOption(o => o.setName('username').setDescription('Last.fm username')))
    .addSubcommand(s => s.setName('topartists').setDescription('Your top artists').addStringOption(o => o.setName('period').setDescription('Period').addChoices(
      { name: '7 days', value: '7day' }, { name: '1 month', value: '1month' }, { name: '12 months', value: '12month' }, { name: 'overall', value: 'overall' })))
    .addSubcommand(s => s.setName('toptracks').setDescription('Your top tracks').addStringOption(o => o.setName('period').setDescription('Period').addChoices(
      { name: '7 days', value: '7day' }, { name: '1 month', value: '1month' }, { name: '12 months', value: '12month' }, { name: 'overall', value: 'overall' })))
    .addSubcommand(s => s.setName('topalbums').setDescription('Your top albums').addStringOption(o => o.setName('period').setDescription('Period').addChoices(
      { name: '7 days', value: '7day' }, { name: '1 month', value: '1month' }, { name: '12 months', value: '12month' }, { name: 'overall', value: 'overall' })))
    .addSubcommand(s => s.setName('artistplays').setDescription("How many times you've scrobbled an artist")
      .addStringOption(o => o.setName('artist').setDescription('Artist').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;
    const getUser = () => {
      const opt = interaction.options.getString('username');
      if (opt) return opt;
      return db.prepare('SELECT username FROM lastfm_users WHERE user_id = ?').get(uid)?.username;
    };

    if (!config.lastfmApiKey) {
      return interaction.reply({ embeds: [errorEmbed('Last.fm is not configured on this bot yet (the bot owner needs to add an API key).')], ephemeral: true });
    }

    if (sub === 'login') {
      const username = interaction.options.getString('username');
      db.prepare('INSERT OR REPLACE INTO lastfm_users (user_id, username) VALUES (?, ?)').run(uid, username);
      return interaction.reply({ embeds: [embed('🎵 Last.fm', `Linked your Last.fm account: **${username}**`)] });
    }
    if (sub === 'logout') {
      db.prepare('DELETE FROM lastfm_users WHERE user_id = ?').run(uid);
      return interaction.reply({ embeds: [embed('🎵 Last.fm', 'Unlinked your Last.fm account.')] });
    }

    const username = getUser();
    if (!username) return interaction.reply({ embeds: [errorEmbed('Link your Last.fm first with `/lastfm login`, or pass a username.')], ephemeral: true });
    await interaction.deferReply();

    if (sub === 'nowplaying') {
      const res = await lastfm('user.getrecenttracks', { user: username, limit: 1 });
      const track = res?.recenttracks?.track?.[0];
      if (!track) return interaction.editReply({ embeds: [errorEmbed('No recent tracks found.')] });
      const now = track['@attr']?.nowplaying === 'true';
      return interaction.editReply({ embeds: [embed(`🎵 ${username} ${now ? 'is listening to' : 'last listened to'}`, `**${track.name}**\nby **${track.artist['#text']}**${track.album?.['#text'] ? `\non *${track.album['#text']}*` : ''}`)
        .setThumbnail(track.image?.find(i => i.size === 'large')?.['#text'] || null)] });
    }

    if (sub === 'latest') {
      const res = await lastfm('user.getrecenttracks', { user: username, limit: 10 });
      const tracks = res?.recenttracks?.track;
      if (!tracks?.length) return interaction.editReply({ embeds: [errorEmbed('No recent tracks found.')] });
      const lines = tracks.map((t, i) => `**${i + 1}.** ${t.name} — ${t.artist['#text']}`);
      return interaction.editReply({ embeds: [embed(`🎵 ${username}'s latest scrobbles`, lines.join('\n'))] });
    }

    if (sub === 'topartists' || sub === 'toptracks' || sub === 'topalbums') {
      const period = interaction.options.getString('period') || '7day';
      const method = { topartists: 'user.gettopartists', toptracks: 'user.gettoptracks', topalbums: 'user.gettopalbums' }[sub];
      const res = await lastfm(method, { user: username, period, limit: 10 });
      const key = { topartists: 'artists', toptracks: 'tracks', topalbums: 'albums' }[sub];
      const items = res?.[key.slice(0, -1) === 'artiste' ? 'topartists' : { artists: 'topartists', tracks: 'toptracks', albums: 'topalbums' }[key]]?.[key.slice(0, -1)];
      const list = items?.map((it, i) => `**${i + 1}.** ${it.name}${it.artist?.name ? ` — ${it.artist.name}` : ''} (${it.playcount} plays)`).join('\n');
      if (!list) return interaction.editReply({ embeds: [errorEmbed('Nothing found for that period.')] });
      return interaction.editReply({ embeds: [embed(`🎵 ${username}'s top ${key} (${period})`, list)] });
    }

    if (sub === 'artistplays') {
      const artist = interaction.options.getString('artist');
      const res = await lastfm('artist.getinfo', { artist, username });
      const plays = res?.artist?.stats?.userplaycount;
      if (plays === undefined) return interaction.editReply({ embeds: [errorEmbed('Artist not found.')] });
      return interaction.editReply({ embeds: [embed('🎵 Artist plays', `**${username}** has scrobbled **${res.artist.name}** ${Number(plays).toLocaleString()} times.`)] });
    }
  },
};
