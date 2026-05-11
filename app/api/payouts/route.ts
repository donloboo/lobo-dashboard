export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'payouts.json')
function readAll() { try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')) } catch { return [] } }
function writeAll(data: object[]) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) }

export async function GET() { return NextResponse.json(readAll()) }

export async function POST(req: Request) {
  try {
    const entry = await req.json()
    const all = readAll()
    all.unshift(entry)
    writeAll(all)
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 500 }) }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    writeAll(readAll().filter((p: { id: string }) => p.id !== id))
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 500 }) }
}
