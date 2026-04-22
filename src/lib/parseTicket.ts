import type { ParsedTicketData, TicketType } from '@/types'

const CAR_COMPANIES = /\b(hertz|avis|enterprise|budget|europcar|sixt|national|alamo|thrifty|dollar|fox|payless)\b/i

// Three-letter codes that are NOT airport codes
const IATA_STOPWORDS = new Set([
  'THE','AND','FOR','NOT','ARE','BUT','YOU','ALL','CAN','HER','WAS','ONE','OUR',
  'OUT','DAY','NEW','SUN','AIR','FLY','JET','SKY','VIA','NOW','USE','GET','SET',
  'TAX','VAT','REF','PNR','ETA','ETD','STD','STA','DEP','ARR','PAX','SEA','BUS',
  'CAR','VAN','YES','AGE','AGO','APR','AUG','DEC','FEB','JAN','JUL','JUN','MAR',
  'MAY','NOV','OCT','SEP','MON','TUE','WED','THU','FRI','SAT','OUR','HIS','ITS',
  'OWN','WHO','WHY','HOW','HAS','HAD','DID','GOT','PUT','ANY','FAR','FEW','ACT',
  'ADD','OLD','BIG','BOX','BUY','CUT','EAT','END','HIT','ICE','JOB','LAY','LED',
  'LET','MAP','MEN','MET','ODD','OFF','PAY','PRO','RAW','ROW','RUN','SAY','SIT',
  'SIX','SUM','TEN','TIP','TOP','TRY','WAR','WAY','WET','WIN','WON','YET','ZIP',
  // Currencies
  'CAD','USD','GBP','EUR','AUD','JPY','CHF','SEK','NOK','DKK','NZD','HKD','SGD',
  // Taxes / codes
  'HST','GST','PST','QST','VAT','IVA','TFM','YQI','YQF','YQV','XTT','XTY',
  // Airline / booking
  'GDS','CKD','OPE','OPR','INT','PKG','STR','CLS','INC','LTD','OKF','PNR',
  'END','NUC','ROE','BSR','TTL','ADT','INF','CHD','WS','AC','BA','UA',
  // Words
  'STATUS','INFO','FARE','HOLD','CLASS','SEAT','GATE','TERM','BAGS','FEES',
  'EACH','ONLY','ALSO','WILL','THAT','WITH','FROM','THIS','HAVE','BEEN',
  'MORE','THAN','WHEN','THEY','INTO','THEN','SOME','WHAT','WERE','SAID',
])

// Matches valid 24h or 12h times, excludes HH:MM:SS timestamps
// (?<!\d:) prevents matching "59" inside "17:59:36"
// (?!:\d)  prevents matching "17:59" inside "17:59:36"
const TIME_RE = /(?<!\d:)\b((?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[ap]m)?)(?!:\d)/gi

function detectType(text: string): TicketType {
  const lower = text.toLowerCase()
  if (CAR_COMPANIES.test(text) || /\bcar\s*rental\b|\bvehicle\s*hire\b|\bcar\s*hire\b|\brental\s*car\b/.test(lower)) return 'car'
  if (/\bflight\b|\bboarding\s*pass\b|\bairport\b|\bairlines?\b|\be-?ticket\b/.test(lower)
    || /\bDEPARTING\b|\bARRIVING\b/.test(text)) return 'flight'
  if (/\btrain\b|\brail\b|\bstation\b/.test(lower)) return 'train'
  if (/\bhotel\b|\binn\b|\bcheck.in\b|\bcheck.out\b|\broom\b|\bsuites?\b/.test(lower)) return 'hotel'
  if (/\bbus\b|\bcoach\b/.test(lower)) return 'bus'
  if (/\bferry\b|\bcruise\b/.test(lower)) return 'ferry'
  return 'other'
}

