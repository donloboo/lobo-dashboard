import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'scorecard.json')

function readAll(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'))
  } catch {
    return {}
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const weekId = searchParams.get('weekId')
  const all = readAll()
  if (weekId) return NextResponse.json(all[weekId] ?? null)
  return NextResponse.json(all)
}

export async function POST(req: Request) {
  try {
    const { weekId, data } = await req.json()
    const all = readAll()
    all[weekId] = data
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
