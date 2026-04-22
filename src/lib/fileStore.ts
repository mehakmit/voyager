import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── IndexedDB (same device, always fast) ────────────────────────────────────

const DB_NAME = 'voyager-files'
const STORE = 'ticket-files'
const VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function storeFile(key: string, file: File): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(file, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadFile(key: string): Promise<File | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as File | undefined)
    req.onerror = () => reject(req.error)
  })
}

// ── Firestore (cross-device, base64, max ~700 KB source file) ───────────────
// Stores the file as a base64 data URL in the ticket-files collection so any
// signed-in device can load the original document without Firebase Storage.

const MAX_SIZE = 700_000 // ~933 KB as base64 — safely under Firestore's 1 MB doc limit

function toDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function storeFileRemote(key: string, file: File): Promise<void> {
  if (file.size > MAX_SIZE) return
  try {
    const data = await toDataURL(file)
    await setDoc(doc(db, 'ticket-files', key), { data, type: file.type, name: file.name })
  } catch { /* silent — remote storage is best-effort */ }
}

export async function loadFileRemote(key: string): Promise<string | undefined> {
  try {
    const snap = await getDoc(doc(db, 'ticket-files', key))
    return snap.exists() ? (snap.data().data as string) : undefined
  } catch {
    return undefined
  }
}
