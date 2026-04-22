import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTickets } from '@/hooks/useTickets'
import type { CarDetails } from '@/types'
import { Car, Hash, MapPin } from 'lucide-react'

export default function CarTab({ tripId }: { tripId: string }) {
  const { tickets } = useTickets(tripId)
  const [_manual, setManual] = useState<CarDetails | null>(null)
  const [form, setForm] = useState({
    rentalCompany: '', plateNumber: '', pickupLocation: '',
    dropoffLocation: '', bookingRef: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Car tickets parsed from uploads
  const carTickets = tickets.filter(t => {
    const data = { ...t.parsed, ...t.manualOverrides }
    return data.type === 'car'
  })

  useEffect(() => {
    return onSnapshot(doc(db, 'cars', tripId), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as CarDetails
        setManual(data)
        setForm({
          rentalCompany: data.rentalCompany ?? '',
          plateNumber: data.plateNumber ?? '',
          pickupLocation: data.pickupLocation ?? '',
          dropoffLocation: data.dropoffLocation ?? '',
          bookingRef: data.bookingRef ?? '',
          notes: data.notes ?? '',
        })
      }
    })
  }, [tripId])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await setDoc(doc(db, 'cars', tripId), { ...form, tripId, id: tripId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">

      {/* Parsed car tickets */}
      {carTickets.map(ticket => {
        const data = { ...ticket.parsed, ...ticket.manualOverrides }
        return (
          <div key={ticket.id} className="bg-slate-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Car size={18} className="text-indigo-400" />
              <p className="font-semibold text-white capitalize">{data.rentalCompany ?? 'Car Rental'}</p>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">from ticket</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {data.pickupLocation && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <MapPin size={11} />
                    <span>Pick-up</span>
                  </div>
                  <p className="text-white text-sm">{data.pickupLocation}</p>
                  {data.pickupDateTime && <p className="text-slate-400 text-xs mt-0.5">{data.pickupDateTime}</p>}
                </div>
              )}
              {data.dropoffLocation && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <MapPin size={11} />
                    <span>Drop-off</span>
                  </div>
                  <p className="text-white text-sm">{data.dropoffLocation}</p>
                  {data.dropoffDateTime && <p className="text-slate-400 text-xs mt-0.5">{data.dropoffDateTime}</p>}
                </div>
              )}
            </div>

            {data.bookingRef && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Hash size={11} />
                <span>{data.bookingRef}</span>
              </div>
            )}
            {data.vehicleType && <p className="text-slate-400 text-xs">Vehicle: {data.vehicleType}</p>}
          </div>
        )
      })}

      {/* Manual details */}
      <div className="bg-slate-900 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Car size={18} className="text-slate-400" />
          <p className="font-medium text-white text-sm">Manual details</p>
        </div>

        <form onSubmit={save} className="space-y-3">
          {[
            { label: 'Rental company', key: 'rentalCompany', placeholder: 'e.g. Hertz' },
            { label: 'Plate number', key: 'plateNumber', placeholder: 'e.g. AB12 CDE' },
            { label: 'Pickup location', key: 'pickupLocation', placeholder: '' },
            { label: 'Drop-off location', key: 'dropoffLocation', placeholder: '' },
            { label: 'Booking reference', key: 'bookingRef', placeholder: '' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
