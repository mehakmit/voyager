import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  doc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { storeFile, storeFileRemote } from '@/lib/fileStore'
import { extractText } from '@/lib/extractText'
import { parseAllTickets } from '@/lib/parseTicket'
import { nanoid } from '@/lib/nanoid'
import type { Ticket, ParsedTicketData } from '@/types'

export function useTickets(tripId: string | undefined) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return
    const q = query(collection(db, 'tickets'), where('tripId', '==', tripId))
    return onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket)))
      setLoading(false)
    })
  }, [tripId])

  async function uploadTicket(
    file: File,
    uploadedBy: string,
    members: { uid: string; displayName: string | null; email: string }[] = [],
  ): Promise<string[]> {
    let rawText = ''
    try {
      rawText = await extractText(file)
    } catch (err) {
      console.warn('Text extraction failed, storing ticket without parsed fields:', err)
    }
    const parsedList = parseAllTickets(rawText)
    const ids: string[] = []

    const localFileKey = nanoid()
    storeFile(localFileKey, file).catch(() => {})
    storeFileRemote(localFileKey, file)

    for (const parsed of parsedList) {
      const id = nanoid()

      let assignedMemberUid: string | undefined
      if (parsed.type === 'hotel' || parsed.type === 'car') {
        assignedMemberUid = 'all'
      } else if (parsed.passengerName && members.length > 0) {
        assignedMemberUid = matchMemberByName(parsed.passengerName, members) ?? undefined
      }

      await setDoc(doc(db, 'tickets', id), {
        tripId: tripId!,
        uploadedBy,
        uploadedAt: Date.now(),
        fileName: file.name,
        fileType: file.type,
        localFileKey,
        parsed,
        ...(assignedMemberUid !== undefined && { assignedMemberUid }),
      })
      ids.push(id)
    }

    const storageKey = `trips/${tripId}/tickets/${nanoid()}_${file.name}`
    uploadBytes(ref(storage, storageKey), file)
      .then(snap => getDownloadURL(snap.ref))
      .then(fileUrl => Promise.all(ids.map(id => updateDoc(doc(db, 'tickets', id), { fileUrl }))))
      .catch(() => {})

    return ids
  }

  function matchMemberByName(
    name: string,
    members: { uid: string; displayName: string | null }[],
  ): string | null {
    const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 1)
    for (const m of members) {
      if (!m.displayName) continue
      const mName = m.displayName.toLowerCase()
      const matched = words.filter(w => mName.includes(w)).length
      if (matched >= Math.min(2, words.length)) return m.uid
    }
    return null
  }

  async function updateTicket(ticketId: string, overrides: Partial<ParsedTicketData>) {
    await updateDoc(doc(db, 'tickets', ticketId), { manualOverrides: overrides })
  }

  async function assignTicket(ticketId: string, memberUid: string | null) {
    await updateDoc(doc(db, 'tickets', ticketId), { assignedMemberUid: memberUid })
  }

  async function deleteTicket(ticketId: string) {
    await deleteDoc(doc(db, 'tickets', ticketId))
  }

  return { tickets, loading, uploadTicket, updateTicket, assignTicket, deleteTicket }
}
