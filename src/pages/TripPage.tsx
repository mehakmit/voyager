import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { Trip } from '@/types'
import { ArrowLeft, Settings } from 'lucide-react'
import TicketsTab from '@/components/TicketsTab'
import ItineraryTab from '@/components/ItineraryTab'
import ExpensesTab from '@/components/ExpensesTab'
import CarTab from '@/components/CarTab'
import Countdown from '@/components/Countdown'
import TripSettingsModal from '@/components/TripSettingsModal'

type Tab = 'tickets' | 'itinerary' | 'expenses' | 'car'

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

  if (!trip) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>

  const isOwner = trip.ownerId === user?.uid
  const tabs: Tab[] = ['tickets', 'itinerary', ...(trip.settings.showExpenses ? ['expenses' as Tab] : []), ...(trip.settings.showCar ? ['car' as Tab] : [])]

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{trip.name}</h1>
          <p className="text-slate-400 text-xs truncate">{trip.destination}</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-white">
            <Settings size={18} />
          </button>
        )}
      </header>

      <Countdown startDate={trip.startDate} />

      <nav className="flex border-b border-slate-800 px-4">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-auto">
        {activeTab === 'tickets' && <TicketsTab tripId={trip.id} />}
        {activeTab === 'itinerary' && <ItineraryTab trip={trip} />}
        {activeTab === 'expenses' && trip.settings.showExpenses && <ExpensesTab tripId={trip.id} />}
        {activeTab === 'car' && trip.settings.showCar && <CarTab tripId={trip.id} />}
      </div>

      {showSettings && (
        <TripSettingsModal trip={trip} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
