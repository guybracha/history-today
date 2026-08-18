import { config } from '../config.js';
import { request } from '../http.js';
import { discordEmbed } from '../format.js';

export async function send(fact) {
  await request(`${config.discord.webhookUrl}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: config.discord.username,
      embeds: [discordEmbed(fact)],
    }),
  });
  return { ok: true };
}
