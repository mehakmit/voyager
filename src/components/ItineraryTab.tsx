import { useMemo, useState, useRef, useEffect } from 'react'
import { useTickets } from '@/hooks/useTickets'
import type { Trip } from '@/types'
import { format, eachDayOfInterval, isSameDay } from 'date-fns'
import { Plane, Train, Hotel, Bus, Ticket, Car, Clock } from 'lucide-react'
import type { TicketType } from '@/types'
import { tryParseDate } from '@/lib/parseDate'

const TYPE_ICONS: Record<TicketType, typeof Plane> = {
  flight: Plane, train: Train, hotel: Hotel, car: Car, bus: Bus, ferry: Ticket, other: Ticket,
}

function dateMatchesDay(dateStr: string, day: Date): boolean {
  const parsed = tryParseDate(dateStr)
  return parsed !== null && isSameDay(parsed, day)
}

export default function ItineraryTab({ trip }: { trip: Trip }) {
  const { tickets } = useTickets(trip.id)
  const [activeIdx, setActiveIdx] = useState(0)
  const pillsRef = useRef<HTMLDivElement>(null)
  const activePillRef = useRef<HTMLButtonElement>(null)

  const days = useMemo(() =>
    eachDayOfInterval({ start: trip.startDate, end: trip.endDate })
  , [trip.startDate, trip.endDate])

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
        if (datesToTry.some(d => dateMatchesDay(d, day))) addToDay(day, ticket, false)
      }
      if (data.type === 'hotel' && data.checkOut) {
        const checkOutDateStr = data.checkOut.match(/[A-Z]\w+\s+\d{1,2},?\s*\d{4}/i)?.[0]
        if (checkOutDateStr) {
          for (const day of days) {
            if (dateMatchesDay(checkOutDateStr, day)) addToDay(day, ticket, true)
          }
        }
      }
    }
    return map
  }, [tickets, days])

  // Auto-scroll active pill into view
  useEffect(() => {
    activePillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIdx])

  const activeDay = days[activeIdx]
  const dayStr = activeDay ? format(activeDay, 'yyyy-MM-dd') : ''
  const dayEvents = ticketsByDate[dayStr] ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Day pills */}
      <div
        ref={pillsRef}
        className="flex gap-2 px-4 py-4 overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {days.map((day, i) => {
          const active = i === activeIdx
          const hasEvents = (ticketsByDate[format(day, 'yyyy-MM-dd')] ?? []).length > 0
          return (
            <button
              key={i}
              ref={active ? activePillRef : undefined}
              onClick={() => setActiveIdx(i)}
              className="shrink-0 flex flex-col items-center justify-between rounded-[18px] px-2 py-2.5 transition-all duration-200"
              style={{
                width: 58, height: 82,
                background: active ? '#e76a55' : '#0c1b30',
                color: active ? '#fff' : undefined,
                boxShadow: active ? 'none' : '0 1px 0 rgba(255,255,255,0.06)',
                border: 'none', cursor: 'pointer',
              }}
            >
              <span className="font-mono text-[9px] uppercase tracking-wide opacity-70">{format(day, 'EEE')}</span>
              <span className="font-display italic text-3xl leading-none">{format(day, 'd')}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${hasEvents ? (active ? 'bg-white/70' : 'bg-indigo-400') : 'opacity-0'}`} />
            </button>
          )
        })}
      </div>

      {/* Day label */}
      {activeDay && (
        <div className="px-5 pb-3">
          <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
            Day {activeIdx + 1} of {days.length}
          </p>
          <p className="font-display italic text-2xl text-white mt-0.5">
            {format(activeDay, 'EEEE, MMM d')}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 px-5 pb-6">
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-600">
            <p className="text-sm">No events this day</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[42px] top-2 bottom-2 w-px bg-white/[0.08]" />

            {dayEvents.map(({ ticket, checkout }) => {
              const data = { ...ticket.parsed, ...ticket.manualOverrides }
              const Icon = TYPE_ICONS[data.type] ?? Ticket

              let subtitle = ''
              let time: string | undefined

              if (data.type === 'hotel') {
                subtitle = (checkout ? 'Check-out' : 'Check-in') + (data.hotelName ? ` · ${data.hotelName}` : '')
                time = (checkout ? data.checkOut : data.checkIn)?.match(/\b\d{1,2}:\d{2}\b/)?.[0]
              } else {
                if (data.flightNumber) subtitle = data.flightNumber + (data.origin && data.destination ? ` · ${data.origin} → ${data.destination}` : '')
                else if (data.rentalCompany) subtitle = data.rentalCompany
                else if (data.hotelName) subtitle = data.hotelName
                time = data.departureTime
              }

              return (
                <div key={`${ticket.id}-${checkout}`} className="flex gap-3 py-2.5" style={{ position: 'relative', zIndex: 1 }}>
                  {/* Time column */}
                  <div className="w-10 text-right pt-2.5 shrink-0">
                    {time ? (
                      <span className="font-mono text-[11px] text-white/70 leading-none">{time}</span>
                    ) : (
                      <Clock size={12} className="text-slate-600 ml-auto" />
                    )}
                  </div>

                  {/* Icon dot */}
                  <div className="shrink-0 flex justify-center pt-2" style={{ width: 28, zIndex: 1 }}>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: '#0c1b30', border: '1.5px solid rgba(255,255,255,0.15)' }}
                    >
                      <Icon size={13} className="text-indigo-400" />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-slate-900 rounded-2xl px-3 py-2.5 min-w-0">
                    <p className="text-sm font-semibold text-white capitalize">{data.type}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{subtitle}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
