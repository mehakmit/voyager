import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'joining' | 'error' | 'already'>('joining')
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || !user || !token) return

    async function join() {
      const q = query(collection(db, 'trips'), where('inviteToken', '==', token))
      const snap = await getDocs(q)

      if (snap.empty) {
        setStatus('error')
        setError('Invite link is invalid or has expired.')
        return
      }

      const tripDoc = snap.docs[0]
      const trip = tripDoc.data()

      if (trip.members.includes(user!.uid)) {
        navigate(`/trip/${tripDoc.id}`)
        return
      }

      await updateDoc(doc(db, 'trips', tripDoc.id), {
        members: arrayUnion(user!.uid),
        [`memberDetails.${user!.uid}`]: {
          uid: user!.uid,
          email: user!.email,
          displayName: user!.displayName,
          role: 'member',
          joinedAt: Date.now(),
        },
      })

      navigate(`/trip/${tripDoc.id}`)
    }

    join().catch(err => {
      setStatus('error')
      setError(err.message)
    })
  }, [loading, user, token])

  if (loading || status === 'joining') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Joining trip...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">
      <div className="text-center">
        <p className="text-red-400 font-medium">{error}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">
          Go home →
        </button>
      </div>
    </div>
  )
}
