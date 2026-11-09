const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db, getUser, addCash, addBank } = require('../../db');
const config = require('../../config');
const { fmt, embed, errorEmbed, successEmbed } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Staff-only commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('lock').setDescription('Lock a command or all commands in this server').addStringOption(o => o.setName('command').setDescription('Command name or * for all').setRequired(true)))
    .addSubcommand(s => s.setName('unlock').setDescription('Unlock a command').addStringOption(o => o.setName('command').setDescription('Command name or *').setRequired(true)))
    .addSubcommand(s => s.setName('dm').setDescription('DM a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)))
    .addSubcommand(s => s.setName('analytics').setDescription('View bot usage stats'))
    .addSubcommand(s => s.setName('blacklist').setDescription('Blacklist a user or server (bot owner only)')
      .addStringOption(o => o.setName('action').setDescription('add or remove').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
      .addStringOption(o => o.setName('id').setDescription('User or server ID').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId;

    if (sub === 'lock' || sub === 'unlock') {
      const cmd = interaction.options.getString('command').replace(/^\//, '').toLowerCase();
      if (sub === 'lock') {
        db.prepare('INSERT OR REPLACE INTO locked_commands (guild_id, command) VALUES (?, ?)').run(gid, cmd);
        return interaction.reply({ embeds: [successEmbed(`Locked \`${cmd}\` in this server.`)] });
      }
      db.prepare('DELETE FROM locked_commands WHERE guild_id = ? AND command = ?').run(gid, cmd);
      return interaction.reply({ embeds: [successEmbed(`Unlocked \`${cmd}\`.`)] });
    }

    if (sub === 'dm') {
      const user = interaction.options.getUser('user');
      const message = interaction.options.getString('message');
      try {
        await user.send(message);
        return interaction.reply({ embeds: [successEmbed(`DM sent to **${user.username}**.`)], ephemeral: true });
      } catch {
        return interaction.reply({ embeds: [errorEmbed('Could not DM that user (their DMs may be closed).')], ephemeral: true });
      }
    }

    if (sub === 'analytics') {
      const users = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
      return interaction.reply({ embeds: [embed('📊 Fqce Tool stats', [
        `**Servers:** ${client.guilds.cache.size}`,
        `**Commands:** ${client.commands.size}`,
        `**Known users:** ${users}`,
        `**Uptime:** ${Math.floor(process.uptime() / 60)} minutes`,
        '',
        '*Made by fqce*',
      ].join('\n'))] });
    }

    if (sub === 'blacklist') {
      if (!config.ownerId || interaction.user.id !== config.ownerId)
        return interaction.reply({ embeds: [errorEmbed('Bot owner only.')], ephemeral: true });
      const action = interaction.options.getString('action');
      const id = interaction.options.getString('id');
      const kind = id === gid ? 'guild' : 'user';
      if (action === 'add') {
        db.prepare('INSERT OR REPLACE INTO blacklist (id, kind, reason) VALUES (?, ?, ?)').run(id, kind, interaction.options.getString('reason') || null);
        return interaction.reply({ embeds: [successEmbed(`Blacklisted ${kind} \`${id}\`.`)], ephemeral: true });
      }
      db.prepare('DELETE FROM blacklist WHERE id = ? AND kind = ?').run(id, kind);
      return interaction.reply({ embeds: [successEmbed(`Removed ${kind} \`${id}\` from the blacklist.`)], ephemeral: true });
    }
  },
};
