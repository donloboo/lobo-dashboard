import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { syncScorecard } from '@/lib/sync-scorecard'
import { sendDiscord, bookingEmbed } from '@/lib/discord'

const FILE = path.join(process.cwd(), 'data', 'dialer-reports.json')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readOld(): any[] {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')) } catch { return [] }
}

export async function GET() {
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(FILE, 'utf-8')))
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newData: any[] = await req.json()
    const oldData = readOld()
    const oldIds = new Set(oldData.map((r: { id: string }) => r.id))
    const oldById = Object.fromEntries(oldData.map((r: { id: string; outcome: string }) => [r.id, r]))

    fs.writeFileSync(FILE, JSON.stringify(newData, null, 2))
    syncScorecard()

    // Notify Discord for new bookings
    for (const r of newData) {
      if (r.outcome !== 'booked') continue

      const isNew       = !oldIds.has(r.id)
      const wasBooked   = oldById[r.id]?.outcome === 'booked'

      if (isNew || !wasBooked) {
        await sendDiscord(bookingEmbed(r))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
