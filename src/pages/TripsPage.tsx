import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useTrips } from '@/hooks/useTrips'
import { useAuth } from '@/hooks/useAuth'
import { format, differenceInDays } from 'date-fns'
import { Plus, LogOut } from 'lucide-react'
import CreateTripModal from '@/components/CreateTripModal'
import type { Trip } from '@/types'

export default function TripsPage() {
  const { user } = useAuth()
  const { trips, loading } = useTrips(user?.uid)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const now = Date.now()
  const upcoming = trips.filter(t => t.endDate >= now).sort((a, b) => a.startDate - b.startDate)
  const past = trips.filter(t => t.endDate < now).sort((a, b) => b.startDate - a.startDate)
  const hero = upcoming[0] ?? null
  const restUpcoming = upcoming.slice(1)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between px-5 pb-4 pt-safe">
        <h1 className="font-display italic text-3xl text-white">Odyssey</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-full text-sm font-semibold"
          >
            <Plus size={15} /> New trip
          </button>
          <button onClick={() => signOut(auth)} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="pb-10">
        {loading && <p className="text-slate-500 text-sm px-5 py-8">Loading…</p>}

        {/* Hero trip card */}
        {hero && (
          <div className="px-4 mb-6">
            <HeroCard trip={hero} onClick={() => navigate(`/trip/${hero.id}`)} />
          </div>
        )}

        {/* Rest of upcoming */}
        {restUpcoming.length > 0 && (
          <section className="px-5 mb-6">
            <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-3">Upcoming</p>
            <div className="space-y-2.5">
              {restUpcoming.map(t => (
                <SmallTripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Past trips */}
        {past.length > 0 && (
          <section className="mb-6">
            <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-3 px-5">Past adventures</p>
            <div className="flex gap-3 px-4 overflow-x-auto scrollbar-none pb-1">
              {past.map(t => (
                <PastTripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} />
              ))}
            </div>
          </section>
        )}

        {!loading && trips.length === 0 && (
          <div className="text-center py-20 px-5">
            <p className="font-display italic text-4xl text-slate-700">No trips yet</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 text-indigo-400 text-sm font-medium">
              Plan your first adventure →
            </button>
          </div>
        )}
      </main>

      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function HeroCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const daysUntil = differenceInDays(trip.startDate, Date.now())
  const isUpcoming = trip.startDate > Date.now()

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-[28px] overflow-hidden relative text-white"
      style={{
        background: '#0c1b30',
        boxShadow: '0 24px 60px -28px rgba(0,0,0,0.7)',
      }}
    >
      {/* Diagonal stripe pattern */}
      <div
        className="absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(135deg, #152d48 0 16px, #0c1b30 16px 32px)',
          opacity: 0.9,
        }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 20%, #0c1b30 100%)' }}
      />

      <div className="relative p-6 pt-28">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: '#f3e9d5', color: '#0A1A2E' }}
          >
            {isUpcoming && daysUntil >= 0 ? '● Active trip' : 'Upcoming'}
          </span>
        </div>

        <h2 className="font-display italic leading-[0.95] tracking-tight"
            style={{ fontSize: 52, letterSpacing: -1 }}>
          {trip.name}
        </h2>
        <p className="text-white/60 font-display italic" style={{ fontSize: 32 }}>
          {trip.destination}
        </p>

        <div className="flex items-end justify-between mt-5">
          <div>
            <p className="font-mono text-[11px] text-white/60 uppercase tracking-wide">
              {format(trip.startDate, 'MMM d')} — {format(trip.endDate, 'MMM d, yyyy')}
            </p>
          </div>
          {isUpcoming && daysUntil >= 0 && (
            <div
              className="w-16 h-16 rounded-full border border-white/25 flex flex-col items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="font-display italic text-3xl leading-none">{daysUntil}</span>
              <span className="font-mono text-[9px] text-white/60 uppercase tracking-wide mt-0.5">to go</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function SmallTripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-900 rounded-2xl px-4 py-3.5 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{trip.name}</p>
        <p className="text-slate-400 text-xs mt-0.5">{trip.destination} · {format(trip.startDate, 'MMM d')} – {format(trip.endDate, 'MMM d')}</p>
      </div>
      <span className="text-slate-600 text-xs font-mono shrink-0">›</span>
    </button>
  )
}

function PastTripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 w-36 rounded-[20px] overflow-hidden bg-slate-900 text-left"
    >
      <div
        className="h-24"
        style={{ background: 'repeating-linear-gradient(135deg, #152d48 0 12px, #0c1b30 12px 24px)' }}
      />
      <div className="px-3 py-2.5">
        <p className="font-display italic text-lg leading-tight text-white">{trip.name}</p>
        <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wide mt-1">
          {format(trip.startDate, 'MMM yyyy')}
        </p>
      </div>
    </button>
  )
}
