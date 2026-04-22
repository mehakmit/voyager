import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTrips } from '@/hooks/useTrips'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

export default function CreateTripModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const { createTrip } = useTrips(user?.uid)
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', destination: '', startDate: '', endDate: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const id = await createTrip({
        name: form.name,
        destination: form.destination,
        startDate: new Date(form.startDate).getTime(),
        endDate: new Date(form.endDate).getTime(),
        user: { uid: user.uid, email: user.email!, displayName: user.displayName },
      })
      navigate(`/trip/${id}`)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">New Trip</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: 'Trip name', key: 'name', type: 'text', placeholder: 'e.g. Japan 2025' },
            { label: 'Destination', key: 'destination', type: 'text', placeholder: 'e.g. Tokyo, Japan' },
            { label: 'Start date', key: 'startDate', type: 'date', placeholder: '' },
            { label: 'End date', key: 'endDate', type: 'date', placeholder: '' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                required
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium mt-2 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      </div>
    </div>
  )
}
