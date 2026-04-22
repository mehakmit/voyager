import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTickets } from '@/hooks/useTickets'
import { useAuth } from '@/hooks/useAuth'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  Upload, Plane, Train, Hotel, Bus, Ticket, Car, Trash2, Loader2,
  User, X, ExternalLink, FileText,
} from 'lucide-react'
import { loadFile, loadFileRemote } from '@/lib/fileStore'
import type { Ticket as TicketType, TicketType as TType, Trip } from '@/types'

const TYPE_ICONS: Record<TType, typeof Plane> = {
  flight: Plane, train: Train, hotel: Hotel, car: Car, bus: Bus, ferry: Ticket, other: Ticket,
}

export default function TicketsTab({ tripId }: { tripId: string }) {
  const { user } = useAuth()
  const { tickets, loading, uploadTicket, assignTicket, deleteTicket } = useTickets(tripId)
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null)

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
    setUploadError(null)
    try {
      for (const file of files) {
        const ids = await uploadTicket(file, user.uid)
        setUploadCount(prev => prev + ids.length)
      }
    } catch (err) {
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      setUploadError(`Upload failed — ${detail}`)
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }, [user, uploadTicket])

  // noClick: true — we use a native <label>+<input> for the tap target instead.
  // Programmatic input.click() from react-dropzone is blocked by iOS Safari;
  // a <label> click is a direct native action and always works on mobile.
  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: { 'application/pdf': ['.pdf'], 'image/*': [] },
    multiple: true,
  })

  const members = trip ? Object.values(trip.memberDetails) : []

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl transition-colors ${
          isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        {uploading ? (
          <div className="p-8 flex flex-col items-center gap-2 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">Parsing ticket{uploadCount > 1 ? `s (${uploadCount} found)` : ''}...</p>
          </div>
        ) : (
          <label className="p-8 flex flex-col items-center gap-2 text-slate-400 cursor-pointer">
            <Upload size={24} />
            <p className="text-sm">Drop tickets here or tap to upload</p>
            <p className="text-xs text-slate-500">PDF with multiple flights creates separate tickets</p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*"
              multiple
              className="sr-only"
              onChange={e => {
                const files = e.target.files
                if (files?.length) {
                  onDrop(Array.from(files))
                  e.target.value = ''
                }
              }}
            />
          </label>
        )}
      </div>

      {uploadError && (
        <p className="text-red-400 text-sm text-center">{uploadError}</p>
      )}

      {loading && <p className="text-slate-400 text-sm">Loading tickets...</p>}

      <div className="space-y-3">
        {tickets
          .sort((a, b) => b.uploadedAt - a.uploadedAt)
          .map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              members={members as any[]}
              onOpen={() => setSelectedTicket(ticket)}
              onDelete={() => deleteTicket(ticket.id)}
              onAssign={uid => assignTicket(ticket.id, uid)}
            />
          ))}
      </div>

      {!loading && tickets.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-6">
          No tickets yet. Upload a boarding pass or hotel confirmation.
        </p>
      )}

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          members={members as any[]}
          onClose={() => setSelectedTicket(null)}
          onDelete={() => { deleteTicket(selectedTicket.id); setSelectedTicket(null) }}
          onAssign={uid => assignTicket(selectedTicket.id, uid)}
        />
      )}
    </div>
  )
}

// ── Compact card shown in the list ──────────────────────────────────────────

interface CardProps {
  ticket: TicketType
  members: { uid: string; displayName: string | null; email: string }[]
  onOpen: () => void
  onDelete: () => void
  onAssign: (uid: string | null) => void
}

