const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Info commands')
    .addSubcommand(s => s.setName('ping').setDescription("View the bot's latency"))
    .addSubcommand(s => s.setName('about').setDescription('Info about Fqce Tool'))
    .addSubcommand(s => s.setName('credits').setDescription('Fqce Tool credits'))
    .addSubcommand(s => s.setName('avatar').setDescription("View a user's avatar").addUserOption(o => o.setName('user').setDescription('User')))
    .addSubcommand(s => s.setName('banner').setDescription("View a user's banner").addUserOption(o => o.setName('user').setDescription('User')))
    .addSubcommand(s => s.setName('serverinfo').setDescription('View server info'))
    .addSubcommand(s => s.setName('userinfo').setDescription("View a user's info").addUserOption(o => o.setName('user').setDescription('User')))
    .addSubcommand(s => s.setName('invite').setDescription("Get Fqce Tool's invite link"))
    .addSubcommand(s => s.setName('help').setDescription('List all commands')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'ping') {
      const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
      return interaction.editReply(`🏓 Pong! Latency: **${sent.createdTimestamp - interaction.createdTimestamp}ms**, API: **${Math.round(client.ws.ping)}ms**`);
    }

    if (sub === 'about' || sub === 'credits') {
      return interaction.reply({ embeds: [embed('⚡ Fqce Tool', [
        'The everything bot for your server - fun, games, media tools, social lookups, music, giveaways and more.',
        '',
        '**Made by fqce**',
        'All credit goes to **fqce**.',
        '',
        `Serving **${client.guilds.cache.size}** servers.`,
      ].join('\n'))] });
    }

    if (sub === 'avatar') {
      const u = interaction.options.getUser('user') || interaction.user;
      return interaction.reply({ embeds: [embed(`🖼️ ${u.username}'s avatar`).setImage(u.displayAvatarURL({ size: 1024 }))] });
    }

    if (sub === 'banner') {
      const u = await client.users.fetch((interaction.options.getUser('user') || interaction.user).id, { force: true });
      if (!u.banner) return interaction.reply({ embeds: [embed('🖼️ Banner', `**${u.username}** has no banner.`)] });
      return interaction.reply({ embeds: [embed(`🖼️ ${u.username}'s banner`).setImage(u.bannerURL({ size: 1024 }))] });
    }

    if (sub === 'serverinfo') {
      const g = interaction.guild;
      return interaction.reply({ embeds: [embed(`🌐 ${g.name}`, [
        `**Owner:** <@${g.ownerId}>`,
        `**Members:** ${g.memberCount}`,
        `**Channels:** ${g.channels.cache.size}`,
        `**Roles:** ${g.roles.cache.size}`,
        `**Boosts:** ${g.premiumSubscriptionCount} (level ${g.premiumTier})`,
        `**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:D>`,
      ].join('\n')).setThumbnail(g.iconURL({ size: 256 }))] });
    }

    if (sub === 'userinfo') {
      const u = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild?.members.fetch(u.id).catch(() => null);
      return interaction.reply({ embeds: [embed(`👤 ${u.username}`, [
        `**ID:** ${u.id}`,
        `**Created:** <t:${Math.floor(u.createdTimestamp / 1000)}:D>`,
        member ? `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : '',
        member?.roles?.cache ? `**Roles:** ${member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).slice(0, 10).join(' ') || 'none'}` : '',
      ].filter(Boolean).join('\n')).setThumbnail(u.displayAvatarURL({ size: 256 }))] });
    }

    if (sub === 'invite') {
      return interaction.reply({ embeds: [embed('🔗 Invite Fqce Tool', `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)] });
    }

    if (sub === 'help') {
      const cats = {};
      for (const cmd of client.commands.values()) {
        const cat = cmd.data.toJSON().category || cmd.category || 'General';
        (cats[cat] = cats[cat] || []).push(`\`/${cmd.data.name}\``);
      }
      const lines = Object.entries(cats).map(([c, cmds]) => `**${c}**\n${cmds.join(' ')}`);
      return interaction.reply({ embeds: [embed('⚡ Fqce Tool commands', lines.join('\n\n') + '\n\n*Made by fqce*')] });
    }
  },
};