// Extract a labelled 4-digit HHMM time near a dep/arr label.
// Primary: label immediately before HHMM (e.g. "Dep.Time 1410" or "Arr.Time : 0630").
// Fallback: label within 80 chars of a structurally valid HHMM (hour 00–23, min 00–59),
//           used when pdfjs column ordering separates label and value in the text stream.
function extractHHMM(section: string, labelRe: string): string | undefined {
  const primary = section.match(new RegExp(`\\b${labelRe}[\\s.]*[:\\s]+(\\d{4})\\b`, 'i'))
  if (primary) {
    const h = parseInt(primary[1].slice(0, 2), 10)
    const m = parseInt(primary[1].slice(2), 10)
    if (h < 24 && m < 60) return `${primary[1].slice(0, 2)}:${primary[1].slice(2)}`
  }
  // Fallback: look for a valid HHMM within 20 chars of the label.
  // Narrow window prevents cross-column matches in pdfjs-extracted text.
  const fallback = section.match(
    new RegExp(`\\b${labelRe}\\b[\\s\\S]{0,20}?(?<!\\d)((?:0\\d|1\\d|2[0-3])[0-5]\\d)(?!\\d)`, 'i')
  )
  if (fallback) return `${fallback[1].slice(0, 2)}:${fallback[1].slice(2)}`
  return undefined
}

