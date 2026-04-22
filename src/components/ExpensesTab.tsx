import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { nanoid } from '@/lib/nanoid'
import type { Expense } from '@/types'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

export default function ExpensesTab({ tripId }: { tripId: string }) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', currency: 'GBP', category: 'food' })

  useEffect(() => {
    const q = query(collection(db, 'expenses'), where('tripId', '==', tripId))
    return onSnapshot(q, snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))))
  }, [tripId])

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const id = nanoid()
    await setDoc(doc(db, 'expenses', id), {
      tripId,
      title: form.title,
      amount: parseFloat(form.amount),
      currency: form.currency,
      paidBy: user.uid,
      splitWith: [],
      date: Date.now(),
      category: form.category,
      createdAt: Date.now(),
    })
    setForm({ title: '', amount: '', currency: 'GBP', category: 'food' })
    setShowAdd(false)
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const currency = expenses[0]?.currency ?? 'GBP'

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total spent</p>
          <p className="text-2xl font-bold text-white">{currency} {total.toFixed(2)}</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Add
        </button>
      </div>

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
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              placeholder="GBP"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
              maxLength={3}
              className="w-20 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-medium">
            Save
          </button>
        </form>
      )}

      <div className="space-y-2">
        {expenses.sort((a, b) => b.date - a.date).map(expense => (
          <div key={expense.id} className="flex items-center justify-between bg-slate-900 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{expense.title}</p>
              <p className="text-xs text-slate-500">{format(expense.date, 'MMM d')}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-white">{expense.currency} {expense.amount.toFixed(2)}</p>
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
