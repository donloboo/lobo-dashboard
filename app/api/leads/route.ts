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

const FAKE_NAMES = new Set([
  'test','test-1','test-2','test-3','redo','deez','goyslop','ja','jja','sjs',
  'hhgh','hej','hello','asdf','qwerty','abc','xyz','admin','lobo','edvard','atlassi',
])

function isRealLead(lead: any): boolean {
  const name = (lead.name || '').trim()
  const phone = (lead.phone || '').replace(/\D/g, '')
  // Phone must have at least 8 digits
  if (phone.length < 8) return false
  // Name must have at least 2 alphabetic characters
  if ((name.match(/[a-zA-ZåäöÅÄÖæøÆØ]/g) || []).length < 2) return false
  // Name must contain at least one vowel
  if (!/[aeiouåäöæøAEIOUÅÄÖÆØ]/.test(name)) return false
  // Name must not be a known fake/test word
  if (FAKE_NAMES.has(name.toLowerCase().replace(/[^a-zåäö]/g, ''))) return false
  // Name must not contain digits (Test-1, Test-2 etc)
  if (/\d/.test(name)) return false
  // Name must not be a sentence (more than 4 words = someone typed their goal as name)
  if (name.split(/\s+/).length > 4) return false
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

  const now = Date.now()
  const H24 = 24 * 60 * 60 * 1000

  const sorted = leads
    .filter((l: any) => l.phone && isRealLead(l))
    .map((l: any) => {
      const phone = normalizePhone(l.phone)
      let effectiveStatus = l.status

      // Recycle no_answer leads older than 24h back into the queue
      if (l.status === 'no_answer' && l.called_at) {
        const age = now - new Date(l.called_at).getTime()
        if (age > H24) effectiveStatus = 'uncalled'
      }

      // Surface rebooked leads whose callback time has passed
      if (l.status === 'rebooked' && l.callback_time) {
        if (now >= new Date(l.callback_time).getTime()) effectiveStatus = 'uncalled'
      }

      const alreadyCalled = effectiveStatus === 'uncalled' &&
        (calledPhones.has(phone) || l.status === 'no_answer' || l.status === 'rebooked')

      return { ...l, score: score(l), already_called: alreadyCalled, effectiveStatus }
    })
    .sort((a: any, b: any) => {
      const aU = a.effectiveStatus === 'uncalled'
      const bU = b.effectiveStatus === 'uncalled'
      if (aU && !bU) return -1
      if (!aU && bU) return 1
      if (aU && bU) {
        if (a.already_called && !b.already_called) return 1
        if (!a.already_called && b.already_called) return -1
        return b.score - a.score
      }
      return 0
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
