import { useMemo } from 'react'
import { useTickets } from '@/hooks/useTickets'
import type { Trip } from '@/types'
import { format, eachDayOfInterval, isSameDay } from 'date-fns'
import { tryParseDate } from '@/lib/parseDate'
import { Plane, Train, Hotel, Bus, Ticket, Car, Clock } from 'lucide-react'
import type { TicketType } from '@/types'

const TYPE_ICONS: Record<TicketType, typeof Plane> = {
  flight: Plane, train: Train, hotel: Hotel, car: Car, bus: Bus, ferry: Ticket, other: Ticket,
}


function dateMatchesDay(dateStr: string, day: Date): boolean {
  const parsed = tryParseDate(dateStr)
  return parsed !== null && isSameDay(parsed, day)
}

export default function ItineraryTab({ trip }: { trip: Trip }) {
  const { tickets } = useTickets(trip.id)

  const days = useMemo(() => {
    return eachDayOfInterval({ start: trip.startDate, end: trip.endDate })
  }, [trip.startDate, trip.endDate])

  const ticketsByDate = useMemo(() => {
    const map: Record<string, { ticket: (typeof tickets)[number]; checkout: boolean }[]> = {}

    function addToDay(day: Date, ticket: (typeof tickets)[number], checkout: boolean) {
      const dayStr = format(day, 'yyyy-MM-dd')
      if (!map[dayStr]) map[dayStr] = []
      if (!map[dayStr].find(e => e.ticket.id === ticket.id && e.checkout === checkout)) {
        map[dayStr].push({ ticket, checkout })
      }
    }

    for (const ticket of tickets) {
      const data = { ...ticket.parsed, ...ticket.manualOverrides }
      const datesToTry: string[] = []
      if (data.date) datesToTry.push(data.date)
      if (data.allDates) datesToTry.push(...data.allDates)

      for (const day of days) {
        if (datesToTry.some(d => dateMatchesDay(d, day))) {
          addToDay(day, ticket, false)
        }
      }

      if (data.type === 'hotel' && data.checkOut) {
        const checkOutDateStr = data.checkOut.match(/[A-Z]\w+\s+\d{1,2},?\s*\d{4}/i)?.[0]
        if (checkOutDateStr) {
          for (const day of days) {
            if (dateMatchesDay(checkOutDateStr, day)) {
              addToDay(day, ticket, true)
            }
          }
        }
      }
    }
    return map
  }, [tickets, days])

  return (
    <div className="p-4 max-w-lg mx-auto space-y-2">
      {days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayTickets = ticketsByDate[dayStr] ?? []

        return (
          <div key={dayStr} className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
              <div className="text-center">
                <p className="text-xs text-slate-500">{format(day, 'EEE')}</p>
                <p className="text-lg font-bold text-white leading-none">{format(day, 'd')}</p>
                <p className="text-xs text-slate-500">{format(day, 'MMM')}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-800/50">
              {dayTickets.length === 0 && (
                <p className="text-slate-600 text-xs px-4 py-3">No events</p>
              )}
              {dayTickets.map(({ ticket, checkout }) => {
                const data = { ...ticket.parsed, ...ticket.manualOverrides }
                const Icon = TYPE_ICONS[data.type] ?? Ticket

                let subtitle = ''
                let time: string | undefined
                if (data.type === 'hotel') {
                  subtitle = (checkout ? 'Check-out' : 'Check-in') + (data.hotelName ? ` · ${data.hotelName}` : '')
                  time = (checkout ? data.checkOut : data.checkIn)?.match(/\b\d{1,2}:\d{2}\b/)?.[0]
                } else {
                  if (data.flightNumber) subtitle = data.flightNumber + (data.origin && data.destination ? ` · ${data.origin} → ${data.destination}` : '')
                  else if (data.hotelName) subtitle = data.hotelName
                  else if (data.rentalCompany) subtitle = data.rentalCompany
                  time = data.departureTime
                }

                return (
                  <div key={`${ticket.id}-${checkout}`} className="flex items-start gap-3 px-4 py-3">
                    <Icon size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white capitalize">{data.type}</p>
                      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                    </div>
                    {time && (
                      <div className="flex items-center gap-1 text-slate-400 text-xs shrink-0">
                        <Clock size={11} />
                        {time}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
