import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { X, Copy, Check } from 'lucide-react'
import type { Trip, TripMember } from '@/types'

const COMMON_CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']

export default function TripSettingsModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [settings, setSettings] = useState(trip.settings)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const inviteUrl = `${window.location.origin}/join/${trip.inviteToken}`

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveSettings() {
    setSaving(true)
    await updateDoc(doc(db, 'trips', trip.id), { settings })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Trip Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        {/* Invite link */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Invite link</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 bg-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 truncate">{inviteUrl}</p>
            <button onClick={copyInvite} className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2">
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Members */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Members ({trip.members.length})</p>
          <div className="space-y-1">
            {(Object.values(trip.memberDetails) as TripMember[]).map(member => (
              <div key={member.uid} className="flex items-center justify-between">
                <p className="text-sm text-white">{member.displayName ?? member.email}</p>
                <span className="text-xs text-slate-500 capitalize">{member.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Base currency */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Base currency for balances</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_CURRENCIES.map(c => (
              <button
                key={c}
                onClick={() => setSettings(s => ({ ...s, baseCurrency: c }))}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  settings.baseCurrency === c
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Optional tabs */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Optional tabs</p>
          <div className="space-y-2">
            {[
              { key: 'showExpenses', label: 'Expenses' },
              { key: 'showCar', label: 'Car' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-white">{label}</span>
                <div
                  onClick={() => setSettings((s: typeof settings) => ({ ...s, [key]: !s[key as keyof typeof s] }))}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${settings[key as keyof typeof settings] ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings[key as keyof typeof settings] ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
