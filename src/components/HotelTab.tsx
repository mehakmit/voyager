import { useState } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { useAuth } from '@/hooks/useAuth'
import { Hotel, MapPin, Key, Wifi, Loader2 } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { tryParseDate } from '@/lib/parseDate'

export default function HotelTab({ tripId }: { tripId: string }) {
  const { tickets, loading, uploadTicket } = useTickets(tripId)
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !user) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) await uploadTicket(file, user.uid)
    } finally {
      setUploading(false)
    }
  }

  const hotelTickets = tickets
    .filter(t => (t.parsed.type === 'hotel' || t.manualOverrides?.type === 'hotel'))
    .sort((a, b) => {
      const aDate = tryParseDate(({ ...a.parsed, ...a.manualOverrides }).checkIn ?? '') ?? new Date(0)
      const bDate = tryParseDate(({ ...b.parsed, ...b.manualOverrides }).checkIn ?? '') ?? new Date(0)
      return aDate.getTime() - bDate.getTime()
    })

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div>
          <h1 className="font-display italic text-4xl text-white leading-none">Stays</h1>
          <p className="text-slate-400 text-sm mt-1">
            {loading ? '…' : `${hotelTickets.length} hotel${hotelTickets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <label className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white mt-1 cursor-pointer shrink-0">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <span className="text-xl leading-none">+</span>}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,image/*" multiple className="sr-only"
            onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
        </label>
      </div>

      {loading && <p className="text-slate-500 text-sm px-5">Loading…</p>}

      {!loading && hotelTickets.length === 0 && (
        <div className="flex flex-col items-center py-16 px-5 text-center">
          <Hotel size={36} className="text-slate-700 mb-3" />
          <p className="font-display italic text-2xl text-slate-600">No stays yet</p>
          <p className="text-slate-600 text-sm mt-2">Upload a hotel confirmation in the Tickets tab.</p>
        </div>
      )}

      <div className="px-4 space-y-5">
        {hotelTickets.map((ticket, idx) => {
          const data = { ...ticket.parsed, ...ticket.manualOverrides }
          const isFirst = idx === 0

          const checkInDate = tryParseDate(data.checkIn?.match(/[A-Z]\w+\s+\d{1,2},?\s*\d{4}/i)?.[0] ?? '')
          const checkOutDate = tryParseDate(data.checkOut?.match(/[A-Z]\w+\s+\d{1,2},?\s*\d{4}/i)?.[0] ?? '')
          const nights = checkInDate && checkOutDate ? Math.abs(differenceInDays(checkOutDate, checkInDate)) : null


          const nextTicket = hotelTickets[idx + 1]
          const nextData = nextTicket ? { ...nextTicket.parsed, ...nextTicket.manualOverrides } : null

          return (
            <div key={ticket.id}>
              <div
                className="rounded-[26px] overflow-hidden"
                style={{ background: '#0c1b30', boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 16px 36px -22px rgba(0,0,0,0.5)' }}
              >
                {/* Image placeholder — diagonal stripe pattern */}
                <div className="relative" style={{ height: 180 }}>
                  <div
                    className="absolute inset-0"
                    style={{ background: 'repeating-linear-gradient(135deg, #1e3a5c 0 16px, #152d48 16px 32px)' }}
                  />
                  <div className="absolute top-3.5 left-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{ background: '#000812', color: '#fff' }}>
                      ● {isFirst ? 'Now staying' : 'Upcoming'}
                    </span>
                  </div>
                  {data.bookingRef && (
                    <div className="absolute top-3.5 right-4">
                      <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                        style={{ background: '#f3e9d5', color: '#0A1A2E' }}>
                        ★ Confirmed
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-4 font-mono text-[10px] text-white/30 uppercase tracking-wide">
                    HOTEL · {data.hotelName?.toUpperCase().slice(0, 20) ?? 'HOTEL'} · EXTERIOR
                  </div>
                </div>

                {/* Hotel name + address */}
                <div className="px-5 pt-5 pb-2">
                  <h2 className="font-display italic leading-none text-white" style={{ fontSize: 36 }}>
                    {data.hotelName ?? 'Hotel'}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-2 text-slate-400 text-sm">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">{data.roomType ? `Room: ${data.roomType}` : 'Address not available'}</span>
                  </div>
                </div>

                {/* Check-in / nights / check-out timeline */}
                <div className="mx-4 my-4 rounded-2xl px-4 py-3.5 flex items-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex-1">
                    <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">Check-in</div>
                    <div className="font-semibold text-white text-sm mt-1">{data.checkIn?.match(/\w+ \d+,? \d{4}/i)?.[0] ?? '—'} · {data.checkIn?.match(/\d{1,2}:\d{2}/)?.[0] ?? '—'}</div>
                  </div>
                  {nights !== null && (
                    <div className="flex flex-col items-center px-3">
                      <div className="w-16 relative">
                        <div className="border-t border-dashed border-white/15" />
                      </div>
                      <span className="font-mono text-[9px] text-slate-500 mt-1 uppercase tracking-wide">{nights} nights</span>
                    </div>
                  )}
                  <div className="flex-1 text-right">
                    <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">Check-out</div>
                    <div className="font-semibold text-white text-sm mt-1">{data.checkOut?.match(/\w+ \d+,? \d{4}/i)?.[0] ?? '—'} · {data.checkOut?.match(/\d{1,2}:\d{2}/)?.[0] ?? '—'}</div>
                  </div>
                </div>

                {/* Info tiles */}
                <div className="grid grid-cols-2 gap-2.5 px-4 pb-3">
                  <InfoTile icon={<Key size={15} className="text-slate-300" />}
                    main={data.roomType ?? 'Room info'}
                    sub="Booking confirmed" />
                  <InfoTile icon={<Wifi size={15} className="text-slate-300" />}
                    main={data.passengerName ?? 'Guest'}
                    sub={data.bookingRef ? `Ref: ${data.bookingRef.slice(0, 12)}` : 'No wifi info'} />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 px-4 pb-5">
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(data.hotelName ?? '')}`, '_blank')}
                    className="flex-1 h-11 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold text-white"
                    style={{ background: '#e76a55' }}>
                    <MapPin size={14} /> Directions
                  </button>
                  <button
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent((data.hotelName ?? '') + ' contact phone')}`, '_blank')}
                    className="flex-1 h-11 rounded-2xl flex items-center justify-center text-sm font-semibold text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                    Contact host
                  </button>
                </div>
              </div>

              {/* Next stay */}
              {nextData && idx === 0 && (
                <div className="mt-5">
                  <p className="font-mono text-[11px] text-slate-500 uppercase tracking-widest mb-3 px-1">Next stay</p>
                  <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3"
                    style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
                    <div className="w-20 h-20 rounded-2xl shrink-0 overflow-hidden"
                      style={{ background: 'repeating-linear-gradient(135deg, #1e3a5c 0 10px, #152d48 10px 20px)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-display italic text-xl text-white leading-tight">{nextData.hotelName ?? 'Hotel'}</div>
                      <div className="text-slate-400 text-xs mt-1">{nextData.checkIn?.match(/\w+ \d+/i)?.[0] ?? ''} — {nextData.checkOut?.match(/\w+ \d+/i)?.[0] ?? ''}</div>
                      {nextData.roomType && <div className="text-slate-500 text-xs mt-0.5">{nextData.roomType}</div>}
                    </div>
                    <span className="text-slate-600 text-lg">›</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InfoTile({ icon, main, sub }: { icon: React.ReactNode; main: string; sub: string }) {
  return (
    <div className="rounded-2xl px-3 py-2.5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-white truncate">{main}</span>
      </div>
      <div className="text-[11px] text-slate-500 mt-1 ml-6 truncate">{sub}</div>
    </div>
  )
}
