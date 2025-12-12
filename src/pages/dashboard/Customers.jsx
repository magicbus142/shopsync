import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Phone, MapPin, ArrowRight, Pencil, Trash2, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { useNavigate } from 'react-router-dom'
import ConfirmationModal from '../../components/ui/ConfirmationModal'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null) // For Edit Mode
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', openingBalance: '' })
  const [search, setSearch] = useState('')
  const [confirmModal, setConfirmModal] = useState({ isOpen: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setLoading(true)
    const { data: customersData, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error(error)
        toast.error('Failed to load customers')
    } else {
        // Fetch pending amounts for calculating total due
        const { data: pendingTxns } = await supabase
            .from('transactions')
            .select('customer_id, amount')
            .eq('payment_status', 'pending')
            
        const customersWithDue = customersData.map(c => {
            const due = pendingTxns
                ? pendingTxns
                    .filter(t => t.customer_id === c.id)
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                : 0
            return { ...c, total_due: due }
        })

        setCustomers(customersWithDue)
    }
    setLoading(false)
  }

  const handleSaveCustomer = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        toast.error("You must be logged in")
        setIsSubmitting(false)
        return
    }

    const payload = {
        user_id: user.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address
    }

    let error
    
    if (editingId) {
        // Update existing
        const { error: updateError } = await supabase
            .from('customers')
            .update(payload)
            .eq('id', editingId)
        error = updateError
    } else {
        // Create new
        const { error: insertError } = await supabase
            .from('customers')
            .insert([payload])
        error = insertError
    }

    if (error) {
        console.error("Save Error:", error)
        toast.error(error.message)
    } else {
        // Handle Opening Balance for New Customers
        if (!editingId && payload.name && newCustomer.openingBalance && Number(newCustomer.openingBalance) > 0) {
             // 1. Get the new customer ID
             const { data: customerData } = await supabase.from('customers').select('id').eq('name', payload.name).order('created_at', { ascending: false }).limit(1).single()
             
             if (customerData) {
                 // 2. Create Opening Balance Transaction
                 await supabase.from('transactions').insert([{
                     user_id: user.id,
                     customer_id: customerData.id,
                     type: 'income',
                     category: 'Other',
                     description: 'Opening Balance',
                     amount: newCustomer.openingBalance,
                     amount_paid: 0,
                     payment_status: 'Pending',
                     payment_method: 'Other',
                     date: new Date().toISOString().split('T')[0]
                 }])
             }
        }

        toast.success(editingId ? 'Customer updated' : 'Customer added')
        setShowAddForm(false)
        setNewCustomer({ name: '', phone: '', address: '', openingBalance: '' })
        setEditingId(null)
        fetchCustomers()
    }
    setIsSubmitting(false)
  }

  const handleEdit = (customer) => {
      setNewCustomer({
          name: customer.name,
          phone: customer.phone || '',
          address: customer.address || '',
          openingBalance: '' // Don't show opening balance on edit
      })
      setEditingId(customer.id)
      setShowAddForm(true)
  }

  const handleDelete = (id) => {
      setConfirmModal({
          isOpen: true,
          title: 'Delete Customer',
          message: 'Are you sure? This will NOT delete their transaction history, but remove them from this list.',
          variant: 'danger',
          onConfirm: async () => {
              const { error } = await supabase.from('customers').delete().eq('id', id)
              if (error) {
                  toast.error('Failed to delete: ' + error.message)
              } else {
                  toast.success('Customer deleted')
                  fetchCustomers()
              }
              setConfirmModal({ isOpen: false })
          }
      })
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  )

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className="text-3xl font-bold tracking-tight">Customer Khata</h2>
            <p className="text-muted-foreground mt-1">Manage customers and track pending payments.</p>
         </div>
         <button 
           onClick={() => {
               setEditingId(null)
               setNewCustomer({ name: '', phone: '', address: '' })
               setShowAddForm(true)
           }}
           className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 shadow-md transition-colors"
         >
           <Plus className="w-5 h-5" /> Add Customer
         </button>
      </div>

      {/* Search & Stats omitted for brevity (unchanged) */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <AnimatePresence>
            {loading ? (
                <p className="text-muted-foreground col-span-full text-center py-10">Loading Customers...</p>
            ) : filteredCustomers.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                    <p>No customers found.</p>
                </div>
            ) : (
                filteredCustomers.map(customer => (
                    <motion.div
                        key={customer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        layout
                        className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                    >
                        {/* Actions (visible on hover) */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleEdit(customer); }} 
                                className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"
                                title="Edit"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }} 
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex justify-between items-start mb-4 pr-16">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                                {customer.name.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold truncate">{customer.name}</h3>
                            {customer.total_due > 0 && (
                                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                    Due: ₹{customer.total_due}
                                </span>
                            )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground min-h-[3rem]">
                            {customer.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5" /> {customer.phone}
                                </div>
                            )}
                            {customer.address && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> <span className="truncate">{customer.address}</span>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                            className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-primary text-sm font-medium bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors border border-primary/10"
                        >
                            <Receipt className="w-4 h-4" /> View Ledger
                        </button>
                    </motion.div>
                ))
            )}
         </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="text-xl font-bold">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
                <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-black/10 rounded-full">
                    <Plus className="w-6 h-6 rotate-45" /> 
                </button>
                </div>
                
                <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Customer Name <span className="text-red-500">*</span></label>
                        <input 
                            required 
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                            value={newCustomer.name}
                            onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                            placeholder="e.g. Raju Bhai"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Phone Number</label>
                        <input 
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                            value={newCustomer.phone}
                            onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Address</label>
                        <textarea 
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background resize-none h-20"
                            value={newCustomer.address}
                            onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                        />
                    </div>
                    
                    {!editingId && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-orange-600">Opening Balance (Pending)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                <input 
                                    type="number"
                                    className="w-full pl-7 pr-3 py-2 border border-orange-200 rounded-lg bg-orange-50/50"
                                    placeholder="0"
                                    value={newCustomer.openingBalance}
                                    onChange={e => setNewCustomer({...newCustomer, openingBalance: e.target.value})}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">If they already owe you money, enter it here.</p>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          editingId ? 'Update Customer' : 'Save Customer'
                        )}
                    </button>
                </form>
            </motion.div>
            </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          variant={confirmModal.variant}
      />
    </div>
  )
}
