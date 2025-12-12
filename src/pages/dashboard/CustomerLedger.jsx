import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, MapPin, Receipt, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'

export default function CustomerLedger() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchCustomerDetails()
  }, [id])

  const fetchCustomerDetails = async () => {
    setLoading(true)
    
    // 1. Get Customer Info
    const { data: customerData, error: cError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
      
    if (cError) {
        console.error("Error fetching customer", cError)
    } else {
        setCustomer(customerData)
        
        // 2. Get Transaction History
        const { data: txns, error: tError } = await supabase
            .from('transactions')
            .select('*')
            .eq('customer_id', id)
            .order('date', { ascending: false })
            
        if (!tError) {
            setTransactions(txns || [])
        }
    }
    setLoading(false)
  }

  const calculateBalance = () => {
      // Logic: If 'pending', it's credit (Owed). If 'paid' (income), it's settled?
      // Wait, 'pending' means they owe us.
      // 'income' vs 'expense' is for US.
      // Usually customer ledger is:
      // - Sold Item (Debit) -> Amount increases
      // - Received Payment (Credit) -> Amount decreases
      
      // For now, let's just sum up "Pending" amounts as "Total Due".
      if (!transactions) return 0
      return transactions
        .filter(t => t.payment_status === 'pending')
        .reduce((sum, t) => sum + Number(t.amount), 0)
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Ledger...</div>
  if (!customer) return <div className="p-8 text-center">Customer not found.</div>

  const totalDue = calculateBalance()

  return (
    <div className="space-y-6">
       {/* Header with Back Button */}
       <div className="flex items-center gap-4">
           <button 
             onClick={() => navigate('/dashboard/customers')} 
             className="p-2 hover:bg-muted rounded-full transition-colors"
           >
               <ArrowLeft className="w-6 h-6" />
           </button>
           <h1 className="text-2xl font-bold">Customer Ledger</h1>
       </div>

       {/* Customer Profile Card */}
       <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
           <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                    {customer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                   <h2 className="text-xl font-bold">{customer.name}</h2>
                   <div className="text-muted-foreground space-y-1 mt-1 text-sm">
                       {customer.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4"/> {customer.phone}</div>}
                       {customer.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4"/> {customer.address}</div>}
                   </div>
                </div>
           </div>

           <div className="bg-muted/30 p-4 rounded-xl min-w-[200px] text-center md:text-right border border-border">
               <p className="text-sm font-medium text-muted-foreground">Total Pending Due</p>
               <p className={`text-3xl font-bold mt-1 ${totalDue > 0 ? 'text-red-500' : 'text-green-600'}`}>
                   ₹{totalDue.toLocaleString()}
               </p>
               {totalDue > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Unpaid</span>}
           </div>
       </div>

       {/* Transaction History */}
       <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
           <div className="p-4 border-b border-border bg-muted/20">
               <h3 className="font-bold flex items-center gap-2">
                   <Receipt className="w-4 h-4" /> Transaction History
               </h3>
           </div>
           
           {transactions.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground">No transactions found for this customer.</div>
           ) : (
               <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                       <thead className="bg-muted/50 text-muted-foreground font-medium text-left">
                           <tr>
                               <th className="p-4">Date</th>
                               <th className="p-4">Description</th>
                               <th className="p-4">Type</th>
                               <th className="p-4 text-center">Status</th>
                               <th className="p-4 text-right">Amount</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-border">
                           {transactions.map(t => (
                               <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                                   <td className="p-4 flex items-center gap-2">
                                       <Calendar className="w-4 h-4 text-muted-foreground" />
                                       {format(new Date(t.date), 'dd MMM yyyy')}
                                   </td>
                                   <td className="p-4 font-medium">{t.description || 'Sale'}</td>
                                   <td className="p-4 capitalize">{t.category}</td>
                                   <td className="p-4 text-center">
                                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                           t.payment_status === 'pending' 
                                            ? 'bg-red-100 text-red-600' 
                                            : 'bg-green-100 text-green-600'
                                       }`}>
                                           {t.payment_status === 'pending' ? 'Pending' : 'Paid'}
                                       </span>
                                   </td>
                                   <td className="p-4 text-right font-bold">₹{t.amount}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           )}
       </div>
    </div>
  )
}
