import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Plus, X, Calendar, Package, Users, Search, Filter, Download, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'
import DateRangePicker from '../../components/ui/DateRangePicker'
import ConfirmationModal from '../../components/ui/ConfirmationModal'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const [products, setProducts] = useState([])
  const [workers, setWorkers] = useState([])
  const [editingId, setEditingId] = useState(null)
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: () => {},
    variant: 'danger' 
  })

  // Filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // all, income, expense
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMethod, setFilterMethod] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    productId: '',
    workerId: '',
    quantity: '',
    paymentMethod: 'Cash',
    paymentStatus: 'Paid'
  })

  useEffect(() => {
    fetchTransactions()
    fetchProducts()
    fetchWorkers()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*')
    setProducts(data || [])
  }

  const fetchWorkers = async () => {
    const { data } = await supabase.from('workers').select('*')
    setWorkers(data || [])
  }

  // HELPER HELPERS
  const getProductName = (id) => {
    const p = products.find(item => item.id === id)
    return p ? p.name : 'Unknown Product'
  }

  const getWorkerName = (id) => {
    const w = workers.find(item => item.id === id)
    return w ? w.name : 'Unknown Worker'
  }

  const handleExport = () => {
     // Prepare data for export
     const exportData = transactions.map(t => ({
        Date: t.date,
        Type: t.type,
        Category: t.category,
        Amount: t.amount,
        Description: t.description,
        Product: t.product_id ? getProductName(t.product_id) : '-',
        Worker: t.worker_id ? getWorkerName(t.worker_id) : '-',
        Quantity: t.quantity || '-'
     }))

     const ws = XLSX.utils.json_to_sheet(exportData);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Transactions");
     XLSX.writeFile(wb, "lekka-transactions.xlsx");
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
              toast.error('Error deleting transaction: ' + error.message)
              console.error(error)
            } else {
              toast.success('Transaction deleted')
              fetchTransactions()
            }
        }
    })
  }

  const handleEdit = (t) => {
    setFormData({
      type: t.type,
      amount: t.amount,
      category: t.category,
      description: t.description || '',
      date: t.date,
      productId: t.product_id || '',
      workerId: t.worker_id || '',
      quantity: t.quantity || '',
      paymentMethod: t.payment_method || 'Cash',
      paymentStatus: t.payment_status || 'Paid'
    })
    setEditingId(t.id)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    // Get User ID
    let userId = null
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
    else {
       const local = localStorage.getItem('user')
       if (local) userId = JSON.parse(local).id
    }

    if (!userId) {
       alert('Please login to add transactions')
       setIsSubmitting(false)
       return
    }

    // 1. Prepare Transaction Data
    const payload = {
      user_id: userId,
      type: formData.type,
      amount: formData.amount,
      category: formData.category,
      description: formData.description,
      date: formData.date,
      product_id: formData.category === 'Inventory' || formData.category === 'Sales' ? (formData.productId || null) : null,
      worker_id: formData.category === 'Salary' ? (formData.workerId || null) : null,
      quantity: formData.quantity || null,
      payment_method: formData.paymentMethod,
      payment_status: formData.paymentStatus
    }

    if (editingId) {
       setConfirmModal({
           isOpen: true,
           title: 'Save Changes',
           message: 'Are you sure you want to update this transaction?',
           variant: 'primary',
           onConfirm: async () => {
                const { error } = await supabase
                    .from('transactions')
                    .update(payload)
                    .eq('id', editingId)

                if (error) {
                    toast.error('Error updating transaction: ' + error.message)
                    setIsSubmitting(false)
                    return
                }

                resetForm()
                fetchTransactions()
                fetchProducts() 
                setIsSubmitting(false)
           },
           onCancel: () => setIsSubmitting(false) 
       })
       return
    } else {
        const { error } = await supabase.from('transactions').insert([payload])

        if (error) {
          toast.error('Error adding transaction: ' + error.message)
          setIsSubmitting(false)
          return
        }
    }

    // 2. Auto-Update Stock Logic
    if (!editingId && payload.product_id && payload.quantity) {
       const product = products.find(p => p.id === payload.product_id)
       if (product) {
          const newStock = formData.type === 'expense' 
             ? product.stock + parseInt(payload.quantity) // Buying Inventory -> Increase Stock
             : product.stock - parseInt(payload.quantity) // Selling Inventory -> Decrease Stock
          
          await supabase.from('products').update({ stock: newStock }).eq('id', payload.product_id)
       }
    }

    resetForm()
    fetchTransactions()
    fetchProducts() 
    setIsSubmitting(false)
  }

  const resetForm = () => {
     setShowModal(false)
     setEditingId(null)
     setFormData({
       type: 'income',
       amount: '',
       category: '',
       description: '',
       date: new Date().toISOString().split('T')[0],
       productId: '',
       workerId: '',
       quantity: '',
       paymentMethod: 'Cash',
       paymentStatus: 'Paid'
     })
  }

  // FILTER LOGIC
  const filteredTransactions = transactions.filter(t => {
     // 1. Search (Description, Category, Product Name, Worker Name)
     const searchContent = `
        ${t.description || ''} 
        ${t.category} 
        ${t.product_id ? getProductName(t.product_id) : ''} 
        ${t.worker_id ? getWorkerName(t.worker_id) : ''}
     `.toLowerCase()
     
     if (search && !searchContent.includes(search.toLowerCase())) return false

     // 2. Filter Type
     if (filterType !== 'all' && t.type !== filterType) return false

     // 3. Filter Category
     if (filterCategory !== 'all' && t.category !== filterCategory) return false

     // 4. Filter Status
     if (filterStatus !== 'all' && t.payment_status !== filterStatus) return false

     // 5. Filter Method
     if (filterMethod !== 'all' && t.payment_method !== filterMethod) return false

     // 6. Date Range
     if (dateRange.from && dateRange.to) {
        const tDate = parseISO(t.date)
        const start = startOfDay(parseISO(dateRange.from))
        const end = endOfDay(parseISO(dateRange.to))
        if(!isWithinInterval(tDate, { start, end })) return false
     }

     return true
  })

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0)
  
  // Dynamic Total for Pending View
  const visibleTotal = filteredTransactions.reduce((acc, t) => acc + Number(t.amount), 0)

  return (
    <div className="space-y-6 relative min-h-[80vh]">
      <div className="flex justify-between items-center pr-14 md:pr-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">Manage your finances</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-secondary/80 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> 
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="hidden md:flex bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium items-center gap-2 hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total Income</p>
          <p className="text-2xl font-bold text-green-500">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-500">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border col-span-2 md:col-span-1">
          <p className="text-sm text-muted-foreground mb-1">Balance</p>
          <p className="text-2xl font-bold">₹{(totalIncome - totalExpense).toLocaleString()}</p>
        </div>
        
        {/* Pending Summary */}
        {filterStatus === 'Pending' && (
             <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-xl border border-orange-200 dark:border-orange-800 col-span-2 md:col-span-3 flex items-center justify-between">
                <div>
                    <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">Total Pending Amount</p>
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">₹{visibleTotal.toLocaleString()}</p>
                </div>
                <div className="text-right text-xs text-orange-600/80 dark:text-orange-400/80">
                    Based on current filters
                </div>
             </div>
        )}
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
         {/* Top Row: Search */}
         <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search by description, product, or worker..." 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>

         {/* Middle Row: Filters Grid */}
         <div className="grid grid-cols-2 md:flex md:flex-row gap-3 md:gap-4 md:items-center">
             <select 
               className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
               value={filterType}
               onChange={(e) => setFilterType(e.target.value)}
             >
               <option value="all">All Types</option>
               <option value="income">Income</option>
               <option value="expense">Expense</option>
             </select>

             <select 
               className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
             >
               <option value="all">All Status</option>
               <option value="Paid">Paid</option>
               <option value="Pending">Pending</option>
             </select>

             <select 
               className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
               value={filterMethod}
               onChange={(e) => setFilterMethod(e.target.value)}
             >
               <option value="all">All Methods</option>
               <option value="Cash">Cash</option>
               <option value="UPI">UPI</option>
               <option value="Other">Other</option>
             </select>

             <div className="col-span-2 md:col-span-1 md:w-auto">
                <DateRangePicker 
                    from={dateRange.from}
                    to={dateRange.to}
                    onFromChange={(val) => setDateRange({...dateRange, from: val})}
                    onToChange={(val) => setDateRange({...dateRange, to: val})}
                    onClear={(dateRange.from || dateRange.to) ? () => setDateRange({ from: '', to: '' }) : null}
                />
             </div>
         </div>

         {(search || filterType !== 'all' || filterStatus !== 'all' || filterMethod !== 'all' ||  dateRange.from) && (
             <div className="flex justify-end md:w-auto">
                 <button 
                   onClick={() => {
                     setSearch('')
                     setFilterType('all')
                     setFilterCategory('all')
                     setFilterStatus('all')
                     setFilterMethod('all')
                     setDateRange({ from: '', to: '' })
                   }}
                   className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg w-full md:w-auto text-center dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/40"
                 >
                   Clear Filters
                 </button>
             </div>
         )}
      </div>

      {/* Transactions List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
             <div className="text-center py-12 text-muted-foreground">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">No transactions found.</div>
        ) : (
           <div className="divide-y divide-border">
             {filteredTransactions.map((t) => (
               <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors gap-3 sm:gap-4">
                 <div className="flex items-start gap-4">
                   <div className={`p-2 rounded-full mt-1 shrink-0 ${t.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                     {t.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                   </div>
                   <div className="min-w-0">
                     <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-lg leading-none">{t.category}</p>
                        
                        {/* PRODUCT BADGE */}
                        {t.product_id && (
                           <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                              <Package className="w-3 h-3" /> <span className="truncate max-w-[100px] sm:max-w-none">{getProductName(t.product_id)}</span> 
                              {t.quantity && ` (x${t.quantity})`}
                           </span>
                        )}
                        {/* WORKER BADGE */}
                        {t.worker_id && (
                           <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                              <Users className="w-3 h-3" /> <span className="truncate max-w-[100px] sm:max-w-none">{getWorkerName(t.worker_id)}</span>
                           </span>
                        )}
                     </div>
                     
                     <p className="text-sm text-muted-foreground line-clamp-1 break-all">{t.description}</p>
                     
                     <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                       <span className="flex items-center gap-1">
                         <Calendar className="w-3 h-3" /> {format(new Date(t.date), 'dd MMM yyyy')}
                       </span>
                       <span className="flex gap-1">
                           <span className="px-1.5 py-0.5 border border-border rounded text-[10px] bg-muted/50">{t.payment_method || 'Cash'}</span>
                           <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                               t.payment_status === 'Pending' 
                               ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' 
                               : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                           }`}>
                               {t.payment_status || 'Paid'}
                           </span>
                       </span>
                     </p>
                   </div>
                 </div>
                 
                 <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end pl-14 sm:pl-0 mt-1 sm:mt-0 border-t sm:border-t-0 border-dashed border-border pt-2 sm:pt-0">
                    <div className="text-xs text-muted-foreground capitalize sm:hidden">Amount</div>
                    <div className="text-right">
                       <div className={`font-bold text-lg sm:text-xl ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                         {t.type === 'income' ? '+' : '-'} ₹{Number(t.amount).toLocaleString()}
                       </div>
                       
                       <div className="flex items-center justify-end gap-1 mt-2">
                           <button 
                             onClick={() => handleEdit(t)}
                             className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                             title="Edit Transaction"
                           >
                             <Pencil className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleDelete(t.id)}
                             className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                             title="Delete Transaction"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                       </div>
                    </div>
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* FAB for Mobile */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex md:hidden items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
                <h3 className="text-xl font-bold">Add Transaction</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-muted rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-0">
                
                {/* 1. Type Switcher (Tabs) */}
                <div className="flex border-b border-border">
                  {['income', 'expense'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, type, category: ''})}
                      className={`flex-1 py-4 text-sm font-medium capitalize transition-all relative ${
                        formData.type === type 
                        ? (type === 'income' ? 'text-green-600 bg-green-50/50 dark:bg-green-900/20' : 'text-red-600 bg-red-50/50 dark:bg-red-900/20')
                        : 'text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {type}
                      {formData.type === type && (
                        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${type === 'income' ? 'bg-green-600' : 'bg-red-600'}`} />
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-6 space-y-6">

                    {/* 2. Amount Input (Hero) */}
                    <div className="text-center">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Amount</label>
                        <div className="relative inline-block w-full max-w-[200px]">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-light">₹</span>
                           <input
                             type="number"
                             required
                             placeholder="0"
                             className="w-full pl-8 pr-4 py-2 text-4xl font-bold text-center bg-transparent border-b-2 border-border focus:border-primary focus:outline-none transition-colors placeholder:text-muted/30"
                             value={formData.amount}
                             onChange={(e) => setFormData({...formData, amount: e.target.value})}
                           />
                        </div>
                    </div>

                    {/* 3. Main Details Grid */}
                    <div className="grid grid-cols-2 gap-6">
                         {/* Date */}
                        <div className="space-y-1.5">
                           <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" /> Date
                           </label>
                           <input
                             type="date"
                             required
                             className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                             value={formData.date}
                             onChange={(e) => setFormData({...formData, date: e.target.value})}
                           />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                             <Filter className="w-3.5 h-3.5" /> Category
                          </label>
                          <select
                            required
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                          >
                            <option value="">Select...</option>
                            {formData.type === 'income' ? (
                               <>
                                 <option value="Sales">Sales (Product)</option>
                                 <option value="Service">Service</option>
                                 <option value="Other">Other</option>
                               </>
                            ) : (
                               <>
                                 <option value="Inventory">Inventory Purchase</option>
                                 <option value="Salary">Salary Payment</option>
                                 <option value="Rent">Rent</option>
                                 <option value="Utilities">Utilities</option>
                                 <option value="Marketing">Marketing</option>
                                 <option value="Other">Other</option>
                               </>
                            )}
                          </select>
                        </div>
                    </div>

                    {/* 4. Description */}
                    <div className="space-y-1.5">
                       <label className="text-xs font-medium text-muted-foreground">Description</label>
                       <div className="relative">
                          <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="What was this for?"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                             <Pencil className="w-4 h-4 opacity-50" />
                          </div>
                       </div>
                    </div>


                    {/* 5. Dynamic Sections (Inventory/Workers/Customer) */}
                    {(formData.category === 'Inventory' || (formData.category === 'Sales' && formData.type === 'income') || (formData.category === 'Salary' && formData.type === 'expense') || formData.type === 'income') && (
                        <div className="rounded-xl border border-border overflow-hidden">
                             <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center gap-2">
                                {formData.category === 'Salary' ? <Users className="w-4 h-4 text-purple-500" /> : <Package className="w-4 h-4 text-blue-500" />}
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    {formData.category === 'Salary' ? 'Worker' : (formData.type === 'income' ? 'Product Info' : 'Products')}
                                </span>
                             </div>
                             
                             <div className="p-4 grid grid-cols-2 gap-4 bg-card/50">
                                 
                                 {/* Inventory Logic */}
                                 {(formData.category === 'Inventory' || (formData.category === 'Sales' && formData.type === 'income')) && (
                                    <>
                                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Product</label>
                                            <select
                                              required
                                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
                                              value={formData.productId}
                                              onChange={(e) => setFormData({...formData, productId: e.target.value})}
                                            >
                                              <option value="">Choose...</option>
                                              {products.map(p => (
                                                 <option key={p.id} value={p.id}>{p.name} (Qty: {p.stock})</option>
                                              ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                                            <input
                                               type="number"
                                               required
                                               min="1"
                                               className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
                                               placeholder="0"
                                               value={formData.quantity}
                                               onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                            />
                                        </div>
                                    </>
                                 )}

                                 {/* Salary Logic */}
                                 {formData.category === 'Salary' && formData.type === 'expense' && (
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground">Worker</label>
                                        <select
                                          required
                                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
                                          value={formData.workerId}
                                          onChange={(e) => setFormData({...formData, workerId: e.target.value})}
                                        >
                                          <option value="">Choose Who to Pay...</option>
                                          {workers.map(w => (
                                             <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                                          ))}
                                        </select>
                                    </div>
                                 )}
                             </div>
                        </div>
                    )}

                    {/* 6. Payment Method & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-border border-dashed">
                        {/* Method */}
                        <div className="space-y-2">
                           <label className="text-xs font-medium text-muted-foreground block">Payment Method</label>
                           <div className="flex bg-muted/50 p-1 rounded-lg">
                              {['Cash', 'UPI', 'Other'].map((m) => (
                                 <button
                                   key={m}
                                   type="button"
                                   onClick={() => setFormData({...formData, paymentMethod: m})}
                                   className={`flex-1 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                     formData.paymentMethod === m 
                                     ? 'bg-white dark:bg-black shadow-sm text-foreground' 
                                     : 'text-muted-foreground hover:text-foreground'
                                   }`}
                                 >
                                   {m}
                                 </button>
                              ))}
                           </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                           <label className="text-xs font-medium text-muted-foreground block">Status</label>
                           <div className="flex bg-muted/50 p-1 rounded-lg">
                              {['Paid', 'Pending'].map((s) => (
                                 <button
                                   key={s}
                                   type="button"
                                   onClick={() => setFormData({...formData, paymentStatus: s})}
                                   className={`flex-1 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                     formData.paymentStatus === s 
                                     ? (s === 'Paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-sm')
                                     : 'text-muted-foreground hover:text-foreground'
                                   }`}
                                 >
                                   {s}
                                 </button>
                              ))}
                           </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-3.5 rounded-xl font-semibold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed ${
                         formData.type === 'income' 
                         ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-none' 
                         : 'bg-red-600 hover:bg-red-700 text-white shadow-red-200 dark:shadow-none'
                      }`}
                    >
                      {isSubmitting ? (
                          <>
                             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                             Saving...
                          </>
                      ) : (
                         <>
                            {editingId ? 'Update Transaction' : 'Save Transaction'}
                            <ArrowUpRight className={`w-5 h-5 ${formData.type === 'expense' ? 'rotate-180' : ''}`} />
                         </>
                      )}
                    </button>
                </div>

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
