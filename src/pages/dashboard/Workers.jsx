import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Phone, Search, IndianRupee, FileText, Download, Pencil, Trash2, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'
import DateRangePicker from '../../components/ui/DateRangePicker'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import Pagination from '../../components/ui/Pagination'
import { useToast } from '../../context/ToastContext'
import ImageUploader from '../../components/common/ImageUploader'
import AuditHistory from '../../components/common/AuditHistory'

export default function Workers() {
  const { currentOrg } = useOrganization()
  const { success, error: toastError } = useToast()
  
  const [workers, setWorkers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [showModal, setShowModal] = useState(false) // Add Worker Modal
  const [showPayModal, setShowPayModal] = useState(false) // Pay Worker Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false) // History Modal
  
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [editingId, setEditingId] = useState(null)
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' 
  })

  // Filters
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const [formData, setFormData] = useState({ name: '', role: '', phone: '', salary: '', image_url: '' })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const [payData, setPayData] = useState({ amount: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    if (currentOrg) fetchData()
  }, [currentOrg])

  const fetchData = async () => {
    if (!currentOrg) return
    setLoading(true)
    const { data: workersData } = await supabase.from('workers').select('*').eq('organization_id', currentOrg.id).order('created_at', { ascending: false })
    const { data: transData } = await supabase.from('transactions').select('*').eq('organization_id', currentOrg.id).not('worker_id', 'is', null).order('created_at', { ascending: false })
    setWorkers(workersData || [])
    setTransactions(transData || [])
    setLoading(false)
  }

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(workers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Workers");
    XLSX.writeFile(wb, "lekka-workers.xlsx");
  }

  const handleDelete = (id) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Worker',
        message: 'Are you sure you want to delete this worker? This action cannot be undone.',
        variant: 'danger',
        showCancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
            const { error } = await supabase.from('workers').delete().eq('id', id)
            if (error) {
              console.error(error)
              if (error.code === '23503') { // Foreign key violation
                   toastError('Cannot delete worker with associated records.')
              } else {
                   toastError('Error deleting worker')
              }
            } else {
              success('Worker deleted successfully')
              fetchData()
            }
        }
    })
  }

  const handleEdit = (worker) => {
    setFormData({
      name: worker.name,
      role: worker.role || '',
      phone: worker.phone || '',
      salary: worker.salary || '',
      image_url: worker.image_url || ''
    })
    setEditingId(worker.id)
    setShowModal(true)
  }

  // Add/Update Worker
  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !currentOrg) { toastError('Authentication error'); return }

    const item = {
      ...formData,
      organization_id: currentOrg.id,
      salary: formData.salary ? parseFloat(formData.salary) : 0,
      image_url: formData.image_url || null,
      user_id: user.id
    }

    const executeSave = async () => {
        if (editingId) {
            const { error } = await supabase
                .from('workers')
                .update(item)
                .eq('id', editingId)
                
            if (error) toastError('Error updating worker: ' + error.message)
            else { 
                setShowModal(false) 
                setFormData({ name: '', role: '', phone: '', salary: '', image_url: '' })
                setEditingId(null)
                success('Worker updated successfully')
                fetchData() 
            }
        } else {
            const { error } = await supabase.from('workers').insert([item])
    
            if (error) toastError('Error adding worker: ' + error.message)
            else { 
                setShowModal(false) 
                setFormData({ name: '', role: '', phone: '', salary: '', image_url: '' }) 
                success('Worker added successfully')
                fetchData() 
            }
        }
    }

    if (editingId) {
       setConfirmModal({
           isOpen: true,
           title: 'Save Changes',
           message: 'Are you sure you want to update this worker profile?',
           variant: 'primary',
           onConfirm: executeSave
       })
    } else {
       executeSave()
    }
  }

  // Pay Worker
  const handlePaySubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !currentOrg) return

    const payload = {
      organization_id: currentOrg.id,
      user_id: user.id,
      type: 'expense',
      category: 'Salary', // Updated from old value if needed
      description: `Salary Payment to ${selectedWorker.name}`,
      amount: parseFloat(payData.amount),
      amount_paid: parseFloat(payData.amount), // Full payment by default for salary
      date: payData.date,
      worker_id: selectedWorker.id,
      payment_status: 'Paid',
      payment_method: 'Cash' // Default
    }

    const { error, data: txData } = await supabase.from('transactions').insert([payload]).select()

    if (error) toastError('Error recording payment: ' + error.message)
    else { 
        // Record detailed payment in transaction_payments
        if (txData?.[0]?.id) {
            await supabase.from('transaction_payments').insert([{
                transaction_id: txData[0].id,
                amount: parseFloat(payData.amount),
                date: payData.date,
                payment_method: 'Cash'
            }])
        }

      setShowPayModal(false)
      setPayData({ amount: '', date: new Date().toISOString().split('T')[0] })
      fetchData() 
      success('Payment recorded successfully!')
    }
  }

  const openPayModal = (worker) => {
    setSelectedWorker(worker)
    setShowPayModal(true)
  }

  const openHistoryModal = (worker) => {
    setSelectedWorker(worker)
    setShowHistoryModal(true)
  }

  const getWorkerStats = (workerId) => {
    const workerTransactions = transactions.filter(t => {
      if (t.worker_id !== workerId) return false
      if (dateRange.from && dateRange.to) {
        const tDate = parseISO(t.date)
        const start = startOfDay(parseISO(dateRange.from))
        const end = endOfDay(parseISO(dateRange.to))
        return isWithinInterval(tDate, { start, end })
      }
      return true
    })
    const totalPaid = workerTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    return { totalPaid, transactionCount: workerTransactions.length }
  }

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.role && w.role.toLowerCase().includes(search.toLowerCase()))
  )

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentWorkers = filteredWorkers.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage)

  return (
    <div className="space-y-6 relative min-h-[80vh]">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pr-14 md:pr-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workers Management</h2>
          <p className="text-muted-foreground">Manage staff and track salary payments</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-secondary/80 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> 
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="hidden md:flex bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium items-center gap-2 hover:bg-primary/90 flex-1 md:flex-none justify-center"
            >
              <Plus className="w-4 h-4" /> Add Worker
            </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-end md:items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search by name or role..." 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="w-full md:w-auto">
           <DateRangePicker 
               from={dateRange.from}
               to={dateRange.to}
               onFromChange={(val) => setDateRange({...dateRange, from: val})}
               onToChange={(val) => setDateRange({...dateRange, to: val})}
               onClear={(dateRange.from || dateRange.to) ? () => setDateRange({ from: '', to: '' }) : null}
           />
         </div>
      </div>
      
      {/* Desktop Table View */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Base Salary</th>
                <th className="px-6 py-4 text-right">Total Paid</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
               {loading ? (
                 <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">Loading...</td></tr>
               ) : filteredWorkers.length === 0 ? (
                 <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">No workers found.</td></tr>
               ) : (
                 currentWorkers.map((worker) => {
                   const stats = getWorkerStats(worker.id)
                   return (
                     <tr key={worker.id} className="hover:bg-muted/30 transition-colors">
                       <td className="px-6 py-4 font-medium flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                            {worker.image_url ? (
                                <img src={worker.image_url} alt={worker.name} className="w-full h-full object-cover" />
                            ) : (
                                worker.name.charAt(0).toUpperCase()
                            )}
                          </div>
                         {worker.name}
                       </td>
                       <td className="px-6 py-4 text-muted-foreground">{worker.role || '-'}</td>
                       <td className="px-6 py-4">{worker.phone ? <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" /> {worker.phone}</div> : '-'}</td>
                       <td className="px-6 py-4 text-right">{worker.salary ? `₹${Number(worker.salary).toLocaleString()}` : '-'}</td>
                       <td className="px-6 py-4 text-right"><span className="font-bold text-green-600">₹{stats.totalPaid.toLocaleString()}</span></td>
                       <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                         <button 
                           onClick={() => openPayModal(worker)}
                           className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-medium transition-colors"
                         >
                           Pay Now
                         </button>
                         <button 
                           onClick={() => handleEdit(worker)}
                           className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                           title="Edit Worker"
                         >
                           <Pencil className="w-4 h-4" />
                         </button>
                         <button 
                             onClick={() => openHistoryModal(worker)}
                             className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                             title="View History"
                           >
                             <Eye className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => handleDelete(worker.id)}
                           className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                           title="Delete Worker"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </td>
                     </tr>
                   )
                 })
               )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Truncated for brevity, assuming standard mobile structure similar to Inventory) */}
      <div className="md:hidden space-y-4">
        {/* ... Similar mobile view code ... */}
        {currentWorkers.map((worker) => {
            const stats = getWorkerStats(worker.id)
            return (
                <div key={worker.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                                {worker.image_url ? <img src={worker.image_url} alt={worker.name} className="w-full h-full object-cover" /> : worker.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold">{worker.name}</h3>
                                <p className="text-sm text-muted-foreground">{worker.role || 'No Role'}</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => handleEdit(worker)} className="p-2 text-muted-foreground hover:bg-muted rounded-full"><Pencil className="w-5 h-5" /></button>
                            <button onClick={() => openHistoryModal(worker)} className="p-2 text-muted-foreground hover:bg-muted rounded-full"><Eye className="w-5 h-5" /></button>
                            <button onClick={() => handleDelete(worker.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><Trash2 className="w-5 h-5" /></button>
                        </div>
                    </div>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-3 rounded-lg">
                        <div><p className="text-muted-foreground text-xs mb-1">Base Salary</p><p className="font-medium">{worker.salary ? `₹${Number(worker.salary).toLocaleString()}` : '-'}</p></div>
                        <div><p className="text-muted-foreground text-xs mb-1">Total Paid</p><p className="font-medium text-green-600">₹{stats.totalPaid.toLocaleString()}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground text-xs mb-1">Contact</p><div className="flex items-center gap-1 font-medium">{worker.phone ? <><Phone className="w-3 h-3" /> {worker.phone}</> : '-'}</div></div>
                    </div>
                    <button onClick={() => openPayModal(worker)} className="w-full py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg font-medium text-sm transition-colors">Pay Now</button>
                </div>
            )
        })}
      </div>
      
      {/* Pagination */}
      {filteredWorkers.length > itemsPerPage && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      {/* FAB */}
      <button onClick={() => setShowModal(true)} className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex md:hidden items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"><Plus className="w-8 h-8" /></button>

      {/* Add Worker Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="text-xl font-bold">{editingId ? 'Edit Worker' : 'Add New Worker'}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-black/10 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Full Name</label>
                  <input required className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="text-sm font-medium mb-1 block">Role / Position</label>
                    <input className="w-full px-3 py-2 border border-input rounded-lg bg-background" placeholder="e.g. Helper" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
                  </div>
                   <div>
                    <label className="text-sm font-medium mb-1 block">Base Salary (₹)</label>
                    <input type="number" className="w-full px-3 py-2 border border-input rounded-lg bg-background" placeholder="Monthly" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone Number</label>
                  <input type="tel" className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                
                <div className="space-y-3">
                    <label className="text-sm font-medium">Profile Photo</label>
                    <ImageUploader 
                        initialImage={formData.image_url}
                        onUpload={(url) => setFormData({ ...formData, image_url: url })}
                        folder="workers"
                        placeholder="Upload Photo"
                    />
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                   <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg">Cancel</button>
                   <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">Save Worker</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Worker Modal */}
      <AnimatePresence>
        {showPayModal && selectedWorker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="text-xl font-bold">Pay {selectedWorker.name}</h3>
                <button onClick={() => setShowPayModal(false)} className="p-1 hover:bg-black/10 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-full text-primary"><IndianRupee className="w-5 h-5" /></div>
                   <div>
                     <p className="text-sm text-muted-foreground">Salary Payment</p>
                     <p className="font-semibold text-lg">{selectedWorker.role}</p>
                   </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount (₹)</label>
                  <input required type="number" className="w-full px-3 py-2 border border-input rounded-lg bg-background font-mono text-lg" value={payData.amount} onChange={(e) => setPayData({...payData, amount: e.target.value})} placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <input type="date" required className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={payData.date} onChange={(e) => setPayData({...payData, date: e.target.value})} />
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                   <button type="button" onClick={() => setShowPayModal(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg">Cancel</button>
                   <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">Record Payment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && selectedWorker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <div>
                  <h3 className="text-xl font-bold">{selectedWorker.name}</h3>
                  <div className="flex gap-2 text-xs mt-1">
                      <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">Log & Audit</span>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-black/10 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                   {/* 1. Transaction History (Payments) */}
                   <div>
                       <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider text-xs">
                           <IndianRupee className="w-3 h-3" /> Recent Payments
                       </h4>
                       {transactions.filter(t => t.worker_id === selectedWorker.id).length === 0 ? (
                           <div className="text-sm text-muted-foreground italic pl-2">No payments recorded.</div>
                       ) : (
                           <div className="space-y-2">
                               {transactions
                                   .filter(t => t.worker_id === selectedWorker.id)
                                   .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                   .slice(0, 5) // Last 5 payments
                                   .map((t) => (
                                   <div key={t.id} className="flex justify-between items-center text-sm bg-muted/20 p-2 rounded">
                                       <span className="text-muted-foreground">{format(new Date(t.date), 'dd MMM yyyy')}</span>
                                       <span className="font-medium">₹{Number(t.amount).toLocaleString()}</span>
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>

                   {/* 2. Audit History */}
                   <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider text-xs">
                           <FileText className="w-3 h-3" /> Profile Changes
                       </h4>
                       <AuditHistory tableName="workers" recordId={selectedWorker.id} />
                   </div>
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
