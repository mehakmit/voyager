import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { Trip } from '@/types'
import { Home, Plane, Map, Hotel, Wallet, Car, Settings } from 'lucide-react'
import TicketsTab from '@/components/TicketsTab'
import ItineraryTab from '@/components/ItineraryTab'
import ExpensesTab from '@/components/ExpensesTab'
import CarTab from '@/components/CarTab'
import HotelTab from '@/components/HotelTab'
import TripSettingsModal from '@/components/TripSettingsModal'
import { differenceInDays } from 'date-fns'

type Tab = 'tickets' | 'itinerary' | 'hotel' | 'expenses' | 'car'

const TRIP_TABS: { key: Tab; label: string; Icon: typeof Plane }[] = [
  { key: 'tickets',   label: 'Tickets', Icon: Plane },
  { key: 'itinerary', label: 'Plan',    Icon: Map },
  { key: 'hotel',     label: 'Stays',   Icon: Hotel },
  { key: 'expenses',  label: 'Money',   Icon: Wallet },
  { key: 'car',       label: 'Car',     Icon: Car },
]

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('tickets')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!id) return
    return onSnapshot(doc(db, 'trips', id), snap => {
      if (snap.exists()) setTrip({ id: snap.id, ...snap.data() } as Trip)
    })
  }, [id])

  if (!trip) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>

  const isOwner = trip.ownerId === user?.uid
  const daysUntil = differenceInDays(trip.startDate, Date.now())
  const isUpcoming = trip.startDate > Date.now()

  const visibleTabs = TRIP_TABS.filter(t =>
    t.key !== 'expenses' && t.key !== 'car'
      ? true
      : t.key === 'expenses' ? trip.settings.showExpenses
      : trip.settings.showCar
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 pb-3 pt-safe border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest truncate">{trip.destination}</p>
          <h1 className="font-display italic text-2xl leading-tight text-white truncate">{trip.name}</h1>
        </div>
        {isUpcoming && daysUntil >= 0 && (
          <div className="text-right shrink-0">
            <p className="font-display italic text-2xl leading-none text-indigo-400">{daysUntil}</p>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wide mt-0.5">days to go</p>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {activeTab === 'tickets'   && <TicketsTab tripId={trip.id} />}
        {activeTab === 'itinerary' && <ItineraryTab trip={trip} />}
        {activeTab === 'hotel'     && <HotelTab tripId={trip.id} />}
        {activeTab === 'expenses'  && trip.settings.showExpenses && <ExpensesTab trip={trip} />}
        {activeTab === 'car'       && trip.settings.showCar      && <CarTab tripId={trip.id} />}
      </div>

      {/* Floating bottom tab bar — matches design exactly */}
      <div className="fixed left-3 right-3 z-30" style={{ bottom: 'max(14px, env(safe-area-inset-bottom))' }}>
        <nav
          className="flex items-center justify-between px-1.5 py-1.5 rounded-[28px]"
          style={{ background: '#000812', boxShadow: '0 14px 30px -10px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          {/* Home — navigates back to trips list */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center rounded-full"
            style={{ padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <Home size={18} color="rgba(255,255,255,0.55)" />
          </button>

          {/* Trip tabs */}
          {visibleTabs.map(({ key, label, Icon }) => {
            const active = activeTab === key
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="flex items-center gap-1.5 rounded-full transition-all duration-200"
                style={{
                  padding: active ? '8px 14px' : '8px 10px',
                  background: active ? '#e76a55' : 'transparent',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Icon size={18} color="#fff" />
                {active && <span className="text-white text-xs font-semibold whitespace-nowrap">{label}</span>}
              </button>
            )
          })}

          {/* Settings */}
          <button
            onClick={() => isOwner ? setShowSettings(true) : undefined}
            className="flex items-center rounded-full"
            style={{ padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <Settings size={18} color="rgba(255,255,255,0.55)" />
          </button>
        </nav>
      </div>

      {showSettings && (
        <TripSettingsModal trip={trip} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
