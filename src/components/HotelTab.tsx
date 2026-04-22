import { useTickets } from '@/hooks/useTickets'
import { Hotel, Calendar, Hash } from 'lucide-react'

export default function HotelTab({ tripId }: { tripId: string }) {
  const { tickets, loading } = useTickets(tripId)

  const hotelTickets = tickets.filter(t => {
    const data = { ...t.parsed, ...t.manualOverrides }
    return data.type === 'hotel'
  })

  return (
    <div className="p-4 max-w-lg mx-auto space-y-3">
      {loading && <p className="text-slate-400 text-sm">Loading...</p>}

      {!loading && hotelTickets.length === 0 && (
        <div className="text-center py-12">
          <Hotel size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hotel bookings found.</p>
          <p className="text-slate-600 text-xs mt-1">Upload a hotel confirmation in the Tickets tab and it will appear here.</p>
        </div>
      )}

      {hotelTickets.map(ticket => {
        const data = { ...ticket.parsed, ...ticket.manualOverrides }
        return (
          <div key={ticket.id} className="bg-slate-900 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-slate-800 rounded-lg p-2 shrink-0">
                <Hotel size={18} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{data.hotelName ?? 'Hotel'}</p>
                {data.bookingRef && (
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                    <Hash size={11} />
                    <span>{data.bookingRef}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {data.checkIn && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Calendar size={11} />
                    <span>Check-in</span>
                  </div>
                  <p className="text-white text-sm font-medium">{data.checkIn}</p>
                </div>
              )}
              {data.checkOut && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Calendar size={11} />
                    <span>Check-out</span>
                  </div>
                  <p className="text-white text-sm font-medium">{data.checkOut}</p>
                </div>
              )}
            </div>

            {data.roomType && (
              <p className="text-slate-400 text-xs">Room: {data.roomType}</p>
            )}
            {data.passengerName && (
              <p className="text-slate-400 text-xs">Guest: {data.passengerName}</p>
            )}

            <p className="text-slate-600 text-xs truncate">{ticket.fileName}</p>
          </div>
        )
      })}
    </div>
  )
}
