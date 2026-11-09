const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const dir of fs.readdirSync(commandsPath)) {
  const dirPath = path.join(commandsPath, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  for (const file of fs.readdirSync(dirPath).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(dirPath, file));
    if (command.data && command.execute) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`Registered to guild ${config.guildId} (instant).`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('Registered globally (can take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
