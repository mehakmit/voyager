import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useTrips } from '@/hooks/useTrips'
import { useAuth } from '@/hooks/useAuth'
import { format, differenceInDays } from 'date-fns'
import { Plus, LogOut, MapPin, Calendar } from 'lucide-react'
import CreateTripModal from '@/components/CreateTripModal'
import type { Trip } from '@/types'

export default function TripsPage() {
  const { user } = useAuth()
  const { trips, loading } = useTrips(user?.uid)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const now = Date.now()
  const upcoming = trips.filter(t => t.startDate > now).sort((a, b) => a.startDate - b.startDate)
  const past = trips.filter(t => t.startDate <= now).sort((a, b) => b.startDate - a.startDate)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between px-4 pb-4 pt-safe border-b border-slate-800">
        <h1 className="text-xl font-bold">Voyager</h1>
        <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-white">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Trips</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> New Trip
          </button>
        </div>

        {loading && <p className="text-slate-400 text-sm">Loading...</p>}

        {upcoming.length > 0 && (
          <section>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Upcoming</p>
            <div className="space-y-3">
              {upcoming.map(trip => (
                <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/trip/${trip.id}`)} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Past</p>
            <div className="space-y-3">
              {past.map(trip => (
                <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/trip/${trip.id}`)} />
              ))}
            </div>
          </section>
        )}

        {!loading && trips.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">No trips yet.</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">
              Create your first trip →
            </button>
          </div>
        )}
      </main>

      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const daysUntil = differenceInDays(trip.startDate, Date.now())
  const isUpcoming = trip.startDate > Date.now()

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-900 hover:bg-slate-800 rounded-xl p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{trip.name}</p>
          <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
            <MapPin size={12} />
            <span>{trip.destination}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
            <Calendar size={12} />
            <span>
              {format(trip.startDate, 'MMM d')} – {format(trip.endDate, 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        {isUpcoming && daysUntil >= 0 && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-indigo-400">{daysUntil}</p>
            <p className="text-xs text-slate-500">days away</p>
          </div>
        )}
      </div>
    </button>
  )
}
