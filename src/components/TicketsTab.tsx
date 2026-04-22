import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTickets } from '@/hooks/useTickets'
import { useAuth } from '@/hooks/useAuth'
import { Upload, Plane, Train, Hotel, Bus, Ticket, Trash2, Loader2 } from 'lucide-react'
import type { Ticket as TicketType } from '@/types'

const TYPE_ICONS = {
  flight: Plane,
  train: Train,
  hotel: Hotel,
  bus: Bus,
  ferry: Ticket,
  other: Ticket,
}

export default function TicketsTab({ tripId }: { tripId: string }) {
  const { user } = useAuth()
  const { tickets, loading, uploadTicket, deleteTicket } = useTickets(tripId)
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (files: File[]) => {
    if (!user) return
    setUploading(true)
    try {
      for (const file of files) {
        await uploadTicket(file, user.uid)
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
            <p className="text-sm">Parsing ticket...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Upload size={24} />
            <p className="text-sm">Drop tickets here or click to upload</p>
            <p className="text-xs text-slate-500">PDF, JPG, PNG supported</p>
          </div>
        )}
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading tickets...</p>}

      <div className="space-y-3">
        {tickets.map(ticket => (
          <TicketCard key={ticket.id} ticket={ticket} onDelete={() => deleteTicket(ticket.id)} />
        ))}
      </div>

      {!loading && tickets.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-6">No tickets yet. Upload a boarding pass or hotel confirmation.</p>
      )}
    </div>
  )
}

function TicketCard({ ticket, onDelete }: { ticket: TicketType; onDelete: () => void }) {
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
            <p className="font-medium text-white capitalize">{data.type}</p>
            <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
          <p className="text-xs text-slate-500 truncate">{ticket.fileName}</p>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
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
            {data.passengerName && <Field label="Passenger" value={data.passengerName} />}
            {data.hotelName && <Field label="Hotel" value={data.hotelName} />}
            {data.checkIn && <Field label="Check-in" value={data.checkIn} />}
            {data.checkOut && <Field label="Check-out" value={data.checkOut} />}
          </div>
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
