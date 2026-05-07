export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import OpenAI, { toFile } from 'openai'

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

  const openai = new OpenAI({ apiKey })
  let tmpPath = ''

  try {
    const formData = await req.formData()
    const file     = formData.get('audio') as File
    const dialer   = formData.get('dialer') as string
    const leadName = formData.get('leadName') as string
    const date     = formData.get('date') as string

    if (!file) return NextResponse.json({ error: 'Ingen fil' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'm4a'

    // Log diagnostic info
    const magic = buffer.slice(0, 12).toString('hex')
    console.log(`[transcribe] file=${file.name} size=${buffer.length} ext=${ext} magic=${magic}`)

    // Write to tmp
    tmpPath = path.join(os.tmpdir(), `whisper-${Date.now()}.${ext}`)
    fs.writeFileSync(tmpPath, buffer)

    // 1. Transcribe — use toFile with explicit MIME type (most reliable)
    const stream = fs.createReadStream(tmpPath)
    // Force audio/mp4 for m4a/mp4, proper types for others
    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4',
      wav: 'audio/wav',  ogg: 'audio/ogg', webm: 'audio/webm',
      flac: 'audio/flac', oga: 'audio/ogg',
    }
    const mime = mimeMap[ext] ?? 'audio/mp4'
    const audioFile = await toFile(stream, `audio.${ext}`, { type: mime })

    console.log(`[transcribe] sending to whisper: name=${audioFile.name} type=${audioFile.type} size=${audioFile.size}`)

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'sv',
    })
    const transcript = transcription.text

    // 2. Analyze with GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user',   content: `Transkript:\n\n${transcript}` },
      ],
    })
    const analysis = completion.choices[0]?.message?.content ?? 'Kunde inte analysera.'

    // 3. Save
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
    console.error('[transcribe] error:', String(e))
    return NextResponse.json({ error: String(e) }, { status: 500 })
  } finally {
    if (tmpPath) try { fs.unlinkSync(tmpPath) } catch {}
  }
}
