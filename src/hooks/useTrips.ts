import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Trip, TripSettings } from '@/types'
import { nanoid } from '../lib/nanoid'

export function useTrips(uid: string | undefined) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, 'trips'), where('members', 'array-contains', uid))
    return onSnapshot(q, (snap) => {
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip)))
      setLoading(false)
    })
  }, [uid])

  async function createTrip(data: {
    name: string
    destination: string
    startDate: number
    endDate: number
    user: { uid: string; email: string; displayName: string | null }
  }) {
    const id = nanoid()
    const inviteToken = nanoid(16)
    const trip: Omit<Trip, 'id'> = {
      name: data.name,
      destination: data.destination,
      startDate: data.startDate,
      endDate: data.endDate,
      members: [data.user.uid],
      memberDetails: {
        [data.user.uid]: {
          uid: data.user.uid,
          email: data.user.email,
          displayName: data.user.displayName,
          role: 'owner',
          joinedAt: Date.now(),
        },
      },
      ownerId: data.user.uid,
      settings: { showCar: false, showExpenses: false },
      createdAt: Date.now(),
      inviteToken,
    }
    await setDoc(doc(db, 'trips', id), trip)
    return id
  }

  async function updateSettings(tripId: string, settings: Partial<TripSettings>) {
    await updateDoc(doc(db, 'trips', tripId), { settings })
  }

  async function deleteTrip(tripId: string) {
    await deleteDoc(doc(db, 'trips', tripId))
  }

  return { trips, loading, createTrip, updateSettings, deleteTrip }
}
