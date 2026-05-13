import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { syncScorecard } from '@/lib/sync-scorecard'
import { sendDiscord, callEmbed, closeEmbed } from '@/lib/discord'

const FILE = path.join(process.cwd(), 'data', 'call-reports.json')

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

    // Merge: upsert incoming entries, keep existing entries not touched by this save
    const newById = Object.fromEntries(newData.map((r: { id: string }) => [r.id, r]))
    const merged = [
      ...oldData.filter((r: { id: string }) => !newById[r.id]),
      ...newData,
    ]

    fs.writeFileSync(FILE, JSON.stringify(merged, null, 2))
    syncScorecard()

    for (const r of newData) {
      const isNew    = !oldIds.has(r.id)
      const oldOutcome = oldById[r.id]?.outcome

      if (!isNew && oldOutcome === r.outcome) continue

      const isClose  = r.outcome === 'closed_pif' || r.outcome === 'closed_partial'
      const wasClose = oldOutcome === 'closed_pif' || oldOutcome === 'closed_partial'

      // #alla-samtal — every new or outcome-changed report
      await sendDiscord(callEmbed(r), 'calls')

      // #closes — only new closes
      if (isClose && !wasClose) {
        await sendDiscord(closeEmbed(r), 'closes')
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
