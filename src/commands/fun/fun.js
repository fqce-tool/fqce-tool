const { SlashCommandBuilder } = require('discord.js');
const { evaluate: safeEvaluate } = require('../../safeMath');
const { embed, errorEmbed, pick, rand } = require('../../utils');

const ROASTS = [
  'you bring everyone so much joy... when you leave the room.',
  "you're proof that evolution can go in reverse.",
  "you have the personality of a wet sock.",
  "if I had a pound for every smart thing you said, I'd be broke.",
  "you're the reason shampoo has instructions.",
  "somewhere a village is missing its idiot.",
  "you're like a cloud - when you disappear, it's a beautiful day.",
];
const RIZZ = [
  'are you wifi? because I am really feeling a connection.',
  'are you a parking ticket? because you have FINE written all over you.',
  "I'm not a photographer, but I can picture us together.",
  'are you a bank loan? because you have my interest.',
  'do you believe in love at first sight, or should I walk by again?',
];
const EIGHTBALL = [
  'It is certain.', 'Without a doubt.', 'Yes, definitely.', 'Most likely.', 'Signs point to yes.',
  'Reply hazy, try again.', 'Ask again later.', 'Cannot predict now.',
  "Don't count on it.", 'My reply is no.', 'Outlook not so good.', 'Very doubtful.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Fun commands')
    .addSubcommand(s => s.setName('8ball').setDescription('Consult the magic 8ball').addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true)))
    .addSubcommand(s => s.setName('roast').setDescription('Roast a user').addUserOption(o => o.setName('user').setDescription('User to roast').setRequired(true)))
    .addSubcommand(s => s.setName('rizz').setDescription('Rizz a user').addUserOption(o => o.setName('user').setDescription('User to rizz').setRequired(true)))
    .addSubcommand(s => s.setName('rate').setDescription('Rate something out of 10').addStringOption(o => o.setName('thing').setDescription('What to rate').setRequired(true)))
    .addSubcommand(s => s.setName('ship').setDescription('Ship two users together')
      .addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true))
      .addUserOption(o => o.setName('user2').setDescription('Second user')))
    .addSubcommand(s => s.setName('say').setDescription('Make the bot say something')
      .addStringOption(o => o.setName('message').setDescription('Message').setRequired(true))
      .addBooleanOption(o => o.setName('reverse').setDescription('Reverse the text'))
      .addBooleanOption(o => o.setName('uwu').setDescription('UwUify the text')))
    .addSubcommand(s => s.setName('coinflip').setDescription('Flip a coin').addIntegerOption(o => o.setName('rounds').setDescription('Number of flips').setMinValue(1).setMaxValue(10)))
    .addSubcommand(s => s.setName('math').setDescription('Calculate a mathematical expression').addStringOption(o => o.setName('expression').setDescription('Expression').setRequired(true)))
    .addSubcommand(s => s.setName('urban').setDescription('Search Urban Dictionary').addStringOption(o => o.setName('search').setDescription('Term').setRequired(true)))
    .addSubcommand(s => s.setName('lyrics').setDescription('Search for song lyrics').addStringOption(o => o.setName('song').setDescription('Song name').setRequired(true)))
    .addSubcommand(s => s.setName('emojimix').setDescription('Mix two emojis together').addStringOption(o => o.setName('emojis').setDescription('Two emojis').setRequired(true)))
    .addSubcommand(s => s.setName('petpet').setDescription("Pet someone's avatar").addUserOption(o => o.setName('user').setDescription('User').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === '8ball') {
      const q = interaction.options.getString('question');
      return interaction.reply({ embeds: [embed('🎱 Magic 8ball', `**Q:** ${q}\n**A:** ${pick(EIGHTBALL)}`)] });
    }
    if (sub === 'roast') {
      const u = interaction.options.getUser('user');
      return interaction.reply({ embeds: [embed('🔥 Roast', `**${u.username}**, ${pick(ROASTS)}`)] });
    }
    if (sub === 'rizz') {
      const u = interaction.options.getUser('user');
      return interaction.reply({ embeds: [embed('😏 Rizz', `Hey **${u.username}**, ${pick(RIZZ)}`)] });
    }
    if (sub === 'rate') {
      const thing = interaction.options.getString('thing');
      return interaction.reply({ embeds: [embed('📊 Rate', `I rate **${thing}** a solid **${rand(0, 10)}/10**.`)] });
    }
    if (sub === 'ship') {
      const u1 = interaction.options.getUser('user1');
      const u2 = interaction.options.getUser('user2') || interaction.user;
      const score = rand(0, 100);
      const bar = '❤️'.repeat(Math.round(score / 10)) + '🖤'.repeat(10 - Math.round(score / 10));
      const name = u1.username.slice(0, Math.ceil(u1.username.length / 2)) + u2.username.slice(Math.floor(u2.username.length / 2));
      return interaction.reply({ embeds: [embed('💞 Ship', `**${u1.username}** × **${u2.username}**\nShip name: **${name}**\n${bar} **${score}%**`)] });
    }
    if (sub === 'say') {
      let msg = interaction.options.getString('message');
      if (interaction.options.getBoolean('reverse')) msg = [...msg].reverse().join('');
      if (interaction.options.getBoolean('uwu')) msg = msg.replace(/[lr]/g, 'w').replace(/[LR]/g, 'W') + ' uwu';
      return interaction.reply({ content: msg.slice(0, 2000) });
    }
    if (sub === 'coinflip') {
      const rounds = interaction.options.getInteger('rounds') || 1;
      const results = Array.from({ length: rounds }, () => pick(['🪙 Heads', '🪙 Tails']));
      return interaction.reply({ embeds: [embed('🪙 Coinflip', results.join('\n'))] });
    }
    if (sub === 'math') {
      try {
        const result = safeEvaluate(interaction.options.getString('expression'));
        return interaction.reply({ embeds: [embed('🧮 Math', `\`${interaction.options.getString('expression')}\` = **${result}**`)] });
      } catch {
        return interaction.reply({ embeds: [errorEmbed('Invalid expression.')], ephemeral: true });
      }
    }
    if (sub === 'urban') {
      const q = encodeURIComponent(interaction.options.getString('search'));
      const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${q}`).then(r => r.json()).catch(() => null);
      const def = res?.list?.[0];
      if (!def) return interaction.reply({ embeds: [errorEmbed('No definition found.')], ephemeral: true });
      const text = def.definition.replace(/\[|\]/g, '').slice(0, 1000);
      return interaction.reply({ embeds: [embed(`📖 ${def.word}`, `${text}\n\n👍 ${def.thumbs_up} | 👎 ${def.thumbs_down}`)] });
    }
    if (sub === 'lyrics') {
      const q = encodeURIComponent(interaction.options.getString('song'));
      const res = await fetch(`https://api.lyrics.ovh/suggest/${q}`).then(r => r.json()).catch(() => null);
      const song = res?.data?.[0];
      if (!song) return interaction.reply({ embeds: [errorEmbed('No song found.')], ephemeral: true });
      const lyr = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(song.artist.name)}/${encodeURIComponent(song.title)}`).then(r => r.json()).catch(() => null);
      if (!lyr?.lyrics) return interaction.reply({ embeds: [errorEmbed('Lyrics not found for that song.')], ephemeral: true });
      return interaction.reply({ embeds: [embed(`🎵 ${song.title} — ${song.artist.name}`, lyr.lyrics.slice(0, 4000))] });
    }
    if (sub === 'emojimix') {
      const emojis = interaction.options.getString('emojis').match(/\p{Extended_Pictographic}/gu);
      if (!emojis || emojis.length < 2) return interaction.reply({ embeds: [errorEmbed('Give me two emojis to mix.')], ephemeral: true });
      const [e1, e2] = emojis;
      const url = `https://emojik.vercel.app/s/${encodeURIComponent(e1)}_${encodeURIComponent(e2)}?size=256`;
      return interaction.reply({ embeds: [embed('🎭 Emoji mix').setImage(url)] });
    }
    if (sub === 'petpet') {
      const u = interaction.options.getUser('user');
      const avatar = u.displayAvatarURL({ extension: 'png', size: 256 });
      return interaction.reply({ embeds: [embed(`🐾 pet pet ${u.username}`).setImage(`https://api.popcat.xyz/petpet?image=${encodeURIComponent(avatar)}`)] });
    }
  },
};
