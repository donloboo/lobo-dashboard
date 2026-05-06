export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  // Show all env var NAMES that contain DISCORD (not values)
  const discordKeys = Object.keys(process.env).filter(k => k.includes('DISCORD'))

  return NextResponse.json({
    found_keys: discordKeys,
    total_env_vars: Object.keys(process.env).length,
    calls_defined: !!process.env.DISCORD_WEBHOOK_CALLS,
    closes_defined: !!process.env.DISCORD_WEBHOOK_CLOSES,
    dialer_defined: !!process.env.DISCORD_WEBHOOK_DIALER,
    setter_defined: !!process.env.DISCORD_WEBHOOK_SETTER,
  })
}
