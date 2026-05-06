const WEBHOOKS = {
  calls:   process.env.DISCORD_WEBHOOK_CALLS,   // alla samtal med Lobo
  closes:  process.env.DISCORD_WEBHOOK_CLOSES,  // closes only
  dialer:  process.env.DISCORD_WEBHOOK_DIALER,  // dialer bokningar
  setter:  process.env.DISCORD_WEBHOOK_SETTER,  // setter bokningar
}

interface Embed {
  title: string
  color: number
  fields: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
}

export async function sendDiscord(embed: Embed, channel: keyof typeof WEBHOOKS) {
  const url = WEBHOOKS[channel]
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
  } catch {}
}

// ── Call report (alla samtal) ────────────────────────────────
const OUTCOME_LABELS: Record<string, string> = {
  shown:          '✅ Visad',
  noshow:         '❌ No-show',
  closed_pif:     '💰 Stängd (PIF)',
  closed_partial: '💰 Stängd (Del)',
  followup:       '🔁 Uppföljning',
  not_interested: '🚫 Inte intresserad',
  dq:             '❌ DQ',
}

export function callEmbed(r: {
  name: string
  outcome: string
  booked_by?: string
  amount?: number
  paid_now?: number
  platform?: string
}): Embed {
  const label = OUTCOME_LABELS[r.outcome] ?? r.outcome
  const isClose = r.outcome === 'closed_pif' || r.outcome === 'closed_partial'
  const amount = r.outcome === 'closed_pif' ? r.amount : r.paid_now
  const fields: Embed['fields'] = [
    { name: 'Lead',     value: r.name,  inline: true },
    { name: 'Outcome',  value: label,   inline: true },
  ]
  if (r.booked_by) fields.push({ name: 'Bokad av', value: r.booked_by, inline: true })
  if (isClose && amount) {
    const fee = r.platform === 'whop' ? 0.963 : 0.80
    fields.push({ name: 'Belopp', value: `${amount.toLocaleString('sv-SE')} kr`, inline: true })
    fields.push({ name: 'Netto',  value: `${Math.round(amount * fee).toLocaleString('sv-SE')} kr`, inline: true })
  }
  return {
    title: `${label} — ${r.name}`,
    color: isClose ? 0xF1C40F : r.outcome === 'noshow' ? 0xED4245 : 0x99AAB5,
    fields,
    footer: { text: 'The Money Team Dashboard' },
  }
}

// ── Close ────────────────────────────────────────────────────
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
      { name: 'Lead',     value: r.name,                                        inline: true },
      { name: 'Belopp',   value: `${(amount ?? 0).toLocaleString('sv-SE')} kr`, inline: true },
      { name: 'Netto',    value: `${net.toLocaleString('sv-SE')} kr`,           inline: true },
      { name: 'Via',      value: platform,                                       inline: true },
      { name: 'Bokad av', value: r.booked_by ?? '—',                            inline: true },
      { name: 'Typ',      value: isPif ? 'Paid in Full' : 'Delbetalning',       inline: true },
    ],
    footer: { text: 'The Money Team Dashboard' },
  }
}

// ── Dialer booking ───────────────────────────────────────────
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
    title: '📅 Ny bokning — Dialer',
    color: 0x57F287,
    fields: [
      { name: 'Lead',          value: r.name,                       inline: true },
      { name: 'Dialer',        value: r.dialer,                     inline: true },
      { name: 'Samtalsdatum',  value: formatDate(r.booking_date),   inline: true },
      { name: 'Ålder',         value: r.age ? `${r.age} år` : '—', inline: true },
      { name: 'Kan investera', value: r.can_invest || '—',          inline: true },
    ],
    footer: { text: 'The Money Team Dashboard' },
  }
}

// ── Setter booking ───────────────────────────────────────────
export function setterBookingEmbed(r: {
  booked: number
  date: string
}): Embed {
  function formatDate(v: string) {
    if (!v) return '—'
    const [, m, d] = v.split('-')
    return `${d}/${m}`
  }
  return {
    title: '📩 Ny bokning — Setter',
    color: 0x5865F2,
    fields: [
      { name: 'Bokad av', value: 'Ellow',                    inline: true },
      { name: 'Antal',    value: String(r.booked),           inline: true },
      { name: 'Datum',    value: formatDate(r.date),         inline: true },
    ],
    footer: { text: 'The Money Team Dashboard' },
  }
}

// ── Setter daily report (kept for backwards compat) ──────────
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
      { name: 'DMs skickade',   value: String(r.dms_sent), inline: true },
      { name: 'Konversationer', value: String(r.convos),   inline: true },
      { name: 'Bokade',         value: String(r.booked),   inline: true },
    ],
    footer: { text: 'The Money Team Dashboard' },
  }
}
