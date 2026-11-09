const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { embed, errorEmbed, rand, pick } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games')
    .setDescription('Minigames')
    .addSubcommand(s => s.setName('tictactoe').setDescription('Play TicTacToe with a friend').addUserOption(o => o.setName('player').setDescription('Opponent').setRequired(true)))
    .addSubcommand(s => s.setName('rps').setDescription('Play Rock-Paper-Scissors').addUserOption(o => o.setName('player').setDescription('Opponent (empty = bot)')))
    .addSubcommand(s => s.setName('cookie').setDescription('Click the cookie first!')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'tictactoe') {
      const p1 = interaction.user;
      const p2 = interaction.options.getUser('player');
      if (p2.bot || p2.id === p1.id) return interaction.reply({ embeds: [errorEmbed('Pick a real opponent (not yourself, not a bot).')], ephemeral: true });
      const board = Array(9).fill(null);
      let turn = p1.id;
      const symbols = { [p1.id]: '❌', [p2.id]: '⭕' };
      const render = () => [0, 1, 2].map(r => new ActionRowBuilder().addComponents(
        [0, 1, 2].map(c => {
          const i = r * 3 + c;
          return new ButtonBuilder().setCustomId(`games:ttt:${i}`).setLabel(board[i] || '➖')
            .setStyle(board[i] ? (board[i] === '❌' ? ButtonStyle.Danger : ButtonStyle.Success) : ButtonStyle.Secondary)
            .setDisabled(!!board[i]);
        })
      ));
      const winner = () => {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (const [a, b, c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        return board.every(Boolean) ? 'draw' : null;
      };
      const msg = await interaction.reply({ content: `🎮 TicTacToe: <@${p1.id}> (❌) vs <@${p2.id}> (⭕). <@${p1.id}> goes first.`, components: render(), fetchReply: true });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });
      collector.on('collect', async i => {
        if (![p1.id, p2.id].includes(i.user.id)) return i.reply({ content: 'This is not your game.', ephemeral: true });
        if (i.user.id !== turn) return i.reply({ content: 'Not your turn!', ephemeral: true });
        const idx = parseInt(i.customId.split(':')[2]);
        board[idx] = symbols[i.user.id];
        turn = turn === p1.id ? p2.id : p1.id;
        const w = winner();
        await i.deferUpdate();
        if (w) {
          const text = w === 'draw' ? "It's a draw!" : `<@${i.user.id}> wins! 🎉`;
          return msg.edit({ content: `🎮 TicTacToe: ${text}`, components: render() });
        }
        await msg.edit({ content: `🎮 TicTacToe: <@${p1.id}> (❌) vs <@${p2.id}> (⭕). <@${turn}>'s turn.`, components: render() });
      });
      collector.on('end', (_, reason) => { if (reason === 'time') msg.edit({ content: '🎮 Game timed out.', components: [] }).catch(() => {}); });
      return;
    }

    if (sub === 'rps') {
      const p2 = interaction.options.getUser('player');
      if (!p2) {
        const choices = ['rock', 'paper', 'scissors'];
        const bot = pick(choices);
        const row = new ActionRowBuilder().addComponents(
          choices.map(c => new ButtonBuilder().setCustomId(`games:rps:${c}:${bot}`).setLabel(c).setStyle(ButtonStyle.Primary))
        );
        const msg = await interaction.reply({ content: '🎮 Rock-Paper-Scissors vs me. Pick!', components: [row], fetchReply: true });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async i => {
          if (i.user.id !== interaction.user.id) return i.reply({ content: 'Not your game.', ephemeral: true });
          const you = i.customId.split(':')[2];
          const outcome = you === bot ? "It's a draw!" :
            ((you === 'rock' && bot === 'scissors') || (you === 'paper' && bot === 'rock') || (you === 'scissors' && bot === 'paper'))
              ? 'You win! 🎉' : 'I win! 🤖';
          await i.update({ content: `🎮 You picked **${you}**, I picked **${bot}**. ${outcome}`, components: [] });
        });
        collector.on('end', (_, reason) => { if (reason === 'time') msg.edit({ content: '🎮 Timed out.', components: [] }).catch(() => {}); });
        return;
      }
      if (p2.bot || p2.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Pick a real opponent (not yourself, not a bot).')], ephemeral: true });
      const choices = ['rock', 'paper', 'scissors'];
      const row = new ActionRowBuilder().addComponents(choices.map(c => new ButtonBuilder().setCustomId(`games:rps2:${c}`).setLabel(c).setStyle(ButtonStyle.Primary)));
      const picks = {};
      const msg = await interaction.reply({ content: `🎮 RPS: <@${interaction.user.id}> vs <@${p2.id}> - both pick!`, components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
      collector.on('collect', async i => {
        if (![interaction.user.id, p2.id].includes(i.user.id)) return i.reply({ content: 'Not your game.', ephemeral: true });
        picks[i.user.id] = i.customId.split(':')[2];
        await i.reply({ content: `You picked **${picks[i.user.id]}**.`, ephemeral: true });
        if (Object.keys(picks).length === 2) {
          const [a, b] = [picks[interaction.user.id], picks[p2.id]];
          const outcome = a === b ? "It's a draw!" :
            ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper'))
              ? `<@${interaction.user.id}> wins! 🎉` : `<@${p2.id}> wins! 🎉`;
          collector.stop('done');
          await msg.edit({ content: `🎮 <@${interaction.user.id}> picked **${a}**, <@${p2.id}> picked **${b}**. ${outcome}`, components: [] });
        }
      });
      collector.on('end', (_, reason) => { if (reason === 'time') msg.edit({ content: '🎮 Timed out.', components: [] }).catch(() => {}); });
      return;
    }

    if (sub === 'cookie') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('games:cookie:click').setLabel('🍪 Click the cookie!').setStyle(ButtonStyle.Primary)
      );
      const msg = await interaction.reply({ content: '🍪 First to click the cookie wins it!', components: [row], fetchReply: true });
      try {
        const i = await msg.awaitMessageComponent({ componentType: ComponentType.Button, time: 30000 });
        await i.update({ content: `🍪 <@${i.user.id}> got the cookie first!`, components: [] });
      } catch {
        await msg.edit({ content: '🍪 Nobody clicked the cookie. It went stale.', components: [] }).catch(() => {});
      }
      return;
    }
  },
};
