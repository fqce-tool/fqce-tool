const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const { embed, errorEmbed } = require('../../utils');
const ffmpeg = require('../../ffmpeg');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('video')
    .setDescription('Video tools')
    .addSubcommand(s => s.setName('togif').setDescription('Convert the first 10s of a video to a GIF').addAttachmentOption(o => o.setName('file').setDescription('Video file, 15MB max').setRequired(true)))
    .addSubcommand(s => s.setName('reverse').setDescription('Reverse the first 15s of a video').addAttachmentOption(o => o.setName('file').setDescription('Video file, 15MB max').setRequired(true)))
    .addSubcommand(s => s.setName('mute').setDescription('Remove the audio from a video').addAttachmentOption(o => o.setName('file').setDescription('Video file, 15MB max').setRequired(true)))
    .addSubcommand(s => s.setName('crop').setDescription('Crop a video to a centered square').addAttachmentOption(o => o.setName('file').setDescription('Video file, 15MB max').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const attachment = interaction.options.getAttachment('file');

    if (!ffmpeg.available()) {
      return interaction.reply({ embeds: [errorEmbed('Video tools are not available on this bot install (missing ffmpeg).')], ephemeral: true });
    }
    const type = attachment.contentType || '';
    if (!type.startsWith('video/')) {
      return interaction.reply({ embeds: [errorEmbed('That file is not a video.')], ephemeral: true });
    }
    if (attachment.size > ffmpeg.MAX_INPUT_BYTES) {
      return interaction.reply({ embeds: [errorEmbed('File too large (15MB max).')], ephemeral: true });
    }

    await interaction.deferReply();

    const base = (attachment.name || 'video').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_').slice(0, 40) || 'video';
    let input = null;
    let output = null;
    let name = '';
    let label = '';

    try {
      input = await ffmpeg.downloadToTemp(attachment.url, 'video', '.bin');

      if (sub === 'togif') {
        output = ffmpeg.tempOut('video', '.gif');
        name = `${base}.gif`;
        label = '🎞️ GIF';
        await ffmpeg.run(['-v', 'error', '-i', input, '-t', '10', '-vf', 'fps=12,scale=480:-1:flags=lanczos', '-loop', '0', '-y', output], 150000);
      } else if (sub === 'reverse') {
        output = ffmpeg.tempOut('video', '.mp4');
        name = `${base}-reversed.mp4`;
        label = '⏪ Reversed video';
        await ffmpeg.run(['-v', 'error', '-i', input, '-t', '15', '-vf', 'reverse', '-af', 'areverse', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-c:a', 'aac', '-y', output], 240000);
      } else if (sub === 'mute') {
        output = ffmpeg.tempOut('video', '.mp4');
        name = `${base}-muted.mp4`;
        label = '🔇 Muted video';
        await ffmpeg.run(['-v', 'error', '-i', input, '-c:v', 'copy', '-an', '-movflags', '+faststart', '-y', output]);
      } else if (sub === 'crop') {
        output = ffmpeg.tempOut('video', '.mp4');
        name = `${base}-square.mp4`;
        label = '✂️ Cropped video';
        await ffmpeg.run(['-v', 'error', '-i', input, '-t', '30', '-vf', "crop='min(iw,ih)':'min(iw,ih)'", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'copy', '-y', output], 240000);
      }

      const buffer = fs.readFileSync(output);
      return interaction.editReply({
        embeds: [embed(label, `Processed **${attachment.name}**.`)],
        files: [new AttachmentBuilder(buffer, { name })],
      });
    } catch (e) {
      console.error(e);
      const msg = e.message === 'File too large (15MB max).' ? e.message : 'Could not process that video. Make sure it is a valid video file.';
      return interaction.editReply({ embeds: [errorEmbed(msg)] });
    } finally {
      ffmpeg.cleanup(input, output);
    }
  },
};
