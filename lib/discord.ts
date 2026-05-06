const WEBHOOK = process.env.DISCORD_WEBHOOK_URL

interface Embed {
  title: string
  color: number
  fields: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
}

export async function sendDiscord(embed: Embed) {
  if (!WEBHOOK) return
  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
  } catch {}
}

export function closeEmbed(r: {
  name: string
  outcome: string
  platform?: string
  amount?: number
  paid_now?: number
  booked_by?: string
}): Embed {
  const isPif     = r.outcome === 'closed_pif'
  const isPartial = r.outcome === 'closed_partial'
  const amount    = isPif ? r.amount : r.paid_now
  const platform  = r.platform === 'whop' ? 'Whop' : 'Hotmart'
  const fee       = r.platform === 'whop' ? 0.963 : 0.80
  const net       = amount ? Math.round(amount * fee) : 0

  return {
    title: '💰 STÄNGD!',
    color: 0xF1C40F,
    fields: [
      { name: 'Lead',      value: r.name,                                         inline: true },
      { name: 'Belopp',    value: `${(amount ?? 0).toLocaleString('sv-SE')} kr`,  inline: true },
      { name: 'Netto',     value: `${net.toLocaleString('sv-SE')} kr`,            inline: true },
      { name: 'Via',       value: platform,                                        inline: true },
      { name: 'Bokad av',  value: r.booked_by ?? '—',                             inline: true },
      { name: 'Typ',       value: isPif ? 'Paid in Full' : isPartial ? 'Delbetalning' : '—', inline: true },
    ],
    footer: { text: 'The Money Team Dashboard' },
  }
}

export function setterEmbed(r: {
  dms_sent: number
  convos: number
  booked: number
  date: string
}): Embed {
  return {
    title: '📩 Ellow — Daglig rapport',
    color: 0x5865F2,
    fields: [
      { name: 'DMs skickade', value: String(r.dms_sent), inline: true },
      { name: 'Konversationer', value: String(r.convos),  inline: true },
      { name: 'Bokade',         value: String(r.booked),  inline: true },
    ],
    footer: { text: 'The Money Team Dashboard' },
  }
}

export function bookingEmbed(r: {
  name: string
  dialer: string
  booking_date?: string
  can_invest?: string
  age?: string
}): Embed {
  function formatDate(v?: string) {
    if (!v) return '—'
    const [, m, d] = v.split('-')
    return `${d}/${m}`
  }

  return {
    title: '📅 Ny bokning!',
    color: 0x57F287,
    fields: [
      { name: 'Lead',        value: r.name,                  inline: true },
      { name: 'Dialer',      value: r.dialer,                inline: true },
      { name: 'Samtalsdatum',value: formatDate(r.booking_date), inline: true },
      { name: 'Ålder',       value: r.age ? `${r.age} år` : '—', inline: true },
      { name: 'Kan investera', value: r.can_invest || '—',   inline: true },
    ],
    footer: { text: 'The Money Team Dashboard' },
  }
}
