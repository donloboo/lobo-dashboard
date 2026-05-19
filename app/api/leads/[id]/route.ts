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

async function notifyDiscord(lead: any, outcome: string, dialer: string) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return
  const icons: Record<string, string> = {
    booked: '✅', no_answer: '📵', not_booked: '❌', rebooked: '🔄', dq: '🚫'
  }
  const content = `${icons[outcome] || '📋'} **${dialer}** → **${outcome.toUpperCase()}**\n👤 ${lead.name} | 📞 ${lead.phone}`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  }).catch(() => {})
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const leads = readLeads()
  const idx = leads.findIndex((l: any) => l.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Race condition guard — prevent two dialers claiming the same lead
  if (body.status === 'calling') {
    const current = leads[idx]
    const isRecyclable = current.status === 'no_answer' || current.status === 'rebooked'
    if (current.status !== 'uncalled' && !isRecyclable) {
      return NextResponse.json({ error: 'already_claimed' }, { status: 409 })
    }
    if (current.claimed_by && current.claimed_by !== body.claimed_by) {
      return NextResponse.json({ error: 'already_claimed' }, { status: 409 })
    }
  }

  leads[idx] = { ...leads[idx], ...body }
  writeLeads(leads)

  // Discord notification on final outcome
  if (body.outcome) {
    await notifyDiscord(leads[idx], body.outcome, leads[idx].claimed_by || 'Okänd')
  }

  return NextResponse.json(leads[idx])
}
