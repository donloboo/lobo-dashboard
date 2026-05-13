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
    const oldById = Object.fromEntries(oldData.map((r: { id: string; outcome: string }) => [r.id, r]))

    // Merge: upsert incoming entries, keep existing entries not touched by this save
    const newById = Object.fromEntries(newData.map((r: { id: string }) => [r.id, r]))
    const merged = [
      ...oldData.filter((r: { id: string }) => !newById[r.id]), // keep untouched existing entries
      ...newData,                                                 // add/update incoming entries
    ]

    fs.writeFileSync(FILE, JSON.stringify(merged, null, 2))
    syncScorecard()

    for (const r of newData) {
      if (r.outcome !== 'booked') continue
      const wasBooked = oldById[r.id]?.outcome === 'booked'
      if (!wasBooked) {
        await sendDiscord(bookingEmbed(r), 'dialer')
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    const oldData = readOld()
    const updated = oldData.filter((r: { id: string }) => r.id !== id)
    fs.writeFileSync(FILE, JSON.stringify(updated, null, 2))
    syncScorecard()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
