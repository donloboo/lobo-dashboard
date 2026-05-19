import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'leads.json')
const SEED = path.join(process.cwd(), 'lib', 'leads-seed.json')

function readLeads() {
  if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, 'utf-8'))
  // First-run on Railway: seed from bundled file (outside the data volume)
  if (fs.existsSync(SEED)) {
    const seed = fs.readFileSync(SEED, 'utf-8')
    try { fs.writeFileSync(FILE, seed) } catch {}
    return JSON.parse(seed)
  }
  return []
}

function writeLeads(leads: any[]) {
  fs.writeFileSync(FILE, JSON.stringify(leads, null, 2))
}

function score(lead: any): number {
  let pts = 0
  const age = parseInt(lead.age || '0')
  if (age >= 20) pts += 2
  if (lead.situation === 'Jobbar heltid') pts += 3
  else if (lead.situation === 'Jobbar deltid') pts += 1
  if (lead.income === '30.000kr+') pts += 3
  else if (lead.income === '10-20.000kr') pts += 1
  if (lead.goal === '100.000kr+' || lead.goal === 'Miljoner') pts += 2
  const hoursOld = (Date.now() - new Date(lead.submitted_at).getTime()) / 3600000
  if (hoursOld < 24) pts += 2
  return pts
}

function normalizePhone(p: string) {
  return p.replace(/\s+/g, '').replace(/^00/, '+')
}

function isRealLead(lead: any): boolean {
  const name = (lead.name || '').trim()
  const phone = (lead.phone || '').replace(/\D/g, '')
  // Name must have at least 2 alphabetic characters
  if ((name.match(/[a-zA-ZåäöÅÄÖæøÆØ]/g) || []).length < 2) return false
  // Phone must have at least 8 digits
  if (phone.length < 8) return false
  return true
}

export async function GET() {
  const leads = readLeads()

  // Cross-reference with call-reports to mark already-called leads
  const callReportsFile = path.join(process.cwd(), 'data', 'call-reports.json')
  const calledPhones = new Set<string>()
  if (fs.existsSync(callReportsFile)) {
    const callReports = JSON.parse(fs.readFileSync(callReportsFile, 'utf-8'))
    for (const r of callReports) {
      if (r.phone) calledPhones.add(normalizePhone(r.phone))
    }
  }

  const sorted = leads
    .filter((l: any) => l.phone && isRealLead(l))
    .map((l: any) => {
      const alreadyCalled = l.status === 'uncalled' && calledPhones.has(normalizePhone(l.phone))
      return { ...l, score: score(l), already_called: alreadyCalled }
    })
    .sort((a: any, b: any) => {
      // Already called → always last
      if (a.already_called && !b.already_called) return 1
      if (!a.already_called && b.already_called) return -1
      if (a.status === 'uncalled' && b.status !== 'uncalled') return -1
      if (a.status !== 'uncalled' && b.status === 'uncalled') return 1
      return b.score - a.score
    })
  return NextResponse.json(sorted)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Typeform webhook payload
  const answers = body.form_response?.answers || []
  const submitted_at = body.form_response?.submitted_at || new Date().toISOString()
  const response_id = body.form_response?.token || Date.now().toString()

  function getField(id: string) {
    const a = answers.find((x: any) => x.field?.id === id)
    if (!a) return ''
    if (a.type === 'choice') return a.choice?.label || ''
    return a[a.type] || ''
  }

  const phone = getField('on6SQWB2E0I7')
  if (!phone) return NextResponse.json({ ok: true })

  const lead = {
    id: response_id,
    submitted_at,
    name: getField('UUdNF7Vwbyci'),
    age: getField('HPcFdvapBHqn'),
    situation: getField('45buCiEhohj7'),
    income: getField('RRdd2jIt1Y0k'),
    goal: getField('zlBxlUpfnqjQ'),
    email: getField('2K39yITxXG8y'),
    phone,
    instagram: getField('MtVJulcDAoK7'),
    status: 'uncalled',
    claimed_by: null,
    called_at: null,
    outcome: null,
    outcome_reason: null,
    notes: ''
  }

  const leads = readLeads()
  if (!leads.find((l: any) => l.id === response_id)) {
    leads.unshift(lead)
    writeLeads(leads)
  }

  return NextResponse.json({ ok: true })
}
