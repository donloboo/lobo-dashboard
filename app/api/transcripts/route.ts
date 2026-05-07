export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'transcripts.json')

function readAll() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')) } catch { return [] }
}

export async function GET() {
  return NextResponse.json(readAll())
}

export async function POST(req: Request) {
  try {
    const entry = await req.json()
    const all = readAll()
    all.unshift(entry)
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    const all = readAll().filter((t: { id: string }) => t.id !== id)
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
