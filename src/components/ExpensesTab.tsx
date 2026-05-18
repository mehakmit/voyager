import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { nanoid } from '@/lib/nanoid'
import type { Expense, Trip, TripMember } from '@/types'
import { Plus, Trash2, RefreshCw, Coffee, Bed, Car, Compass, ShoppingBag } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface Props { trip: Trip }

interface Debt {
  from: string
  fromName: string
  to: string
  toName: string
  amount: number // in base currency
}

function calculateDebts(
  expenses: Expense[],
  members: TripMember[],
  rates: Record<string, number>, // rates relative to base currency (1 base = X foreign)
  baseCurrency: string,
): Debt[] {
  const net: Record<string, number> = {}

  function toBase(amount: number, currency: string): number {
    if (currency === baseCurrency) return amount
    const rate = rates[currency]
    return rate ? amount / rate : amount // fallback: treat as base if rate unknown
  }

  for (const expense of expenses) {
    if (!expense.splitWith || expense.splitWith.length === 0) continue
    const amountInBase = toBase(expense.amount, expense.currency)
    const share = amountInBase / expense.splitWith.length
    for (const uid of expense.splitWith) {
      if (uid !== expense.paidBy) {
        net[uid] = (net[uid] ?? 0) - share
        net[expense.paidBy] = (net[expense.paidBy] ?? 0) + share
      }
    }
  }

  const nameOf = (uid: string) => {
    const m = members.find(m => m.uid === uid)
    return m?.displayName ?? m?.email ?? uid
  }

  // Simplify debts
  const creditors = members
    .filter(m => (net[m.uid] ?? 0) > 0.01)
    .map(m => ({ uid: m.uid, remaining: net[m.uid] }))
  const debtors = members
    .filter(m => (net[m.uid] ?? 0) < -0.01)
    .map(m => ({ uid: m.uid, remaining: Math.abs(net[m.uid]) }))

  const debts: Debt[] = []
  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.remaining <= 0.01 || creditor.remaining <= 0.01) continue
      const amount = Math.min(debtor.remaining, creditor.remaining)
      debts.push({
        from: debtor.uid,
        fromName: nameOf(debtor.uid),
        to: creditor.uid,
        toName: nameOf(creditor.uid),
        amount: Math.round(amount * 100) / 100,
      })
      debtor.remaining -= amount
      creditor.remaining -= amount
    }
  }

  return debts
}

