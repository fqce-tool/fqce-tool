const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils');

// Free, keyless AI via pollinations.ai (no API key, no account).
const TEXT_URL = 'https://text.pollinations.ai/';
const IMAGE_URL = 'https://image.pollinations.ai/prompt/';

async function ask(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const res = await fetch(TEXT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are Fqce Tool, a friendly Discord bot assistant made by fqce. Answer concisely.' },
          { role: 'user', content: prompt },
        ],
        model: 'openai',
      }),
    });
    if (!res.ok) throw new Error(`AI service error (${res.status})`);
    return (await res.text()).trim();
  } finally {
    clearTimeout(timer);
  }
}

async function imagine(prompt, size) {
  const [w, h] = { square: [1024, 1024], portrait: [768, 1152], landscape: [1152, 768] }[size] || [1024, 1024];
  const seed = Math.floor(Math.random() * 1e9);
  const url = `${IMAGE_URL}${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Image service error (${res.status})`);
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) throw new Error('Image service did not return an image.');
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('AI chat and image generation')
    .addSubcommand(s => s.setName('ask').setDescription('Ask the AI anything')
      .addStringOption(o => o.setName('prompt').setDescription('What to ask').setRequired(true).setMaxLength(2000)))
    .addSubcommand(s => s.setName('image').setDescription('Generate an AI image')
      .addStringOption(o => o.setName('prompt').setDescription('Describe the image').setRequired(true).setMaxLength(1000))
      .addStringOption(o => o.setName('size').setDescription('Image shape').addChoices(
        { name: 'square', value: 'square' },
        { name: 'portrait', value: 'portrait' },
        { name: 'landscape', value: 'landscape' },
      ))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    try {
      if (sub === 'ask') {
        const prompt = interaction.options.getString('prompt');
        let answer = await ask(prompt);
        if (!answer) return interaction.editReply({ embeds: [errorEmbed('The AI did not answer. Try again.')] });
        if (answer.length > 1900) answer = `${answer.slice(0, 1900)}…`;
        return interaction.editReply({ embeds: [embed('🤖 AI', `**${prompt.slice(0, 200)}**\n\n${answer}`)] });
      }

      if (sub === 'image') {
        const prompt = interaction.options.getString('prompt');
        const size = interaction.options.getString('size') || 'square';
        const buffer = await imagine(prompt, size);
        return interaction.editReply({
          embeds: [embed('🎨 AI image', prompt.slice(0, 300)).setImage('attachment://ai-image.jpg')],
          files: [new AttachmentBuilder(buffer, { name: 'ai-image.jpg' })],
        });
      }
    } catch (e) {
      console.error(e);
      const msg = e.name === 'AbortError' ? 'The AI service took too long. Try again.' : 'The AI service failed. Try again in a moment.';
      return interaction.editReply({ embeds: [errorEmbed(msg)] });
    }
  },
};
