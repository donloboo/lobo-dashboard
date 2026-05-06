import { NextResponse } from 'next/server'
import { sendDiscord } from '@/lib/discord'

export async function GET() {
  const results: Record<string, string> = {}

  const channels = ['calls', 'closes', 'dialer', 'setter'] as const

  for (const channel of channels) {
    try {
      await sendDiscord({
        title: `✅ Test — ${channel}`,
        color: 0x57F287,
        fields: [{ name: 'Status', value: 'Webhook fungerar!', inline: true }],
        footer: { text: 'The Money Team Dashboard' },
      }, channel)
      results[channel] = 'skickat'
    } catch (e) {
      results[channel] = `fel: ${String(e)}`
    }
  }

  return NextResponse.json(results)
}
