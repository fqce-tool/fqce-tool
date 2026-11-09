const { EmbedBuilder } = require('discord.js');
const config = require('./config');

function fmt(n) {
  return `${config.currency} ${Math.floor(n).toLocaleString('en-US')}`;
}

function embed(title, description, color = config.embedColor) {
  const e = new EmbedBuilder().setColor(color);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

function errorEmbed(msg) {
  return embed('❌ Error', msg, 0xed4245);
}

function successEmbed(msg) {
  return embed('✅', msg, 0x57f287);
}

function ms(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function parseDuration(str) {
  const m = String(str).trim().match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
  return n * mult;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { fmt, embed, errorEmbed, successEmbed, ms, parseDuration, rand, pick };
