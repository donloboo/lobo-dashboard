import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'leads.json')

function readLeads() {
  if (!fs.existsSync(FILE)) return []
  return JSON.parse(fs.readFileSync(FILE, 'utf-8'))
}

function writeLeads(leads: any[]) {
  fs.writeFileSync(FILE, JSON.stringify(leads, null, 2))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const leads = readLeads()
  const idx = leads.findIndex((l: any) => l.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  leads[idx] = { ...leads[idx], ...body }
  writeLeads(leads)
  return NextResponse.json(leads[idx])
}
