'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  CreditCard,
  Database,
  Download,
  FileSpreadsheet,
  Globe2,
  LayoutDashboard,
  Laptop,
  Menu,
  MoreVertical,
  MoonStar,
  Palette,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  SunMedium,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react'

type View = 'Overview' | 'All Transactions' | 'Analytics & Reports' | 'Category Budgets' | 'Recurring & Bills' | 'Settings' | 'History' | 'Trash'
type Transaction = { id: number; merchant: string; category: string; date: string; amount: number; type: 'Expense' | 'Income'; deleted?: boolean }
type HistoryAction = 'created' | 'edited' | 'deleted' | 'restored'
type HistoryEntry = {
  id: number
  transactionId: number
  action: HistoryAction
  changedFields: Record<string, { old: any; new: any }> | null
  timestamp: string
}
type SettingsSection = 'profile' | 'regional' | 'appearance' | 'data'
type TransactionForm = { merchant: string; category: string; amount: string; date: string; type: 'Expense' | 'Income' }
type BudgetForm = { name: string; limit: string; color: string }
type BillForm = { name: string; amount: string; due: string; frequency: 'Monthly' | 'Yearly' }
type Budget = { name: string; spent: number; limit: number; color: string }
type Bill = { name: string; due: string; amount: number; paid: boolean; frequency: 'Monthly' | 'Yearly' }

const emptyBudgetForm: BudgetForm = { name: '', limit: '', color: 'bg-primary' }
const emptyBillForm: BillForm = { name: '', amount: '', due: '2026-08-28', frequency: 'Monthly' }

const settingsSections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: CircleUserRound },
  { id: 'regional', label: 'Regional & Currency', icon: Globe2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Data Management', icon: Database },
]

const themeOptions = [
  { id: 'dark', label: 'Dark Slate Mode', note: 'Low-glare workspace', icon: MoonStar, preview: 'bg-slate-950' },
  { id: 'light', label: 'Light Mode', note: 'Bright and classic', icon: SunMedium, preview: 'bg-white' },
  { id: 'system', label: 'System Default', note: 'Follows your device', icon: Laptop, preview: 'bg-gradient-to-br from-slate-900 to-slate-200' },
] as const

const accentOptions = [
  { id: 'classic', label: 'Classic Green', value: '#226b59' },
  { id: 'indigo', label: 'Indigo', value: '#4f46e5' },
  { id: 'emerald', label: 'Emerald', value: '#10b981' },
  { id: 'teal', label: 'Teal', value: '#14b8a6' },
] as const

const monthOptions = ['1st of every month', '15th of every month', 'Last day of every month']
const categoryOptions = ['Groceries', 'Utilities', 'Shopping', 'Transport', 'Dining', 'Health', 'Income']

const emptyForm: TransactionForm = {
  merchant: '',
  category: 'Groceries',
  amount: '',
  date: '2026-08-24',
  type: 'Expense',
}

const icons: Record<string, React.ElementType> = {
  Overview: LayoutDashboard,
  'All Transactions': Receipt,
  'Analytics & Reports': BarChart3,
  'Category Budgets': Wallet,
  'Recurring & Bills': CalendarDays,
  Settings,
  History: LayoutDashboard,
  Trash: Trash2,
}

const money = (n: number) => `${new Intl.NumberFormat('en-US').format(n)} IQD`

const actionBadgeClasses: Record<HistoryAction, string> = {
  created: 'history-badge created',
  edited: 'history-badge edited',
  deleted: 'history-badge deleted',
  restored: 'history-badge restored',
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return formatTimestamp(value)
}

function getDefaultDateRange(preset: 'This Month' | 'Last Month' | 'This Year') {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (preset === 'This Year') {
    return {
      start: new Date(year, 0, 1).toISOString().slice(0, 10),
      end: new Date(year, 11, 31).toISOString().slice(0, 10),
    }
  }

  if (preset === 'Last Month') {
    const lastMonth = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    return {
      start: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().slice(0, 10),
      end: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()).toISOString().slice(0, 10),
    }
  }

  return {
    start: new Date(year, month, 1).toISOString().slice(0, 10),
    end: new Date(year, month + 1, 0).toISOString().slice(0, 10),
  }
}

function Stat({ label, value, trend, tone = 'default' }: { label: string; value: string; trend?: string; tone?: string }) {
  return <div className="stat-card"><p className="eyebrow">{label}</p><p className={`stat-value ${tone}`}>{value}</p>{trend && <p className="trend"><TrendingUp size={13} /> {trend}</p>}</div>
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div className="section-title"><h2>{title}</h2>{action}</div>
}

function SettingsSwitch({ checked, onClick, label, description }: { checked: boolean; onClick: () => void; label: string; description: string }) {
  return (
    <button className="switch-row" type="button" onClick={onClick} aria-checked={checked} role="switch">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className={`ios-switch ${checked ? 'on' : ''}`} aria-hidden="true">
        <span />
      </span>
    </button>
  )
}

