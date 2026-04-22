import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTickets } from '@/hooks/useTickets'
import { useAuth } from '@/hooks/useAuth'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Upload, Plane, Train, Hotel, Bus, Ticket, Car, Trash2, Loader2, User } from 'lucide-react'
import type { Ticket as TicketType, TicketType as TType, Trip } from '@/types'

const TYPE_ICONS: Record<TType, typeof Plane> = {
  flight: Plane, train: Train, hotel: Hotel, car: Car, bus: Bus, ferry: Ticket, other: Ticket,
}

export default function TicketsTab({ tripId }: { tripId: string }) {
  const { user } = useAuth()
  const { tickets, loading, uploadTicket, assignTicket, deleteTicket } = useTickets(tripId)
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [trip, setTrip] = useState<Trip | null>(null)

  // Load trip for member list (for assignee picker)
  useState(() => {
    const unsub = onSnapshot(doc(db, 'trips', tripId), snap => {
      if (snap.exists()) setTrip({ id: snap.id, ...snap.data() } as Trip)
    })
    return unsub
  })

  const onDrop = useCallback(async (files: File[]) => {
    if (!user) return
    setUploading(true)
    setUploadCount(0)
    try {
      for (const file of files) {
        const ids = await uploadTicket(file, user.uid)
        setUploadCount(prev => prev + ids.length)
      }
    } finally {
      setUploading(false)
    }
  }, [user, uploadTicket])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': [], 'image/*': [] },
    multiple: true,
  })

  const members = trip ? Object.values(trip.memberDetails) : []

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">Parsing ticket{uploadCount > 1 ? `s (${uploadCount} found)` : ''}...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Upload size={24} />
            <p className="text-sm">Drop tickets here or click to upload</p>
            <p className="text-xs text-slate-500">PDF with multiple flights creates separate tickets</p>
          </div>
        )}
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading tickets...</p>}

      <div className="space-y-3">
        {tickets
          .sort((a, b) => b.uploadedAt - a.uploadedAt)
          .map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              members={members as any[]}
              onDelete={() => deleteTicket(ticket.id)}
              onAssign={(uid) => assignTicket(ticket.id, uid)}
            />
          ))}
      </div>

      {!loading && tickets.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-6">
          No tickets yet. Upload a boarding pass or hotel confirmation.
        </p>
      )}
    </div>
  )
}

interface CardProps {
  ticket: TicketType
  members: { uid: string; displayName: string | null; email: string }[]
  onDelete: () => void
  onAssign: (uid: string | null) => void
}

function TicketCard({ ticket, members, onDelete, onAssign }: CardProps) {
  const data = { ...ticket.parsed, ...ticket.manualOverrides }
  const Icon = TYPE_ICONS[data.type] ?? Ticket

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="bg-slate-800 rounded-lg p-2 shrink-0">
          <Icon size={18} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-white capitalize">{data.type}</p>
              {/* Passenger name — shown prominently */}
              {data.passengerName && (
                <p className="text-xs text-indigo-300 font-medium mt-0.5">{data.passengerName}</p>
              )}
            </div>
            <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {data.flightNumber && <Field label="Flight" value={data.flightNumber} />}
            {data.origin && data.destination && (
              <Field label="Route" value={`${data.origin} → ${data.destination}`} />
            )}
            {data.date && <Field label="Date" value={data.date} />}
            {data.departureTime && <Field label="Departs" value={data.departureTime} />}
            {data.arrivalTime && <Field label="Arrives" value={data.arrivalTime} />}
            {data.seat && <Field label="Seat" value={data.seat} />}
            {data.gate && <Field label="Gate" value={data.gate} />}
            {data.terminal && <Field label="Terminal" value={data.terminal} />}
            {data.bookingRef && <Field label="Ref" value={data.bookingRef} />}
            {data.hotelName && <Field label="Hotel" value={data.hotelName} />}
            {data.checkIn && <Field label="Check-in" value={data.checkIn} />}
            {data.checkOut && <Field label="Check-out" value={data.checkOut} />}
            {data.rentalCompany && <Field label="Rental" value={data.rentalCompany} />}
            {data.pickupLocation && <Field label="Pick-up" value={data.pickupLocation} />}
          </div>

          {/* Assignee picker */}
          {members.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <User size={12} className="text-slate-500 shrink-0" />
              <select
                value={ticket.assignedMemberUid ?? ''}
                onChange={e => onAssign(e.target.value || null)}
                className="flex-1 bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Assign to...</option>
                {members.map(m => (
                  <option key={m.uid} value={m.uid}>
                    {m.displayName ?? m.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500 text-xs">{label}: </span>
      <span className="text-slate-200 text-xs">{value}</span>
    </div>
  )
}
