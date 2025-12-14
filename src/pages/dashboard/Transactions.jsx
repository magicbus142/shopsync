import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Plus, X, Calendar, Package, Users, Search, Filter, Download, Pencil, Trash2, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'
import { useToast } from '../../context/ToastContext'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'
import DateRangePicker from '../../components/ui/DateRangePicker'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import Pagination from '../../components/ui/Pagination'

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
  const [paymentHistory, setPaymentHistory] = useState([])
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  
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
    paymentStatus: 'Paid',
    initialPayment: '',
    items: []
  })

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Reset page when filters change
  useEffect(() => {
     setCurrentPage(1)
  }, [search, filterType, filterCategory, filterStatus, filterMethod, dateRange])

  // Payment Form State (for adding extra payments in edit mode)
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Cash'
  })

  // View Modal State
  const [viewTransaction, setViewTransaction] = useState(null)
  const [viewItems, setViewItems] = useState([])
  const [viewPayments, setViewPayments] = useState([])

  const handleView = async (t) => {
      setViewTransaction(t)
      // Fetch details
      const { data: items } = await supabase.from('transaction_items').select('*').eq('transaction_id', t.id)
      setViewItems(items || [])
      
      const { data: payments } = await supabase.from('transaction_payments').select('*').eq('transaction_id', t.id).order('date', { ascending: false })
      setViewPayments(payments || [])
  }

  useEffect(() => {
    if (currentOrg) {
        fetchTransactions()
        fetchProducts()
        fetchWorkers()
    }
  }, [currentOrg])

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
            // Optimistic update (optional) or just wait for success
            const { error } = await supabase.from('transactions').delete().eq('id', id)
            if (error) {
              toast.error('Error deleting transaction: ' + error.message)
              console.error(error)
            } else {
              toast.success('Transaction deleted')
              // Update local state immediately
              setTransactions(prev => prev.filter(t => t.id !== id))
              // Also refetch for safety (balance calc etc)
              fetchTransactions()
            }
            setConfirmModal({ ...confirmModal, isOpen: false })
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
      paymentStatus: t.payment_status || 'Paid',
      initialPayment: '',
      items: []
    })
    setEditingId(t.id)
    fetchPaymentHistory(t.id)
    // fetch items for edit if needed, for now we just handle new ones
    if (t.category === 'Sales' || t.category === 'Inventory') {
        fetchTransactionItems(t.id)
    }
    setShowModal(true)
  }

  const fetchTransactionItems = async (txId) => {
      const { data } = await supabase.from('transaction_items').select('*').eq('transaction_id', txId)
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

  const fetchPaymentHistory = async (transactionId) => {
    const { data, error } = await supabase
      .from('transaction_payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('date', { ascending: false })
    
    if (data) setPaymentHistory(data)
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()
    if (!editingId || !newPayment.amount) return

    setIsAddingPayment(true)
    try {
        const { data: insertedData, error } = await supabase.from('transaction_payments').insert([{
            transaction_id: editingId,
            amount: newPayment.amount,
            date: newPayment.date,
            payment_method: newPayment.method
        }]).select()

        if (error) throw error

        toast.success('Payment added')
        
        if (insertedData && insertedData.length > 0) {
            const updatedHistory = [insertedData[0], ...paymentHistory]
            setPaymentHistory(updatedHistory)
            
            // Recalculate remaining for next input
            const totalPaid = updatedHistory.reduce((sum, p) => sum + Number(p.amount), 0)
            const remaining = Number(formData.amount) - totalPaid
            setNewPayment({ 
                amount: remaining > 0 ? remaining : '', 
                date: new Date().toISOString().split('T')[0], 
                method: 'Cash' 
            })
        } else {
            // Fallback refetch
            fetchPaymentHistory(editingId)
             setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], method: 'Cash' })
        }
        
        fetchTransactions() // Refresh main list
    } catch (error) {
        console.error("Error adding payment details:", error)
        toast.error('Error adding payment: ' + (error.message || "Unknown error"))
    } finally {
        setIsAddingPayment(false)
    }
  }

  const handleDeletePayment = async (paymentId) => {
    const { error } = await supabase.from('transaction_payments').delete().eq('id', paymentId)
    if (error) {
        toast.error('Error deleting payment')
    } else {
        toast.success('Payment deleted')
        fetchPaymentHistory(editingId)
        fetchTransactions()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
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
         return 
      }

      // Calculate correct status based on initial payment
      let finalStatus = 'Pending'
      if (editingId) {
          finalStatus = formData.paymentStatus // Keep existing or user-edited status for edits
      } else {
           const initial = Number(formData.initialPayment) || 0
           const total = Number(formData.amount) || 0
           if (total > 0 && initial >= total) finalStatus = 'Paid'
           else if (initial > 0) finalStatus = 'Partial'
           else finalStatus = 'Pending'
      }

      // 1. Prepare Transaction Data
      const payload = {
        organization_id: currentOrg.id,
        user_id: userId,
        type: formData.type,
        amount: formData.amount,
        category: formData.category,
        description: formData.description,
        date: formData.date,
        // product_id and quantity kept for backward compatibility if mainly income/expense, 
        // but for Sales/Inventory we use items table. 
        // If we have items, payload.product_id can be null or maybe the first item? 
        // Let's keep it null for multi-item transactions to avoid confusion.
        product_id: (formData.category === 'Inventory' || formData.category === 'Sales') && formData.items.length === 0 ? (formData.productId || null) : null,
        worker_id: formData.category === 'Salary' ? (formData.workerId || null) : null,
        quantity: formData.items.length === 0 ? (formData.quantity || null) : null,
        payment_method: formData.paymentMethod,
        payment_status: finalStatus
      }

      if (editingId) {
         setConfirmModal({
             isOpen: true,
             title: 'Save Changes',
             message: 'Are you sure you want to update this transaction details?',
             variant: 'primary',
             onConfirm: async () => {
                  try {
                      const { error } = await supabase
                          .from('transactions')
                          .update(payload)
                          .eq('id', editingId)

                      if (error) {
                          throw new Error(error.message)
                      }

                      // Update transaction items if any
                      if (formData.items && formData.items.length > 0) {
                          // First, delete existing items for this transaction
                          await supabase.from('transaction_items').delete().eq('transaction_id', editingId)

                          // Then, insert new items
                          const itemsPayload = formData.items.map(i => ({
                              transaction_id: editingId,
                              product_id: i.productId,
                              quantity: i.quantity,
                              price_per_unit: i.price,
                              total_price: Number(i.price) * Number(i.quantity)
                          }))
                          const { error: itemsError } = await supabase.from('transaction_items').insert(itemsPayload)
                          if (itemsError) {
                              console.error("Error updating items", itemsError)
                              toast.error("Error updating items: " + itemsError.message)
                          }
                      } else {
                          // If no items in form, delete all existing items for this transaction
                          await supabase.from('transaction_items').delete().eq('transaction_id', editingId)
                      }

                      toast.success('Transaction updated successfully!')
                      resetForm()
                      fetchTransactions()
                      fetchProducts() 
                  } catch (error) {
                      console.error("Error during update confirmation:", error)
                      toast.error('Error updating transaction: ' + error.message)
                  } finally {
                      setConfirmModal({ ...confirmModal, isOpen: false })
                      setIsSubmitting(false) // Ensure loading state is reset after confirm action
                  }
             },
             onCancel: () => {
                setIsSubmitting(false) // Reset loading state if user cancels
                setConfirmModal({ ...confirmModal, isOpen: false })
             }
         })
         return // Exit handleSubmit, as the actual work is now in the onConfirm callback
      } 

      // ADD NEW TRANSACTION
      const { data: newTx, error } = await supabase.from('transactions').insert([payload]).select().single()

      if (error) {
        throw new Error(error.message)
      }
      
      // Handle Initial Payment
      if (formData.initialPayment && Number(formData.initialPayment) > 0) {
           const { error: payError } = await supabase.from('transaction_payments').insert([{
               transaction_id: newTx.id,
               amount: formData.initialPayment,
               date: formData.date,
               payment_method: formData.paymentMethod
           }])
           if(payError) console.error("Error saving initial payment", payError)
      }
      // If no initial payment, it defaults to Pending (0 paid)

      // Handle Transaction Items (New System)
      if (formData.items && formData.items.length > 0) {
          const itemsPayload = formData.items.map(i => ({
              transaction_id: newTx.id,
              product_id: i.productId,
              quantity: i.quantity,
              price_per_unit: i.price,
              total_price: Number(i.price) * Number(i.quantity)
          }))
          
          const { error: itemsError } = await supabase.from('transaction_items').insert(itemsPayload)
          if (itemsError) {
              console.error("Error adding items", itemsError)
              toast.error("Error adding items: " + itemsError.message)
          } else {
              // Update Stock for each item
              for (const item of formData.items) {
                  if (item.productId && item.quantity) {
                       const product = products.find(p => p.id === item.productId)
                       if (product) {
                           const newStock = formData.type === 'expense' 
                              ? product.stock + parseInt(item.quantity) // Buying -> Increase
                              : product.stock - parseInt(item.quantity) // Selling -> Decrease
                           
                           await supabase.from('products').update({ stock: newStock }).eq('id', item.productId)
                       }
                  }
              }
          }
      }
      
      // Legacy single item stock update (only if NO items array used)
      if (!editingId && payload.product_id && payload.quantity && formData.items.length === 0) {
         const product = products.find(p => p.id === payload.product_id)
         if (product) {
            const newStock = formData.type === 'expense' 
               ? product.stock + parseInt(payload.quantity) // Buying Inventory -> Increase Stock
               : product.stock - parseInt(payload.quantity) // Selling Inventory -> Decrease Stock
            
            await supabase.from('products').update({ stock: newStock }).eq('id', payload.product_id)
         }
      }

      toast.success('Transaction added successfully!')
      resetForm()
      fetchTransactions()
      fetchProducts() 
      
    } catch (error) {
        console.error("Error in handleSubmit:", error)
        toast.error('An unexpected error occurred: ' + error.message)
    } finally {
        // Ensure loading state is reset, unless the editing path returned early
        if (!editingId) {
            setIsSubmitting(false)
        }
    }
  }

  const resetForm = () => {
     setShowModal(false)
     setEditingId(null)
     setFormData(initialFormState)
     setPaymentHistory([])
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData(initialFormState)
    setPaymentHistory([])
    setShowModal(true)
  }

  const initialFormState = {
    type: 'income',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    productId: '',
    workerId: '',
    quantity: '',
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    initialPayment: '',
    items: []
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
     if (filterStatus !== 'all' && t.payment_status !== filterStatus && !(filterStatus === 'Pending' && t.payment_status === 'Partial')) return false

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
  
  // Calculate Total Pending (All time)
  const totalPending = transactions.reduce((acc, t) => {
      const amount = Number(t.amount) || 0
      const paid = Number(t.amount_paid) || 0
      // Ensure we don't count negative pending if overpaid
      const pending = Math.max(0, amount - paid)
      return acc + pending
  }, 0)

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

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
              onClick={handleAddNew}
              className="hidden md:flex bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium items-center gap-2 hover:bg-primary/90"
            >
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
             {currentItems.map((t) => (
               <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors gap-3 sm:gap-4">
                 <div className="flex items-start gap-4">
                   <div className={`p-2 rounded-full mt-1 shrink-0 ${t.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                     {t.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                   </div>
                   <div className="min-w-0">
                     <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-lg leading-none">{t.category}</p>
                        
                        {/* PRODUCT BADGE (Single or Multi) */}
                         {t.product_id ? (
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                               <Package className="w-3 h-3" /> <span className="truncate max-w-[100px] sm:max-w-none">{getProductName(t.product_id)}</span> 
                               {t.quantity && ` (x${t.quantity})`}
                            </span>
                         ) : (
                            t.transaction_items && t.transaction_items.length > 0 && t.transaction_items.map(item => (
                                <span key={item.id} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                                    <Package className="w-3 h-3" /> <span className="truncate max-w-[100px] sm:max-w-none">{getProductName(item.product_id)}</span> 
                                    {item.quantity && ` (x${item.quantity})`}
                                </span>
                            ))
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
                             onClick={() => handleView(t)}
                             className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                             title="View Details"
                           >
                             <Eye className="w-4 h-4" />
                           </button>
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
          
          {/* Pagination Controls */}
          {filteredTransactions.length > itemsPerPage && (
             <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
             />
          )}
       </div>

      {/* FAB for Mobile */}
      <button 
        onClick={handleAddNew}
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

                        {/* Multi-Item Product List for Sales/Inventory */}
                        {(formData.category === 'Sales' || formData.category === 'Inventory') ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            items: [...prev.items, { productId: '', quantity: 1, price: 0 }]
                                        }))}
                                        className="text-xs flex items-center gap-1 text-primary font-medium hover:underline bg-primary/5 px-2 py-1 rounded-full transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Add Item
                                    </button>
                                </div>
                                
                                <div className="space-y-2">


                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex flex-col gap-3 bg-muted/30 p-3 rounded-xl border border-border group hover:border-primary/30 transition-all">
                                            {/* Row 1: Product Selection & Delete */}
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Product</label>
                                                    <select
                                                        required
                                                        className="w-full bg-background/50 p-2 rounded-md border border-border text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                                        value={item.productId}
                                                        onChange={(e) => {
                                                            const pid = e.target.value
                                                            const product = products.find(p => p.id === pid)
                                                            const price = product ? (formData.type === 'income' ? product.price : 0) : 0
                                                            
                                                            const newItems = [...formData.items]
                                                            newItems[index] = { ...newItems[index], productId: pid, price }
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                items: newItems,
                                                                amount: newItems.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0)
                                                            }))
                                                        }}
                                                    >
                                                        <option value="">Select Product...</option>
                                                        {products.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} (Stock: {p.stock})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newItems = formData.items.filter((_, i) => i !== index)
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            items: newItems,
                                                            amount: formData.type === 'income' ? newItems.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0) : prev.amount
                                                        }))
                                                    }}
                                                    className="mt-6 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                    title="Remove Item"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Row 2: Details Grid */}
                                            <div className="grid grid-cols-4 gap-3 items-end">
                                               {/* Stock Info (Read Only) */}
                                               <div className="col-span-1">
                                                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Stock</label>
                                                    <div className="text-xs font-mono bg-muted/50 py-2 px-2 rounded text-center border border-border/50">
                                                        {(() => {
                                                            const p = products.find(prod => prod.id === item.productId);
                                                            return p ? p.stock : '-';
                                                        })()}
                                                    </div>
                                               </div>

                                                {/* Quantity Input */}
                                                <div className="col-span-1">
                                                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Qty</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="1"
                                                        className="w-full bg-background/50 text-sm text-center px-1 py-1.5 rounded-md border border-border focus:border-primary outline-none transition-all focus:ring-1 focus:ring-primary/20 hover:bg-background"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const qty = e.target.value
                                                            const newItems = [...formData.items]
                                                            newItems[index] = { ...newItems[index], quantity: qty }
                                                            const total = newItems.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0)
                                                            
                                                            if(formData.type === 'income') {
                                                                setFormData(prev => ({ ...prev, items: newItems, amount: total }))
                                                            } else {
                                                                setFormData(prev => ({ ...prev, items: newItems }))
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                {/* Price Input (Editable) */}
                                                <div className="col-span-1">
                                                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">₹</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full bg-background/50 text-sm text-right pl-3 pr-1 py-1.5 rounded-md border border-border focus:border-primary outline-none transition-all focus:ring-1 focus:ring-primary/20 hover:bg-background"
                                                            value={item.price}
                                                            onChange={(e) => {
                                                                const price = e.target.value
                                                                const newItems = [...formData.items]
                                                                newItems[index] = { ...newItems[index], price: price }
                                                                const total = newItems.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0)
                                                                
                                                                setFormData(prev => ({ ...prev, items: newItems, amount: total }))
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Row Total (Read Only) */}
                                                <div className="col-span-1">
                                                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block text-right">Total</label>
                                                    <div className="text-sm font-bold text-right py-1.5">
                                                        ₹{(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {formData.items.length === 0 && (
                                        <div 
                                            className="text-center py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                items: [...prev.items, { productId: '', quantity: 1, price: 0 }]
                                            }))}
                                        >
                                            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                                            <p className="text-sm text-muted-foreground font-medium">Click to add items</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}

                        {/* Total Amount Display (Editable for Expenses or Non-Product Sales) */}
                        <div className="text-center space-y-4 pt-4 border-t border-dashed border-border">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Total Amount</label>
                            <div className="relative inline-block w-full max-w-[200px]">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-light">₹</span>
                               <input
                                 type="number"
                                 required
                                 placeholder="0"
                                 className="w-full pl-8 pr-4 py-2 text-4xl font-bold text-center bg-transparent border-b-2 border-border focus:border-primary focus:outline-none transition-colors placeholder:text-muted/30"
                                 value={formData.amount}
                                 onChange={(e) => {
                                     const val = e.target.value;
                                     // If we are adding (not editing) and haven't touched initialPayment manually, auto-fill it
                                     // But actually, let's just update amount. 
                                     setFormData(prev => ({
                                         ...prev, 
                                         amount: val,
                                         // Auto-fill initial payment to match total if users usually pay in full? 
                                         // Let's default initialPayment to val if it was empty or matching old val
                                         initialPayment: !editingId && (prev.initialPayment === '' || prev.initialPayment === prev.amount) ? val : prev.initialPayment
                                     }))
                                 }}
                               />
                            </div>
                        </div>

                        {/* Initial Payment Field (Only for New) */}
                        {!editingId && (
                           <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2">
                               <label className="text-xs font-medium text-muted-foreground mb-1">Amount Paid Now</label>
                               <div className="relative w-32">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                    <input 
                                        type="number" 
                                        className={`w-full pl-6 pr-2 py-1 text-center border rounded-md text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary ${
                                            Number(formData.initialPayment) < Number(formData.amount) && Number(formData.initialPayment) > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : 
                                            Number(formData.initialPayment) === 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-300 bg-green-50 text-green-700'
                                        }`}
                                        value={formData.initialPayment}
                                        onChange={(e) => setFormData({...formData, initialPayment: e.target.value})}
                                        placeholder="0"
                                    />
                               </div>
                               <div className="text-[10px] mt-1 font-medium">
                                   {Number(formData.initialPayment) >= Number(formData.amount) ? (
                                       <span className="text-green-600">Paid in Full</span>
                                   ) : Number(formData.initialPayment) > 0 ? (
                                       <span className="text-orange-600">Partial Payment (Bal: ₹{Number(formData.amount) - Number(formData.initialPayment)})</span>
                                   ) : (
                                       <span className="text-red-600">Pending (Unpaid)</span>
                                   )}
                               </div>
                           </div>
                        )}
                        
                        {/* Payment History (Only for Edit) */}
                        {editingId && (
                           <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border text-left">
                               <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 block flex justify-between items-center">
                                   Payment History
                                   <span className="text-[10px] font-normal normal-case bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                       Bal: ₹{(Number(formData.amount) - paymentHistory.reduce((s,p) => s + Number(p.amount), 0)).toLocaleString()}
                                   </span>
                               </label>
                               
                               <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                                   {paymentHistory.map(p => (
                                       <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-background rounded-lg border border-border shadow-sm">
                                           <div className="flex gap-2 items-center">
                                                <span className="font-semibold text-green-600">₹{Number(p.amount).toLocaleString()}</span>
                                                <span className="text-muted-foreground text-xs">• {format(new Date(p.date), 'dd MMM')}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">{p.payment_method}</span>
                                           </div>
                                           <button 
                                              type="button"
                                              onClick={() => handleDeletePayment(p.id)} 
                                              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                           >
                                               <Trash2 className="w-3.5 h-3.5" />
                                           </button>
                                       </div>
                                   ))}
                                   {paymentHistory.length === 0 && <div className="text-xs text-muted-foreground italic text-center py-2">No payments recorded yet.</div>}
                               </div>

                               {/* Add New Payment Mini Form */}
                               <div className="flex gap-2 items-end pt-2 border-t border-dashed border-border">
                                   <div className="flex-1 space-y-1">
                                       <label className="text-[10px] text-muted-foreground">Add Payment</label>
                                       <div className="flex gap-2">
                                           <input 
                                                type="number" 
                                                placeholder="Amount" 
                                                className="w-full px-2 py-1.5 rounded-md border border-border text-sm"
                                                value={newPayment.amount}
                                                onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                           />
                                            <select 
                                                className="w-24 px-2 py-1.5 rounded-md border border-border text-sm"
                                                value={newPayment.method}
                                                onChange={(e) => setNewPayment({...newPayment, method: e.target.value})}
                                            >
                                                <option>Cash</option>
                                                <option>UPI</option>
                                                <option>Other</option>
                                            </select>
                                       </div>
                                   </div>
                                   <button 
                                      type="button" 
                                      onClick={handleAddPayment}
                                      disabled={!newPayment.amount || isAddingPayment}
                                      className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                   >
                                      <Plus className="w-4 h-4" />
                                   </button>
                               </div>
                           </div>
                        )}
                    </div>


                    {/* 5. Dynamic Sections (Inventory/Workers/Customer) */}
                    {/* 5. Section for Salary (Worker Selection) */}
                    {formData.category === 'Salary' && formData.type === 'expense' && (
                        <div className="rounded-xl border border-border overflow-hidden">
                             <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-500" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Worker Details
                                </span>
                             </div>
                             
                             <div className="p-4 grid grid-cols-2 gap-4 bg-card/50">
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
                             </div>
                        </div>
                    )}

                    {/* 6. Payment Method & Status (ONLY FOR NEW + INCOME/EXPENSE Logic if needed, but primarily controlled by payment history now) */}
                    {/* We hide manual Status/Method select for Edit Mode because it's derived from history. For New Mode, we use the simple Initial Payment inputs above. */}
                    {!editingId && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-border border-dashed">
                             {/* Method for Initial Payment */}
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
                             
                             {/* Status Preview (Read Only) */}
                             <div className="space-y-2 opacity-70 pointer-events-none">
                                <label className="text-xs font-medium text-muted-foreground block">Status (Auto)</label>
                                <div className="px-3 py-2 bg-muted/50 rounded-lg text-sm font-medium text-center">
                                    {Number(formData.initialPayment) >= Number(formData.amount) ? 'Paid' : Number(formData.initialPayment) > 0 ? 'Partial' : 'Pending'}
                                </div>
                             </div>
                        </div>
                    )}

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
      {/* View Modal */}
       <AnimatePresence>
        {viewTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
                <div>
                    <h3 className="text-xl font-bold">Transaction Details</h3>
                    <p className="text-sm text-muted-foreground">{format(new Date(viewTransaction.date), 'dd MMMM yyyy')}</p>
                </div>
                <button onClick={() => setViewTransaction(null)} className="p-1 hover:bg-muted rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-8">
                  {/* Top Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted/30 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
                          <p className="text-xl font-bold">₹{Number(viewTransaction.amount).toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paid</p>
                          <p className="text-xl font-bold text-green-600">₹{Number(viewTransaction.amount_paid || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Balance</p>
                          <p className={`text-xl font-bold ${Number(viewTransaction.amount) - Number(viewTransaction.amount_paid || 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              ₹{(Number(viewTransaction.amount) - Number(viewTransaction.amount_paid || 0)).toLocaleString()}
                          </p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium border ${
                                viewTransaction.payment_status === 'Pending' 
                                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' 
                                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                            }`}>
                                {viewTransaction.payment_status || 'Paid'}
                          </span>
                      </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <h4 className="font-semibold text-sm border-b border-border pb-2">Details</h4>
                          <div className="space-y-3 text-sm">
                              <div className="flex justifying-between">
                                  <span className="text-muted-foreground w-24">Type:</span>
                                  <span className="capitalize font-medium">{viewTransaction.type}</span>
                              </div>
                              <div className="flex justifying-between">
                                  <span className="text-muted-foreground w-24">Category:</span>
                                  <span className="font-medium">{viewTransaction.category}</span>
                              </div>
                               <div className="flex justifying-between">
                                  <span className="text-muted-foreground w-24">Description:</span>
                                  <span className="font-medium">{viewTransaction.description || '-'}</span>
                              </div>
                              {viewTransaction.worker_id && (
                                   <div className="flex justifying-between">
                                      <span className="text-muted-foreground w-24">Worker:</span>
                                      <span className="font-medium">{getWorkerName(viewTransaction.worker_id)}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Payment History */}
                      <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                             <h4 className="font-semibold text-sm">Payment History</h4>
                             <span className="text-xs text-muted-foreground">{viewPayments.length} payments</span>
                          </div>
                          
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                              {viewPayments.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">No payments recorded.</p>
                              ) : (
                                  viewPayments.map(p => (
                                      <div key={p.id} className="flex justify-between items-center text-sm p-3 bg-muted/20 rounded-lg border border-border">
                                          <div>
                                              <p className="font-medium">₹{Number(p.amount).toLocaleString()}</p>
                                              <p className="text-xs text-muted-foreground">{format(new Date(p.date), 'dd MMM yyyy')}</p>
                                          </div>
                                          <span className="text-xs px-2 py-1 bg-background rounded border border-border">{p.payment_method}</span>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Items List */}
                  {(viewItems.length > 0 || (viewTransaction.product_id && !viewItems.length)) && (
                      <div className="space-y-4">
                          <h4 className="font-semibold text-sm border-b border-border pb-2">Items</h4>
                          <div className="border border-border rounded-xl overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                                      <tr>
                                          <th className="px-4 py-3">Product</th>
                                          <th className="px-4 py-3 text-center">Qty</th>
                                          <th className="px-4 py-3 text-right">Price</th>
                                          <th className="px-4 py-3 text-right">Total</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                      {viewItems.length > 0 ? (
                                          viewItems.map(item => (
                                              <tr key={item.id}>
                                                  <td className="px-4 py-3">{getProductName(item.product_id)}</td>
                                                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                  <td className="px-4 py-3 text-right">₹{Number(item.price_per_unit).toLocaleString()}</td>
                                                  <td className="px-4 py-3 text-right font-medium">₹{Number(item.total_price).toLocaleString()}</td>
                                              </tr>
                                          ))
                                      ) : (
                                          // Fallback for old single-product transactions
                                          <tr>
                                               <td className="px-4 py-3">{getProductName(viewTransaction.product_id)}</td>
                                               <td className="px-4 py-3 text-center">{viewTransaction.quantity}</td>
                                               <td className="px-4 py-3 text-right">-</td>
                                               <td className="px-4 py-3 text-right font-medium">₹{Number(viewTransaction.amount).toLocaleString()}</td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
              
              <div className="p-4 border-t border-border bg-muted/10 text-right">
                  <button 
                    onClick={() => setViewTransaction(null)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                  >
                      Close
                  </button>
              </div>
            </motion.div>
          </div>
        )}
       </AnimatePresence>
    </div>
  )
}
