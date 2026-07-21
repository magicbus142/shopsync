import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Plus, X, Calendar, Package, Users, Search, Filter, Download, Pencil, Trash2, Eye, IndianRupee, Share2, Edit2 } from 'lucide-react'
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

  const isCartMode = (activeTab === 'income' && formData.category === 'Sales') || 
                     (activeTab === 'expense' && formData.category === 'Inventory Purchase');

  useEffect(() => {
    if (isCartMode) {
      const itemsTotal = (formData.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tempTotal = tempItem.productId 
        ? (Number(tempItem.quantity || 0) * Number(tempItem.price || 0)) 
        : 0;
      
      setFormData(prev => ({
        ...prev,
        amount: itemsTotal + tempTotal
      }));
    }
  }, [formData.items, tempItem.productId, tempItem.quantity, tempItem.price, isCartMode]);

  const updateTempItemProduct = (productId) => {
     const p = products.find(x => x.id === productId)
     // Auto-fill price: Selling Price for Income, Buying Price for Expense
     const price = p ? (activeTab === 'income' ? p.price : (p.buying_price || 0)) : 0
     setTempItem(prev => ({ ...prev, productId, price }))
  }

  useEffect(() => {
    if (tempItem.productId) {
      const p = products.find(x => x.id === tempItem.productId)
      const price = p ? (activeTab === 'income' ? p.price : (p.buying_price || 0)) : 0
      setTempItem(prev => ({ ...prev, price }))
    }
  }, [activeTab, tempItem.productId, products]);

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
    try {
      const { data: prods, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', currentOrg.id)
        
      if (error) throw error

      const { data: incomeTxs } = await supabase
        .from('transactions')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .ilike('type', 'income')

      const txIds = (incomeTxs || []).map(t => t.id)
      let soldMap = {}

      if (txIds.length > 0) {
        const { data: items } = await supabase
          .from('transaction_items')
          .select('product_id, quantity')
          .in('transaction_id', txIds)

        if (items) {
          items.forEach(item => {
            if (item.product_id) {
              soldMap[item.product_id] = (soldMap[item.product_id] || 0) + Number(item.quantity || 0)
            }
          })
        }
      }

      const updatedProducts = await Promise.all((prods || []).map(async (prod) => {
        const soldQty = soldMap[prod.id] || 0
        const initStock = prod.initial_stock !== null && prod.initial_stock !== undefined ? Number(prod.initial_stock) : (Number(prod.stock) + soldQty)
        const expectedStock = Math.max(0, initStock - soldQty)

        if (prod.stock !== expectedStock || prod.initial_stock === null || prod.initial_stock === undefined) {
          await supabase
            .from('products')
            .update({ stock: expectedStock, initial_stock: initStock })
            .eq('id', prod.id)

          return { ...prod, stock: expectedStock, initial_stock: initStock }
        }
        return prod
      }))

      setProducts(updatedProducts)
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const fetchWorkers = async () => {
    if (!currentOrg) return
    const { data } = await supabase.from('workers').select('*').eq('organization_id', currentOrg.id)
    setWorkers(data || [])
  }

  // Helper to recalculate and update transaction status
  const updateTransactionStatus = async (transactionId) => {
      // 1. Fetch Transaction Amount
      const { data: tx } = await supabase.from('transactions').select('amount').eq('id', transactionId).single()
      if (!tx) return

      // 2. Fetch All Payments
      const { data: payments } = await supabase.from('transaction_payments').select('amount').eq('transaction_id', transactionId)
      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

      // 3. Determine Status
      let status = 'Pending'
      if (totalPaid >= tx.amount) status = 'Paid'
      else if (totalPaid > 0) status = 'Partial'

      // 4. Update Transaction allow partial updates
      await supabase.from('transactions').update({ 
          amount_paid: totalPaid,
          payment_status: status 
      }).eq('id', transactionId)
  }
  
  const fetchPaymentHistory = async (transactionId) => {
    const { data } = await supabase
      .from('transaction_payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('date', { ascending: false })
    
    setPaymentHistory(data || [])
  }

  const handleAddPaymentEdit = async (newPayment) => {
    try {
      const { error } = await supabase.from('transaction_payments').insert([{
        transaction_id: editingId,
        amount: parseFloat(newPayment.amount),
        date: newPayment.date,
        payment_method: newPayment.payment_method
      }]);
      if (error) throw error;
      toast.success("Payment recorded successfully");
      fetchPaymentHistory(editingId);
      fetchTransactions();
    } catch (err) {
      console.error("Error adding payment:", err);
      toast.error("Failed to add payment: " + err.message);
    }
  }

  const handleRemovePaymentEdit = async (paymentId) => {
    try {
      const { error } = await supabase
        .from('transaction_payments')
        .delete()
        .eq('id', paymentId);
      if (error) throw error;
      toast.success("Payment removed successfully");
      fetchPaymentHistory(editingId);
      fetchTransactions();
    } catch (err) {
      console.error("Error removing payment:", err);
      toast.error("Failed to remove payment: " + err.message);
    }
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

          // Recalculate status based on new amount
          await updateTransactionStatus(editingId)

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

          // Insert items
          if (formData.items && formData.items.length > 0) {
              const itemsPayload = formData.items.map(i => ({
                  transaction_id: newTx.id,
                  product_id: i.productId,
                  quantity: i.quantity,
                  price_per_unit: i.price,
                  total_price: Number(i.price) * Number(i.quantity)
              }))
              await supabase.from('transaction_items').insert(itemsPayload)
          }
      }

      toast.success("Transaction saved successfully")
      resetForm()
      fetchTransactions()
      fetchProducts()
      
    } catch (error) {
        console.error("Error saving:", error)
        toast.error("Error saving transaction: " + (error.message || error))
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
          
          await updateTransactionStatus(viewTransaction.id) // Recalculate status

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
          
          await updateTransactionStatus(viewTransaction.id) // Recalculate status

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
      if (filterStatus !== 'all') {
          if (filterStatus === 'Unpaid') {
              if (t.payment_status === 'Paid') return false
          } else {
              if (t.payment_status !== filterStatus) return false
          }
      }
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Transactions</h2>
          <p className="text-muted-foreground">Monitor and manage your financial records.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => { 
                    setEditingId(null); 
                    setFormData({...initialFormState, type: 'income'}); 
                    setActiveTab('income'); 
                    setShowModal(true); 
                }} 
                className="hidden md:flex bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
            >
              <ArrowDownLeft className="w-5 h-5" /> Record Sale
            </button>
            <button 
                onClick={() => { 
                    setEditingId(null); 
                    setFormData({...initialFormState, type: 'expense'}); 
                    setActiveTab('expense'); 
                    setShowModal(true); 
                }} 
                className="hidden md:flex bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            >
              <ArrowUpRight className="w-5 h-5" /> New Expense
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[
            { label: 'Total Income', amount: totalIncome, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
            { label: 'Total Expenses', amount: totalExpense, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/10' },
            { label: 'Pending', amount: totalPending, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10' },
            { label: 'Net Balance', amount: totalIncome - totalExpense, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
         ].map((stat, i) => (
             <div key={i} className={`p-5 rounded-2xl border border-border ${stat.bg}`}>
                 <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                 <p className={`text-2xl font-bold ${stat.color}`}>₹{stat.amount.toLocaleString()}</p>
             </div>
         ))}
      </div>

      {/* Search & Filters Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          {/* Search */}
          <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Search transactions..." 
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
          </div>

                {/* Filters Container */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Date Inputs */}
                    <div className="flex items-center gap-2 bg-background border border-input rounded-xl px-3 py-1.5 shadow-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-xs focus:ring-0 p-0 text-foreground w-auto"
                            value={dateRange.from || ''}
                            onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                        />
                        <span className="text-muted-foreground">-</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-xs focus:ring-0 p-0 text-foreground w-auto"
                            value={dateRange.to || ''}
                            onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                        />
                    </div>

                    {/* Status Filter */}
                    <select 
                        className="h-10 px-3 py-2 bg-background border border-input rounded-xl text-sm min-w-[120px] shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid (Pending & Partial)</option>
                    </select>

                    {/* Type Filter */}
                    <select 
                        className="h-10 px-3 py-2 bg-background border border-input rounded-xl text-sm min-w-[120px] shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </select>
                </div>
      </div>

      {/* Transactions List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
         {/* Table Header */}
         <div className="hidden md:flex flex-row gap-4 p-4 border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
             <div className="w-[32%] pl-14">Origin / Description</div>
             <div className="w-[18%] pl-2">Category</div>
             <div className="w-[18%]">Status</div>
             <div className="w-[20%] text-right pr-8">Amount</div>
             <div className="w-[12%] text-center">Action</div>
         </div>
         <div className="divide-y divide-border">
              {currentItems.length > 0 ? currentItems.map((transaction) => {
                  const isPositive = transaction.type === 'income'
                  const pendingAmount = Number(transaction.amount) - (Number(transaction.amount_paid) || 0)
                  
                  return (
                  <div 
                    key={transaction.id} 
                    className="p-4 hover:bg-muted/50 transition-colors flex flex-col md:flex-row items-center gap-4 group cursor-pointer border-[0.5px] border-border md:border-none rounded-xl md:rounded-none mb-3 md:mb-0 shadow-sm md:shadow-none bg-card md:bg-transparent"
                    onClick={() => handleView(transaction)}
                  >
                  {/* Icon & Description */}
                  <div className="flex items-start gap-4 w-full md:w-[32%]">
                      <div className={`w-12 h-12 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {isPositive ? <ArrowDownLeft className="w-6 h-6 md:w-5 md:h-5"/> : <ArrowUpRight className="w-6 h-6 md:w-5 md:h-5"/>}
                      </div>
                      <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate break-words line-clamp-1" title={transaction.party_name || transaction.description || 'Untitled Transaction'}>
                            {transaction.party_name || transaction.description || 'Untitled Transaction'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(transaction.date), 'yyyy-MM-dd')}</p>
                          {/* Mobile Only Extras */}
                          <div className="md:hidden flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-muted/50 text-muted-foreground rounded text-[10px] font-bold uppercase border border-border/50">
                                {transaction.category}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${transaction.payment_status?.toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : transaction.payment_status?.toLowerCase() === 'pending' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                {transaction.payment_status}
                            </span>
                          </div>
                      </div>
                  </div>

                   {/* Category Pill (Desktop) */}
                   <div className="hidden md:block w-full md:w-[18%] pl-2">
                        <span className="px-3 py-1 bg-muted/50 text-muted-foreground rounded-lg text-[10px] font-bold uppercase tracking-wider border border-border/50">
                            {transaction.category}
                        </span>
                   </div>

                  {/* Status with Dot (Desktop) */}
                  <div className="hidden md:flex w-full md:w-[18%] items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${transaction.payment_status?.toLowerCase() === 'paid' ? 'bg-emerald-500' : transaction.payment_status?.toLowerCase() === 'pending' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                       <span className={`text-xs font-bold uppercase ${transaction.payment_status?.toLowerCase() === 'paid' ? 'text-emerald-600' : transaction.payment_status?.toLowerCase() === 'pending' ? 'text-rose-600' : 'text-amber-600'}`}>
                           {transaction.payment_status}
                       </span>
                  </div>

                  {/* Amount */}
                  <div className="w-full md:w-[20%] flex flex-row md:flex-col justify-between items-center md:items-end md:text-right pr-0 md:pr-8 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-none border-border/50">
                       <span className="text-sm font-medium text-muted-foreground md:hidden">Amount</span>
                       <div className='text-right'>
                            <p className={`font-bold text-lg md:text-base ${isPositive ? 'text-emerald-600' : 'text-foreground'}`}>
                                {isPositive ? '+' : '-'} ₹{Number(transaction.amount).toLocaleString()}
                            </p>
                            {transaction.payment_status?.toLowerCase() === 'partial' && pendingAmount > 0 && (
                                <p className="text-[10px] font-bold text-amber-600 uppercase">Due: ₹{pendingAmount.toLocaleString()}</p>
                            )}
                       </div>
                  </div>
                  
                  {/* Actions (Desktop hover / Mobile context maybe?) */}
                  {/* Actions (Desktop hover / Mobile context maybe?) */}
                  <div className="flex w-full md:w-[12%] justify-end md:justify-center gap-2 md:gap-1 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-none border-border/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleView(transaction)} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-4 h-4"/>
                      </button>
                      <button onClick={() => handleEdit(transaction)} className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4"/>
                      </button>
                      <button onClick={() => handleDelete(transaction.id)} className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4"/>
                      </button>
                  </div>
                </div>
              )}) : (
                <div className="p-12 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No transactions found matching your criteria.</p>
                </div>
            )}
         </div>
         {filteredTransactions.length > itemsPerPage && <div className="border-t border-border p-4 bg-muted/50"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
      </div>

      {/* Mobile FAB */}
      <div className="md:hidden fixed bottom-24 right-4 z-40 flex flex-col gap-3">
          {/* <button 
                onClick={() => { 
                    setEditingId(null); 
                    setFormData({...initialFormState, type: 'expense'}); 
                    setActiveTab('expense'); 
                    setShowModal(true); 
                }} 
                className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg shadow-slate-900/40 flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all"
                title="Add Expense"
            >
              <ArrowUpRight className="w-6 h-6" />
          </button> */}
          <button 
                onClick={() => { 
                    setEditingId(null); 
                    setFormData({...initialFormState, type: 'income'}); 
                    setActiveTab('income'); 
                    setShowModal(true); 
                }} 
                className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/40 flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all"
                title="Record Sale"
            >
              <Plus className="w-8 h-8" />
          </button>
      </div>

       {/* View Details Modal - Digital Receipt Style */}
       <AnimatePresence>
        {viewTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewTransaction(null)}>
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-border/50"
                onClick={e => e.stopPropagation()}
             >
                    {/* Colored Header based on type */}
                    <div className={`p-6 md:p-8 flex-shrink-0 ${viewTransaction.type === 'income' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-pink-600'}`}>
                        <div className="flex justify-between items-start">
                             <div>
                                <div className="flex items-center gap-2 mb-2 text-white/80 font-semibold">
                                    {viewTransaction.type === 'income' ? <ArrowDownLeft className="w-5 h-5 text-white" /> : <ArrowUpRight className="w-5 h-5 text-white" />}
                                    <span className="text-sm uppercase tracking-widest font-bold">{viewTransaction.type === 'income' ? 'Sales / Income' : 'Expense'}</span>
                                </div>
                                <h2 className="text-5xl font-black tracking-tight text-white mb-3">₹{Number(viewTransaction.amount).toLocaleString()}</h2>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm border ${
                                        viewTransaction.payment_status?.toLowerCase() === 'paid' 
                                          ? 'bg-white/20 text-white border-white/30' 
                                          : viewTransaction.payment_status?.toLowerCase() === 'pending' 
                                          ? 'bg-red-900/40 text-red-100 border-red-300/30' 
                                          : 'bg-amber-400/30 text-amber-100 border-amber-300/40'
                                    }`}>
                                        {viewTransaction.payment_status}
                                    </span>
                                    <span className="text-sm text-white/80 font-medium">{format(new Date(viewTransaction.date), 'dd MMMM yyyy')}</span>
                                </div>
                             </div>

                             <div className="flex flex-col items-end gap-2">
                                <button onClick={() => setViewTransaction(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                                    <X className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        const t = viewTransaction
                                        const text = `*Invoice Spec*\n\nTransaction: #${t.id}\nAmount: ₹${Number(t.amount).toLocaleString()}\nStatus: ${t.payment_status}\nVerified by ShopSync`
                                        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
                                        window.open(url, '_blank')
                                    }}
                                    className="hidden md:flex bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 px-4 py-2 rounded-lg text-sm font-bold items-center gap-2 transition-colors"
                                >
                                    <Share2 className="w-4 h-4" /> Share Receipt
                                </button>
                             </div>
                        </div>
                    </div>

                     {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 space-y-6 custom-scrollbar">
                        
                        {/* Items Section - Hide for Salary/Wages */}
                        {!['Salary', 'Wages'].includes(viewTransaction.category) && (
                            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                                <div className={`px-4 py-3 flex items-center gap-2 ${viewTransaction.type === 'income' ? 'bg-emerald-500/10 border-b border-emerald-500/20' : 'bg-rose-500/10 border-b border-rose-500/20'}`}>
                                    <div className={`w-2 h-2 rounded-full ${viewTransaction.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <h4 className={`text-xs font-bold uppercase tracking-widest ${viewTransaction.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>Items Purchased</h4>
                                </div>
                                <div className="bg-card p-4 space-y-3">
                                    {viewItems.length > 0 ? (
                                        viewItems.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm border-b border-dashed border-border/60 last:border-0 pb-2 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold ${viewTransaction.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.quantity}x</span> 
                                                    <span className="font-medium text-foreground">{getProductName(item.product_id)}</span>
                                                </div>
                                                <span className="font-bold">₹{item.total_price.toLocaleString()}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-muted-foreground text-xs italic">No items linked</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment History (Includes Summary) */}
                        <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                             <div className={`px-4 py-3 flex items-center gap-2 ${viewTransaction.type === 'income' ? 'bg-emerald-500/10 border-b border-emerald-500/20' : 'bg-rose-500/10 border-b border-rose-500/20'}`}>
                                <div className={`w-2 h-2 rounded-full ${viewTransaction.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <h4 className={`text-xs font-bold uppercase tracking-widest ${viewTransaction.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>Payment History</h4>
                            </div>
                            <div className="p-6">
                                <PaymentHistory 
                                    payments={paymentHistory} 
                                    totalAmount={Number(viewTransaction.amount)}
                                    readOnly={true}
                                />
                            </div>
                        </div>

                        {/* Bottom Info */}
                        <div className="grid grid-cols-2 gap-4">
                             <div className={`p-4 rounded-2xl border ${viewTransaction.type === 'income' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/30' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800/30'}`}>
                                  <p className="text-xs text-muted-foreground font-medium mb-1">Payment Method</p>
                                  <p className="font-bold text-foreground">{viewTransaction.payment_method || 'Cash'}</p>
                             </div>
                             <div className={`p-4 rounded-2xl border ${viewTransaction.type === 'income' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/30' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800/30'}`}>
                                  <p className="text-xs text-muted-foreground font-medium mb-1">{viewTransaction.type === 'income' ? 'Received From' : 'Paid To'}</p>
                                  <p className="font-bold text-foreground">{viewTransaction.party_name || viewTransaction.description || 'N/A'}</p>
                             </div>
                        </div>
                        
                    </div>
             </motion.div>
          </div>
        )}
       </AnimatePresence>

      {/* Add/Edit Modal (With Tabs) */}
      <AnimatePresence>
         {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
               <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                   animate={{ opacity: 1, scale: 1, y: 0 }} 
                   exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                   className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-border flex flex-col"
                   onClick={e => e.stopPropagation()}
                >
                  <div className="flex border-b border-border bg-muted/20 shrink-0">
                      <button 
                        onClick={() => { setActiveTab('income'); setFormData({...formData, type: 'income'}) }}
                        className={`flex-1 py-4 text-center font-bold tracking-tight transition-all relative overflow-hidden ${activeTab === 'income' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                          Income 
                          {activeTab === 'income' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />}
                      </button>
                      <button 
                        onClick={() => { setActiveTab('expense'); setFormData({...formData, type: 'expense'}) }}
                        className={`flex-1 py-4 text-center font-bold tracking-tight transition-all relative overflow-hidden ${activeTab === 'expense' ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                          Expense
                          {activeTab === 'expense' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />}
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                      <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Head Fields */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                                  <input type="date" required className="w-full px-4 py-2.5 border border-input rounded-xl bg-background hover:bg-accent/5 focus:ring-2 focus:ring-primary/20 outline-none transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                                  <select className="w-full px-4 py-2.5 border border-input rounded-xl bg-background hover:bg-accent/5 focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                      <option value="">Select Category...</option>
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

                           <div className="space-y-2">
                               <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{activeTab === 'income' ? 'Pary / Buyer Name' : 'Payee / Description'}</label>
                               <input 
                                    className="w-full px-4 py-3 border border-input rounded-xl bg-background hover:bg-accent/5 focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                                    placeholder={activeTab === 'income' ? "e.g. Ram Kumar" : "e.g. Shop Rent for Oct"} 
                                    value={activeTab === 'income' ? formData.buyerName : formData.description} 
                                    onChange={e => activeTab === 'income' ? setFormData({...formData, buyerName: e.target.value}) : setFormData({...formData, description: e.target.value})} 
                                />
                           </div>

                             {/* Product Cart Section */}
                         {((activeTab === 'income' && formData.category === 'Sales') || (activeTab === 'expense' && formData.category === 'Inventory Purchase')) && (
                             <div className="bg-muted/40 p-5 rounded-2xl border border-dashed border-border/70 space-y-5">
                                 <h5 className="font-bold text-sm flex items-center gap-2 text-foreground">
                                     <Package className="w-4 h-4 text-primary" /> 
                                     {activeTab === 'income' ? 'Add Products to Order' : 'Add Inventory Items'}
                                 </h5>
                                 
                                 {/* Adder Row */}
                                 <div className="flex flex-col md:flex-row gap-3 items-end">
                                     <div className="w-full space-y-1.5">
                                         <label className="text-xs font-medium text-muted-foreground">Product</label>
                                         <select 
                                             className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-1 focus:ring-primary"
                                             value={tempItem.productId}
                                             onChange={(e) => updateTempItemProduct(e.target.value)}
                                         >
                                             <option value="">Select Product...</option>
                                             {products.map(p => (
                                                 <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                                             ))}
                                         </select>
                                     </div>
                                     <div className="flex gap-3 w-full md:w-auto">
                                         <div className="w-20 space-y-1.5 shrink-0">
                                             <label className="text-xs font-medium text-muted-foreground">Qty</label>
                                             <input type="number" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background" value={tempItem.quantity} onChange={e => setTempItem({...tempItem, quantity: e.target.value})} min="1" />
                                         </div>
                                         <div className="w-24 space-y-1.5 shrink-0">
                                             <label className="text-xs font-medium text-muted-foreground">Price</label>
                                             <input type="number" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background" value={tempItem.price} onChange={e => setTempItem({...tempItem, price: e.target.value})} />
                                         </div>
                                         <button type="button" onClick={handleAddItem} className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 h-[38px] w-[38px] flex items-center justify-center rounded-lg shadow-sm mt-auto"><Plus className="w-5 h-5" /></button>
                                     </div>
                                 </div>

                                 {/* Items List Table */}
                                 {formData.items.length > 0 && (
                                     <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                                         <table className="w-full text-sm">
                                             <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                                                 <tr>
                                                     <th className="px-4 py-2 text-left">Product</th>
                                                     <th className="px-4 py-2 text-center">Qty</th>
                                                     <th className="px-4 py-2 text-right">Total</th>
                                                     <th className="w-8"></th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-border">
                                                 {formData.items.map((item, idx) => (
                                                     <tr key={idx} className="group hover:bg-muted/20">
                                                         <td className="px-4 py-2 font-medium">{products.find(p=>p.id===item.productId)?.name || 'Unknown'}</td>
                                                         <td className="px-4 py-2 text-center text-muted-foreground">{item.quantity}</td>
                                                         <td className="px-4 py-2 text-right font-medium">₹{(item.price * item.quantity).toLocaleString()}</td>
                                                         <td className="px-4 py-2 text-center">
                                                             <button type="button" onClick={() => handleRemoveItem(idx)} className="text-muted-foreground hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                                                         </td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>
                                     </div>
                                 )}
                             </div>
                         )}
                           
                           {/* Amount and Payment */}
                          <div className="bg-muted/20 p-6 rounded-2xl border border-border">
                               <div className="space-y-4">
                                   <div className="flex flex-col space-y-2">
                                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Amount</label>
                                      <div className="relative">
                                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                          <input 
                                                type="number" 
                                                required 
                                                className={`w-full pl-8 pr-4 py-3 border border-input rounded-xl bg-background font-bold text-xl outline-none hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary ${isCartMode ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : ''}`}
                                                value={formData.amount} 
                                                onChange={e => { if (!isCartMode) setFormData({...formData, amount: e.target.value}) }}
                                                readOnly={isCartMode}
                                                placeholder="0.00"
                                            />
                                      </div>
                                   </div>

                                   {!editingId && (
                                       <div className="grid grid-cols-2 gap-4">
                                           <div className="space-y-2">
                                               <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Paid Now</label>
                                               <input type="number" className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm" placeholder="₹ Amount Paid" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                                           </div>
                                            <div className="space-y-2">
                                               <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Method</label>
                                               <select className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm cursor-pointer" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                                                    <option>Cash</option>
                                                    <option>UPI</option>
                                                    <option>Bank Transfer</option>
                                               </select>
                                           </div>
                                       </div>
                                   )}

                                    {editingId && (
                                       <div className="space-y-4 pt-4 border-t border-border mt-4">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Payment History</label>
                                            <PaymentHistory 
                                                payments={paymentHistory} 
                                                totalAmount={Number(formData.amount || 0)}
                                                onAddPayment={handleAddPaymentEdit}
                                                onRemovePayment={handleRemovePaymentEdit}
                                                readOnly={false}
                                            />
                                       </div>
                                    )}
                               </div>
                          </div>
                      </form>
                  </div>

                  {/* Modal Footer (Sticky) */}
                  <div className="p-4 border-t border-border bg-background shrink-0 flex justify-end gap-3">
                      <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                      <button 
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${activeTab === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'}`}
                      >
                          {isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Confirm Transaction'}
                      </button>
                  </div>

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
