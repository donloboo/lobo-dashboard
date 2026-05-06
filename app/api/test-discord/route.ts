import { NextResponse } from 'next/server'

const WEBHOOKS = {
  calls:  process.env.DISCORD_WEBHOOK_CALLS,
  closes: process.env.DISCORD_WEBHOOK_CLOSES,
  dialer: process.env.DISCORD_WEBHOOK_DIALER,
  setter: process.env.DISCORD_WEBHOOK_SETTER,
}

export async function GET() {
  const results: Record<string, string> = {}

  for (const [channel, url] of Object.entries(WEBHOOKS)) {
    if (!url) {
      results[channel] = 'ENV SAKNAS'
      continue
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `✅ Test — ${channel}`,
            color: 0x57F287,
            fields: [{ name: 'Status', value: 'Webhook fungerar!', inline: true }],
            footer: { text: 'The Money Team Dashboard' },
          }],
        }),
      })
      const text = await res.text()
      results[channel] = `HTTP ${res.status} — ${text || 'ok'}`
    } catch (e) {
      results[channel] = `FEL: ${String(e)}`
    }
  }

  return NextResponse.json(results)
}
