const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function nanoid(length = 20): string {
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => CHARS[b % CHARS.length]).join('')
}
