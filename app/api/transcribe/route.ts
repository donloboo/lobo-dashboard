export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import OpenAI, { toFile } from 'openai'
import ffmpeg from 'fluent-ffmpeg'

const TRANSCRIPTS_FILE = path.join(process.cwd(), 'data', 'transcripts.json')
function saveEntry(entry: object) {
  let all: object[] = []
  try { all = JSON.parse(fs.readFileSync(TRANSCRIPTS_FILE, 'utf-8')) } catch {}
  all.unshift(entry)
  fs.writeFileSync(TRANSCRIPTS_FILE, JSON.stringify(all, null, 2))
}

function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputFormat('mp3')
      .audioCodec('libmp3lame')
      .audioFrequency(16000)
      .audioChannels(1)
      .audioBitrate('64k')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
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
  let tmpInput = ''
  let tmpMp3 = ''

  try {
    const formData = await req.formData()
    const file     = formData.get('audio') as File
    const dialer   = formData.get('dialer') as string
    const leadName = formData.get('leadName') as string
    const date     = formData.get('date') as string

    if (!file) return NextResponse.json({ error: 'Ingen fil' }, { status: 400 })

    // Write uploaded file to tmp
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'm4a'
    const ts = Date.now()
    tmpInput = path.join(os.tmpdir(), `whisper-in-${ts}.${ext}`)
    tmpMp3   = path.join(os.tmpdir(), `whisper-out-${ts}.mp3`)
    fs.writeFileSync(tmpInput, buffer)

    // Convert to mp3 — handles any format (m4a, mp4, wav, ogg, etc.)
    await convertToMp3(tmpInput, tmpMp3)

    // 1. Transcribe with Whisper
    const mp3Stream = fs.createReadStream(tmpMp3)
    const audioFile = await toFile(mp3Stream, 'audio.mp3', { type: 'audio/mpeg' })
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
    if (tmpInput) try { fs.unlinkSync(tmpInput) } catch {}
    if (tmpMp3)   try { fs.unlinkSync(tmpMp3) } catch {}
  }
}
