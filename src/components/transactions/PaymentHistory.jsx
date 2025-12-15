import React from 'react'
import { format } from 'date-fns'
import { Trash2, Plus, CreditCard } from 'lucide-react'

// Props:
// - payments (array): List of payments from transaction_payments table
// - totalAmount (number): Total transaction amount
// - onAddPayment (func): Callback to add payment
// - onRemovePayment (func): Callback to remove payment (optional)
export default function PaymentHistory({ payments = [], totalAmount, onAddPayment, onRemovePayment, readOnly = false }) {
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const balance = Math.max(0, totalAmount - totalPaid)
    const status = totalPaid >= totalAmount ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending'

    const [newPayment, setNewPayment] = React.useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash'
    })

    const handleAdd = () => {
        if (!newPayment.amount || Number(newPayment.amount) <= 0) return
        onAddPayment(newPayment)
        setNewPayment({ ...newPayment, amount: '' })
    }

    return (
        <div className="space-y-6">
            <h4 className="text-base font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="w-4 h-4 text-primary" /> Payment History
            </h4>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Total Amount</p>
                    <p className="text-lg font-bold">₹{Number(totalAmount).toLocaleString()}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Total Paid</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">₹{totalPaid.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Balance Due</p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">₹{balance.toLocaleString()}</p>
                </div>
            </div>

            {/* Payment List */}
            <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-medium text-muted-foreground px-2">
                    <span>Date & Method</span>
                    <span>Amount</span>
                </div>
                
                {payments.length === 0 && (
                     <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border">
                        No payments recorded yet.
                     </div>
                )}
                
                <div className="space-y-2">
                {payments.map((p, i) => (
                    <div key={p.id || i} className="group flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                                 {p.payment_method === 'Cash' ? '💵' : p.payment_method === 'UPI' ? '📱' : '🏦'}
                             </div>
                             <div>
                                 <p className="text-sm font-medium text-foreground">{format(new Date(p.date), 'dd MMM yyyy')}</p>
                                 <p className="text-xs text-muted-foreground">{p.payment_method}</p>
                             </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <span className="font-bold text-foreground">₹{Number(p.amount).toLocaleString()}</span>
                             {!readOnly && onRemovePayment && (
                                <button onClick={() => onRemovePayment(p.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all" title="Delete Payment">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             )}
                        </div>
                    </div>
                ))}
                </div>
            </div>

            {/* Add New Payment Form */}
            {!readOnly && balance > 0 && (
                <div className="pt-2 border-t border-border mt-4">
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-1 bg-primary rounded-full"></div>
                            <h5 className="font-semibold text-sm">Record New Payment</h5>
                        </div>
                        
                        <div className="space-y-4">
                             {/* Amount */}
                             <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount Received</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                    <input 
                                        type="number" 
                                        className="w-full pl-7 pr-3 py-2.5 text-base rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all font-bold" 
                                        value={newPayment.amount} 
                                        placeholder={`Max: ${balance}`}
                                        onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background" 
                                        value={newPayment.date} 
                                        onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                                    />
                                </div>
                                {/* Method */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Mode</label>
                                    <select 
                                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background"
                                        value={newPayment.payment_method}
                                        onChange={e => setNewPayment({...newPayment, payment_method: e.target.value})}
                                    >
                                        <option>Cash</option>
                                        <option>UPI</option>
                                        <option>Bank Transfer</option>
                                        <option>Cheque</option>
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={handleAdd}
                                disabled={!newPayment.amount}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 font-bold text-sm"
                                title="Add Payment"
                            >
                                <Plus className="w-5 h-5" /> Add Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
