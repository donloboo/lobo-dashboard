import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { syncScorecard } from '@/lib/sync-scorecard'
import { sendDiscord, setterBookingEmbed } from '@/lib/discord'

const FILE = path.join(process.cwd(), 'data', 'setter-reports.json')

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
    const oldIds = new Set(readOld().map((r: { id: string }) => r.id))

    fs.writeFileSync(FILE, JSON.stringify(newData, null, 2))
    syncScorecard()

    for (const r of newData) {
      if (!oldIds.has(r.id) && (r.booked ?? 0) > 0) {
        await sendDiscord(setterBookingEmbed({ booked: r.booked, date: r.date }), 'setter')
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
