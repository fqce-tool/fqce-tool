const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../db');
const { embed, errorEmbed, successEmbed } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('util')
    .setDescription('Utility commands')
    .addSubcommand(s => s.setName('define').setDescription('Look up a word definition').addStringOption(o => o.setName('word').setDescription('Word').setRequired(true)))
    .addSubcommand(s => s.setName('translate').setDescription('Translate text')
      .addStringOption(o => o.setName('to').setDescription('Target language (e.g. en, es, fr)').setRequired(true))
      .addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true)))
    .addSubcommand(s => s.setName('base64').setDescription('Base64 encode/decode')
      .addStringOption(o => o.setName('mode').setDescription('encode or decode').setRequired(true).addChoices({ name: 'encode', value: 'encode' }, { name: 'decode', value: 'decode' }))
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)))
    .addSubcommand(s => s.setName('qr').setDescription('Generate a QR code').addStringOption(o => o.setName('text').setDescription('Text/URL').setRequired(true)))
    .addSubcommand(s => s.setName('color').setDescription('Inspect a color').addStringOption(o => o.setName('color').setDescription('Hex code (e.g. #ff5733)').setRequired(true)))
    .addSubcommand(s => s.setName('crypto').setDescription('View a cryptocurrency price')
      .addStringOption(o => o.setName('coin').setDescription('Coin (e.g. bitcoin)').setRequired(true))
      .addStringOption(o => o.setName('currency').setDescription('Currency (default usd)')))
    .addSubcommand(s => s.setName('weather').setDescription('Current weather for a city').addStringOption(o => o.setName('city').setDescription('City').setRequired(true)))
    .addSubcommand(s => s.setName('afk').setDescription('Set your AFK status').addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('poll').setDescription('Create a poll')
      .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
      .addStringOption(o => o.setName('options').setDescription('Options separated by commas (2-10)').setRequired(true)))
    .addSubcommand(s => s.setName('remind').setDescription('Set a reminder')
      .addStringOption(o => o.setName('duration').setDescription('When (e.g. 10m, 2h)').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Reminder text').setRequired(true)))
    .addSubcommandGroup(g => g.setName('tags').setDescription('Custom text tags')
      .addSubcommand(s => s.setName('create').setDescription('Create a tag')
        .addStringOption(o => o.setName('tag').setDescription('Tag name').setRequired(true))
        .addStringOption(o => o.setName('text').setDescription('Tag content').setRequired(true)))
      .addSubcommand(s => s.setName('send').setDescription('Send a tag').addStringOption(o => o.setName('tag').setDescription('Tag name').setRequired(true)))
      .addSubcommand(s => s.setName('delete').setDescription('Delete a tag').addStringOption(o => o.setName('tag').setDescription('Tag name').setRequired(true)))
      .addSubcommand(s => s.setName('list').setDescription('List all tags'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId;
    const uid = interaction.user.id;

    if (sub === 'define') {
      const word = encodeURIComponent(interaction.options.getString('word'));
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`).then(r => r.ok ? r.json() : null).catch(() => null);
      const entry = res?.[0];
      if (!entry) return interaction.reply({ embeds: [errorEmbed('No definition found.')], ephemeral: true });
      const meanings = entry.meanings.slice(0, 3).map(m => `**${m.partOfSpeech}** — ${m.definitions[0].definition}`).join('\n');
      return interaction.reply({ embeds: [embed(`📖 ${entry.word}`, meanings)] });
    }

    if (sub === 'translate') {
      const to = interaction.options.getString('to');
      const text = interaction.options.getString('text');
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`).then(r => r.json()).catch(() => null);
      const translated = res?.[0]?.map(p => p[0]).join('');
      if (!translated) return interaction.reply({ embeds: [errorEmbed('Translation failed. Check the language code.')], ephemeral: true });
      return interaction.reply({ embeds: [embed('🌐 Translate', `**Original:** ${text}\n**Translated (${to}):** ${translated}`)] });
    }

    if (sub === 'base64') {
      const mode = interaction.options.getString('mode');
      const text = interaction.options.getString('text');
      try {
        const out = mode === 'encode' ? Buffer.from(text, 'utf8').toString('base64') : Buffer.from(text, 'base64').toString('utf8');
        return interaction.reply({ embeds: [embed(`🔡 Base64 ${mode}`, `\`\`\`${out.slice(0, 1900)}\`\`\``)] });
      } catch {
        return interaction.reply({ embeds: [errorEmbed('Invalid input for that mode.')], ephemeral: true });
      }
    }

    if (sub === 'qr') {
      const text = interaction.options.getString('text');
      return interaction.reply({ embeds: [embed('🔳 QR code').setImage(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`)] });
    }

    if (sub === 'color') {
      const hex = interaction.options.getString('color').replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) return interaction.reply({ embeds: [errorEmbed('Give a valid hex color like `#ff5733`.')], ephemeral: true });
      return interaction.reply({ embeds: [embed(`🎨 #${hex}`, `**Hex:** #${hex}\n**RGB:** ${parseInt(hex.slice(0,2),16)}, ${parseInt(hex.slice(2,4),16)}, ${parseInt(hex.slice(4,6),16)}`)
        .setColor(parseInt(hex, 16))
        .setImage(`https://singlecolorimage.com/get/${hex}/400x100`)] });
    }

    if (sub === 'crypto') {
      const coin = interaction.options.getString('coin').toLowerCase();
      const currency = (interaction.options.getString('currency') || 'usd').toLowerCase();
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=${encodeURIComponent(currency)}&include_24hr_change=true&include_market_cap=true`).then(r => r.json()).catch(() => null);
      const data = res?.[coin];
      if (!data) return interaction.reply({ embeds: [errorEmbed('Coin not found. Use its full id, e.g. `bitcoin`, `ethereum`.')], ephemeral: true });
      const change = data[`${currency}_24h_change`];
      return interaction.reply({ embeds: [embed(`📈 ${coin}`, `**Price:** ${data[currency]?.toLocaleString()} ${currency.toUpperCase()}\n**24h:** ${change ? change.toFixed(2) : '?'}%\n**Market cap:** ${data[`${currency}_market_cap`]?.toLocaleString()} ${currency.toUpperCase()}`)] });
    }

    if (sub === 'weather') {
      const city = encodeURIComponent(interaction.options.getString('city'));
      const res = await fetch(`https://wttr.in/${city}?format=j1`).then(r => r.json()).catch(() => null);
      const cur = res?.current_condition?.[0];
      if (!cur) return interaction.reply({ embeds: [errorEmbed('City not found.')], ephemeral: true });
      return interaction.reply({ embeds: [embed(`🌤️ Weather in ${interaction.options.getString('city')}`, [
        `**${cur.weatherDesc[0].value}**, ${cur.temp_C}°C (feels like ${cur.FeelsLikeC}°C)`,
        `**Humidity:** ${cur.humidity}%`,
        `**Wind:** ${cur.windspeedKmph} km/h`,
      ].join('\n'))] });
    }

    if (sub === 'afk') {
      const reason = interaction.options.getString('reason') || 'AFK';
      db.prepare('INSERT OR REPLACE INTO afk (user_id, guild_id, reason, since) VALUES (?, ?, ?, ?)').run(uid, gid, reason, Date.now());
      return interaction.reply({ embeds: [successEmbed(`💤 You're now AFK: ${reason}`)] });
    }

    if (sub === 'poll') {
      const question = interaction.options.getString('question');
      const options = interaction.options.getString('options').split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
      if (options.length < 2) return interaction.reply({ embeds: [errorEmbed('Give at least 2 options, separated by commas.')], ephemeral: true });
      const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
      const msg = await interaction.reply({ embeds: [embed(`📊 ${question}`, options.map((o, i) => `${emojis[i]} ${o}`).join('\n'))], fetchReply: true });
      for (let i = 0; i < options.length; i++) await msg.react(emojis[i]).catch(() => {});
      return;
    }

    if (sub === 'remind') {
      const m = interaction.options.getString('duration').trim().match(/^(\d+)\s*(s|m|h|d)$/i);
      if (!m) return interaction.reply({ embeds: [errorEmbed('Invalid duration. Use e.g. `30s`, `10m`, `2h`, `1d`.')], ephemeral: true });
      const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
      const ms = parseInt(m[1]) * mult;
      if (ms > 7 * 86400000) return interaction.reply({ embeds: [errorEmbed('Max 7 days.')], ephemeral: true });
      const text = interaction.options.getString('message');
      await interaction.reply({ embeds: [successEmbed(`⏰ I'll remind you <t:${Math.floor((Date.now() + ms) / 1000)}:R>.`)] });
      setTimeout(() => {
        interaction.user.send(`⏰ Reminder: ${text}`).catch(() => interaction.followUp({ content: `⏰ <@${uid}> Reminder: ${text}` }).catch(() => {}));
      }, ms);
      return;
    }

    if (sub === 'create') {
      const tag = interaction.options.getString('tag').toLowerCase();
      const text = interaction.options.getString('text');
      db.prepare('INSERT OR REPLACE INTO tags (name, guild_id, owner_id, text) VALUES (?, ?, ?, ?)').run(tag, gid, uid, text);
      return interaction.reply({ embeds: [successEmbed(`Tag \`${tag}\` saved.`)] });
    }
    if (sub === 'send') {
      const tag = interaction.options.getString('tag').toLowerCase();
      const row = db.prepare('SELECT * FROM tags WHERE name = ? AND guild_id = ?').get(tag, gid);
      if (!row) return interaction.reply({ embeds: [errorEmbed('Tag not found.')], ephemeral: true });
      return interaction.reply({ content: row.text });
    }
    if (sub === 'delete') {
      const tag = interaction.options.getString('tag').toLowerCase();
      const row = db.prepare('SELECT * FROM tags WHERE name = ? AND guild_id = ?').get(tag, gid);
      if (!row) return interaction.reply({ embeds: [errorEmbed('Tag not found.')], ephemeral: true });
      if (row.owner_id !== uid && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({ embeds: [errorEmbed('Only the tag owner or a manager can delete it.')], ephemeral: true });
      db.prepare('DELETE FROM tags WHERE name = ? AND guild_id = ?').run(tag, gid);
      return interaction.reply({ embeds: [successEmbed(`Tag \`${tag}\` deleted.`)] });
    }
    if (sub === 'list') {
      const rows = db.prepare('SELECT name FROM tags WHERE guild_id = ?').all(gid);
      if (!rows.length) return interaction.reply({ embeds: [embed('🏷️ Tags', 'No tags yet.')] });
      return interaction.reply({ embeds: [embed('🏷️ Tags', rows.map(r => `\`${r.name}\``).join(', '))] });
    }
  },
};
