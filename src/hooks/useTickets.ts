import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  doc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { extractText } from '@/lib/extractText'
import { parseRawText } from '@/lib/parseTicket'
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

  async function uploadTicket(file: File, uploadedBy: string) {
    const rawText = await extractText(file)
    const parsed = parseRawText(rawText)
    const id = nanoid()
    const ticket: Omit<Ticket, 'id'> = {
      tripId: tripId!,
      uploadedBy,
      uploadedAt: Date.now(),
      fileName: file.name,
      fileType: file.type,
      parsed,
    }
    await setDoc(doc(db, 'tickets', id), ticket)
    return id
  }

  async function updateTicket(ticketId: string, overrides: Partial<ParsedTicketData>) {
    await updateDoc(doc(db, 'tickets', ticketId), { manualOverrides: overrides })
  }

  async function deleteTicket(ticketId: string) {
    await deleteDoc(doc(db, 'tickets', ticketId))
  }

  return { tickets, loading, uploadTicket, updateTicket, deleteTicket }
}
