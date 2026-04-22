import { useEffect, useState } from 'react'
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns'

export default function Countdown({ startDate }: { startDate: number }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (isPast(startDate)) return null

  const days = differenceInDays(startDate, now)
  const hours = differenceInHours(startDate, now) % 24
  const minutes = differenceInMinutes(startDate, now) % 60
  const seconds = differenceInSeconds(startDate, now) % 60

  return (
    <div className="flex items-center justify-center gap-4 py-4 bg-slate-900/50 border-b border-slate-800">
      {[
        { label: 'Days', value: days },
        { label: 'Hours', value: hours },
        { label: 'Mins', value: minutes },
        { label: 'Secs', value: seconds },
      ].map(({ label, value }) => (
        <div key={label} className="text-center">
          <p className="text-2xl font-bold text-indigo-400 tabular-nums">{String(value).padStart(2, '0')}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  )
}
