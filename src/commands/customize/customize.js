const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, errorEmbed, successEmbed } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customize')
    .setDescription("Customize Fqce Tool's appearance in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup(g => g.setName('name').setDescription("Set the bot's server nickname")
      .addSubcommand(s => s.setName('set').setDescription('Set nickname').addStringOption(o => o.setName('text').setDescription('New nickname').setRequired(true)))
      .addSubcommand(s => s.setName('reset').setDescription('Reset nickname')))
    .addSubcommandGroup(g => g.setName('bio').setDescription("Set the bot's server bio")
      .addSubcommand(s => s.setName('set').setDescription('Set bio').addStringOption(o => o.setName('text').setDescription('New bio').setRequired(true)))
      .addSubcommand(s => s.setName('reset').setDescription('Reset bio'))),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const me = await interaction.guild.members.fetchMe();

    if (group === 'name') {
      try {
        if (sub === 'set') {
          const text = interaction.options.getString('text');
          await me.setNickname(text);
          return interaction.reply({ embeds: [successEmbed(`Nickname set to **${text}**.`)] });
        }
        await me.setNickname(null);
        return interaction.reply({ embeds: [successEmbed('Nickname reset.')] });
      } catch {
        return interaction.reply({ embeds: [errorEmbed("I can't change my nickname here (check my role permissions).")], ephemeral: true });
      }
    }

    if (group === 'bio') {
      return interaction.reply({ embeds: [errorEmbed("Discord bots can't set a per-server bio via the API. My global bio is managed by fqce.")], ephemeral: true });
    }
  },
};
