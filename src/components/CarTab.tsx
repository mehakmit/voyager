import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTickets } from '@/hooks/useTickets'
import type { CarDetails } from '@/types'
import { Car, MapPin, Plus, ChevronDown } from 'lucide-react'

export default function CarTab({ tripId }: { tripId: string }) {
  const { tickets } = useTickets(tripId)
  const [manual, setManual] = useState<CarDetails | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    rentalCompany: '', plateNumber: '', pickupLocation: '',
    dropoffLocation: '', bookingRef: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

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
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  // Merge data: ticket data takes priority for display, manual fills gaps
  const displayData = carTickets.length > 0
    ? { ...carTickets[0].parsed, ...carTickets[0].manualOverrides }
    : manual ? {
        rentalCompany: manual.rentalCompany,
        pickupLocation: manual.pickupLocation,
        dropoffLocation: manual.dropoffLocation,
        bookingRef: manual.bookingRef,
        vehicleType: undefined,
      } : null

  const hasData = displayData !== null || manual !== null

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div>
          <h1 className="font-display italic text-4xl text-white leading-none">Car</h1>
          <p className="text-slate-400 text-sm mt-1">
            {hasData ? '1 rental' : 'No rental added'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white mt-1"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Car card */}
      {hasData && (
        <div className="px-4 mb-5">
          <div
            className="rounded-[26px] overflow-hidden"
            style={{ background: '#0c1b30', boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 16px 36px -22px rgba(0,0,0,0.5)' }}
          >
            {/* Car hero area */}
            <div className="px-5 pt-5 pb-3"
              style={{ background: 'linear-gradient(180deg, #1a3460 0%, #0c1b30 100%)' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                    {displayData?.rentalCompany ?? manual?.rentalCompany ?? 'Rental'} · Economy
                  </div>
                  <div className="font-display italic text-white mt-1" style={{ fontSize: 36, lineHeight: 1 }}>
                    {displayData?.vehicleType ?? manual?.plateNumber ?? 'Vehicle'}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">or similar · rental confirmed</div>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: '#e76a55', color: '#fff' }}>Booked</span>
              </div>

              {/* Car SVG illustration */}
              <div className="flex justify-center py-3">
                <svg width="240" height="88" viewBox="0 0 280 100" fill="none">
                  <path d="M30 70 L50 50 Q60 42 75 40 L120 35 Q140 32 165 35 L200 40 Q220 44 235 56 L255 70"
                    stroke="rgba(243,233,213,0.6)" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M30 70 H255 Q260 70 260 75 V82 H20 V75 Q20 70 30 70 Z"
                    fill="rgba(243,233,213,0.6)"/>
                  <circle cx="70" cy="82" r="14" fill="#0c1b30" stroke="rgba(243,233,213,0.6)" strokeWidth="2"/>
                  <circle cx="70" cy="82" r="5" fill="rgba(243,233,213,0.6)"/>
                  <circle cx="210" cy="82" r="14" fill="#0c1b30" stroke="rgba(243,233,213,0.6)" strokeWidth="2"/>
                  <circle cx="210" cy="82" r="5" fill="rgba(243,233,213,0.6)"/>
                  <path d="M85 68 L100 50 Q105 45 115 44 L140 42 Q145 42 145 48 V68"
                    stroke="rgba(243,233,213,0.25)" strokeWidth="1.5" fill="none"/>
                  <path d="M150 68 V44 L175 42 Q200 44 215 56 L225 68"
                    stroke="rgba(243,233,213,0.25)" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
            </div>

            {/* Pickup / return */}
            <div className="px-5 py-4">
              <div className="flex items-stretch gap-3">
                <div className="flex-1">
                  <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">Pickup</div>
                  <div className="font-display italic text-xl text-white mt-1">
                    {manual?.pickupDate ? new Date(manual.pickupDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                    <MapPin size={11} />
                    <span className="truncate">{displayData?.pickupLocation ?? manual?.pickupLocation ?? 'Location TBC'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center px-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ border: '1.5px solid rgba(243,233,213,0.2)' }}>
                    <span className="font-mono text-[9px] text-white/60">›</span>
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">Return</div>
                  <div className="font-display italic text-xl text-white mt-1">
                    {manual?.dropoffDate ? new Date(manual.dropoffDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-1 justify-end">
                    <span className="truncate">{displayData?.dropoffLocation ?? manual?.dropoffLocation ?? 'Location TBC'}</span>
                    <MapPin size={11} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 px-5 py-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { k: manual?.bookingRef ? `#${manual.bookingRef.slice(0, 6)}` : '—', l: 'Ref' },
                { k: 'Full', l: 'Tank' },
                { k: '—', l: 'Free km' },
                { k: manual?.notes ? 'Yes' : '—', l: 'Notes' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-semibold text-sm text-white">{s.k}</div>
                  <div className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <div className="flex flex-col items-center py-12 px-5 text-center">
          <Car size={36} className="text-slate-700 mb-3" />
          <p className="font-display italic text-2xl text-slate-600">No rental yet</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-400 text-sm">
            Add car details →
          </button>
        </div>
      )}

      {/* Manual form */}
      {hasData && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mx-4 w-[calc(100%-2rem)] flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900 text-slate-400 text-sm"
        >
          <span>Edit details</span>
          <ChevronDown size={16} />
        </button>
      )}

      {showForm && (
        <div className="mx-4 bg-slate-900 rounded-2xl p-4" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
          <form onSubmit={save} className="space-y-3">
            {[
              { label: 'Rental company', key: 'rentalCompany', placeholder: 'e.g. Hertz' },
              { label: 'Plate / vehicle', key: 'plateNumber', placeholder: 'e.g. Fiat 500' },
              { label: 'Pickup location', key: 'pickupLocation', placeholder: '' },
              { label: 'Drop-off location', key: 'dropoffLocation', placeholder: '' },
              { label: 'Booking reference', key: 'bookingRef', placeholder: '' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                <input
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-slate-800 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wide mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-2xl text-slate-400 text-sm"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 h-11 rounded-2xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#e76a55' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
