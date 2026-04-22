import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { CarDetails } from '@/types'
import { Car } from 'lucide-react'

export default function CarTab({ tripId }: { tripId: string }) {
  const [_car, setCar] = useState<CarDetails | null>(null)
  const [form, setForm] = useState({
    rentalCompany: '', plateNumber: '', pickupLocation: '',
    dropoffLocation: '', bookingRef: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return onSnapshot(doc(db, 'cars', tripId), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as CarDetails
        setCar(data)
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
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Car size={20} className="text-indigo-400" />
        <h2 className="font-semibold text-white">Car Details</h2>
      </div>

      <form onSubmit={save} className="space-y-3">
        {[
          { label: 'Rental company', key: 'rentalCompany', placeholder: 'e.g. Hertz' },
          { label: 'Plate number', key: 'plateNumber', placeholder: 'e.g. AB12 CDE' },
          { label: 'Pickup location', key: 'pickupLocation', placeholder: 'e.g. Heathrow T5' },
          { label: 'Drop-off location', key: 'dropoffLocation', placeholder: 'e.g. Same as pickup' },
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
            rows={3}
            className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium"
        >
          {saving ? 'Saving...' : 'Save Car Details'}
        </button>
      </form>
    </div>
  )
}
