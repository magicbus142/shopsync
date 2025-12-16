import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Plus, X, Calendar, Package, Users, Search, Filter, Download, Pencil, Trash2, Eye, IndianRupee, Share2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'
import { useToast } from '../../context/ToastContext'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'
import DateRangePicker from '../../components/ui/DateRangePicker'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import Pagination from '../../components/ui/Pagination'
import PaymentHistory from '../../components/transactions/PaymentHistory'
import AuditHistory from '../../components/common/AuditHistory'

export default function Transactions() {
  const { currentOrg } = useOrganization()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()
  
  const [products, setProducts] = useState([])
  const [workers, setWorkers] = useState([])
  const [editingId, setEditingId] = useState(null)
  
  // Payment History State
  const [paymentHistory, setPaymentHistory] = useState([])
  
  // View Modal State
  const [viewTransaction, setViewTransaction] = useState(null)
  const [viewItems, setViewItems] = useState([])
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' 
  })

  // Filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') 
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMethod, setFilterMethod] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const initialFormState = {
    type: 'income', // 'income' or 'expense'
    category: '', 
    description: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    initialPayment: '', // Paid Now
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    buyerName: '', // For Income
    items: [], // [{ productId, quantity, price }]
  }

  const [formData, setFormData] = useState(initialFormState)
  const [activeTab, setActiveTab] = useState('income') // For Modal Form: 'income' or 'expense'
  
  // Product Cart State
  const [tempItem, setTempItem] = useState({ productId: '', quantity: 1, price: 0 })

  const updateTempItemProduct = (productId) => {
     const p = products.find(x => x.id === productId)
     // Auto-fill price: Selling Price for Income, Buying Price for Expense
     const price = p ? (activeTab === 'income' ? p.price : (p.buying_price || 0)) : 0
     setTempItem(prev => ({ ...prev, productId, price }))
  }

  const handleAddItem = () => {
      if (!tempItem.productId || tempItem.quantity <= 0) return
      
      const p = products.find(x => x.id === tempItem.productId)
      const newItem = {
          productId: tempItem.productId,
          quantity: Number(tempItem.quantity),
          price: Number(tempItem.price),
          name: p ? p.name : 'Unknown Product'
      }

      const updatedItems = [...formData.items, newItem]
      // Auto-calculate total amount
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

      setFormData(prev => ({
          ...prev,
          items: updatedItems,
          amount: newTotal
      }))
      
      // Reset temp item but keep generic defaults
      setTempItem({ productId: '', quantity: 1, price: 0 })
  }

  const handleRemoveItem = (index) => {
      const updatedItems = formData.items.filter((_, i) => i !== index)
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
       setFormData(prev => ({
          ...prev,
          items: updatedItems,
          amount: newTotal
      }))
  }

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
     setCurrentPage(1)
  }, [search, filterType, filterCategory, filterStatus, filterMethod, dateRange])

  useEffect(() => {
    if (currentOrg) {
        fetchTransactions()
        fetchProducts()
        fetchWorkers()
    }
  }, [currentOrg?.id])

  const fetchTransactions = async () => {
    if (!currentOrg) return
    setLoading(true)
    const { data } = await supabase.from('transactions').select('*, transaction_items(*)').eq('organization_id', currentOrg.id).order('created_at', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  const fetchProducts = async () => {
    if (!currentOrg) return
    const { data } = await supabase.from('products').select('*').eq('organization_id', currentOrg.id)
    setProducts(data || [])
  }

  const fetchWorkers = async () => {
    if (!currentOrg) return
    const { data } = await supabase.from('workers').select('*').eq('organization_id', currentOrg.id)
    setWorkers(data || [])
  }
  
  const fetchPaymentHistory = async (transactionId) => {
    const { data } = await supabase
      .from('transaction_payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('date', { ascending: false })
    
    setPaymentHistory(data || [])
  }

  const getProductName = (id) => {
    const p = products.find(item => item.id === id)
    return p ? p.name : 'Unknown Product'
  }

  const getWorkerName = (id) => {
    const w = workers.find(item => item.id === id)
    return w ? w.name : 'Unknown Worker'
  }

  const handleDelete = (id) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Transaction',
        message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
        variant: 'danger',
        onConfirm: async () => {
            const { error } = await supabase.from('transactions').delete().eq('id', id)
            if (error) {
              toast.error("Error deleting transaction")
            } else {
              toast.success("Transaction deleted")
              fetchTransactions()
            }
        }
    })
  }
  
  const handleView = async (t) => {
      setViewTransaction(t)
      const { data: items } = await supabase.from('transaction_items').select('*').eq('transaction_id', t.id)
      setViewItems(items || [])
      fetchPaymentHistory(t.id)
  }

  const handleEdit = (t) => {
    setFormData({
      type: t.type,
      category: t.category,
      description: t.description || '',
      date: t.date,
      amount: t.amount,
      initialPayment: '', // Reset for edit (view history instead)
      paymentMethod: t.payment_method || 'Cash',
      paymentStatus: t.payment_status || 'Paid',
      buyerName: t.party_name || '',
      items: [] // Will fetch items
    })
    
    setEditingId(t.id)
    setActiveTab(t.type)
    
    // Fetch Items
    const loadItems = async () => {
        const { data } = await supabase.from('transaction_items').select('*').eq('transaction_id', t.id)
        if (data && data.length > 0) {
            setFormData(prev => ({
                ...prev,
                items: data.map(i => ({
                    productId: i.product_id,
                    quantity: i.quantity,
                    price: i.price_per_unit || 0
                }))
            }))
        }
    }
    loadItems()
    fetchPaymentHistory(t.id) // For payment history component inside edit modal? Or separate? 
    // We will show Payment History in View Details mostly, but maybe allow adding payments in edit too.
    
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('Please login'); return }

      // Status Logic
      let finalStatus = 'Pending'
      if (editingId) {
          finalStatus = formData.paymentStatus 
      } else {
           const initial = Number(formData.initialPayment) || 0
           const total = Number(formData.amount) || 0
           if (total > 0 && initial >= total) finalStatus = 'Paid'
           else if (initial > 0) finalStatus = 'Partial'
           else finalStatus = 'Pending'
      }

      const payload = {
        organization_id: currentOrg.id,
        user_id: user.id,
        type: activeTab, // Use tab as type
        amount: formData.amount,
        category: formData.category,
        description: formData.description,
        date: formData.date,
        party_name: formData.buyerName, // For Income
        payment_method: formData.paymentMethod,
        payment_status: finalStatus
      }

      if (editingId) {
          // UPDATE
          await supabase.from('transactions').update(payload).eq('id', editingId)
          
          // Re-create items if any
           if (formData.items && formData.items.length > 0) {
              await supabase.from('transaction_items').delete().eq('transaction_id', editingId)
              const itemsPayload = formData.items.map(i => ({
                  transaction_id: editingId,
                  product_id: i.productId,
                  quantity: i.quantity,
                  price_per_unit: i.price,
                  total_price: Number(i.price) * Number(i.quantity)
              }))
              await supabase.from('transaction_items').insert(itemsPayload)
          }

      } else {
          // INSERT
          const { data: newTx, error } = await supabase.from('transactions').insert([payload]).select().single()
          if (error) throw error

          // Add Initial Payment if any
          if (formData.initialPayment && Number(formData.initialPayment) > 0) {
               await supabase.from('transaction_payments').insert([{
                   transaction_id: newTx.id,
                   amount: formData.initialPayment,
                   date: formData.date,
                   payment_method: formData.paymentMethod
               }])
          }

          // Trigger Stock Updates & Items
          if (formData.items && formData.items.length > 0) {
              const itemsPayload = formData.items.map(i => ({
                  transaction_id: newTx.id,
                  product_id: i.productId,
                  quantity: i.quantity,
                  price_per_unit: i.price,
                  total_price: Number(i.price) * Number(i.quantity)
              }))
              await supabase.from('transaction_items').insert(itemsPayload)

              // Stock Updates
              for (const item of formData.items) {
                   const product = products.find(p => p.id === item.productId)
                   if (product) {
                       const newStock = activeTab === 'expense' 
                           ? product.stock + parseInt(item.quantity)
                           : product.stock - parseInt(item.quantity)
                       await supabase.from('products').update({ stock: newStock }).eq('id', item.productId)
                   }
              }
          }
      }

      toast.success("Transaction saved successfully")
      resetForm()
      fetchTransactions()
      fetchProducts()
      
    } catch (error) {
        console.error("Error saving:", error)
        toast.error("Error saving transaction")
    } finally {
        setIsSubmitting(false)
    }
  }

  const resetForm = () => {
     setShowModal(false)
     setEditingId(null)
     setFormData(initialFormState)
     setPaymentHistory([])
  }

  // Helper for Payment History Component
  const handleAddPartialPayment = async (newPay) => {
      try {
          const { error } = await supabase.from('transaction_payments').insert([{
             transaction_id: viewTransaction.id,
             amount: parseFloat(newPay.amount),
             date: newPay.date,
             payment_method: newPay.payment_method
          }])
          if (error) throw error
          toast.success("Payment recorded")
          handleView(viewTransaction) // Refresh
          fetchTransactions() // Refresh main list status
      } catch (e) {
          console.error("Payment Error:", e)
          toast.error(e.message || "Error adding payment")
      }
  }

  const handleRemovePartialPayment = async (ppId) => {
      try {
          await supabase.from('transaction_payments').delete().eq('id', ppId)
          toast.success("Payment removed")
          handleView(viewTransaction)
          fetchTransactions()
      } catch (e) {
           toast.error("Error removing payment")
      }
  }

  // Filter Logic
  const filteredTransactions = transactions.filter(t => {
      // Search
      if (search) {
          const lowerSearch = search.toLowerCase()
          const matches = 
            t.description?.toLowerCase().includes(lowerSearch) ||
            t.category?.toLowerCase().includes(lowerSearch) ||
            t.party_name?.toLowerCase().includes(lowerSearch) ||
            String(t.amount).includes(lowerSearch)
          
          if (!matches) return false
      }

      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterStatus !== 'all' && t.payment_status !== filterStatus) return false
      if (filterMethod !== 'all' && t.payment_method !== filterMethod) return false
      
      // Date Range
      if (dateRange?.from && dateRange?.to) {
          const tDate = parseISO(t.date)
          const start = startOfDay(dateRange.from)
          const end = endOfDay(dateRange.to)
          if (!isWithinInterval(tDate, { start, end })) return false
      }

      return true
  })
  
  // Stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0)
  const totalPending = transactions.reduce((acc, t) => {
       const pending = Math.max(0, Number(t.amount) - (Number(t.amount_paid) || 0))
       return acc + pending
  }, 0)

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  return (
    <div className="space-y-6 relative min-h-[80vh]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-14 md:pr-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">Manage your finances</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => { setEditingId(null); setFormData(initialFormState); setShowModal(true); }} className="hidden md:flex bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium items-center gap-2 hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total Income</p>
          <p className="text-2xl font-bold text-green-500">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-500">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
             <p className="text-sm text-muted-foreground mb-1">Total Pending</p>
             <p className="text-2xl font-bold text-orange-500">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-1">Balance</p>
          <p className="text-2xl font-bold">₹{(totalIncome - totalExpense).toLocaleString()}</p>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          {/* Search */}
          <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Search transactions..." 
                    className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
          </div>

                {/* Filters Container */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Date Inputs */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-2 py-1">
                            <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">Start Date</span>
                            <input 
                                type="date" 
                                className="bg-transparent border-none text-sm focus:ring-0 p-1"
                                value={dateRange.from || ''}
                                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-2 py-1">
                            <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">End Date</span>
                            <input 
                                type="date" 
                                className="bg-transparent border-none text-sm focus:ring-0 p-1"
                                value={dateRange.to || ''}
                                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <select 
                        className="h-10 px-3 py-2 bg-background border border-input rounded-lg text-sm min-w-[120px]"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Partial">Partial</option>
                    </select>

                    {/* Type Filter */}
                    <select 
                        className="h-10 px-3 py-2 bg-background border border-input rounded-lg text-sm min-w-[120px]"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </select>
                </div>
      </div>

      {/* Transactions List (Simplified for brevity, assuming existing list structure with updated badges) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
         <div className="divide-y divide-border">
            {currentItems.map(t => (
                <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 gap-3">
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full mt-1 ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {t.type === 'income' ? <ArrowDownLeft className="w-5 h-5"/> : <ArrowUpRight className="w-5 h-5"/>}
                        </div>
                        <div>
                             <p className="font-semibold text-lg">{t.category}</p>
                             <p className="text-sm text-muted-foreground">{t.description} {t.party_name && `• ${t.party_name}`}</p>
                             <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded border ${t.payment_status === 'Paid' ? 'border-green-200 text-green-700 bg-green-50' : 'border-orange-200 text-orange-700 bg-orange-50'}`}>
                                    {t.payment_status}
                                </span>
                                <span className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd MMM yyyy')}</span>
                             </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                             ₹{Number(t.amount).toLocaleString()}
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                             <button onClick={() => handleView(t)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"><Eye className="w-4 h-4"/></button>
                             <button onClick={() => handleEdit(t)} className="p-1.5 text-zinc-600 bg-zinc-50 rounded hover:bg-zinc-100"><Pencil className="w-4 h-4"/></button>
                             <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>
            ))}
         </div>
         {filteredTransactions.length > itemsPerPage && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
      </div>

       {/* View Details Modal */}
       <AnimatePresence>
        {viewTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/20">
                {/* Modal Header */}
                <div className="p-6 border-b border-border flex justify-between items-start bg-muted/20">
                    <div>
                         <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${viewTransaction.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {viewTransaction.type}
                            </span>
                            <span className="text-sm text-muted-foreground">{format(new Date(viewTransaction.date), 'dd MMMM yyyy')}</span>
                         </div>
                         <h3 className="text-2xl font-bold text-foreground">{viewTransaction.category}</h3>
                         {viewTransaction.description && <p className="text-muted-foreground mt-1">{viewTransaction.description} {viewTransaction.party_name ? `• ${viewTransaction.party_name}` : ''}</p>}
                    </div>
                    <button onClick={() => setViewTransaction(null)} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Main Amount Card */}
                    <div className="bg-card p-6 rounded-2xl border border-border flex justify-between items-center shadow-sm">
                        <div>
                            <p className="text-sm text-muted-foreground font-medium mb-1">Total Transaction Amount</p>
                            <p className="text-4xl font-bold tracking-tight text-foreground">₹{Number(viewTransaction.amount).toLocaleString()}</p>
                        </div>
                        <div className={`p-4 rounded-full ${viewTransaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                            {viewTransaction.type === 'income' ? <ArrowDownLeft className="w-8 h-8"/> : <ArrowUpRight className="w-8 h-8"/>}
                        </div>
                    </div>

                    <PaymentHistory 
                        payments={paymentHistory} 
                        totalAmount={Number(viewTransaction.amount)}
                        onAddPayment={handleAddPartialPayment}
                        onRemovePayment={handleRemovePartialPayment}
                    />

                    {/* Quick Actions */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                const t = viewTransaction
                                const itemsText = viewItems.map(i => `${i.quantity} x ${getProductName(i.product_id)}`).join(', ')
                                const text = `*Invoice Details*\n\nTransaction ID: #${t.id}\nDate: ${format(new Date(t.date), 'dd MMM yyyy')}\nCategory: ${t.category}\n\n*Items:*\n${itemsText || 'N/A'}\n\n*Total Amount:* ₹${Number(t.amount).toLocaleString()}\n*Status:* ${t.payment_status}\n\nThank you for your business!`
                                const url = `https://wa.me/?text=${encodeURIComponent(text)}`
                                window.open(url, '_blank')
                            }}
                            className="flex-1 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
                        >
                            <Share2 className="w-5 h-5" /> Share Invoice on WhatsApp
                        </button>
                    </div>

                    <AuditHistory tableName="transactions" recordId={viewTransaction.id} />
                </div>
             </motion.div>
          </div>
        )}
       </AnimatePresence>

      {/* Add/Edit Modal (With Tabs) */}
      <AnimatePresence>
         {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                  <div className="flex border-b border-border">
                      <button 
                        onClick={() => { setActiveTab('income'); setFormData({...formData, type: 'income'}) }}
                        className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'income' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'hover:bg-muted text-muted-foreground'}`}
                      >
                          Income
                      </button>
                      <button 
                        onClick={() => { setActiveTab('expense'); setFormData({...formData, type: 'expense'}) }}
                        className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'expense' ? 'bg-red-50 text-red-700 border-b-2 border-red-500' : 'hover:bg-muted text-muted-foreground'}`}
                      >
                          Expense
                      </button>
                      <button onClick={resetForm} className="px-4 hover:bg-red-100 text-muted-foreground hover:text-red-500"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                      {/* Common Fields */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-sm font-medium">Date</label>
                             <input type="date" required className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <label className="text-sm font-medium">Category</label>
                             <select className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                 <option value="">Select...</option>
                                 {activeTab === 'income' ? (
                                    <>
                                        <option value="Sales">Sales Product</option>
                                        <option value="Services">Services</option>
                                        <option value="Other">Other Income</option>
                                    </>
                                 ) : (
                                    <>
                                        <option value="Inventory Purchase">Inventory Purchase</option>
                                        <option value="Salary Payment">Salary Payment</option>
                                        <option value="Rent">Rent</option>
                                        <option value="Utilities">Utilities</option>
                                        <option value="Other">Other Expense</option>
                                    </>
                                 )}
                             </select>
                          </div>
                      </div>
                    
                    {/* Dynamic Fields based on Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{activeTab === 'income' ? 'Buyer Name' : 'Payee / Description'}</label>
                        <input className="w-full px-3 py-2 border border-input rounded-lg bg-background" placeholder={activeTab === 'income' ? "e.g. John Doe" : "e.g. Office Rent"} value={activeTab === 'income' ? formData.buyerName : formData.description} onChange={e => activeTab === 'income' ? setFormData({...formData, buyerName: e.target.value}) : setFormData({...formData, description: e.target.value})} />
                    </div>

                    {/* Product Cart Section */}
                    {((activeTab === 'income' && formData.category === 'Sales') || (activeTab === 'expense' && formData.category === 'Inventory Purchase')) && (
                        <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-border space-y-4">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                                <Package className="w-4 h-4 text-primary" /> 
                                {activeTab === 'income' ? 'Select Products to Sell' : 'Select Inventory to Buy'}
                            </h5>
                            
                            {/* Adder Row */}
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Product</label>
                                    <select 
                                        className="w-full px-2 py-2 text-sm border border-input rounded-lg bg-background"
                                        value={tempItem.productId}
                                        onChange={(e) => updateTempItemProduct(e.target.value)}
                                    >
                                        <option value="">Select Product...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (Stock: {p.stock})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-20 space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Qty</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-2 py-2 text-sm border border-input rounded-lg bg-background"
                                        value={tempItem.quantity}
                                        onChange={e => setTempItem({...tempItem, quantity: e.target.value})}
                                        min="1"
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Price/Unit</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-2 py-2 text-sm border border-input rounded-lg bg-background"
                                        value={tempItem.price}
                                        onChange={e => setTempItem({...tempItem, price: e.target.value})}
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleAddItem}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-lg"
                                    title="Add to List"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Items List Table */}
                            {formData.items.length > 0 && (
                                <div className="overflow-hidden rounded-lg border border-border bg-background">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-medium">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Product</th>
                                                <th className="px-3 py-2 text-center">Qty</th>
                                                <th className="px-3 py-2 text-right">Total</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {formData.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2">{products.find(p=>p.id===item.productId)?.name || 'Unknown'}</td>
                                                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-right">₹{(item.price * item.quantity).toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveItem(idx)}
                                                            className="text-red-500 hover:bg-red-50 rounded p-1"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                         <label className="text-sm font-medium flex justify-between">
                            Total Amount (₹)
                            {formData.items.length > 0 && <span className="text-xs text-muted-foreground font-normal">(Auto-calculated)</span>}
                         </label>
                         <input 
                            type="number" 
                            required 
                            className={`w-full px-3 py-2 border border-input rounded-lg bg-background font-bold text-lg ${formData.items.length > 0 ? 'bg-muted text-muted-foreground' : ''}`}
                            value={formData.amount} 
                            onChange={e => {
                                // Only allow manual edit if no items are added
                                if (formData.items.length === 0) {
                                    setFormData({...formData, amount: e.target.value})
                                }
                            }}
                            readOnly={formData.items.length > 0}
                         />
                    </div>

                    {!editingId && (
                        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Paid Now (₹)</label>
                                <input type="number" className="w-full px-3 py-2 border border-input rounded-lg bg-background" placeholder="Initial Payment" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Method</label>
                                <select className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                                    <option>Cash</option>
                                    <option>UPI</option>
                                </select>
                            </div>
                        </div>
                    )}
                    
                    <button type="submit" className={`w-full py-3 rounded-lg font-bold text-white shadow-lg ${activeTab === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        {editingId ? 'Save Changes' : `Record ${activeTab === 'income' ? 'Income' : 'Expense'}`}
                    </button>
                  </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  )
}