export default function ExpensesTab({ trip }: Props) {
  const { user } = useAuth()
  const members = useMemo(() => Object.values(trip.memberDetails) as TripMember[], [trip.memberDetails])
  const baseCurrency = trip.settings.baseCurrency ?? 'GBP'

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [ratesLoading, setRatesLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    title: '',
    amount: '',
    currency: baseCurrency,
    category: 'food',
    paidBy: user?.uid ?? '',
    splitWith: trip.members,
  })

  useEffect(() => {
    const q = query(collection(db, 'expenses'), where('tripId', '==', trip.id))
    return onSnapshot(q, snap =>
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)))
    )
  }, [trip.id])

  // Fetch exchange rates whenever base currency changes or new currencies appear
  const currencies = useMemo(() => {
    const set = new Set(expenses.map(e => e.currency).filter(c => c && c !== baseCurrency))
    return [...set]
  }, [expenses, baseCurrency])

  async function fetchRates() {
    if (currencies.length === 0) return
    setRatesLoading(true)
    try {
      const res = await fetch(
        `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${currencies.join(',')}`
      )
      const data = await res.json()
      if (data.rates) setRates(data.rates)
    } catch {
      // silent fail — amounts will display as-is
    } finally {
      setRatesLoading(false)
    }
  }

  useEffect(() => { fetchRates() }, [currencies.join(','), baseCurrency])

  const debts = useMemo(
    () => calculateDebts(expenses, members, rates, baseCurrency),
    [expenses, members, rates, baseCurrency]
  )

  const realExpenses = expenses.filter(e => !e.isSettlement)

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    const id = nanoid()
    await setDoc(doc(db, 'expenses', id), {
      tripId: trip.id,
      title: form.title,
      amount: parseFloat(form.amount),
      currency: form.currency,
      paidBy: form.paidBy,
      splitWith: form.splitWith,
      date: Date.now(),
      category: form.category,
      createdAt: Date.now(),
      isSettlement: false,
    })
    setForm(f => ({ ...f, title: '', amount: '' }))
    setShowAdd(false)
  }

  async function settleUp(debt: Debt) {
    const id = nanoid()
    await setDoc(doc(db, 'expenses', id), {
      tripId: trip.id,
      title: `${debt.fromName} → ${debt.toName}`,
      amount: debt.amount,
      currency: baseCurrency,
      paidBy: debt.from,
      splitWith: [debt.from, debt.to],
      date: Date.now(),
      category: 'settlement',
      createdAt: Date.now(),
      isSettlement: true,
    })
  }

  const memberName = (uid: string) =>
    uid === user?.uid ? 'You' : (members.find(m => m.uid === uid)?.displayName ?? members.find(m => m.uid === uid)?.email ?? uid)

  const memberInitials = (uid: string) => {
    const name = members.find(m => m.uid === uid)?.displayName ?? ''
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  function toBase(amount: number, currency: string): number {
    if (currency === baseCurrency) return amount
    const rate = rates[currency]
    return rate ? amount / rate : amount
  }

  const total = realExpenses.reduce((s, e) => s + toBase(e.amount, e.currency), 0)
  const myNet = debts.reduce((s, d) => {
    if (d.to === user?.uid) return s + d.amount
    if (d.from === user?.uid) return s - d.amount
    return s
  }, 0)
  const tripDays = Math.max(1, differenceInDays(trip.endDate, trip.startDate))

  const MEMBER_COLORS = ['#2E6FA8', '#e76a55', '#E8A23E', '#2A8A8C', '#9B59B6']
  const memberColor = (uid: string) => {
    const idx = members.findIndex(m => m.uid === uid)
    return MEMBER_COLORS[idx % MEMBER_COLORS.length]
  }

  function catIcon(cat: string) {
    if (cat === 'food') return <Coffee size={15} className="text-slate-300" />
    if (cat === 'accommodation' || cat === 'stay') return <Bed size={15} className="text-slate-300" />
    if (cat === 'transport' || cat === 'transit') return <Car size={15} className="text-slate-300" />
    if (cat === 'activity') return <Compass size={15} className="text-slate-300" />
    return <ShoppingBag size={15} className="text-slate-300" />
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div>
          <h1 className="font-display italic text-4xl text-white leading-none">Expenses</h1>
          <p className="text-slate-400 text-sm mt-1">
            Split fairly · auto-converted
            {ratesLoading && <span className="ml-1.5 inline-flex items-center gap-1 text-slate-500">
              <RefreshCw size={10} className="animate-spin" />
            </span>}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white mt-1"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mx-4 mb-4 bg-slate-900 rounded-2xl p-4 space-y-3"
          style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
          <form onSubmit={addExpense} className="space-y-3">
            <input placeholder="What was it?" required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
            <div className="flex gap-2">
              <input type="number" placeholder="Amount" required step="0.01" min="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
              <input placeholder="GBP" value={form.currency} maxLength={3}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                className="w-20 bg-slate-800 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 uppercase" />
            </div>
            <select value={form.paidBy} onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2.5 text-sm outline-none">
              {members.map(m => <option key={m.uid} value={m.uid}>{m.uid === user?.uid ? 'You' : (m.displayName ?? m.email)}</option>)}
            </select>
            <div className="space-y-1.5">
              {members.map(m => (
                <label key={m.uid} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.splitWith.includes(m.uid)} className="accent-indigo-500"
                    onChange={e => setForm(f => ({
                      ...f,
                      splitWith: e.target.checked ? [...f.splitWith, m.uid] : f.splitWith.filter(id => id !== m.uid),
                    }))} />
                  <span className="text-sm text-white">{m.uid === user?.uid ? 'You' : (m.displayName ?? m.email)}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 h-11 rounded-2xl text-slate-400 text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
              <button type="submit" className="flex-1 h-11 rounded-2xl text-white text-sm font-semibold" style={{ background: '#e76a55' }}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hero total card */}
      {expenses.length > 0 && (
        <div className="mx-4 mb-5 rounded-[26px] px-5 py-5 overflow-hidden relative"
          style={{ background: '#000812', boxShadow: '0 16px 36px -22px rgba(0,0,0,0.7)' }}>
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-50"
            style={{ background: 'radial-gradient(circle, #2E6FA8, transparent 70%)' }} />
          <div className="relative">
            <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest">Trip total</div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="font-display italic text-white leading-none" style={{ fontSize: 64, letterSpacing: -2 }}>
                {baseCurrency === 'GBP' ? '£' : baseCurrency === 'USD' ? '$' : baseCurrency === 'EUR' ? '€' : ''}{Math.floor(total).toLocaleString()}
              </span>
              <span className="text-white/60 text-lg">.{String(Math.round((total % 1) * 100)).padStart(2, '0')}</span>
            </div>
            <p className="text-white/70 text-sm mt-2">{realExpenses.length} expenses · {tripDays} days</p>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '100%', background: '#e76a55' }} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { k: `${baseCurrency === 'GBP' ? '£' : baseCurrency === 'EUR' ? '€' : ''}${(total / Math.max(members.length, 1)).toFixed(0)}`, l: 'each, fair' },
                { k: `${baseCurrency === 'GBP' ? '£' : baseCurrency === 'EUR' ? '€' : ''}${Math.abs(myNet).toFixed(0)}`, l: myNet > 0 ? "you're owed" : myNet < 0 ? 'you owe' : 'settled', accent: myNet !== 0 },
                { k: `${baseCurrency === 'GBP' ? '£' : baseCurrency === 'EUR' ? '€' : ''}${(total / tripDays).toFixed(0)}`, l: 'avg / day' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-display italic text-2xl leading-none" style={{ color: s.accent ? '#e76a55' : '#fff' }}>{s.k}</div>
                  <div className="text-[11px] text-white/50 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settle up */}
      {debts.length > 0 && (
        <div className="px-4 mb-5">
          <p className="font-mono text-[11px] text-slate-500 uppercase tracking-widest mb-3">Settle up</p>
          <div className="space-y-2.5">
            {debts.map((debt, i) => (
              <div key={i} className="bg-slate-900 rounded-2xl px-4 py-3.5 flex items-center gap-3"
                style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ background: memberColor(debt.from) }}>
                  {memberInitials(debt.from)}
                </div>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-white truncate">{memberName(debt.from)}</span>
                  <div className="flex-1 flex items-center">
                    <div className="flex-1 border-t border-dashed border-white/10" />
                    <span className="text-slate-500 text-xs mx-1">▶</span>
                  </div>
                  <span className="text-sm font-semibold text-white truncate">{memberName(debt.to)}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display italic text-xl text-white leading-none">
                    {baseCurrency === 'GBP' ? '£' : baseCurrency === 'EUR' ? '€' : ''}{debt.amount.toFixed(2)}
                  </div>
                  <div className="font-mono text-[9px] text-slate-500 uppercase mt-0.5">Pending</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => debts.forEach(d => settleUp(d))}
            className="mt-3 w-full h-13 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold"
            style={{ background: '#e76a55', height: 52 }}>
            ✦ Settle everything in 3 taps
          </button>
        </div>
      )}

      {debts.length === 0 && expenses.length > 0 && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-2xl" style={{ background: 'rgba(46,111,168,0.15)', border: '1px solid rgba(46,111,168,0.3)' }}>
          <p className="text-[#9BC4E8] text-sm font-medium">All settled up! 🎉</p>
        </div>
      )}

      {/* Recent expenses */}
      {realExpenses.length > 0 && (
        <div className="px-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="font-mono text-[11px] text-slate-500 uppercase tracking-widest">Recent</p>
            <span className="text-xs text-indigo-400 font-semibold">All {realExpenses.length}</span>
          </div>
          <div className="space-y-2">
            {[...expenses].sort((a, b) => b.date - a.date).map(expense => (
              <div key={expense.id}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${expense.isSettlement ? 'opacity-50' : ''}`}
                style={{ background: '#0c1b30', boxShadow: '0 1px 0 rgba(255,255,255,0.04)' }}>
                <div className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {catIcon(expense.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{expense.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                      style={{ background: memberColor(expense.paidBy) }}>
                      {memberInitials(expense.paidBy)}
                    </div>
                    <span className="text-xs text-slate-500">{memberName(expense.paidBy)} paid · {format(expense.date, 'MMM d')}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-white">{expense.currency} {expense.amount.toFixed(2)}</div>
                  {expense.splitWith.length > 1 && (
                    <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                      /{expense.splitWith.length} = {expense.currency} {(expense.amount / expense.splitWith.length).toFixed(2)}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteDoc(doc(db, 'expenses', expense.id))} className="text-slate-700 hover:text-red-400 shrink-0 ml-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="flex flex-col items-center py-12 px-5 text-center">
          <p className="font-display italic text-2xl text-slate-600">No expenses yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-indigo-400 text-sm">Add your first expense →</button>
        </div>
      )}
    </div>
  )
}
