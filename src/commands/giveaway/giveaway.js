const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../db');
const { embed, errorEmbed, successEmbed, parseDuration, ms } = require('../../utils');

const activeGiveaways = new Map(); // message_id -> { timeout }

async function endGiveaway(client, messageId) {
  const g = db.prepare('SELECT * FROM giveaways WHERE message_id = ? AND ended = 0').get(messageId);
  if (!g) return;
  db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?').run(messageId);
  const state = activeGiveaways.get(messageId);
  const entries = state?.entries ? [...state.entries] : [];
  let channel;
  try { channel = await client.channels.fetch(g.channel_id); } catch { return; }
  let msg;
  try { msg = await channel.messages.fetch(messageId); } catch { return; }
  const winners = [];
  const pool = [...entries];
  for (let i = 0; i < g.winners && pool.length; i++) {
    winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  const resultText = winners.length
    ? `🎉 Congratulations ${winners.map(w => `<@${w}>`).join(', ')}! You won **${g.prize}**!`
    : `😢 Nobody entered the giveaway for **${g.prize}**.`;
  await channel.send(resultText).catch(() => {});
  await msg.edit({ embeds: [embed(`🎁 Giveaway ended`, `**Prize:** ${g.prize}\n**Winners:** ${winners.length ? winners.map(w => `<@${w}>`).join(', ') : 'none'}\n**Entries:** ${entries.length}`)], components: [] }).catch(() => {});
  activeGiveaways.delete(messageId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway commands')
    .addSubcommand(s => s.setName('start').setDescription('Start a giveaway in this channel')
      .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10m, 2h, 1d)').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1).setMaxValue(20))
      .addStringOption(o => o.setName('prize').setDescription('Prize').setRequired(true)))
    .addSubcommand(s => s.setName('end').setDescription('End a giveaway early').addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(s => s.setName('reroll').setDescription('Reroll winners for an ended giveaway').addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(s => s.setName('cancel').setDescription('Cancel a giveaway without picking winners').addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List active giveaways in this server')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId;

    if (sub === 'start') {
      const duration = parseDuration(interaction.options.getString('duration'));
      if (!duration || duration < 10000) return interaction.reply({ embeds: [errorEmbed('Invalid duration. Use e.g. `10m`, `2h`, `1d` (min 10s).')], ephemeral: true });
      const winners = interaction.options.getInteger('winners');
      const prize = interaction.options.getString('prize');
      const endsAt = Date.now() + duration;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('giveaway:enter').setLabel('🎉 Enter').setStyle(ButtonStyle.Primary)
      );
      const msg = await interaction.reply({
        embeds: [embed('🎁 Giveaway!', `**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endsAt / 1000)}:R>\n**Entries:** 0\n\nClick 🎉 Enter to join!`)],
        components: [row], fetchReply: true,
      });
      db.prepare('INSERT INTO giveaways (message_id, guild_id, channel_id, prize, winners, ends_at, host_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(msg.id, gid, msg.channel.id, prize, winners, endsAt, interaction.user.id);
      activeGiveaways.set(msg.id, { entries: new Set(), timeout: setTimeout(() => endGiveaway(client, msg.id), duration) });
      return;
    }

    if (sub === 'end' || sub === 'cancel') {
      const messageId = interaction.options.getString('message_id');
      const g = db.prepare('SELECT * FROM giveaways WHERE message_id = ? AND ended = 0').get(messageId);
      if (!g) return interaction.reply({ embeds: [errorEmbed('Giveaway not found or already ended.')], ephemeral: true });
      if (g.host_id !== interaction.user.id && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({ embeds: [errorEmbed('Only the host or a manager can do that.')], ephemeral: true });
      const state = activeGiveaways.get(messageId);
      if (state?.timeout) clearTimeout(state.timeout);
      if (sub === 'cancel') {
        db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?').run(messageId);
        activeGiveaways.delete(messageId);
        const channel = await client.channels.fetch(g.channel_id).catch(() => null);
        const msg = channel ? await channel.messages.fetch(messageId).catch(() => null) : null;
        if (msg) await msg.edit({ embeds: [embed('🎁 Giveaway cancelled', `**Prize:** ${g.prize}`)], components: [] }).catch(() => {});
        return interaction.reply({ embeds: [successEmbed('Giveaway cancelled.')], ephemeral: true });
      }
      await interaction.reply({ embeds: [successEmbed('Ending the giveaway...')], ephemeral: true });
      return endGiveaway(client, messageId);
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      const g = db.prepare('SELECT * FROM giveaways WHERE message_id = ? AND ended = 1').get(messageId);
      if (!g) return interaction.reply({ embeds: [errorEmbed('Ended giveaway not found.')], ephemeral: true });
      const state = activeGiveaways.get(messageId);
      const entries = state?.entries ? [...state.entries] : [];
      if (!entries.length) return interaction.reply({ embeds: [errorEmbed('No recorded entries to reroll (entries are only tracked while the bot is running).')], ephemeral: true });
      const winners = [];
      const pool = [...entries];
      for (let i = 0; i < g.winners && pool.length; i++) winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      return interaction.reply({ content: `🎉 Rerolled! New winner(s): ${winners.map(w => `<@${w}>`).join(', ')} for **${g.prize}**!` });
    }

    if (sub === 'list') {
      const rows = db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0').all(gid);
      if (!rows.length) return interaction.reply({ embeds: [embed('🎁 Giveaways', 'No active giveaways.')] });
      return interaction.reply({ embeds: [embed('🎁 Active giveaways', rows.map(g => `**${g.prize}** — ${g.winners} winner(s), ends <t:${Math.floor(g.ends_at / 1000)}:R> (\`${g.message_id}\`)`).join('\n'))] });
    }
  },

  async onInteraction(interaction) {
    if (interaction.customId !== 'giveaway:enter') return;
    const state = activeGiveaways.get(interaction.message.id);
    const g = db.prepare('SELECT * FROM giveaways WHERE message_id = ? AND ended = 0').get(interaction.message.id);
    if (!g) return interaction.reply({ content: 'This giveaway has ended.', ephemeral: true });
    if (state.entries.has(interaction.user.id)) {
      state.entries.delete(interaction.user.id);
      await interaction.message.edit({ embeds: [embed('🎁 Giveaway!', `**Prize:** ${g.prize}\n**Winners:** ${g.winners}\n**Ends:** <t:${Math.floor(g.ends_at / 1000)}:R>\n**Entries:** ${state.entries.size}\n\nClick 🎉 Enter to join!`)] });
      return interaction.reply({ content: 'You left the giveaway.', ephemeral: true });
    }
    state.entries.add(interaction.user.id);
    await interaction.message.edit({ embeds: [embed('🎁 Giveaway!', `**Prize:** ${g.prize}\n**Winners:** ${g.winners}\n**Ends:** <t:${Math.floor(g.ends_at / 1000)}:R>\n**Entries:** ${state.entries.size}\n\nClick 🎉 Enter to join!`)] });
    return interaction.reply({ content: 'You entered the giveaway! 🎉', ephemeral: true });
  },

  endGiveaway,
};
