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

const ANALYSIS_PROMPT = `Du är en senior säljtränare för Don Loboos dropshipping-utbildning i Sverige. Du känner skriptet utantill och vet exakt vad som skiljer ett bra samtal från ett dåligt.

DIALERNS UPPDRAG: Ringa leads som anmält intresse för dropshipping-utbildningen, kvalificera dem och boka ett möte med Don Lobo (closern). Det absolut viktigaste är att samtalet känns naturligt, mänskligt och förtroendeskapande — inte som att läsa innantill.

SKRIPTETS STEG (i ordning):
1. ÖPPNING – "Tjena, har jag kommit till [namn]?" → presentera sig, nämna Don Loboos team, säg att de anmälde sig
2. INTENT – "Vad var det som fick dig att vilja börja med dropshipping?" → LÅT personen prata. Avbryt INTE.
3. NULÄGE – Fråga om jobbet, hur länge, hur de trivs
4. PAIN (OBLIGATORISK) – Gräv i frustration: "Vad känns mindre bra?" / "Hur länge har du känt så?" / "Vad händer om inget förändras?" → Om ingen tydlig frustration = INGET möte
5. MÅL – "Vad skulle ditt mål vara att tjäna per månad?" → Ingen hype, bara förståelse
6. EKONOMI – "Hur mycket hade du kunnat tänka dig att investera för att nå det målet?" → Var tyst, låt personen svara
7. TILLGÄNGLIGHET – "Har du pengarna tillgängliga just nu?"
8. KLARNA/SKULDER (OBLIGATORISK) – Fråga om skulder och Klarna-historik
9. BESLUTSMANDAT (OBLIGATORISK) – "Kan du ta ett beslut själv eller måste du kolla med någon?" → Inte tydligt JA = INGET möte
10. PRE-COMMIT – Förklara mötet lugnt: "I samtalet kommer Lobo dela sin skärm och visa exakt hur han jobbar"
11. BOKNING – Boka via Calendly, be dem skriva till Lobos Instagram som bekräftelse

DISKVALIFICERINGSREGLER (DQ):
- Ingen jobb / nyanställd
- Under 18 år (ibland 19 fungerar, 18 sällan)
- Skulder + ingen investering
- Kan inte investera + under 20 år + jobbat under 1 år
- Låter helt ointresserad redan i öppningen
- Kan inte ta beslut själv (måste fråga partner/familj) → INGET möte
- Ingen tydlig frustration med nuläget → INGET möte
Vid DQ: Avsluta respektfullt. "När du väl sparat ihop ett kapital, tveka inte att höra av dig igen."

MINIMUMKRAV för bokning:
- Antingen: 10 000+ kr tillgängligt
- Eller: Klarna-godkänd (inga skulder, jobbat 1-2 år, minst 19-20 år)
- Tydlig frustration med nuläget
- Kan ta beslut själv

BETYGSSKALA:
10 = Perfekt samtal. Alla steg genomförda naturligt. Bokat möte. Lead är varm och engagerad.
8-9 = Bra samtal, mindre brister. Mötet bokat med engagerad lead.
6-7 = Godkänt men tydliga förbättringsområden. Antingen steg missades eller energin var fel.
4-5 = Flera kritiska misstag. Stressade fram bokning, missade pain, kvalificerade fel.
2-3 = Dåligt samtal. Läste innantill, avbröt, missade obligatoriska steg.
1 = Ska inte ha bokat mötet alls (DQ-kriterier uppfyllda men bokade ändå), eller samtalet var respektlöst.

Analysera transkriptet nedan och ge feedback på svenska i exakt detta format:

**BETYG: X/10**

**✅ Vad gick bra:**
- (specifika saker med hänvisning till skriptsteg)

**❌ Vad gick fel:**
- (specifika misstag med hänvisning till skriptsteg — inkludera om steg hoppades över)

**💬 Exakt vad som borde sagts istället:**
- (kopiera dialerns mening från transkriptet och skriv hur den borde låtit)

**🎯 Sammanfattning:**
(2-3 meningar: Vad är det viktigaste att förbättra? Var det rätt beslut att boka/DQa?)`

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
