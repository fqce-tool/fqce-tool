const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils');

async function robloxUserId(username) {
  const res = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  }).then(r => r.json()).catch(() => null);
  return res?.data?.[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('Social platform lookups')
    .addSubcommandGroup(g => g.setName('roblox').setDescription('Roblox lookups')
      .addSubcommand(s => s.setName('user').setDescription('Get Roblox user info').addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true)))
      .addSubcommand(s => s.setName('avatar').setDescription("View a Roblox user's avatar").addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true)))
      .addSubcommand(s => s.setName('game').setDescription('Get Roblox game information').addStringOption(o => o.setName('query').setDescription('Game name').setRequired(true)))
      .addSubcommand(s => s.setName('previousnames').setDescription("View a Roblox user's past usernames").addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true)))
      .addSubcommand(s => s.setName('groups').setDescription("View a Roblox user's joined groups").addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true))))
    .addSubcommandGroup(g => g.setName('tiktok').setDescription('TikTok lookups')
      .addSubcommand(s => s.setName('user').setDescription('View TikTok user info').addStringOption(o => o.setName('username').setDescription('TikTok username').setRequired(true))))
    .addSubcommandGroup(g => g.setName('youtube').setDescription('YouTube lookups')
      .addSubcommand(s => s.setName('search').setDescription('Search YouTube videos').addStringOption(o => o.setName('query').setDescription('Search').setRequired(true))))
    .addSubcommandGroup(g => g.setName('twitch').setDescription('Twitch lookups')
      .addSubcommand(s => s.setName('user').setDescription('View Twitch channel info').addStringOption(o => o.setName('username').setDescription('Twitch username').setRequired(true)))
      .addSubcommand(s => s.setName('avatar').setDescription("View a Twitch user's avatar").addStringOption(o => o.setName('username').setDescription('Twitch username').setRequired(true))))
    .addSubcommandGroup(g => g.setName('github').setDescription('GitHub lookups')
      .addSubcommand(s => s.setName('user').setDescription('View GitHub user info').addStringOption(o => o.setName('username').setDescription('GitHub username').setRequired(true)))),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    if (group === 'roblox') {
      if (sub === 'user' || sub === 'avatar' || sub === 'previousnames' || sub === 'groups') {
        const username = interaction.options.getString('username');
        const basic = await robloxUserId(username);
        if (!basic) return interaction.editReply({ embeds: [errorEmbed('Roblox user not found.')] });

        if (sub === 'user') {
          const profile = await fetch(`https://users.roblox.com/v1/users/${basic.id}`).then(r => r.json()).catch(() => null);
          const thumb = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${basic.id}&size=150x150&format=Png`).then(r => r.json()).catch(() => null);
          return interaction.editReply({ embeds: [embed(`🎮 ${profile?.name || username}`, [
            profile?.description ? `${profile.description.slice(0, 300)}\n` : '',
            `**User ID:** ${basic.id}`,
            `**Display name:** ${profile?.displayName || '?'}`,
            `**Created:** ${profile?.created ? `<t:${Math.floor(new Date(profile.created).getTime() / 1000)}:D>` : '?'}`,
            `**Banned:** ${profile?.isBanned ? 'yes' : 'no'}`,
          ].filter(Boolean).join('\n')).setThumbnail(thumb?.data?.[0]?.imageUrl || null)] });
        }

        if (sub === 'avatar') {
          const thumb = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${basic.id}&size=420x420&format=Png`).then(r => r.json()).catch(() => null);
          const url = thumb?.data?.[0]?.imageUrl;
          if (!url) return interaction.editReply({ embeds: [errorEmbed('Could not fetch that avatar.')] });
          return interaction.editReply({ embeds: [embed(`🎮 ${basic.name}'s avatar`).setImage(url)] });
        }

        if (sub === 'previousnames') {
          const names = await fetch(`https://users.roblox.com/v1/users/${basic.id}/username-history?limit=10&sortOrder=Desc`).then(r => r.json()).catch(() => null);
          const list = names?.data?.map(n => `\`${n.name}\``).join(', ');
          return interaction.editReply({ embeds: [embed(`🎮 ${basic.name}'s past usernames`, list || 'None.')] });
        }

        if (sub === 'groups') {
          const groups = await fetch(`https://groups.roblox.com/v1/users/${basic.id}/groups/roles`).then(r => r.json()).catch(() => null);
          const list = groups?.data?.slice(0, 15).map(g => `**${g.group.name}** (${g.role.name})`).join('\n');
          return interaction.editReply({ embeds: [embed(`🎮 ${basic.name}'s groups`, list || 'None.')] });
        }
      }

      if (sub === 'game') {
        const query = interaction.options.getString('query');
        const search = await fetch(`https://games.roblox.com/v1/games/list?keyword=${encodeURIComponent(query)}&maxRows=5`).then(r => r.json()).catch(() => null);
        const game = search?.games?.[0];
        if (!game) return interaction.editReply({ embeds: [errorEmbed('No game found.')] });
        const detail = await fetch(`https://games.roblox.com/v1/games?universeIds=${game.universeId}`).then(r => r.json()).catch(() => null);
        const d = detail?.data?.[0];
        return interaction.editReply({ embeds: [embed(`🎮 ${d?.name || game.name}`, [
          d?.description ? `${d.description.slice(0, 300)}\n` : '',
          `**Playing:** ${d?.playing?.toLocaleString() ?? '?'}`,
          `**Visits:** ${d?.visits?.toLocaleString() ?? '?'}`,
          `**Favorites:** ${d?.favoritedCount?.toLocaleString() ?? '?'}`,
          `https://www.roblox.com/games/${game.placeId}`,
        ].filter(Boolean).join('\n'))] });
      }
    }

    if (group === 'tiktok') {
      if (sub === 'user') {
        const username = interaction.options.getString('username').replace(/^@/, '');
        const res = await fetch(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`).then(r => r.json()).catch(() => null);
        const u = res?.data?.user, stats = res?.data?.stats;
        if (!u) return interaction.editReply({ embeds: [errorEmbed('TikTok user not found.')] });
        return interaction.editReply({ embeds: [embed(`🎵 @${u.uniqueId}`, [
          u.signature ? `${u.signature.slice(0, 300)}\n` : '',
          `**Nickname:** ${u.nickname}`,
          `**Followers:** ${stats?.followerCount?.toLocaleString() ?? '?'}`,
          `**Following:** ${stats?.followingCount?.toLocaleString() ?? '?'}`,
          `**Likes:** ${stats?.heartCount?.toLocaleString() ?? '?'}`,
          `**Videos:** ${stats?.videoCount?.toLocaleString() ?? '?'}`,
        ].filter(Boolean).join('\n')).setThumbnail(u.avatarLarger || null)] });
      }
    }

    if (group === 'twitch') {
      const username = interaction.options.getString('username').replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9_]\w{3,24}$/.test(username)) return interaction.editReply({ embeds: [errorEmbed('That is not a valid Twitch username.')] });
      const getText = (ep) => fetch(`https://decapi.me/twitch/${ep}/${encodeURIComponent(username)}`).then(r => r.ok ? r.text() : null).catch(() => null);

      const avatar = await getText('avatar');
      if (!avatar || !avatar.startsWith('http')) return interaction.editReply({ embeds: [errorEmbed('Twitch user not found.')] });

      if (sub === 'avatar') {
        return interaction.editReply({ embeds: [embed(`📺 ${username}'s avatar`).setImage(avatar)] });
      }

      if (sub === 'user') {
        const [accountage, followcount, game, title, viewercount] = await Promise.all([
          getText('accountage'), getText('followcount'), getText('game'), getText('title'), getText('viewercount'),
        ]);
        const offline = !viewercount || /offline/i.test(viewercount);
        return interaction.editReply({ embeds: [embed(`📺 ${username}`, [
          `**Status:** ${offline ? 'offline' : `live with ${viewercount} viewers`}`,
          !offline && game ? `**Playing:** ${game}` : '',
          !offline && title ? `**Title:** ${title.slice(0, 200)}` : '',
          followcount && !isNaN(Number(followcount)) ? `**Followers:** ${Number(followcount).toLocaleString()}` : '',
          accountage ? `**Account age:** ${accountage}` : '',
          `https://twitch.tv/${username}`,
        ].filter(Boolean).join('\n')).setThumbnail(avatar)] });
      }
    }

    if (group === 'github') {
      if (sub === 'user') {
        const username = interaction.options.getString('username');
        const u = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: { 'User-Agent': 'FqceTool' } }).then(r => r.ok ? r.json() : null).catch(() => null);
        if (!u) return interaction.editReply({ embeds: [errorEmbed('GitHub user not found.')] });
        return interaction.editReply({ embeds: [embed(`🐙 ${u.login}${u.name ? ` (${u.name})` : ''}`, [
          u.bio ? `${u.bio.slice(0, 300)}\n` : '',
          `**Followers:** ${u.followers?.toLocaleString() ?? '?'}`,
          `**Following:** ${u.following?.toLocaleString() ?? '?'}`,
          `**Public repos:** ${u.public_repos?.toLocaleString() ?? '?'}`,
          `**Joined:** ${u.created_at ? `<t:${Math.floor(new Date(u.created_at).getTime() / 1000)}:D>` : '?'}`,
          u.html_url || '',
        ].filter(Boolean).join('\n')).setThumbnail(u.avatar_url || null)] });
      }
    }

    if (group === 'youtube') {
      if (sub === 'search') {
        const query = interaction.options.getString('query');
        const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`).then(r => r.text()).catch(() => null);
        const match = res?.match(/"videoId":"([\w-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"/s);
        if (!match) return interaction.editReply({ embeds: [errorEmbed('No videos found.')] });
        return interaction.editReply({ content: `🎬 **${match[2]}**\nhttps://www.youtube.com/watch?v=${match[1]}` });
      }
    }
  },
};
