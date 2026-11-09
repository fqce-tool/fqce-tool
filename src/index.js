const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { db } = require('./db');

// Keep-alive HTTP server for free hosts (Render): responds to health pings so the instance doesn't sleep.
const http = require('http');
const keepAlivePort = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Fqce Tool is online - made by fqce');
}).listen(keepAlivePort, () => console.log(`Keep-alive server listening on port ${keepAlivePort}`));
const { errorEmbed } = require('./utils');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
for (const dir of fs.readdirSync(commandsPath)) {
  const dirPath = path.join(commandsPath, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  for (const file of fs.readdirSync(dirPath).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(dirPath, file));
    if (command.data && command.execute) {
      command.category = dir.charAt(0).toUpperCase() + dir.slice(1);
      client.commands.set(command.data.name, command);
    }
  }
}

client.once('ready', () => {
  console.log(`Fqce Tool is online as ${client.user.tag} (${client.user.id})`);
  console.log(`Serving ${client.guilds.cache.size} guilds, ${client.commands.size} commands`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Blacklist check
      const bl = db.prepare('SELECT 1 FROM blacklist WHERE (id = ? AND kind = ?) OR (id = ? AND kind = ?)')
        .get(interaction.user.id, 'user', interaction.guildId || '', 'guild');
      if (bl) return interaction.reply({ embeds: [errorEmbed('You are blacklisted from using Fqce Tool.')], ephemeral: true });

      // Locked command check (staff lock)
      if (interaction.guildId) {
        const locked = db.prepare('SELECT 1 FROM locked_commands WHERE guild_id = ? AND (command = ? OR command = ?)')
          .get(interaction.guildId, interaction.commandName, '*');
        if (locked && !interaction.memberPermissions?.has('ManageGuild')) {
          return interaction.reply({ embeds: [errorEmbed('That command is locked in this server.')], ephemeral: true });
        }
      }

      await command.execute(interaction, client);
      return;
    }

    // Button / component interactions route to the owning command's onInteraction handler
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const base = interaction.customId.split(':')[0];
      const command = client.commands.get(base);
      if (command && command.onInteraction) {
        await command.onInteraction(interaction, client);
      }
      return;
    }
  } catch (err) {
    console.error(err);
    const payload = { embeds: [errorEmbed('Something went wrong running that command.')], ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

// AFK handling + mention notifications
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  try {
    const afkRow = db.prepare('SELECT * FROM afk WHERE user_id = ? AND guild_id = ?').get(message.author.id, message.guild.id);
    if (afkRow) {
      db.prepare('DELETE FROM afk WHERE user_id = ? AND guild_id = ?').run(message.author.id, message.guild.id);
      message.reply(`👋 Welcome back <@${message.author.id}>, I removed your AFK.`).catch(() => {});
    }
    for (const user of message.mentions.users.values()) {
      const row = db.prepare('SELECT * FROM afk WHERE user_id = ? AND guild_id = ?').get(user.id, message.guild.id);
      if (row) {
        message.reply(`💤 **${user.username}** is AFK: ${row.reason} (<t:${Math.floor(row.since / 1000)}:R>)`).catch(() => {});
      }
    }
  } catch {}
});

client.login(config.token);
