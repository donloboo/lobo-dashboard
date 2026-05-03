import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { syncScorecard } from '@/lib/sync-scorecard'
import { sendDiscord, closeEmbed } from '@/lib/discord'

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

    fs.writeFileSync(FILE, JSON.stringify(newData, null, 2))
    syncScorecard()

    // Notify Discord for new closes (not edits that were already closed)
    for (const r of newData) {
      const isClose = r.outcome === 'closed_pif' || r.outcome === 'closed_partial'
      if (!isClose) continue

      const isNew     = !oldIds.has(r.id)
      const wasClose  = oldById[r.id]?.outcome === 'closed_pif' || oldById[r.id]?.outcome === 'closed_partial'

      if (isNew || !wasClose) {
        await sendDiscord(closeEmbed(r))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
