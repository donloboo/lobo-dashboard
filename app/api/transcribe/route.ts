export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const TRANSCRIPTS_FILE = path.join(process.cwd(), 'data', 'transcripts.json')
function saveEntry(entry: object) {
  let all: object[] = []
  try { all = JSON.parse(fs.readFileSync(TRANSCRIPTS_FILE, 'utf-8')) } catch {}
  all.unshift(entry)
  fs.writeFileSync(TRANSCRIPTS_FILE, JSON.stringify(all, null, 2))
}

const ANALYSIS_PROMPT = `Du är en säljtränare för ett dropshipping-utbildningsföretag i Sverige.
En dialer ringer potentiella kunder för att kvalificera dem och boka ett säljsamtal med Lobo (closern).

Dialerns jobb är att:
1. Presentera sig och skapa rapport
2. Kvalificera leaden (jobb, hur länge, kan investera, motivation)
3. Pitcha kortfattat vad Lobo gör
4. Boka ett samtal med Lobo

Analysera transkriptet nedan och ge feedback på svenska i exakt detta format:

**BETYG: X/10**

**✅ Vad gick bra:**
- (lista specifika saker)

**❌ Vad gick fel:**
- (lista specifika misstag)

**💬 Vad borde sagts istället:**
- (konkreta meningar dialern kan använda nästa gång)

**🎯 Sammanfattning:**
(1-2 meningar om det viktigaste att förbättra)`

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY saknas' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file     = formData.get('audio') as File
    const dialer   = formData.get('dialer') as string
    const leadName = formData.get('leadName') as string
    const date     = formData.get('date') as string

    if (!file) return NextResponse.json({ error: 'Ingen fil' }, { status: 400 })

    // 1. Transcribe with Whisper
    const arrayBuffer = await file.arrayBuffer()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'm4a'
    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4',
      wav: 'audio/wav',  ogg: 'audio/ogg', webm: 'audio/webm',
      flac: 'audio/flac', oga: 'audio/ogg',
    }
    const mime = mimeMap[ext] ?? 'audio/mp4'
    const blob = new Blob([arrayBuffer], { type: mime })

    const whisperForm = new FormData()
    whisperForm.append('file', blob, `audio.${ext}`)
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'sv')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.text()
      return NextResponse.json({ error: `Whisper fel: ${err}` }, { status: 500 })
    }

    const { text: transcript } = await whisperRes.json()

    // 2. Analyze with GPT-4o-mini
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          { role: 'user',   content: `Transkript:\n\n${transcript}` },
        ],
      }),
    })

    const gptData = await gptRes.json()
    const analysis = gptData.choices?.[0]?.message?.content ?? 'Kunde inte analysera.'

    // 3. Save directly to file
    const entry = {
      id:         Date.now().toString(),
      date,
      dialer,
      leadName,
      transcript,
      analysis,
      created_at: new Date().toISOString(),
    }
    saveEntry(entry)

    return NextResponse.json({ ok: true, entry })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
