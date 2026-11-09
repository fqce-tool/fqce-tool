const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'fqce.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  cash INTEGER NOT NULL DEFAULT 1000,
  bank INTEGER NOT NULL DEFAULT 0,
  last_daily INTEGER NOT NULL DEFAULT 0,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_work INTEGER NOT NULL DEFAULT 0,
  last_beg INTEGER NOT NULL DEFAULT 0,
  last_rob INTEGER NOT NULL DEFAULT 0,
  last_bonus INTEGER NOT NULL DEFAULT 0,
  last_monthly INTEGER NOT NULL DEFAULT 0,
  total_won INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  total_gambled INTEGER NOT NULL DEFAULT 0,
  premium INTEGER NOT NULL DEFAULT 0,
  joined_bonus INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS businesses (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  business TEXT NOT NULL,
  last_collect INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS investments (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS quests (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  quest TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  reward INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS companies (
  name TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  privacy TEXT NOT NULL DEFAULT 'open',
  PRIMARY KEY (name, guild_id)
);
CREATE TABLE IF NOT EXISTS company_members (
  company_name TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rank TEXT NOT NULL DEFAULT 'Member',
  PRIMARY KEY (company_name, guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS marriages (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  since INTEGER NOT NULL,
  PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS family (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  parent_id TEXT,
  PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS tags (
  name TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (name, guild_id)
);
CREATE TABLE IF NOT EXISTS afk (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  since INTEGER NOT NULL,
  PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS giveaways (
  message_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  winners INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  host_id TEXT NOT NULL,
  ended INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS locked_commands (
  guild_id TEXT NOT NULL,
  command TEXT NOT NULL,
  PRIMARY KEY (guild_id, command)
);
CREATE TABLE IF NOT EXISTS blacklist (
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT,
  PRIMARY KEY (id, kind)
);
CREATE TABLE IF NOT EXISTS lastfm_users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL
);
`);

function getUser(userId, guildId) {
  let u = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!u) {
    db.prepare('INSERT INTO users (user_id, guild_id, created_at) VALUES (?, ?, ?)').run(userId, guildId, Date.now());
    u = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  }
  return u;
}

function addCash(userId, guildId, amount, reason) {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET cash = cash + ? WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
  if (reason) logTx(userId, guildId, amount, reason);
}

function addBank(userId, guildId, amount, reason) {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET bank = bank + ? WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
  if (reason) logTx(userId, guildId, amount, reason);
}

function logTx(userId, guildId, amount, reason) {
  db.prepare('INSERT INTO transactions (user_id, guild_id, amount, reason, ts) VALUES (?, ?, ?, ?, ?)')
    .run(userId, guildId, amount, reason, Date.now());
}

module.exports = { db, getUser, addCash, addBank, logTx };
