const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db } = require('../../db');
const { embed, errorEmbed, successEmbed } = require('../../utils');

const getMarriage = (gid, uid) => db.prepare('SELECT * FROM marriages WHERE user_id = ? AND guild_id = ?').get(uid, gid);
const setMarriage = (gid, a, b) => {
  const ts = Date.now();
  db.prepare('INSERT OR REPLACE INTO marriages (user_id, guild_id, partner_id, since) VALUES (?, ?, ?, ?)').run(a, gid, b, ts);
  db.prepare('INSERT OR REPLACE INTO marriages (user_id, guild_id, partner_id, since) VALUES (?, ?, ?, ?)').run(b, gid, a, ts);
};
const delMarriage = (gid, a, b) => {
  db.prepare('DELETE FROM marriages WHERE user_id = ? AND guild_id = ?').run(a, gid);
  db.prepare('DELETE FROM marriages WHERE user_id = ? AND guild_id = ?').run(b, gid);
};
const getParent = (gid, uid) => db.prepare('SELECT * FROM family WHERE user_id = ? AND guild_id = ?').get(uid, gid)?.parent_id;
const getChildren = (gid, uid) => db.prepare('SELECT * FROM family WHERE parent_id = ? AND guild_id = ?').all(uid, gid);

async function confirm(interaction, targetId, prompt) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('family:accept').setLabel('Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('family:decline').setLabel('Decline').setStyle(ButtonStyle.Danger),
  );
  const msg = await interaction.reply({ content: `<@${targetId}> ${prompt}`, components: [row], fetchReply: true });
  try {
    const i = await msg.awaitMessageComponent({ componentType: ComponentType.Button, time: 60000, filter: i => i.user.id === targetId });
    await i.deferUpdate();
    return { msg, accepted: i.customId === 'family:accept' };
  } catch {
    await msg.edit({ content: '⌛ The request timed out.', components: [] }).catch(() => {});
    return { msg, accepted: false };
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('family')
    .setDescription('Marriage, adoption and family trees')
    .addSubcommand(s => s.setName('marry').setDescription('Propose marriage to someone').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('divorce').setDescription('End your marriage'))
    .addSubcommand(s => s.setName('adopt').setDescription('Offer to adopt someone as your child').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('disown').setDescription('Remove one of your children').addUserOption(o => o.setName('user').setDescription('Child').setRequired(true)))
    .addSubcommand(s => s.setName('runaway').setDescription('Cut ties with your parent'))
    .addSubcommand(s => s.setName('leave').setDescription('Leave your whole family'))
    .addSubcommand(s => s.setName('profile').setDescription("View your family or someone else's").addUserOption(o => o.setName('user').setDescription('User')))
    .addSubcommand(s => s.setName('relationship').setDescription('Find out how two people are related')
      .addUserOption(o => o.setName('user').setDescription('First user').setRequired(true))
      .addUserOption(o => o.setName('other').setDescription('Second user')))
    .addSubcommand(s => s.setName('tree').setDescription('Show a family tree').addUserOption(o => o.setName('user').setDescription('User'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;
    const gid = interaction.guildId;

    if (sub === 'marry') {
      const target = interaction.options.getUser('user');
      if (target.id === uid || target.bot) return interaction.reply({ embeds: [errorEmbed('Pick a real person (not yourself, not a bot).')], ephemeral: true });
      if (getMarriage(gid, uid)) return interaction.reply({ embeds: [errorEmbed("You're already married!")], ephemeral: true });
      if (getMarriage(gid, target.id)) return interaction.reply({ embeds: [errorEmbed(`**${target.username}** is already married.`)], ephemeral: true });
      const { msg, accepted } = await confirm(interaction, target.id, `💍 **${interaction.user.username}** is proposing! Do you accept?`);
      if (accepted) {
        setMarriage(gid, uid, target.id);
        return msg.edit({ content: `💍 <@${uid}> and <@${target.id}> are now married! 🎉`, components: [] });
      }
      return msg.edit({ content: `💔 <@${target.id}> declined the proposal.`, components: [] });
    }

    if (sub === 'divorce') {
      const m = getMarriage(gid, uid);
      if (!m) return interaction.reply({ embeds: [errorEmbed("You're not married.")], ephemeral: true });
      delMarriage(gid, uid, m.partner_id);
      return interaction.reply({ embeds: [successEmbed(`💔 You divorced <@${m.partner_id}>.`)] });
    }

    if (sub === 'adopt') {
      const target = interaction.options.getUser('user');
      if (target.id === uid || target.bot) return interaction.reply({ embeds: [errorEmbed('Pick a real person.')], ephemeral: true });
      if (getParent(gid, target.id)) return interaction.reply({ embeds: [errorEmbed(`**${target.username}** already has a parent.`)], ephemeral: true });
      const { msg, accepted } = await confirm(interaction, target.id, `👶 **${interaction.user.username}** wants to adopt you! Do you accept?`);
      if (accepted) {
        db.prepare('INSERT OR REPLACE INTO family (user_id, guild_id, parent_id) VALUES (?, ?, ?)').run(target.id, gid, uid);
        return msg.edit({ content: `👶 <@${uid}> adopted <@${target.id}>!`, components: [] });
      }
      return msg.edit({ content: `<@${target.id}> declined the adoption.`, components: [] });
    }

    if (sub === 'disown') {
      const target = interaction.options.getUser('user');
      if (getParent(gid, target.id) !== uid) return interaction.reply({ embeds: [errorEmbed('They are not your child.')], ephemeral: true });
      db.prepare('DELETE FROM family WHERE user_id = ? AND guild_id = ?').run(target.id, gid);
      return interaction.reply({ embeds: [successEmbed(`You disowned <@${target.id}>.`)] });
    }

    if (sub === 'runaway') {
      const parent = getParent(gid, uid);
      if (!parent) return interaction.reply({ embeds: [errorEmbed("You don't have a parent.")], ephemeral: true });
      db.prepare('DELETE FROM family WHERE user_id = ? AND guild_id = ?').run(uid, gid);
      return interaction.reply({ embeds: [successEmbed(`You ran away from <@${parent}>.`)] });
    }

    if (sub === 'leave') {
      const m = getMarriage(gid, uid);
      if (m) delMarriage(gid, uid, m.partner_id);
      db.prepare('DELETE FROM family WHERE user_id = ? AND guild_id = ?').run(uid, gid);
      db.prepare('UPDATE family SET parent_id = NULL WHERE parent_id = ? AND guild_id = ?').run(uid, gid);
      return interaction.reply({ embeds: [successEmbed('You left your whole family.')], ephemeral: true });
    }

    if (sub === 'profile') {
      const target = interaction.options.getUser('user') || interaction.user;
      const m = getMarriage(gid, target.id);
      const parent = getParent(gid, target.id);
      const children = getChildren(gid, target.id);
      const lines = [];
      lines.push(`**Partner:** ${m ? `<@${m.partner_id}> (since <t:${Math.floor(m.since / 1000)}:D>)` : 'none'}`);
      lines.push(`**Parent:** ${parent ? `<@${parent}>` : 'none'}`);
      lines.push(`**Children:** ${children.length ? children.map(c => `<@${c.user_id}>`).join(', ') : 'none'}`);
      return interaction.reply({ embeds: [embed(`👪 ${target.username}'s family`, lines.join('\n'))] });
    }

    if (sub === 'relationship') {
      const u1 = interaction.options.getUser('user');
      const u2 = interaction.options.getUser('other') || interaction.user;
      if (u1.id === u2.id) return interaction.reply({ embeds: [embed('👪 Relationship', 'That is... the same person.')] });
      const m1 = getMarriage(gid, u1.id);
      if (m1?.partner_id === u2.id) return interaction.reply({ embeds: [embed('👪 Relationship', `**${u1.username}** is married to **${u2.username}**. 💍`)] });
      if (getParent(gid, u1.id) === u2.id) return interaction.reply({ embeds: [embed('👪 Relationship', `**${u2.username}** is **${u1.username}**'s parent. 👶`)] });
      if (getParent(gid, u2.id) === u1.id) return interaction.reply({ embeds: [embed('👪 Relationship', `**${u1.username}** is **${u2.username}**'s parent. 👶`)] });
      const p1 = getParent(gid, u1.id), p2 = getParent(gid, u2.id);
      if (p1 && p1 === p2) return interaction.reply({ embeds: [embed('👪 Relationship', `**${u1.username}** and **${u2.username}** are siblings. 🧑‍🤝‍🧑`)] });
      return interaction.reply({ embeds: [embed('👪 Relationship', 'No relation found.')] });
    }

    if (sub === 'tree') {
      const target = interaction.options.getUser('user') || interaction.user;
      const lines = [`👪 **${target.username}'s family tree**`];
      const parent = getParent(gid, target.id);
      if (parent) {
        const pu = await interaction.client.users.fetch(parent).catch(() => null);
        lines.push(`└─ 👴 ${pu ? pu.username : parent}`);
        lines.push(`   └─ 👤 ${target.username}`);
      } else {
        lines.push(`└─ 👤 ${target.username}`);
      }
      const children = getChildren(gid, target.id);
      for (const c of children) {
        const cu = await interaction.client.users.fetch(c.user_id).catch(() => null);
        lines.push(`   └─ 👶 ${cu ? cu.username : c.user_id}`);
      }
      const m = getMarriage(gid, target.id);
      if (m) {
        const mu = await interaction.client.users.fetch(m.partner_id).catch(() => null);
        lines.push(`💍 married to ${mu ? mu.username : m.partner_id}`);
      }
      return interaction.reply({ embeds: [embed(null, lines.join('\n'))] });
    }
  },
};