export default function Page() {
  const router = useRouter()
  const [view, setView] = useState<View>('Overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [historyFilter, setHistoryFilter] = useState<'All' | HistoryAction>('All')
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false)
  const [isAddBillOpen, setIsAddBillOpen] = useState(false)
  const [budgetMenu, setBudgetMenu] = useState<string | null>(null)
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showPrintSummary, setShowPrintSummary] = useState(false)
  const [form, setForm] = useState<TransactionForm>(emptyForm)
  const [budgetForm, setBudgetForm] = useState<BudgetForm>(emptyBudgetForm)
  const [billForm, setBillForm] = useState<BillForm>(emptyBillForm)
  const [editingBill, setEditingBill] = useState<string | null>(null)
  const [merchantQuery, setMerchantQuery] = useState('')
  const [categoryQuery, setCategoryQuery] = useState('')
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile')
  const [displayName, setDisplayName] = useState('Zanko Muhammad')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [currencyFormat, setCurrencyFormat] = useState<'symbol' | 'code'>('symbol')
  const [startOfMonth, setStartOfMonth] = useState('1st of every month')
  const [themeChoice, setThemeChoice] = useState<(typeof themeOptions)[number]['id']>('light')
    useEffect(() => {
    const root = document.documentElement
    const applyTheme = (isDark: boolean) => {
      root.setAttribute('data-theme', isDark ? 'dark' : 'light')
    }
    if (themeChoice === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    }
    applyTheme(themeChoice === 'dark')
  }, [themeChoice])
  const [accentChoice, setAccentChoice] = useState<(typeof accentOptions)[number]['id']>('classic')
    useEffect(() => {
    const selected = accentOptions.find(o => o.id === accentChoice)
    if (selected) {
      document.documentElement.style.setProperty('--primary', selected.value)
    }
  }, [accentChoice])
  const [autoBackups, setAutoBackups] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
    useEffect(() => {
    document.documentElement.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false')
  }, [reduceMotion])
  const [lastSaved, setLastSaved] = useState('Unsaved changes')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const formattedDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const [periodA, setPeriodA] = useState({ label: 'This Month', start: getDefaultDateRange('This Month').start, end: getDefaultDateRange('This Month').end })
  const [periodB, setPeriodB] = useState({ label: 'Last Month', start: getDefaultDateRange('Last Month').start, end: getDefaultDateRange('Last Month').end })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  useEffect(() => {
    const handleAfterPrint = () => setShowPrintSummary(false)
    if (typeof window !== 'undefined') {
      window.addEventListener('afterprint', handleAfterPrint)
      return () => window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        const [txRes, budgetRes, billRes, historyRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/budgets'),
          fetch('/api/bills'),
          fetch('/api/history'),
        ])
        const [txData, budgetData, billData, historyData] = await Promise.all([
          txRes.json(),
          budgetRes.json(),
          billRes.json(),
          historyRes.json(),
        ])
        setTransactions(Array.isArray(txData) ? txData : [])
        setBudgets(Array.isArray(budgetData) ? budgetData : [])
        setBills(Array.isArray(billData) ? billData : [])
        setHistory(Array.isArray(historyData) ? historyData : [])
      } catch (err) {
        console.error('Failed to load data', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

    async function handleLogoutEverywhere() {
    await fetch('/api/logout-everywhere', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const active = useMemo(() => transactions.filter(t => !t.deleted), [transactions])
  const filtered = useMemo(() => active.filter(t => `${t.merchant} ${t.category}`.toLowerCase().includes(query.toLowerCase())), [active, query])
  const income = active.filter(t => t.type === 'Income').reduce((a, t) => a + t.amount, 0)
  const spent = active.filter(t => t.type === 'Expense').reduce((a, t) => a + t.amount, 0)

  const merchantSuggestions = useMemo(() => {
    const names = [...new Set(active.map(t => t.merchant))]
    return names.filter(name => name.toLowerCase().includes(merchantQuery.trim().toLowerCase())).slice(0, 6)
  }, [active, merchantQuery])

  const categoryMatches = useMemo(() => {
    if (!categoryQuery.trim()) return categoryOptions
    return categoryOptions.filter(category => category.toLowerCase().includes(categoryQuery.trim().toLowerCase()))
  }, [categoryQuery])

  const historyEntries = useMemo(() => {
    const items = historyFilter === 'All' ? history : history.filter(entry => entry.action === historyFilter)
    return [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [history, historyFilter])

  const comparisonCategories = useMemo(() => {
    const allowed = selectedCategories.length ? selectedCategories : categoryOptions
    return allowed.filter(category => category !== 'Income')
  }, [selectedCategories])

  const comparisonData = useMemo(() => {
    const maxAmount = Math.max(
      ...comparisonCategories.map(category => {
        const a = active.filter(t => t.category === category && t.type === 'Expense' && t.date >= periodA.start && t.date <= periodA.end).reduce((sum, item) => sum + item.amount, 0)
        const b = active.filter(t => t.category === category && t.type === 'Expense' && t.date >= periodB.start && t.date <= periodB.end).reduce((sum, item) => sum + item.amount, 0)
        return Math.max(a, b)
      }),
      1,
    )

    return comparisonCategories.map(category => {
      const aTotal = active.filter(t => t.category === category && t.type === 'Expense' && t.date >= periodA.start && t.date <= periodA.end).reduce((sum, item) => sum + item.amount, 0)
      const bTotal = active.filter(t => t.category === category && t.type === 'Expense' && t.date >= periodB.start && t.date <= periodB.end).reduce((sum, item) => sum + item.amount, 0)
      const delta = aTotal === 0 ? 0 : ((bTotal - aTotal) / aTotal) * 100

      return { category, aTotal, bTotal, delta, maxAmount }
    })
  }, [active, comparisonCategories, periodA, periodB])

  const resetModal = () => {
    setIsAddTransactionOpen(false)
    setModalMode('add')
    setEditingId(null)
    setForm(emptyForm)
    setMerchantQuery('')
    setCategoryQuery('')
  }

  const openAddModal = () => {
    setForm(emptyForm)
    setMerchantQuery('')
    setCategoryQuery('')
    setModalMode('add')
    setEditingId(null)
    setIsAddTransactionOpen(true)
  }

  const openBudgetModal = () => {
    setEditingBudget(null)
    setBudgetForm(emptyBudgetForm)
    setIsAddBudgetOpen(true)
  }

  const openEditBudget = (budget: Budget) => {
    setEditingBudget(budget.name)
    setBudgetForm({ name: budget.name, limit: String(budget.limit), color: budget.color })
    setBudgetMenu(null)
    setIsAddBudgetOpen(true)
  }

  const deleteBudget = async (name: string) => {
    setBudgetMenu(null)
    const previous = budgets
    setBudgets(prev => prev.filter(budget => budget.name !== name))
    try {
      const res = await fetch(`/api/budgets/${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete budget')
    } catch (err) {
      console.error(err)
      setBudgets(previous)
    }
  }

  const openBillModal = () => {
    setEditingBill(null)
    setBillForm(emptyBillForm)
    setIsAddBillOpen(true)
  }

  const openEditBill = (bill: Bill) => {
    setEditingBill(bill.name)
    setBillForm({ name: bill.name, amount: String(bill.amount), due: bill.due, frequency: bill.frequency })
    setIsAddBillOpen(true)
  }

  const deleteBill = async (name: string) => {
    const previous = bills
    setBills(prev => prev.filter(bill => bill.name !== name))
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete bill')
    } catch (err) {
      console.error(err)
      setBills(previous)
    }
  }

  const saveBudget = async () => {
    if (!budgetForm.name.trim() || !budgetForm.limit || Number(budgetForm.limit) <= 0) return
    try {
      if (editingBudget) {
        const res = await fetch(`/api/budgets/${encodeURIComponent(editingBudget)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: budgetForm.name.trim(), limit: Number(budgetForm.limit), color: budgetForm.color }),
        })
        if (!res.ok) throw new Error('Failed to update budget')
        const updated = await res.json()
        setBudgets(prev => prev.map(budget => budget.name === editingBudget ? updated : budget))
      } else {
        const res = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: budgetForm.name.trim(), limit: Number(budgetForm.limit), color: budgetForm.color }),
        })
        if (!res.ok) throw new Error('Failed to create budget')
        const created = await res.json()
        setBudgets(prev => [...prev, created])
      }
      setIsAddBudgetOpen(false)
      setBudgetForm(emptyBudgetForm)
      setEditingBudget(null)
    } catch (err) {
      console.error(err)
    }
  }

  const saveBill = async () => {
    if (!billForm.name.trim() || !billForm.amount || Number(billForm.amount) <= 0 || !billForm.due) return
    try {
      if (editingBill) {
        const res = await fetch(`/api/bills/${encodeURIComponent(editingBill)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: billForm.name.trim(), amount: Number(billForm.amount), due: billForm.due, frequency: billForm.frequency }),
        })
        if (!res.ok) throw new Error('Failed to update bill')
        const updated = await res.json()
        setBills(prev => prev.map(bill => bill.name === editingBill ? updated : bill))
      } else {
        const res = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: billForm.name.trim(), amount: Number(billForm.amount), due: billForm.due, frequency: billForm.frequency }),
        })
        if (!res.ok) throw new Error('Failed to create bill')
        const created = await res.json()
        setBills(prev => [...prev, created])
      }
      setIsAddBillOpen(false)
      setBillForm(emptyBillForm)
      setEditingBill(null)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleBillPaid = async (name: string) => {
    const current = bills.find(bill => bill.name === name)
    if (!current) return
    const wasUnpaid = !current.paid
    const previous = bills
    setBills(prev => prev.map(bill => bill.name === name ? { ...bill, paid: !bill.paid } : bill))
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: wasUnpaid }),
      })
      if (!res.ok) throw new Error('Failed to update bill')

      if (wasUnpaid) {
        const [txRes, historyRes] = await Promise.all([fetch('/api/transactions'), fetch('/api/history')])
        const [txData, historyData] = await Promise.all([txRes.json(), historyRes.json()])
        if (Array.isArray(txData)) setTransactions(txData)
        if (Array.isArray(historyData)) setHistory(historyData)
      }
    } catch (err) {
      console.error(err)
      setBills(previous)
    }
  }

  const openEditModal = (id: number) => {
    const transaction = transactions.find(t => t.id === id)
    if (!transaction) return
    setModalMode('edit')
    setEditingId(id)
    setForm({
      merchant: transaction.merchant,
      category: transaction.category,
      amount: String(transaction.amount),
      date: transaction.date,
      type: transaction.type,
    })
    setMerchantQuery(transaction.merchant)
    setCategoryQuery(transaction.category)
    setIsAddTransactionOpen(true)
  }

  const refreshHistory = async () => {
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      if (Array.isArray(data)) setHistory(data)
    } catch (err) {
      console.error('Failed to refresh history', err)
    }
  }

  const addTransaction = async () => {
    if (!form.merchant.trim() || !form.amount || Number(form.amount) <= 0) return
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: form.merchant.trim(),
          category: form.category,
          amount: Number(form.amount),
          date: form.date,
          type: form.type,
        }),
      })
      if (!res.ok) throw new Error('Failed to create transaction')
      const created = await res.json()
      setTransactions(prev => [created, ...prev])
      await refreshHistory()
      resetModal()
    } catch (err) {
      console.error(err)
    }
  }

  const saveTransaction = async () => {
    if (editingId === null || !form.merchant.trim() || !form.amount || Number(form.amount) <= 0) return
    try {
      const res = await fetch(`/api/transactions/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: form.merchant.trim(),
          category: form.category,
          amount: Number(form.amount),
          date: form.date,
          type: form.type,
        }),
      })
      if (!res.ok) throw new Error('Failed to update transaction')
      const updated = await res.json()
      setTransactions(prev => prev.map(t => t.id === editingId ? updated : t))
      await refreshHistory()
      resetModal()
    } catch (err) {
      console.error(err)
    }
  }

  const softDeleteTransaction = async (id: number) => {
    const item = transactions.find(t => t.id === id)
    if (!item) return
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, deleted: true } : t))
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      })
      if (!res.ok) throw new Error('Failed to delete transaction')
      await refreshHistory()
    } catch (err) {
      console.error(err)
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, deleted: false } : t))
    }
  }

  const restoreTransaction = async (id: number) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, deleted: false } : t))
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })
      if (!res.ok) throw new Error('Failed to restore transaction')
      await refreshHistory()
    } catch (err) {
      console.error(err)
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, deleted: true } : t))
    }
  }

  const permanentlyDeleteTransaction = async (id: number) => {
    const previous = transactions
    setTransactions(prev => prev.filter(t => t.id !== id))
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to permanently delete transaction')
    } catch (err) {
      console.error(err)
      setTransactions(previous)
    }
  }

  const exportCsv = () => {
    const csv = ['Merchant,Category,Date,Amount,Type', ...active.map(t => `${t.merchant},${t.category},${t.date},${t.amount},${t.type}`)].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'ledgerly-transactions.csv'
    a.click()
  }

  const exportJson = () => {
    const payload = { transactions: active, budgets, bills }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    a.download = 'ledgerly-backup.json'
    a.click()
  }

  const exportAllData = () => {
    exportCsv()
    exportJson()
  }

  const exportPdf = () => {
    setShowPrintSummary(true)
    setTimeout(() => {
      window.print()
    }, 80)
  }

  const resetPreferences = () => {
    setDisplayName('Zanko Muhammad')
    setCurrencyFormat('symbol')
    setStartOfMonth('1st of every month')
    setThemeChoice('light')
    setAccentChoice('emerald')
    setAutoBackups(true)
    setReduceMotion(false)
    setLastSaved('Unsaved changes')
    setSettingsSection('profile')
  }

  const savePreferences = () => {
    setLastSaved(`Saved just now · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  }

  const jumpToSettingsSection = (section: SettingsSection) => {
    setSettingsSection(section)
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const nav = (label: View) => (
    <motion.button whileTap={{ scale: 0.97 }} className={`nav-item ${view === label ? 'active' : ''}`} onClick={() => { setView(label); setIsSidebarOpen(false) }}>
      {view === label && <motion.span className="active-nav-indicator" layoutId="activeTab" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      {(() => { const Icon = icons[label]; return <Icon size={18} /> })()}
      <span>{label}</span>
    </motion.button>
  )

  if (isLoading) {
    return (
      <main className="app-shell">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%' }}>
          <p style={{ color: '#64748b', fontSize: 14 }}>Loading your data…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark">L</span><span>ledgerly</span></div>
        <div className="nav-group">
          {nav('Overview')}
          {nav('All Transactions')}
          {nav('Analytics & Reports')}
        </div>
        <div className="nav-group">
          <p className="nav-label">Plan & track</p>
          {nav('Category Budgets')}
          {nav('Recurring & Bills')}
        </div>
        <div className="nav-group">
          <p className="nav-label">Manage</p>
          {nav('Settings')}
          {nav('Trash')}
        </div>
        <div className="sidebar-footer">
          <div className="avatar" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}>ZM</div>
          <div><strong>Zanko Muhammad</strong><small>Personal account</small></div>
          <ChevronDown size={15} />
        </div>
      </aside>

      <section className="canvas">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setIsSidebarOpen(prev => !prev)} aria-label="Toggle menu">
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">{formattedDate}</p>
            <h1>{view}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <button className="primary-button" onClick={openAddModal}><Plus size={17} /> Add transaction</button>
          </div>
        </header>

        <div className="content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div className="view-stack" key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
              {view === 'Overview' && (
                <>
                  <div className="welcome">
                    <div>
                      <p className="eyebrow">Your financial snapshot</p>
                      <h2>{greeting}, Zanko.</h2>
                      <p>Here&apos;s how your money is moving this month.</p>
                    </div>
                    <div className="month-pill"><CalendarDays size={16} /> August 2026 <ChevronDown size={15} /></div>
                  </div>

                  <div className="stats-grid">
                    <Stat label="Available balance" value={money(income - spent)} trend="12.4% vs last month" tone="positive" />
                    <Stat label="Total income" value={money(income)} trend="8.2% vs last month" tone="positive" />
                    <Stat label="Total spending" value={money(spent)} trend="3.1% vs last month" />
                  </div>

                  <div className="two-col">
                    <div className="panel chart-panel">
                      <SectionTitle title="Spending overview" action={<button className="text-button">This month <ChevronDown size={14} /></button>} />
                      <div className="chart">
                        <div className="chart-amount">{money(spent)}<span> spent this month</span></div>
                        <div className="bars">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((m, i) => <div className="bar-wrap" key={m}><div className={`bar ${i === 7 ? 'current' : ''}`} style={{ height: `${[45, 58, 40, 69, 55, 72, 48, 84][i]}%` }} /><small>{m}</small></div>)}</div>
                      </div>
                    </div>

                    <div className="panel">
                      <SectionTitle title="Budget health" action={<button className="text-button" onClick={() => setView('Category Budgets')}>View all <span>→</span></button>} />
                      <div className="budget-list">
                        {budgets.slice(0, 3).map(b => (
                          <div className="budget-row" key={b.name}>
                            <div className="budget-meta"><span>{b.name}</span><small>{money(b.spent)} / {money(b.limit)}</small></div>
                            <div className="progress"><span className={b.color} style={{ width: `${Math.min(100, (b.spent / b.limit) * 100)}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="two-col lower">
                    <div className="panel">
                      <SectionTitle title="Recent transactions" action={<button className="text-button" onClick={() => setView('All Transactions')}>View all <span>→</span></button>} />
                      <TransactionList rows={active.slice(0, 4)} onDelete={softDeleteTransaction} onEdit={openEditModal} />
                    </div>

                    <div className="panel insight">
                      <div className="insight-icon"><TrendingUp size={20} /></div>
                      <p className="eyebrow">A small insight</p>
                      <h3>Your spending is on track.</h3>
                      <p>You&apos;ve used 68% of your planned monthly budget with 7 days left in August.</p>
                      <button className="outline-button" onClick={() => setView('Analytics & Reports')}>Open analytics</button>
                    </div>
                  </div>
                </>
              )}

              {view === 'All Transactions' && (
                <div className="panel page-panel">
                  <div className="toolbar">
                    <div className="search"><Search size={17} /><input placeholder="Search transactions..." value={query} onChange={e => setQuery(e.target.value)} /></div>
                    <button className="outline-button"><SlidersHorizontal size={16} /> Filters</button>
                    <button className="outline-button" onClick={exportPdf}><Download size={16} /> Export PDF</button>
                    <button className="outline-button" onClick={exportCsv}><Download size={16} /> Export CSV</button>
                  </div>
                  <TransactionList rows={filtered} onDelete={softDeleteTransaction} onEdit={openEditModal} />
                </div>
              )}

              {view === 'History' && (
                <div className="panel page-panel">
                  <div className="toolbar history-toolbar">
                    <div className="history-filter">
                      <span className="eyebrow">Filter</span>
                      <div className="filter-buttons">
                        {(['All', 'created', 'edited', 'deleted', 'restored'] as const).map(option => (
                          <button key={option} type="button" className={`filter-chip ${historyFilter === option ? 'active' : ''}`} onClick={() => setHistoryFilter(option)}>
                            {option === 'All' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="history-list">
                    {historyEntries.length ? (
                      historyEntries.map(entry => {
                        const transaction = transactions.find(t => t.id === entry.transactionId)
                        const merchant = transaction?.merchant ?? 'Unknown merchant'
                        const summary = entry.changedFields
                          ? Object.entries(entry.changedFields)
                              .slice(0, 3)
                              .map(([field, value]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${String(value.old) || '—'} → ${String(value.new) || '—'}`)
                              .join(' • ')
                          : entry.action === 'created'
                            ? 'Created a new ledger entry.'
                            : entry.action === 'deleted'
                              ? 'Soft-deleted this transaction.'
                              : entry.action === 'restored'
                                ? 'Restored this transaction.'
                                : 'Updated transaction details.'

                        return (
                          <div className="history-row" key={entry.id}>
                            <div className="history-main">
                              <div className="history-header">
                                <span className={actionBadgeClasses[entry.action]}>{entry.action}</span>
                                <strong>{merchant}</strong>
                              </div>
                              <p>{summary}</p>
                            </div>
                            <time>{formatRelativeTime(entry.timestamp)}</time>
                          </div>
                        )
                      })
                    ) : (
                      <div className="empty"><Receipt size={28} /><h3>No activity yet</h3><p>New transaction actions will appear here.</p></div>
                    )}
                  </div>
                </div>
              )}

              {view === 'Category Budgets' && (
                <div className="budget-page">
                  <SectionTitle title="Monthly category budgets" action={<button className="primary-button" onClick={openBudgetModal}><Plus size={17} /> Add budget</button>} />
                  <div className="budget-cards">
                    {budgets.map(b => (
                      <div className="panel budget-card" key={b.name}>
                        <div className="budget-card-head"><div className="category-dot" /><strong>{b.name}</strong><div className="relative"><button type="button" className="kebab" aria-label={`Actions for ${b.name}`} onClick={() => setBudgetMenu(budgetMenu === b.name ? null : b.name)}><MoreVertical size={17} /></button>{budgetMenu === b.name && <div className="card-menu"><button type="button" onClick={() => openEditBudget(b)}>Edit Limit</button><button type="button" onClick={() => deleteBudget(b.name)}>Delete Category</button></div>}</div></div>
                        <p className="big-number">{money(b.spent)}</p>
                        <p className="muted">of {money(b.limit)} planned</p>
                        <div className="progress large"><span className={b.color} style={{ width: `${(b.spent / b.limit) * 100}%` }} /></div>
                        <div className="budget-foot"><span>{Math.round((b.spent / b.limit) * 100)}% used</span><span>{money(b.limit - b.spent)} left</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'Recurring & Bills' && (
                <div className="panel page-panel">
                  <SectionTitle title="Upcoming bills" action={<button className="primary-button" onClick={openBillModal}><Plus size={17} /> Add bill</button>} />
                  <div className="bill-list">
                    {bills.map(b => (
                      <div className="bill-row" key={b.name}>
                        <div className="bill-icon"><CreditCard size={18} /></div>
                        <div className="bill-info"><strong>{b.name}</strong><small>Due {new Date(`${b.due}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}</small></div>
                        <strong>{money(b.amount)}</strong>
                        <button type="button" className={`status ${b.paid ? 'paid' : ''}`} onClick={() => toggleBillPaid(b.name)}><Check size={14} /> {b.paid ? 'Paid' : 'Mark paid'}</button>
                        <button type="button" className="row-action" aria-label={`Edit ${b.name}`} onClick={() => openEditBill(b)}><Pencil size={15} /></button>
                        <button type="button" className="row-action" aria-label={`Delete ${b.name}`} onClick={() => deleteBill(b.name)}><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'Analytics & Reports' && (
                <div className="analytics-layout">
                  <div className="analytics-grid">
                    <div className="panel">
                      <SectionTitle title="Where your money goes" />
                      <div className="donut"><div><strong>{money(spent)}</strong><small>total spend</small></div></div>
                      <div className="legend">
                        {budgets.map(b => <span key={b.name}><i className={b.color} />{b.name}<b>{spent > 0 ? Math.round((b.spent / spent) * 100) : 0}%</b></span>)}
                      </div>
                    </div>

                    <div className="panel">
                      <SectionTitle title="Monthly comparison" />
                      <div className="comparison">
                        <div className="compare-row"><span>Income</span><div><i className="income-line" style={{ width: '88%' }} /></div><b>{money(income)}</b></div>
                        <div className="compare-row"><span>Expenses</span><div><i className="expense-line" style={{ width: '52%' }} /></div><b>{money(spent)}</b></div>
                      </div>
                    </div>
                  </div>

                  <div className="panel compare-periods-panel">
                    <SectionTitle title="Compare Periods" />

                    <div className="compare-period-grid">
                      <div className="period-box">
                        <p className="eyebrow">Period A</p>
                        <div className="period-presets">
                          {['This Month', 'Last Month', 'This Year'].map(option => (
                            <button key={option} type="button" className={`preset-button ${periodA.label === option ? 'active' : ''}`} onClick={() => {
                              const next = getDefaultDateRange(option as 'This Month' | 'Last Month' | 'This Year')
                              setPeriodA({ label: option, start: next.start, end: next.end })
                            }}>
                              {option}
                            </button>
                          ))}
                        </div>
                        <div className="range-fields">
                          <label><span>Start</span><input type="date" value={periodA.start} onChange={e => setPeriodA(prev => ({ ...prev, start: e.target.value }))} /></label>
                          <label><span>End</span><input type="date" value={periodA.end} onChange={e => setPeriodA(prev => ({ ...prev, end: e.target.value }))} /></label>
                        </div>
                      </div>

                      <div className="period-box">
                        <p className="eyebrow">Period B</p>
                        <div className="period-presets">
                          {['This Month', 'Last Month', 'This Year'].map(option => (
                            <button key={option} type="button" className={`preset-button ${periodB.label === option ? 'active' : ''}`} onClick={() => {
                              const next = getDefaultDateRange(option as 'This Month' | 'Last Month' | 'This Year')
                              setPeriodB({ label: option, start: next.start, end: next.end })
                            }}>
                              {option}
                            </button>
                          ))}
                        </div>
                        <div className="range-fields">
                          <label><span>Start</span><input type="date" value={periodB.start} onChange={e => setPeriodB(prev => ({ ...prev, start: e.target.value }))} /></label>
                          <label><span>End</span><input type="date" value={periodB.end} onChange={e => setPeriodB(prev => ({ ...prev, end: e.target.value }))} /></label>
                        </div>
                      </div>
                    </div>

                    <div className="category-filter-box">
                      <p className="eyebrow">Categories</p>
                      <div className="category-checkboxes">
                        <label className="checkbox-row all-categories">
                          <input type="checkbox" checked={selectedCategories.length === 0} onChange={() => setSelectedCategories([])} />
                          <span>All Categories</span>
                        </label>
                        {categoryOptions.filter(category => category !== 'Income').map(category => (
                          <label key={category} className="checkbox-row">
                            <input type="checkbox" checked={selectedCategories.includes(category) || selectedCategories.length === 0} onChange={() => {
                              if (selectedCategories.length === 0) {
                                setSelectedCategories(categoryOptions.filter(item => item !== category))
                                return
                              }
                              setSelectedCategories(prev => prev.includes(category) ? prev.filter(item => item !== category) : [...prev, category])
                            }} />
                            <span>{category}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="period-chart">
                      {comparisonData.map(item => (
                        <div key={item.category} className="period-chart-row">
                          <div className="period-chart-label">{item.category}</div>
                          <div className="period-bars">
                            <div className="period-bar-group">
                              <div className="bar-stack">
                                <div className="bar-compare a" style={{ height: `${(item.aTotal / item.maxAmount) * 100}%` }} />
                              </div>
                              <small>{money(item.aTotal)}</small>
                            </div>
                            <div className="period-bar-group">
                              <div className="bar-stack">
                                <div className="bar-compare b" style={{ height: `${(item.bTotal / item.maxAmount) * 100}%` }} />
                              </div>
                              <small>{money(item.bTotal)}</small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="comparison-table-wrap">
                      <table className="comparison-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Period A</th>
                            <th>Period B</th>
                            <th>% Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonData.map(item => (
                            <tr key={item.category}>
                              <td>{item.category}</td>
                              <td>{money(item.aTotal)}</td>
                              <td>{money(item.bTotal)}</td>
                              <td className={item.delta > 0 ? 'delta positive' : 'delta negative'}>{item.delta.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {view === 'Trash' && (
                <div className="panel page-panel">
                  <SectionTitle title="Recently deleted" action={<button className="outline-button" onClick={() => setTransactions(prev => prev.map(t => ({ ...t, deleted: false })))}>Empty trash</button>} />
                  {transactions.filter(t => t.deleted).length ? (
                    <TransactionList rows={transactions.filter(t => t.deleted)} onRestore={restoreTransaction} onPermanentDelete={permanentlyDeleteTransaction} />
                  ) : (
                    <div className="empty"><Trash2 size={28} /><h3>Trash is empty</h3><p>Deleted transactions will appear here.</p></div>
                  )}
                </div>
              )}

              {view === 'Settings' && (
                <div className="settings-dashboard">
                  <aside className="settings-nav panel">
                    <div className="settings-nav-head">
                      <p className="eyebrow">Preferences</p>
                      <h2>Settings</h2>
                      <p>Manage profile identity, regional rules, theme styling, and local data controls.</p>
                    </div>
                    <nav className="settings-nav-list" aria-label="Settings sections">
                      {settingsSections.map(section => {
                        const Icon = section.icon
                        return (
                          <button key={section.id} type="button" className={`settings-nav-item ${settingsSection === section.id ? 'active' : ''}`} onClick={() => jumpToSettingsSection(section.id)}>
                            <Icon size={18} />
                            <span>{section.label}</span>
                            <ChevronDown size={14} />
                          </button>
                        )
                      })}
                    </nav>
                    <div className="settings-nav-note"><Check size={16} /><span>{lastSaved}</span></div>
                  </aside>

                  <div className="settings-main">
                    <div className="settings-hero">
                      <div>
                        <p className="eyebrow">User preferences dashboard</p>
                        <h2>Everything is grouped into clear cards with room to breathe.</h2>
                        <p>Update identity, regional defaults, visual preferences, and data tools without leaving this view.</p>
                      </div>
                      <div className="settings-hero-badge">Profile, currency, appearance and data</div>
                    </div>

                    <section id="profile" className={`settings-card ${settingsSection === 'profile' ? 'active' : ''}`}>
                      <div className="settings-card-head">
                        <div><p className="eyebrow">Account identity</p><h3>Profile Settings</h3></div>
                        <span className="section-badge">Personal</span>
                      </div>
                      <div className="profile-grid">
                        <div className="avatar-panel">
                          <div className="avatar avatar-large" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}>ZM</div>
                          <div>
                            <strong>Zanko Muhammad</strong>
                            <p>Profile photo and name for reports, exports, and account history.</p>
                          </div>
                          <div className="avatar-actions">
                            <label className="primary-button" style={{ cursor: 'pointer' }}>
                              <Upload size={16} /> Upload Photo
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const reader = new FileReader()
                                  reader.onload = () => setAvatarUrl(reader.result as string)
                                  reader.readAsDataURL(file)
                                }}
                              />
                            </label>
                            {avatarUrl && (
                              <button className="outline-button" type="button" onClick={() => setAvatarUrl(null)}>Remove Photo</button>
                            )}
                          </div>
                        </div>
                        <div className="settings-field-grid">
                          <label className="settings-field">
                            <span>Display Name</span>
                            <input value={displayName} onChange={e => setDisplayName(e.target.value)} />
                          </label>
                          <div className="role-row"><span>Account Role</span><span className="role-badge">Owner / Personal</span></div>
                        </div>
                      </div>
                    </section>

                    <section id="regional" className={`settings-card ${settingsSection === 'regional' ? 'active' : ''}`}>
                      <div className="settings-card-head">
                        <div><p className="eyebrow">Regional defaults</p><h3>Regional &amp; Currency</h3></div>
                        <span className="section-badge locked">Locked System Currency</span>
                      </div>
                      <div className="settings-card-grid">
                        <div className="currency-lock">
                          <div><span>Primary Currency</span><strong>Iraqi Dinar (IQD / د.ع)</strong></div>
                          <span className="locked-pill">Locked System Currency</span>
                        </div>
                        <div className="settings-choice-grid">
                          <button type="button" className={`choice-card ${currencyFormat === 'symbol' ? 'active' : ''}`} onClick={() => setCurrencyFormat('symbol')}>
                            <span className="choice-kicker">Symbol display</span>
                            <strong>1,820,000 د.ع</strong>
                            <small>Use the localized currency symbol in balances and reports.</small>
                          </button>
                          <button type="button" className={`choice-card ${currencyFormat === 'code' ? 'active' : ''}`} onClick={() => setCurrencyFormat('code')}>
                            <span className="choice-kicker">Code display</span>
                            <strong>1,820,000 IQD</strong>
                            <small>Keep the currency code visible for exports and admin views.</small>
                          </button>
                        </div>
                        <label className="settings-field">
                          <span>Start of Financial Month</span>
                          <select value={startOfMonth} onChange={e => setStartOfMonth(e.target.value)}>
                            {monthOptions.map(option => <option key={option}>{option}</option>)}
                          </select>
                        </label>
                      </div>
                    </section>

                    <section id="appearance" className={`settings-card ${settingsSection === 'appearance' ? 'active' : ''}`}>
                      <div className="settings-card-head">
                        <div><p className="eyebrow">Visual style</p><h3>Appearance</h3></div>
                        <span className="section-badge">UI</span>
                      </div>
                      <div className="settings-card-grid">
                        <div className="theme-grid">
                          {themeOptions.map(option => {
                            const Icon = option.icon
                            return (
                              <button key={option.id} type="button" className={`theme-card ${themeChoice === option.id ? 'active' : ''}`} onClick={() => setThemeChoice(option.id)}>
                                <span className={`theme-preview ${option.preview}`} />
                                <Icon size={16} />
                                <strong>{option.label}</strong>
                                <small>{option.note}</small>
                              </button>
                            )
                          })}
                        </div>
                        <div className="accent-row">
                          <div><span>Accent Color</span><p>Choose the highlight tone used for active states and primary actions.</p></div>
                          <div className="accent-picks">
                            {accentOptions.map(option => (
                              <button key={option.id} type="button" className={`accent-dot ${accentChoice === option.id ? 'active' : ''}`} style={{ backgroundColor: option.value }} aria-label={option.label} onClick={() => setAccentChoice(option.id)} />
                            ))}
                          </div>
                        </div>
                        <SettingsSwitch checked={reduceMotion} onClick={() => setReduceMotion(!reduceMotion)} label="Reduce motion" description="Use lighter motion for cards and transitions." />
                      </div>
                    </section>

                    <section id="data" className={`settings-card ${settingsSection === 'data' ? 'active' : ''}`}>
                      <div className="settings-card-head">
                        <div><p className="eyebrow">Local data tools</p><h3>Data &amp; Backups</h3></div>
                        <span className="section-badge warning">Important</span>
                      </div>
                      <div className="settings-card-grid">
                        <div className="data-actions">
                          <button className="primary-button" type="button" onClick={exportAllData}><FileSpreadsheet size={16} /> Export All Financial Data <span>CSV / JSON</span></button>
                          <button className="primary-button" type="button" onClick={exportPdf}><Download size={16} /> Export as PDF</button>
                          <button className="outline-button destructive" type="button" onClick={resetPreferences}><AlertTriangle size={16} /> Reset Preferences</button>
                          <button className="outline-button destructive" type="button" onClick={handleLogout}><AlertTriangle size={16} /> Log out</button>
                          <button className="outline-button destructive" type="button" onClick={handleLogoutEverywhere}><AlertTriangle size={16} /> Log out everywhere</button>
                        </div>
                        <SettingsSwitch checked={autoBackups} onClick={() => setAutoBackups(!autoBackups)} label="Auto backups" description="Keep a local backup copy when you export data." />
                      </div>
                    </section>

                    <div className="settings-actions">
                      <div className="settings-actions-copy">
                        <strong>{lastSaved}</strong>
                        <span>Use Cancel to revert this draft or Save changes to keep it.</span>
                      </div>
                      <div className="settings-actions-buttons">
                        <button className="outline-button" type="button" onClick={resetPreferences}>Cancel</button>
                        <button className="primary-button" type="button" onClick={savePreferences}><Check size={16} /> Save changes</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {isAddTransactionOpen && (
        <div className="modal-backdrop" onClick={resetModal}>
          <div className="modal relative z-50 max-w-md w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-6 shadow-2xl overflow-visible" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">LEDGER ENTRY</h3>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{modalMode === 'edit' ? 'Edit transaction' : 'Add transaction'}</h2>
              </div>
              <button className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-2 transition-colors transition-colors" onClick={resetModal} aria-label="Close"> <X size={18} /></button>
            </div>

            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex flex-col space-y-1.5 relative">
                <label className="text-slate-300 font-medium text-sm mb-1.5 block">Merchant Name</label>
                <input autoFocus className="bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all w-full" placeholder="e.g. Family Mall" value={form.merchant} onChange={e => { setForm({ ...form, merchant: e.target.value }); setMerchantQuery(e.target.value) }} />
                {merchantSuggestions.length > 0 && form.merchant && (
                  <div className="suggestion-list absolute z-[100] top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {merchantSuggestions.map(name => (
                      <button key={name} type="button" className="suggestion-item" onClick={() => { setForm({ ...form, merchant: name }); setMerchantQuery(name); }}>
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-1.5 relative">
                <label className="text-slate-300 font-medium text-sm mb-1.5 block">Category</label>
                <select className="bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categoryOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5 relative">
                  <label className="text-slate-300 font-medium text-sm mb-1.5 block">Amount (IQD)</label>
                  <div className="relative">
                    <input type="number" className="bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all w-full" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm px-2 py-1 rounded-md">د.ع</span>
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 font-medium text-sm mb-1.5 block">Date</label>
                  <input type="date" className="bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all w-full" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center">
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button type="button" className={`px-4 py-2 rounded-lg ${form.type === 'Expense' ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500'}`} onClick={() => setForm({ ...form, type: 'Expense' })}>Expense</button>
                  <button type="button" className={`px-4 py-2 rounded-lg ${form.type === 'Income' ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500'}`} onClick={() => setForm({ ...form, type: 'Income' })}>Income</button>
                </div>
              </div>

              <div>
                <button className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium transition-all" type="button" onClick={modalMode === 'edit' ? saveTransaction : addTransaction}>{modalMode === 'edit' ? 'Save changes' : 'Save transaction'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddBudgetOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddBudgetOpen(false)}>
          <div className="modal relative z-50 max-w-md w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between"><div><h3 className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">PLAN & TRACK</h3><h2 className="mt-1 text-xl font-bold text-slate-900">Add Budget Category</h2></div><button className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-2 transition-colors" onClick={() => setIsAddBudgetOpen(false)} aria-label="Close"><X size={18} /></button></div>
            <div className="flex flex-col gap-4 mt-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 mb-1.5 block">Category Name<input autoFocus className="modal-input" placeholder="e.g. Groceries, Health" value={budgetForm.name} onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })} /></label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 mb-1.5 block">Allocated Budget (IQD)<input type="number" className="modal-input" placeholder="0" value={budgetForm.limit} onChange={e => setBudgetForm({ ...budgetForm, limit: e.target.value })} /></label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 mb-1.5 block">Color / Icon<select className="modal-input" value={budgetForm.color} onChange={e => setBudgetForm({ ...budgetForm, color: e.target.value })}><option value="bg-primary">Emerald</option><option value="bg-chart-2">Blue</option><option value="bg-chart-3">Amber</option><option value="bg-chart-4">Rose</option></select></label>
              <button className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium" type="button" onClick={saveBudget}>Save budget category</button>
            </div>
          </div>
        </div>
      )}

      {isAddBillOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddBillOpen(false)}>
          <div className="modal relative z-50 max-w-md w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between"><div><h3 className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">PLAN & TRACK</h3><h2 className="mt-1 text-xl font-bold text-slate-900">{editingBill ? 'Edit Recurring Expense' : 'Add Recurring Expense'}</h2></div><button className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-2 transition-colors" onClick={() => setIsAddBillOpen(false)} aria-label="Close"><X size={18} /></button></div>
            <div className="flex flex-col gap-4 mt-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 mb-1.5 block">Service Name<input autoFocus className="modal-input" placeholder="e.g. Generator Fee" value={billForm.name} onChange={e => setBillForm({ ...billForm, name: e.target.value })} /></label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 mb-1.5 block">Billing Amount (IQD)<input type="number" className="modal-input" placeholder="0" value={billForm.amount} onChange={e => setBillForm({ ...billForm, amount: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-4"><label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 mb-1.5 block">Due Date<input type="date" className="modal-input" value={billForm.due} onChange={e => setBillForm({ ...billForm, due: e.target.value })} /></label><label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 mb-1.5 block">Frequency<select className="modal-input" value={billForm.frequency} onChange={e => setBillForm({ ...billForm, frequency: e.target.value as BillForm['frequency'] })}><option>Monthly</option><option>Yearly</option></select></label></div>
              <button className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium" type="button" onClick={saveBill}>{editingBill ? 'Save changes' : 'Save recurring expense'}</button>
            </div>
          </div>
        </div>
      )}

      {showPrintSummary && (
        <div className="print-summary visible-print">
          <div className="print-sheet">
            <div className="print-header">
              <div className="print-brand"><span className="brand-mark">L</span><span>ledgerly</span></div>
              <div className="print-header-right">
                <h1>Financial Summary</h1>
                <p className="print-meta">Report generated {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="print-totals">
              <div><span>Total Income</span><strong className="print-income">{money(income)}</strong></div>
              <div><span>Total Spending</span><strong className="print-expense">{money(spent)}</strong></div>
              <div><span>Net Balance</span><strong>{money(income - spent)}</strong></div>
            </div>

            {budgets.length > 0 && (
              <>
                <h2 className="print-section-title">Category Budgets</h2>
                <table>
                  <thead>
                    <tr><th>Category</th><th>Spent</th><th>Limit</th><th>Remaining</th></tr>
                  </thead>
                  <tbody>
                    {budgets.map(b => (
                      <tr key={b.name}>
                        <td>{b.name}</td>
                        <td>{money(b.spent)}</td>
                        <td>{money(b.limit)}</td>
                        <td>{money(b.limit - b.spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {bills.length > 0 && (
              <>
                <h2 className="print-section-title">Recurring Bills</h2>
                <table>
                  <thead>
                    <tr><th>Service</th><th>Amount</th><th>Due</th><th>Frequency</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {bills.map(b => (
                      <tr key={b.name}>
                        <td>{b.name}</td>
                        <td>{money(b.amount)}</td>
                        <td>{new Date(`${b.due}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}</td>
                        <td>{b.frequency}</td>
                        <td>{b.paid ? 'Paid' : 'Unpaid'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h2 className="print-section-title">Transactions</h2>
            <table>
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>{t.merchant}</td>
                    <td>{t.category}</td>
                    <td>{t.date}</td>
                    <td className={t.type === 'Income' ? 'print-income' : ''}>{t.type === 'Income' ? '+' : '-'}{money(t.amount)}</td>
                    <td>{t.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="print-footer">Generated by Ledgerly — Personal finance, made clear.</p>
          </div>
        </div>
      )}
    </main>
  )
}

function TransactionList({ rows, onDelete, onEdit, onRestore, onPermanentDelete }: { rows: Transaction[]; onDelete?: (id: number) => void; onEdit?: (id: number) => void; onRestore?: (id: number) => void; onPermanentDelete?: (id: number) => void }) {
  return (
    <motion.div className="transactions" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}>
      {rows.map(t => (
        <motion.div className="transaction" key={t.id} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
          <div className={`tx-icon ${t.type === 'Income' ? 'income' : ''}`}>
            {t.type === 'Income' ? <TrendingUp size={17} /> : <Receipt size={17} />}
          </div>
          <div className="tx-info">
            <strong>{t.merchant}</strong>
            <small>{t.category} · {t.date}</small>
          </div>
          <strong className={t.type === 'Income' ? 'amount-income' : ''}>{t.type === 'Income' ? '+' : '-'}{money(t.amount)}</strong>
          {onEdit && <button className="row-action" aria-label="Edit" onClick={() => onEdit(t.id)}><Pencil size={15} /></button>}
          {onDelete && <button className="row-action" aria-label="Delete" onClick={() => onDelete(t.id)}><Trash2 size={15} /></button>}
          {onRestore && <button className="row-action" aria-label="Restore" onClick={() => onRestore(t.id)}><RotateCcw size={15} /></button>}
          {onPermanentDelete && <button className="row-action destructive" aria-label="Permanently delete" onClick={() => onPermanentDelete(t.id)}><Trash2 size={15} /></button>}
        </motion.div>
      ))}
    </motion.div>
  )
}
