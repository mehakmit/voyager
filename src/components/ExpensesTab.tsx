import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { nanoid } from '@/lib/nanoid'
import type { Expense, Trip, TripMember } from '@/types'
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowRight, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

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
  const [showDebts, setShowDebts] = useState(true)
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

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">
            {realExpenses.length} expense{realExpenses.length !== 1 ? 's' : ''} · balances in {baseCurrency}
          </p>
          {ratesLoading && (
            <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
              <RefreshCw size={10} className="animate-spin" /> Fetching rates...
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Add expense form */}
      {showAdd && (
        <form onSubmit={addExpense} className="bg-slate-900 rounded-xl p-4 space-y-3">
          <input
            placeholder="What was it?"
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              required
              step="0.01"
              min="0"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              placeholder="GBP"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
              maxLength={3}
              className="w-20 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Paid by</p>
            <select
              value={form.paidBy}
              onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}
              className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {members.map(m => (
                <option key={m.uid} value={m.uid}>
                  {m.uid === user?.uid ? 'You' : (m.displayName ?? m.email)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2">Split with</p>
            <div className="space-y-1">
              {members.map(m => (
                <label key={m.uid} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.splitWith.includes(m.uid)}
                    onChange={e => setForm(f => ({
                      ...f,
                      splitWith: e.target.checked
                        ? [...f.splitWith, m.uid]
                        : f.splitWith.filter(id => id !== m.uid),
                    }))}
                    className="accent-indigo-500"
                  />
                  <span className="text-sm text-white">
                    {m.uid === user?.uid ? 'You' : (m.displayName ?? m.email)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-medium">
            Save
          </button>
        </form>
      )}

      {/* Who owes who */}
      {debts.length > 0 && (
        <div className="bg-slate-900 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDebts(!showDebts)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white"
          >
            <span>Who owes who</span>
            {showDebts ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {showDebts && (
            <div className="divide-y divide-slate-800 border-t border-slate-800">
              {debts.map((debt, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="text-white font-medium truncate">{memberName(debt.from)}</span>
                    <ArrowRight size={14} className="text-slate-500 shrink-0" />
                    <span className="text-white font-medium truncate">{memberName(debt.to)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-indigo-400 font-semibold text-sm">
                      {baseCurrency} {debt.amount.toFixed(2)}
                    </span>
                    {(debt.from === user?.uid || debt.to === user?.uid) && (
                      <button
                        onClick={() => settleUp(debt)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {debts.length === 0 && expenses.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <p className="text-green-400 text-sm font-medium">All settled up!</p>
        </div>
      )}

      {/* Expense list */}
      <div className="space-y-2">
        {expenses.sort((a, b) => b.date - a.date).map(expense => (
          <div
            key={expense.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ${expense.isSettlement ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-900'}`}
          >
            <div className="min-w-0">
              <p className={`text-sm font-medium ${expense.isSettlement ? 'text-slate-400' : 'text-white'}`}>
                {expense.isSettlement ? '✓ ' : ''}{expense.title}
              </p>
              <p className="text-xs text-slate-500">
                {format(expense.date, 'MMM d')} · {memberName(expense.paidBy)} paid
                {!expense.isSettlement && ` · ${expense.splitWith.length} ways`}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className={`text-sm font-semibold ${expense.isSettlement ? 'text-slate-400' : 'text-white'}`}>
                  {expense.currency} {expense.amount.toFixed(2)}
                </p>
                {expense.currency !== baseCurrency && rates[expense.currency] && (
                  <p className="text-xs text-slate-500">
                    ≈ {baseCurrency} {(expense.amount / rates[expense.currency]).toFixed(2)}
                  </p>
                )}
              </div>
              <button onClick={() => deleteDoc(doc(db, 'expenses', expense.id))} className="text-slate-600 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {expenses.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-6">No expenses yet.</p>
      )}
    </div>
  )
}