function parseSection(section: string, fullText: string): ParsedTicketData {
  const type = detectType(section)
  const result: ParsedTicketData = { type }

  // ── Booking ref ──
  const refMatch =
    section.match(/\b(?:airline\s+booking\s+ref|booking\s*ref(?:erence)?|reservation\s*code|gds\s*pnr|pnr|confirmation)[:\s#]*([A-Z0-9]{5,8})\b/i) ??
    fullText.match(/\b(?:airline\s+booking\s+ref|booking\s*ref(?:erence)?|reservation\s*code|gds\s*pnr|pnr|confirmation)[:\s#]*([A-Z0-9]{5,8})\b/i)
  if (refMatch) result.bookingRef = refMatch[1].toUpperCase()

  // ── Passenger name ──
  // Priority 1: explicit "Passenger Name:" label
  const labelMatch = fullText.match(/\bpassenger\s*name[:\s]+([A-Z][A-Z\s]{2,30})/i)
  if (labelMatch) {
    const n = labelMatch[1].trim().split(/\s+/)
    if (n.length <= 4 && n.every(w => !/^(RESERVATION|CODE|STATUS|BOOKING|REF|NUMBER|DATE)$/i.test(w))) {
      result.passengerName = labelMatch[1].trim()
    }
  }
  // Priority 2: IATA airline name format "SURNAME/FIRSTNAME TITLE" or "SURNAME/FIRSTNAME".
  // No `i` flag: only ALL CAPS names match — this prevents "WestJet/SDX" (issuing agent)
  // from being captured instead of the actual passenger. Allows optional spaces around slash.
  if (!result.passengerName) {
    const iataName = fullText.match(/\b([A-Z]{2,20})\s*\/\s*([A-Z]{2,20})(?:\s+(?:MR|MRS|MISS|MS|DR))?/)
    if (iataName && !IATA_STOPWORDS.has(iataName[1]) && !IATA_STOPWORDS.has(iataName[2])) {
      result.passengerName = `${iataName[2]} ${iataName[1]}` // FIRSTNAME SURNAME
    }
  }
  // Priority 3: title + name — no `i` flag so jargon words in all-caps don't false-match
  if (!result.passengerName) {
    const NAME_BLOCKLIST = /^(RESERVATION|CODE|STATUS|BOOKING|REF|NUMBER|DATE|INFO|CLASS|FARE|TICKET|CONFIRMATION|ITINERARY|GATE|SEAT|TERMINAL|PASSENGER|AIRLINE|CITY|AIRPORT|DEPARTURE|ARRIVAL|RETURN|DETAILS|SUMMARY)$/
    // Title Case names ("Mr. John Smith")
    const titleCaseMatch = fullText.match(/\b(MR|MRS|MISS|MS|DR)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/)
    // ALL CAPS names ("MR JOHN SMITH") — validated against blocklist
    const capsMatch = !titleCaseMatch
      ? fullText.match(/\b(MR|MRS|MISS|MS|DR)\s+([A-Z]{2,15}(?:\s+[A-Z]{2,15}){1,2})\b/)
      : null
    const titleMatch = titleCaseMatch ?? capsMatch
    if (titleMatch) {
      const words = titleMatch[2].trim().split(/\s+/)
      if (words.every(w => !NAME_BLOCKLIST.test(w) && !IATA_STOPWORDS.has(w))) {
        result.passengerName = `${titleMatch[1]} ${titleMatch[2]}`
      }
    }
  }

  // ── Departure date ──
  // Priority 1: labelled travel/departure date
  const labeledDate = section.match(
    /\b(?:travel\s*date|departure\s*date|dep(?:arture)?\.?\s*date|date\s*of\s*(?:travel|departure|flight))\s*:\s*([^\n\r]{4,25})/i
  )
  if (labeledDate) {
    result.date = labeledDate[1].trim()
  } else {
    // Priority 2: "TRAVEL...DATE" table header followed by date value.
    // Window extended to 100 chars: WestJet header "AIRLINE DEPARTURE ARRIVAL OTHER NOTES" is ~45 chars.
    const travelDateBlock = section.match(/TRAVEL[\s\S]{0,50}?DATE[\s\S]{0,100}?(\d{1,2}\s+\w+\s+\d{2,4}|\d{1,2}[\/\-]\w+[\/\-]\d{2,4})/i)
    if (travelDateBlock) {
      result.date = travelDateBlock[1].trim()
    } else {
      // Priority 3: day-of-week + date header
      const dow = section.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}\s+\w+\s+\d{4})/i)
      if (dow) {
        result.date = dow[1].trim()
      } else {
        // Priority 4: first date in section, excluding any "ISSUE DATE" value
        const issueDateStr = section.match(/\bISSUE\s*DATE\s+(\d{1,2}\s+\w+\s+\d{2,4})/i)?.[1]?.trim()
        const allDates = [...section.matchAll(
          /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4}|\d{1,2}[\/\-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\-]\d{2,4})/gi
        )].map(m => m[1])
        const travelDates = issueDateStr
          ? allDates.filter(d => d.trim() !== issueDateStr)
          : allDates
        if (travelDates.length > 0) {
          result.date = travelDates[0]
          if (travelDates.length > 1) result.allDates = travelDates
        }
      }
    }
  }

  // ── Times + route (combined for formats that label both together) ──

  // Priority 0: "DEPARTING LHR 09:25" / "ARRIVING SIN 05:45" (Singapore Airlines).
  // Captures airport code AND time in one match — immune to pdfjs column-ordering.
  let depTime: string | undefined
  let arrTime: string | undefined
  const depFull = section.match(/\bDEPARTING\s+([A-Z]{3})\s+(\d{1,2}:\d{2})\b/)
  const arrFull = section.match(/\bARRIVING\s+([A-Z]{3})\s+(\d{1,2}:\d{2})\b/)
  if (depFull && !IATA_STOPWORDS.has(depFull[1])) {
    result.origin = depFull[1]
    depTime = depFull[2]
  }
  if (arrFull && !IATA_STOPWORDS.has(arrFull[1])) {
    result.destination = arrFull[1]
    arrTime = arrFull[2]
  }

  // Strip footer and date strings before further time searches.
  const footerIdx = section.search(/\bPowered\s+by\b|\bE\s*[&]\s*OE\b/i)
  const sectionClean = (footerIdx > 0 ? section.slice(0, footerIdx) : section)
    .replace(/©[^\n]*/g, '')
    .replace(/\b\d{1,2}[\/\-]\w{3,}[\/\-]\d{2,4}\b/g, '')
    .replace(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{2,4}\b/gi, '')

  // Priority 1: label immediately before HHMM ("Dep.Time : 1410", "Arr.Time : 0630")
  if (!depTime) depTime = extractHHMM(sectionClean, 'dep(?:arture)?[\\s.]*time')
  if (!arrTime) arrTime = extractHHMM(sectionClean, 'arr(?:ival)?[\\s.]*time')

  // Priority 2: colon-formatted HH:MM / H:MMam/pm — works for boarding passes
  if (!depTime || !arrTime) {
    const colonTimes = [...sectionClean.matchAll(TIME_RE)].map(m => m[1])
    const uniq = [...new Set(colonTimes)]
    if (!depTime && uniq[0]) depTime = uniq[0]
    if (!arrTime && uniq[1] && uniq[1] !== depTime) arrTime = uniq[1]
  }

  // Priority 3: scan all 4-digit HHMM values in section order.
  // In PDFs where pdfjs separates label columns from value columns, extractHHMM fails.
  // The PDF always lists times as dep → ck-in → arr, so first HHMM = dep, last = arr.
  if (!depTime || !arrTime) {
    const HHMM_RE = /(?<!\d)((?:0[0-9]|1[0-9]|2[0-3])[0-5]\d)(?!\d)/g
    const allHHMMs = [...new Set([...sectionClean.matchAll(HHMM_RE)].map(m => m[1]))]
    if (!depTime && allHHMMs[0])
      depTime = `${allHHMMs[0].slice(0, 2)}:${allHHMMs[0].slice(2)}`
    if (!arrTime && allHHMMs.length >= 2)
      arrTime = `${allHHMMs[allHHMMs.length - 1].slice(0, 2)}:${allHHMMs[allHHMMs.length - 1].slice(2)}`
  }

  if (depTime) result.departureTime = depTime
  if (arrTime) result.arrivalTime = arrTime

  // ── Flight number ──
  // \s* (not \s+) so we catch compact codes like "SQ305" as well as "AC 866"
  const flightLabelMatch = section.match(/\bflight\s*[:\s#]+([A-Z]{2,3}\s*\d{3,4})\b/i)
  const flightInlineMatch = section.match(/\b([A-Z]{2,3})\s*(\d{3,4})\b/)
  if (flightLabelMatch) result.flightNumber = flightLabelMatch[1].replace(/\s/g, '')
  else if (flightInlineMatch && !IATA_STOPWORDS.has(flightInlineMatch[1])) {
    result.flightNumber = flightInlineMatch[1] + flightInlineMatch[2]
  }

  // ── Seat / terminals ──
  // Exclude "Seats : 1" (count of seats booked) — require the value has a letter or ≥2 digits
  const seatMatch = section.match(/\bseat(?!s)\s*(?:number)?[:\s]+([A-Z]?\d{1,3}[A-Z]|\d{2,3}[A-Z]?)\b/i)
  if (seatMatch) result.seat = seatMatch[1]
  // Separate dep/arr terminals; fall back to generic "Terminal" for boarding passes
  const depTerminalMatch = section.match(/\bdep\.?\s*terminal\s*[:\s]+([A-Z]?\d{1,2})\b/i)
  if (depTerminalMatch) result.depTerminal = depTerminalMatch[1]
  const arrTerminalMatch = section.match(/\barr\.?\s*terminal\s*[:\s]+([A-Z]?\d{1,2})\b/i)
  if (arrTerminalMatch) result.arrTerminal = arrTerminalMatch[1]
  if (!result.depTerminal && !result.arrTerminal) {
    const terminalMatch = section.match(/\bterminal\s*[:\s]+([A-Z]?\d{1,2})\b/i)
    if (terminalMatch) result.terminal = terminalMatch[1]
  }

  // ── Airline / class / baggage / duration / meals ──
  // All require a literal colon to avoid matching column headers (e.g. "AIRLINE DEPARTURE")
  // or label-prefix phrases (e.g. "Airline Booking Ref", "Baggage Allowance").
  if (type === 'flight' || type === 'train') {
    const airlineSrc =
      section.match(/\bairline\s*:\s*(.*?)(?=\s+\w[\w.]*\s*:|\n|$)/i) ??
      section.match(/\boperated\s+by\s*:\s*(.*?)(?=\s+\w[\w.]*\s*:|\n|$)/i)
    if (airlineSrc) result.airline = airlineSrc[1].trim().replace(/^AC-/i, '').trim()
    const classMatch = section.match(/\b(?:class|cabin)\s*:\s*(Economy|Business|First|Premium\w*)/i)
    if (classMatch) result.cabinClass = classMatch[1].trim()
    // Only match baggage when the value is a quantity (1PC, 2 PIECE, 23KG, etc.)
    // Prevents grabbing column labels like "Flight" when pdfjs separates label/value columns.
    const baggageMatch = section.match(/\bbaggage\s*:\s*(\d+\s*(?:PC|PIECE|KG|LB|lbs?|bags?)?)/i)
    if (baggageMatch) result.baggage = baggageMatch[1].trim()
    const durationMatch = section.match(/\bflight\s+duration\s*:\s*(\d{1,2})[.:](\d{2})/i)
    if (durationMatch) result.flightDuration = `${durationMatch[1]}h ${durationMatch[2]}m`
    const mealsMatch = section.match(/\bmeals?\s*(?:info)?\s*:\s*(.*?)(?=\s+\w[\w.]*\s*:|\n|$)/i)
    if (mealsMatch) result.meals = mealsMatch[1].trim()
  }

  // ── IATA airport codes ──
  if ((type === 'flight' || type === 'train') && (!result.origin || !result.destination)) {
    // Priority 1: codes in parens right after a city/location word e.g. "London-Heathrow(LHR)"
    const locationParens = [...section.matchAll(
      /(?:departure\s*city|arrival\s*city|from|origin|destination|departs?|arrives?)[^(]{0,80}\(([A-Z]{3})\)/gi
    )].map(m => m[1].toUpperCase()).filter(c => !IATA_STOPWORDS.has(c))

    if (locationParens.length >= 2) {
      result.origin = locationParens[0]
      result.destination = locationParens[1]
    } else {
      // Priority 2: "DEPARTING LHR" / "ARRIVING SIN" (Singapore Airlines format)
      const depCode = section.match(/\bDEPARTING\s+([A-Z]{3})\b/)
      const arrCode = section.match(/\bARRIVING\s+([A-Z]{3})\b/)
      if (depCode && !IATA_STOPWORDS.has(depCode[1])) result.origin = depCode[1]
      if (arrCode && !IATA_STOPWORDS.has(arrCode[1])) result.destination = arrCode[1]

      if (!result.origin || !result.destination) {
        // Priority 3: contextual "YYZ to YUL" or "YYZ-YUL"
        const ctx = section.match(/\b([A-Z]{3})\s*(?:to|-|→|\/)\s*([A-Z]{3})\b/)
        if (ctx && !IATA_STOPWORDS.has(ctx[1]) && !IATA_STOPWORDS.has(ctx[2])) {
          if (!result.origin) result.origin = ctx[1]
          if (!result.destination) result.destination = ctx[2]
        } else if (locationParens.length === 1 && !result.origin) {
          result.origin = locationParens[0]
        }
      }
    }
  }

  // ── Hotel ──
  if (type === 'hotel') {
    const hotelMatch = section.match(/(?:hotel\s+([^\n,]{3,40})|([^\n,]{3,40})\s+hotel)/i)
    if (hotelMatch) result.hotelName = (hotelMatch[1] ?? hotelMatch[2])?.trim()
    const checkInMatch = section.match(/\bcheck[- ]?in[:\s]+(.{5,25})/i)
    if (checkInMatch) result.checkIn = checkInMatch[1].trim()
    const checkOutMatch = section.match(/\bcheck[- ]?out[:\s]+(.{5,25})/i)
    if (checkOutMatch) result.checkOut = checkOutMatch[1].trim()
    const roomMatch = section.match(/\broom\s*(?:type)?[:\s]+([^\n,]{3,30})/i)
    if (roomMatch) result.roomType = roomMatch[1].trim()
  }

  // ── Car ──
  if (type === 'car') {
    const companyMatch = section.match(CAR_COMPANIES)
    if (companyMatch) result.rentalCompany = companyMatch[0]
    const pickupMatch = section.match(/\bpick[- ]?up[:\s]+([^\n,]{3,40})/i)
    if (pickupMatch) result.pickupLocation = pickupMatch[1].trim()
    const dropoffMatch = section.match(/\bdrop[- ]?off[:\s]+([^\n,]{3,40})/i)
    if (dropoffMatch) result.dropoffLocation = dropoffMatch[1].trim()
  }

  result.rawText = section
  return result
}

function splitFlightSections(text: string): string[] {
  // Split on day-of-week date headers (PenGuin/TravelUp format)
  let parts = text.split(/(?=(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+\w+\s+\d{4})/i)
    .filter(s => /flight/i.test(s) && s.trim().length > 100)
  if (parts.length > 1) return parts

  // Split on numbered flight headers e.g. "1. SQ305 · London to Singapore" (Singapore Airlines)
  parts = text.split(/(?=\d+\.\s+[A-Z]{2}\d{3,4}\s*[·•\-])/)
    .filter(s => /flight|departing|arriving/i.test(s) && s.trim().length > 100)
    .map(s => {
      // Trim at page-2+ content so fare tables / payment pages don't pollute time/route parsing
      const cut = s.search(/\b(?:Payment details|Summary of fare|Contact us|Terms and Conditions)\b/i)
      return cut > 200 ? s.slice(0, cut) : s
    })
  if (parts.length > 1) return parts

  // Fallback: split on "Airline Booking Ref" repetitions (PenGuin format)
  parts = text.split(/(?=Airline\s+Booking\s+Ref)/i)
    .filter(s => /flight/i.test(s) && s.trim().length > 100)
  if (parts.length > 1) return parts

  return [text]
}

export function parseAllTickets(rawText: string): ParsedTicketData[] {
  const sections = splitFlightSections(rawText)
  return sections.map(section => parseSection(section, rawText))
}

export function parseRawText(rawText: string): ParsedTicketData {
  return parseAllTickets(rawText)[0]
}
