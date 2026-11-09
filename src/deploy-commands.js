const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const GUILD_ONLY_COMMANDS = new Set(['customize', 'family', 'giveaway', 'staff']);
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const dir of fs.readdirSync(commandsPath)) {
  const dirPath = path.join(commandsPath, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  for (const file of fs.readdirSync(dirPath).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(dirPath, file));
    if (command.data && command.execute) {
      const data = command.data.toJSON();
      const guildOnly = GUILD_ONLY_COMMANDS.has(data.name);
      data.integration_types = guildOnly ? [0] : [0, 1];
      data.contexts = guildOnly ? [0] : [0, 1, 2];
      commands.push(data);
    }
  }
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log('Registered globally for guild and user installation contexts.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
