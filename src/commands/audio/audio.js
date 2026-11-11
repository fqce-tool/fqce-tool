const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const { embed, errorEmbed } = require('../../utils');
const ffmpeg = require('../../ffmpeg');

const EFFECTS = {
  nightcore: { label: 'Nightcore', filter: 'asetrate=44100*1.25,aresample=44100,bass=g=3' },
  bassboost: { label: 'Bass boosted', filter: 'bass=g=10' },
  lofi: { label: 'Lo-fi', filter: 'asetrate=44100*0.85,aresample=44100,lowpass=f=3500,volume=0.9' },
  slowed: { label: 'Slowed + reverb', filter: 'asetrate=44100*0.8,aresample=44100,aecho=0.8:0.88:60:0.4' },
  speedup: { label: 'Sped up', filter: 'asetrate=44100*1.5,aresample=44100' },
  reverse: { label: 'Reversed', filter: 'areverse' },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('audio')
    .setDescription('Audio effects')
    .addSubcommand(s => s.setName('nightcore').setDescription('Nightcore an audio file').addAttachmentOption(o => o.setName('file').setDescription('Audio (or video) file, 15MB max').setRequired(true)))
    .addSubcommand(s => s.setName('bassboost').setDescription('Bass boost an audio file').addAttachmentOption(o => o.setName('file').setDescription('Audio (or video) file, 15MB max').setRequired(true)))
    .addSubcommand(s => s.setName('lofi').setDescription('Lo-fi an audio file').addAttachmentOption(o => o.setName('file').setDescription('Audio (or video) file, 15MB max').setRequired(true)))
    .addSubcommand(s => s.setName('slowed').setDescription('Slowed + reverb an audio file').addAttachmentOption(o => o.setName('file').setDescription('Audio (or video) file, 15MB max').setRequired(true)))
    .addSubcommand(s => s.setName('speedup').setDescription('Speed up an audio file').addAttachmentOption(o => o.setName('file').setDescription('Audio (or video) file, 15MB max').setRequired(true)))
    .addSubcommand(s => s.setName('reverse').setDescription('Reverse an audio file').addAttachmentOption(o => o.setName('file').setDescription('Audio (or video) file, 15MB max').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const effect = EFFECTS[sub];
    const attachment = interaction.options.getAttachment('file');

    if (!ffmpeg.available()) {
      return interaction.reply({ embeds: [errorEmbed('Audio tools are not available on this bot install (missing ffmpeg).')], ephemeral: true });
    }
    const type = attachment.contentType || '';
    if (!type.startsWith('audio/') && !type.startsWith('video/')) {
      return interaction.reply({ embeds: [errorEmbed('That file is not audio or video.')] , ephemeral: true });
    }
    if (attachment.size > ffmpeg.MAX_INPUT_BYTES) {
      return interaction.reply({ embeds: [errorEmbed('File too large (15MB max).')], ephemeral: true });
    }

    await interaction.deferReply();

    let input = null;
    const output = ffmpeg.tempOut('audio', '.mp3');
    try {
      input = await ffmpeg.downloadToTemp(attachment.url, 'audio', '.bin');
      await ffmpeg.run(['-v', 'error', '-i', input, '-vn', '-af', effect.filter, '-c:a', 'libmp3lame', '-b:a', '192k', '-y', output]);
      const buffer = fs.readFileSync(output);
      const base = (attachment.name || 'audio').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_').slice(0, 40) || 'audio';
      return interaction.editReply({
        embeds: [embed(`🎧 ${effect.label}`, `Processed **${attachment.name}**.`)],
        files: [new AttachmentBuilder(buffer, { name: `${base}-${sub}.mp3` })],
      });
    } catch (e) {
      console.error(e);
      const msg = e.message === 'File too large (15MB max).' ? e.message : 'Could not process that file. Make sure it is a valid audio or video file.';
      return interaction.editReply({ embeds: [errorEmbed(msg)] });
    } finally {
      ffmpeg.cleanup(input, output);
    }
  },
};
