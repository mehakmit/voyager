import type { ParsedTicketData, TicketType } from '@/types'

// Patterns for extracting common ticket fields from raw text
const PATTERNS = {
  flightNumber: /\b([A-Z]{2,3})\s?(\d{1,4})\b/,
  bookingRef: /\b(?:booking|reservation|ref(?:erence)?|pnr)[:\s#]*([A-Z0-9]{5,8})\b/i,
  seat: /\bseat[:\s]+([A-Z]?\d{1,3}[A-Z]?)\b/i,
  gate: /\bgate[:\s]+([A-Z]?\d{1,3}[A-Z]?)\b/i,
  terminal: /\bterminal[:\s]+([A-Z0-9]{1,3})\b/i,
  // Dates: DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY, Mon DD YYYY
  date: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{2,4})\b/i,
  // HH:MM or H:MM AM/PM
  time: /\b(\d{1,2}:\d{2}(?:\s?[AaPp][Mm])?)\b/g,
  hotelName: /\b(?:hotel|inn|suites?|resort|lodge|hostel)[:\s]+([^\n,]{3,40})/i,
  checkIn: /\b(?:check[- ]?in|arrival)[:\s]+(.{5,20})/i,
  checkOut: /\b(?:check[- ]?out|departure)[:\s]+(.{5,20})/i,
  passengerName: /\b(?:passenger|name|travell?er)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
  iataCode: /\b([A-Z]{3})\b/g,
}

function detectType(text: string): TicketType {
  const lower = text.toLowerCase()
  if (/\bflight\b|\bboarding\b|\barrival\b|\bdeparture\b|\bairport\b/.test(lower)) return 'flight'
  if (/\btrain\b|\brail\b|\bstation\b/.test(lower)) return 'train'
  if (/\bhotel\b|\binn\b|\bcheck.in\b|\bcheck.out\b|\broom\b/.test(lower)) return 'hotel'
  if (/\bbus\b|\bcoach\b/.test(lower)) return 'bus'
  if (/\bferry\b|\bcruise\b/.test(lower)) return 'ferry'
  return 'other'
}

export function parseRawText(rawText: string): ParsedTicketData {
  const type = detectType(rawText)
  const result: ParsedTicketData = { type, rawText }

  const flightMatch = rawText.match(PATTERNS.flightNumber)
  if (flightMatch) result.flightNumber = `${flightMatch[1]}${flightMatch[2]}`

  const refMatch = rawText.match(PATTERNS.bookingRef)
  if (refMatch) result.bookingRef = refMatch[1].toUpperCase()

  const seatMatch = rawText.match(PATTERNS.seat)
  if (seatMatch) result.seat = seatMatch[1]

  const gateMatch = rawText.match(PATTERNS.gate)
  if (gateMatch) result.gate = gateMatch[1]

  const terminalMatch = rawText.match(PATTERNS.terminal)
  if (terminalMatch) result.terminal = terminalMatch[1]

  const dateMatch = rawText.match(PATTERNS.date)
  if (dateMatch) result.date = dateMatch[0]

  const times = [...rawText.matchAll(PATTERNS.time)].map(m => m[1])
  if (times.length >= 2) {
    result.departureTime = times[0]
    result.arrivalTime = times[1]
  } else if (times.length === 1) {
    result.departureTime = times[0]
  }

  const passengerMatch = rawText.match(PATTERNS.passengerName)
  if (passengerMatch) result.passengerName = passengerMatch[1]

  if (type === 'hotel') {
    const hotelMatch = rawText.match(PATTERNS.hotelName)
    if (hotelMatch) result.hotelName = hotelMatch[1].trim()

    const checkInMatch = rawText.match(PATTERNS.checkIn)
    if (checkInMatch) result.checkIn = checkInMatch[1].trim()

    const checkOutMatch = rawText.match(PATTERNS.checkOut)
    if (checkOutMatch) result.checkOut = checkOutMatch[1].trim()
  }

  // Extract IATA airport codes (3-letter uppercase) for origin/destination
  if (type === 'flight' || type === 'train') {
    const iataCodes = [...rawText.matchAll(PATTERNS.iataCode)]
      .map(m => m[1])
      .filter(code => !['THE', 'AND', 'FOR', 'NOT', 'ARE', 'BUT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY'].includes(code))

    if (iataCodes.length >= 2) {
      result.origin = iataCodes[0]
      result.destination = iataCodes[1]
    }
  }

  return result
}
