const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils');

async function getImage(interaction) {
  const attachment = interaction.options.getAttachment('image');
  const urlOption = interaction.options.getString('url');
  const url = attachment?.url || urlOption;
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('media')
    .setDescription('Image tools')
    .addSubcommand(s => s.setName('grayscale').setDescription('Convert an image to black & white').addAttachmentOption(o => o.setName('image').setDescription('Image')).addStringOption(o => o.setName('url').setDescription('Image URL')))
    .addSubcommand(s => s.setName('invert').setDescription('Invert image colors').addAttachmentOption(o => o.setName('image').setDescription('Image')).addStringOption(o => o.setName('url').setDescription('Image URL')))
    .addSubcommand(s => s.setName('blur').setDescription('Blur an image').addAttachmentOption(o => o.setName('image').setDescription('Image')).addStringOption(o => o.setName('url').setDescription('Image URL')))
    .addSubcommand(s => s.setName('pixelate').setDescription('Pixelate an image').addAttachmentOption(o => o.setName('image').setDescription('Image')).addStringOption(o => o.setName('url').setDescription('Image URL')))
    .addSubcommand(s => s.setName('flip').setDescription('Flip or mirror an image')
      .addStringOption(o => o.setName('direction').setDescription('horizontal or vertical').setRequired(true).addChoices({ name: 'horizontal', value: 'horizontal' }, { name: 'vertical', value: 'vertical' }))
      .addAttachmentOption(o => o.setName('image').setDescription('Image')).addStringOption(o => o.setName('url').setDescription('Image URL')))
    .addSubcommand(s => s.setName('meme').setDescription('Add top/bottom impact text to an image')
      .addStringOption(o => o.setName('text').setDescription('top,bottom text').setRequired(true))
      .addAttachmentOption(o => o.setName('image').setDescription('Image')).addStringOption(o => o.setName('url').setDescription('Image URL')))
    .addSubcommand(s => s.setName('deepfry').setDescription('Deepfry an image').addAttachmentOption(o => o.setName('image').setDescription('Image')).addStringOption(o => o.setName('url').setDescription('Image URL')))
    .addSubcommand(s => s.setName('spin').setDescription('Make an image spin (GIF)').addAttachmentOption(o => o.setName('image').setDescription('Image')).addStringOption(o => o.setName('url').setDescription('Image URL'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    let Jimp;
    try {
      Jimp = require('jimp');
    } catch {
      return interaction.editReply({ embeds: [errorEmbed('Image tools are not available on this bot install (missing dependency).')] });
    }

    const buffer = await getImage(interaction);
    if (!buffer) return interaction.editReply({ embeds: [errorEmbed('Attach an image or give an image URL.')] });

    try {
      const img = await Jimp.read(buffer);
      img.quality(85);

      if (sub === 'grayscale') img.grayscale();
      if (sub === 'invert') img.invert();
      if (sub === 'blur') img.blur(10);
      if (sub === 'pixelate') img.pixelate(12);
      if (sub === 'flip') {
        const dir = interaction.options.getString('direction');
        if (dir === 'horizontal') img.flip(true, false); else img.flip(false, true);
      }
      if (sub === 'deepfry') {
        img.contrast(0.6).saturate(0.9).posterize(6).quality(30);
      }
      if (sub === 'meme') {
        const [top = '', bottom = ''] = interaction.options.getString('text').split(',').map(s => s.trim());
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const print = (text, y, align) => {
          if (!text) return;
          img.print(font, 10, y, { text: text.toUpperCase(), alignmentX: align, alignmentY: Jimp.VERTICAL_ALIGN_TOP }, img.bitmap.width - 20, 200);
        };
        print(top, 10, Jimp.HORIZONTAL_ALIGN_CENTER);
        const font2 = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        if (bottom) img.print(font2, 10, img.bitmap.height - 150, { text: bottom.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, img.bitmap.width - 20, 140);
      }
      if (sub === 'spin') {
        const { GifCodec, GifFrame } = require('gifwrap');
        const frames = 8;
        const size = Math.min(img.bitmap.width, img.bitmap.height, 256);
        img.cover(size, size);
        const gif = new GifCodec();
        const gifFrames = [];
        for (let i = 0; i < frames; i++) {
          const frame = img.clone().rotate((360 / frames) * i, false);
          gifFrames.push(new GifFrame(frame.bitmap, { delayCentisecs: 8 }));
        }
        const encoded = await gif.encodeGif(gifFrames, { loops: 0 });
        return interaction.editReply({ files: [new AttachmentBuilder(encoded.buffer, { name: 'spin.gif' })] });
      }

      const out = await img.getBufferAsync(Jimp.MIME_PNG);
      return interaction.editReply({ files: [new AttachmentBuilder(out, { name: `${sub}.png` })] });
    } catch (e) {
      console.error(e);
      return interaction.editReply({ embeds: [errorEmbed('Could not process that image.')] });
    }
  },
};