function TicketCard({ ticket, members, onOpen, onDelete, onAssign }: CardProps) {
  const data = { ...ticket.parsed, ...ticket.manualOverrides }
  const Icon = TYPE_ICONS[data.type] ?? Ticket

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      <button onClick={onOpen} className="w-full text-left p-4 hover:bg-slate-800/50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="bg-slate-800 rounded-lg p-2 shrink-0 mt-0.5">
            <Icon size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white capitalize">{data.type}</p>
            {data.passengerName && (
              <p className="text-xs text-indigo-300 font-medium mt-0.5">{data.passengerName}</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {data.origin && data.destination && (
                <Field label="Route" value={`${data.origin} → ${data.destination}`} />
              )}
              {data.date && <Field label="Date" value={data.date} />}
              {data.departureTime && <Field label="Departs" value={data.departureTime} />}
              {data.arrivalTime && <Field label="Arrives" value={data.arrivalTime} />}
              {data.flightNumber && <Field label="Flight" value={data.flightNumber} />}
              {data.bookingRef && <Field label="Ref" value={data.bookingRef} />}
              {data.hotelName && <Field label="Hotel" value={data.hotelName} />}
              {data.checkIn && <Field label="Check-in" value={data.checkIn} />}
            </div>
          </div>
          <span className="text-xs text-slate-600 shrink-0 mt-1">tap to view</span>
        </div>
      </button>

      <div className="px-4 pb-3 flex items-center gap-2">
        {members.length > 0 && (
          <>
            <User size={12} className="text-slate-500 shrink-0" />
            <select
              value={ticket.assignedMemberUid ?? ''}
              onChange={e => onAssign(e.target.value || null)}
              className="flex-1 bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Assign to...</option>
              {members.map(m => (
                <option key={m.uid} value={m.uid}>{m.displayName ?? m.email}</option>
              ))}
            </select>
          </>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="ml-auto text-slate-600 hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Full-screen modal ────────────────────────────────────────────────────────

interface ModalProps {
  ticket: TicketType
  members: { uid: string; displayName: string | null; email: string }[]
  onClose: () => void
  onDelete: () => void
  onAssign: (uid: string | null) => void
}

function TicketModal({ ticket, members, onClose, onDelete, onAssign }: ModalProps) {
  const data = { ...ticket.parsed, ...ticket.manualOverrides }
  const Icon = TYPE_ICONS[data.type] ?? Ticket
  const isImage = ticket.fileType?.startsWith('image/')
  const [docUrl, setDocUrl] = useState<string | null>(ticket.fileUrl ?? null)

  // Load file: IndexedDB (same device) → Firestore base64 (any device) → Firebase Storage URL
  useEffect(() => {
    if (docUrl || !ticket.localFileKey) return
    let blobUrl: string
    ;(async () => {
      // 1. Try local IndexedDB
      const localFile = await loadFile(ticket.localFileKey!)
      if (localFile) {
        blobUrl = URL.createObjectURL(localFile)
        setDocUrl(blobUrl)
        return
      }
      // 2. Try Firestore (cross-device base64)
      const dataUrl = await loadFileRemote(ticket.localFileKey!)
      if (dataUrl) {
        const resp = await fetch(dataUrl)
        const blob = await resp.blob()
        blobUrl = URL.createObjectURL(blob)
        setDocUrl(blobUrl)
      }
    })()
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [ticket.localFileKey, ticket.fileUrl])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 shrink-0">
          <div className="bg-slate-800 rounded-lg p-2">
            <Icon size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white capitalize">{data.type}</p>
            {data.passengerName && (
              <p className="text-xs text-indigo-300">{data.passengerName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Parsed details */}
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
            {data.origin && data.destination && (
              <ModalField label="Route" value={`${data.origin} → ${data.destination}`} wide />
            )}
            {data.date && <ModalField label="Date" value={data.date} />}
            {data.flightNumber && <ModalField label="Flight" value={data.flightNumber} />}
            {data.departureTime && <ModalField label="Departs" value={data.departureTime} />}
            {data.arrivalTime && <ModalField label="Arrives" value={data.arrivalTime} />}
            {data.airline && <ModalField label="Airline" value={data.airline} />}
            {data.cabinClass && <ModalField label="Class" value={data.cabinClass} />}
            {data.seat && <ModalField label="Seat" value={data.seat} />}
            {data.gate && <ModalField label="Gate" value={data.gate} />}
            {data.depTerminal && <ModalField label="Dep. Terminal" value={data.depTerminal} />}
            {data.arrTerminal && <ModalField label="Arr. Terminal" value={data.arrTerminal} />}
            {!data.depTerminal && !data.arrTerminal && data.terminal && (
              <ModalField label="Terminal" value={data.terminal} />
            )}
            {data.flightDuration && <ModalField label="Duration" value={data.flightDuration} />}
            {data.baggage && <ModalField label="Baggage" value={data.baggage} />}
            {data.meals && <ModalField label="Meals" value={data.meals} wide />}
            {data.bookingRef && <ModalField label="Booking Ref" value={data.bookingRef} />}
            {data.hotelName && <ModalField label="Hotel" value={data.hotelName} wide />}
            {data.checkIn && <ModalField label="Check-in" value={data.checkIn} />}
            {data.checkOut && <ModalField label="Check-out" value={data.checkOut} />}
            {data.roomType && <ModalField label="Room" value={data.roomType} />}
            {data.rentalCompany && <ModalField label="Rental" value={data.rentalCompany} />}
            {data.pickupLocation && <ModalField label="Pick-up" value={data.pickupLocation} wide />}
          </div>

          {/* Original document */}
          <div className="border-t border-slate-800 mx-4 mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-4 mb-3">
              Original Document
            </p>
            {docUrl ? (
              isImage ? (
                <img
                  src={docUrl}
                  alt="Ticket"
                  className="w-full rounded-lg object-contain max-h-96 bg-slate-800"
                />
              ) : (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 rounded-xl p-4 transition-colors"
                >
                  <FileText size={24} className="text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ticket.fileName}</p>
                    <p className="text-xs text-slate-400">Tap to open PDF</p>
                  </div>
                  <ExternalLink size={16} className="text-slate-400 shrink-0" />
                </a>
              )
            ) : (
              <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-4">
                <FileText size={24} className="text-slate-600 shrink-0" />
                <div>
                  <p className="text-sm text-slate-400 truncate">{ticket.fileName}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Re-upload this ticket to view the original</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 flex items-center gap-3 shrink-0">
          {members.length > 0 && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User size={12} className="text-slate-500 shrink-0" />
              <select
                value={ticket.assignedMemberUid ?? ''}
                onChange={e => onAssign(e.target.value || null)}
                className="flex-1 bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Assign to...</option>
                {members.map(m => (
                  <option key={m.uid} value={m.uid}>{m.displayName ?? m.email}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors shrink-0"
          >
            <Trash2 size={14} /> Delete
          </button>
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

function ModalField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-white font-medium mt-0.5">{value}</p>
    </div>
  )
}
