import { parse, isValid } from 'date-fns'

const DATE_FORMATS = [
  'dd MMM yy', 'dd MMM yyyy', 'd MMM yyyy', 'd MMM yy',
  'MMM dd, yyyy', 'MMM d, yyyy', 'MMM dd yyyy', 'MMM d yyyy',
  'dd/MM/yyyy', 'dd/MM/yy', 'd/M/yyyy', 'd/M/yy',
  'dd-MM-yyyy', 'dd-MM-yy',
  'yyyy-MM-dd',
  'MM/dd/yyyy', 'M/d/yyyy',
]

export function tryParseDate(str: string): Date | null {
  const cleaned = str.trim().replace(/\./g, '')
  for (const fmt of DATE_FORMATS) {
    try {
      const d = parse(cleaned, fmt, new Date())
      if (isValid(d) && d.getFullYear() >= 2020 && d.getFullYear() <= 2035) return d
    } catch {}
  }
  return null
}
