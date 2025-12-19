import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Package, Download, Pencil, Trash2, Eye, X, Activity, Tag, AlertTriangle, TrendingUp, LayoutGrid, Table } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'
import * as XLSX from 'xlsx'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import Pagination from '../../components/ui/Pagination'
import AuditHistory from '../../components/common/AuditHistory'
import ImageUploader from '../../components/common/ImageUploader'
import { useToast } from '../../context/ToastContext'

export default function Inventory() {
  const { currentOrg } = useOrganization()
  const toast = useToast()
  
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Initial State for New Product
  const initialProductState = { 
      name: '', sku: '', stock: '', minStock: '10', 
      image: '', price: '', buyingPrice: '', 
      dealerName: '', amountPaid: '' 
  }
  const [newProduct, setNewProduct] = useState(initialProductState)
  
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [recordPayment, setRecordPayment] = useState(false)
  
  // View/History State
  const [viewProduct, setViewProduct] = useState(null)
  const [viewMode, setViewMode] = useState('table') // 'grid' | 'table'
  const [supplierTransactions, setSupplierTransactions] = useState([])

  useEffect(() => {
     if (viewProduct?.supplier_name && viewProduct?.name) {
         fetchSupplierTransactions()
     } else {
         setSupplierTransactions([])
     }
  }, [viewProduct])

  const fetchSupplierTransactions = async () => {
    try {
        // Fetch transactions where party_name matches supplier OR description contains product name
        // We limit to recent 5 for brevity
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('organization_id', currentOrg.id)
            .ilike('party_name', viewProduct.supplier_name)
            .order('date', { ascending: false })
            .limit(5)
            
        if (error) console.error('Error fetching tx:', error)
        else setSupplierTransactions(data || [])
    } catch (err) {
        console.error(err)
    }
  }

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter])
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' 
  })

  // Start with loading products
  useEffect(() => {
    if (currentOrg) fetchProducts()
  }, [currentOrg])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', currentOrg.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  const handleDelete = (id) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Product',
        message: 'Are you sure you want to delete this product? This action cannot be undone.',
        variant: 'danger',
        showCancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
             const { error } = await supabase.from('products').delete().eq('id', id)
             if (error) {
               console.error(error)
               if (error.code === '23503') { // Foreign key violation
                   toast.error('Cannot delete product with associated records.')
               } else {
                   toast.error('Error deleting product')
               }
             } else {
               toast.success('Product deleted successfully')
               fetchProducts()
             }
        }
    })
  }

  const handleEdit = (product) => {
    setNewProduct({
      name: product.name,
      sku: product.sku || '',
      stock: product.stock,
      minStock: product.min_stock_level || 10,
      image: product.image_url || '',
      price: product.price || '',
      buyingPrice: product.buying_price || '', 
      dealerName: product.supplier_name || '', // Load saved supplier
      amountPaid: '' // Do not load previous payment info to avoid confusion
    })
    setRecordPayment(false)
    setEditingId(product.id)
    setShowAddForm(true)
  }

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "lekka-inventory.xlsx");
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    
    // Get User ID (Supabase Auth)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !currentOrg) { 
        toast.error("Authentication Error: Please login again.")
        return 
    }

    const item = {
       organization_id: currentOrg.id,
       name: newProduct.name,
       sku: newProduct.sku,
       stock: parseInt(newProduct.stock),
       min_stock_level: parseInt(newProduct.minStock),
       image_url: newProduct.image || null,
       price: parseFloat(newProduct.price) || 0,
       buying_price: parseFloat(newProduct.buyingPrice) || 0,
       supplier_name: recordPayment ? newProduct.dealerName : (newProduct.dealerName || null) 
    }
    
    if (!editingId) {
        item.user_id = user.id
        item.initial_stock = parseInt(newProduct.stock)
    }

    const executeSave = async () => {
        try {
            const cost = parseFloat(newProduct.buyingPrice) || 0

            if (editingId) {
                // UPDATE
                const { error } = await supabase
                    .from('products')
                    .update(item)
                    .eq('id', editingId)
                    
                if (error) throw error;
                toast.success("Product updated successfully")
            } else {
                // INSERT
                const { data: prodData, error } = await supabase.from('products').insert([item]).select()
        
                if (error) throw error;
                
                toast.success("Product added successfully")
                
                // Add Expense Transaction Logic
                const totalAmount = parseInt(newProduct.stock) * cost
                        
                if (recordPayment && totalAmount > 0) {
                    let payStatus = 'Paid'
                    let amtPaidNow = parseFloat(newProduct.amountPaid) || 0

                    if (amtPaidNow === 0) payStatus = 'Pending'
                    else if (amtPaidNow < totalAmount) payStatus = 'Partial'
                    else payStatus = 'Paid'

                    const { error: txError, data: txData } = await supabase.from('transactions').insert([{
                        organization_id: currentOrg.id,
                        user_id: user.id,
                        type: 'expense',
                        amount: totalAmount,
                        amount_paid: amtPaidNow, // Initial payment
                        category: 'Inventory Purchase',
                        description: `Stock Purchase: ${newProduct.stock} x ${newProduct.name}`,
                        date: new Date().toISOString().split('T')[0],
                        payment_status: payStatus,
                        payment_method: 'Cash', // Default to Cash for now
                        party_name: newProduct.dealerName
                    }]).select()

                    if (txError) {
                        console.error('Error adding expense:', txError)
                        toast.error("Product added, but failed to record expense info.")
                    } else if (amtPaidNow > 0 && txData?.[0]?.id) {
                         // Create Payment Record if paid > 0
                         const { error: payError } = await supabase.from('transaction_payments').insert([{
                             transaction_id: txData[0].id,
                             amount: amtPaidNow,
                             date: new Date().toISOString().split('T')[0],
                             payment_method: 'Cash'
                         }])
                         if (payError) console.error('Error recording payment history:', payError)
                    }
                }
            }

            closeForm()
            fetchProducts() 
        } catch (error) {
            console.error("Error saving product:", error)
            toast.error("Failed to save product")
        }
    }

    if (editingId) {
       setConfirmModal({
           isOpen: true,
           title: 'Save Changes',
           message: 'Are you sure you want to update this product?',
           variant: 'primary',
           onConfirm: executeSave
       })
    } else {
       await executeSave()
    }
  }

  const closeForm = () => {
      setShowAddForm(false)
      setNewProduct(initialProductState)
      setEditingId(null)
  }

  const getFilteredProducts = () => {
    let filtered = products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.sku && p.sku.includes(search))
    )

    if (filter === 'Low Stock') return filtered.filter(p => p.stock > 0 && p.stock <= p.min_stock_level)
    if (filter === 'In Stock') return filtered.filter(p => p.stock > p.min_stock_level)
    if (filter === 'Out of Stock') return filtered.filter(p => p.stock === 0)
    
    return filtered
  }

  const getStockStatus = (product) => {
    const min = product.min_stock_level || 10
    if (product.stock === 0) return { color: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-900/30', width: '0%' }
    if (product.stock <= min) return { color: 'bg-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', width: '40%' }
    return { color: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-900/30', width: '80%' }
  }

  const filteredProducts = getFilteredProducts()
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  return (
    <div className="w-full space-y-6 relative min-h-[80vh]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pr-14 md:pr-0">
         <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
         <div className="flex gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border mr-2">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Grid View"
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Table View"
                >
                    <Table className="w-4 h-4" />
                </button>
            </div>

            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-secondary/80 transition-colors shadow-sm"
              title="Export Inventory"
            >
              <Download className="w-4 h-4" /> 
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setShowAddForm(true)}
              className="hidden md:flex bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium items-center gap-2 hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
         </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name, SKU..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {['All', 'Low Stock', 'In Stock', 'Out of Stock'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card border border-border hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {viewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewProduct(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto relative"
            >
             <div className="bg-card border-none shadow-none mb-0 overflow-hidden relative">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2">
                             <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Activity className="w-5 h-5" />
                             </div>
                             <h3 className="text-xl font-bold tracking-tight">Product Insights</h3>
                        </div>
                        <button onClick={() => setViewProduct(null)} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Left: Image & Key Info */}
                        <div className="w-full md:w-auto flex flex-col gap-4">
                            <div className="w-full md:w-64 aspect-square rounded-2xl bg-muted border border-border overflow-hidden relative shadow-sm group mx-auto">
                                {viewProduct.image_url ? (
                                    <img src={viewProduct.image_url} alt={viewProduct.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <Package className="w-12 h-12 opacity-20 mb-2" />
                                        <span className="text-xs">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-3 left-3">
                                     <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wide ${
                                        viewProduct.stock > (viewProduct.min_stock_level || 10) 
                                        ? 'bg-white/90 text-green-700 dark:bg-black/80 dark:text-green-400'
                                        : 'bg-white/90 text-red-700 dark:bg-black/80 dark:text-red-400'
                                     }`}>
                                        {viewProduct.stock > (viewProduct.min_stock_level || 10) ? 'In Stock' : 'Low Stock'}
                                     </span>
                                </div>
                            </div>

                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50 md:w-64">
                                <h2 className="text-lg font-bold mb-0.5 truncate" title={viewProduct.name}>{viewProduct.name}</h2>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Tag className="w-3 h-3" /> SKU: {viewProduct.sku || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Right: Metrics Grid */}
                        <div className="flex-1 space-y-6 min-w-0">
                             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                                     <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Selling Price</p>
                                     <p className="text-2xl font-bold text-foreground">₹{viewProduct.price}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30">
                                     <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-1">Buying Price</p>
                                     <p className="text-2xl font-bold text-foreground">₹{viewProduct.buying_price || 0}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                                     <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Inventory Value</p>
                                     <p className="text-2xl font-bold text-foreground">
                                         ₹{(viewProduct.stock * (viewProduct.buying_price || 0)).toLocaleString()}
                                     </p>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                 <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                                      <div className="flex items-center gap-2 mb-2">
                                         <Package className="w-4 h-4 text-primary" />
                                         <span className="text-sm font-medium">Stock Status</span>
                                      </div>
                                      <div className="flex items-end gap-2">
                                          <span className="text-3xl font-bold">
                                              {viewProduct.stock} 
                                              <span className="text-lg text-muted-foreground font-normal"> / {Math.max(viewProduct.stock, viewProduct.initial_stock || 0)}</span>
                                          </span>
                                          <span className="text-sm text-muted-foreground mb-1">units</span>
                                      </div>
                                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 mb-1">
                                          <span>Current</span>
                                          <span>Total Ordered</span>
                                      </div>
                                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-primary transition-all duration-500" 
                                            style={{ 
                                                width: `${Math.min(100, (viewProduct.stock / Math.max(viewProduct.stock, viewProduct.initial_stock || 1)) * 100)}%` 
                                            }}
                                          ></div>
                                      </div>
                                 </div>

                                 <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                                      <div className="flex items-center gap-2 mb-2">
                                         <TrendingUp className="w-4 h-4 text-green-500" />
                                         <span className="text-sm font-medium">Profit Margin</span>
                                      </div>
                                      <div className="flex items-end gap-2">
                                          <span className="text-3xl font-bold text-green-600">
                                            {viewProduct.price > 0 && viewProduct.buying_price > 0 
                                                ? Math.round(((viewProduct.price - viewProduct.buying_price) / viewProduct.price) * 100) 
                                                : 0}%
                                          </span>
                                          <span className="text-sm text-muted-foreground mb-1">per unit</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-2">
                                          Potential Profit: ₹{(viewProduct.price - (viewProduct.buying_price || 0)).toLocaleString()} / unit
                                      </p>
                                 </div>
                             </div>

                             {viewProduct.supplier_name && (
                                 <div className="space-y-4">
                                     {/* Premium Supplier Card */}
                                     <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 relative overflow-hidden group">
                                         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                             <Package className="w-24 h-24 text-indigo-600" />
                                         </div>
                                         <div className="relative z-10 flex items-center gap-4">
                                             <div className="w-12 h-12 rounded-full bg-white dark:bg-indigo-950 flex items-center justify-center text-lg font-bold text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800">
                                                 {viewProduct.supplier_name.substring(0, 2).toUpperCase()}
                                             </div>
                                             <div>
                                                 <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Verified Supplier</p>
                                                 <h4 className="text-lg font-bold text-foreground">{viewProduct.supplier_name}</h4>
                                             </div>
                                         </div>
                                     </div>

                                     {/* Recent Payments List */}
                                     {supplierTransactions.length > 0 && (
                                         <div className="bg-card border border-border rounded-xl p-4">
                                             <h5 className="text-sm font-bold mb-3 flex items-center gap-2">
                                                 <Activity className="w-4 h-4 text-green-500" /> Recent Payments to Dealer
                                             </h5>
                                             <div className="space-y-2">
                                                 {supplierTransactions.map((tx, idx) => (
                                                     <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted transition-colors text-sm">
                                                         <div className="flex flex-col">
                                                             <span className="font-medium text-foreground">
                                                                 {tx.description && tx.description.includes(viewProduct.name) ? 'Stock Purchase' : 'Payment'}
                                                             </span>
                                                             <span className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</span>
                                                         </div>
                                                         <div className="text-right">
                                                             <div className="font-bold text-foreground">₹{tx.amount.toLocaleString()}</div>
                                                             <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                                 tx.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                                                 tx.payment_status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-700' : 
                                                                 'bg-red-100 text-red-700'
                                                             }`}>
                                                                 {tx.payment_status}
                                                             </span>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             )}
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-border">
                        <AuditHistory tableName="products" recordId={viewProduct.id} />
                    </div>
                </div>
             </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      {viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {currentItems.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card border border-border rounded-xl p-4 flex gap-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    {/* Image Section */}
                    <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative border border-border">
                       <div className="w-full h-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                         {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                         ) : (
                            <Package className="text-gray-300 w-8 h-8" />
                         )}
                       </div>
                    </div>
                    
                    {/* Content Section */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                       {/* Header: Name & Price */}
                       <div className="flex justify-between items-start gap-2">
                           <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-lg leading-tight truncate pr-2 group-hover:text-primary transition-colors" title={product.name}>
                                  {product.name}
                              </h3>
                              <div className="text-sm text-muted-foreground mt-0.5">SKU: {product.sku || 'N/A'}</div>
                           </div>
                           <span className="font-bold text-lg whitespace-nowrap flex-shrink-0">₹{product.price || 0}</span>
                       </div>

                       {/* Badge & Actions */}
                       <div className="flex items-center justify-between mt-2">
                           <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${
                               product.stock > (product.min_stock_level || 10) 
                                 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                 : product.stock === 0 
                                   ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                   : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                           }`}>
                               {product.stock > (product.min_stock_level || 10) ? 'In Stock' : product.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                           </span>

                           {/* Action Buttons */}
                           <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => setViewProduct(product)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-md" title="View History"><Eye className="w-3.5 h-3.5" /></button>
                             <button onClick={() => handleEdit(product)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"><Pencil className="w-3.5 h-3.5" /></button>
                             <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                           </div>
                       </div>

                       {/* Stats Grid */}
                       <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/50">
                           <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current Stock</p>
                              <p className="text-lg font-bold leading-none mt-0.5">{product.stock}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Buying Price</p>
                              <p className="text-lg font-bold text-muted-foreground leading-none mt-0.5">
                                  ₹{product.buying_price || 0}
                              </p>
                           </div>
                       </div>
                    </div>
                  </motion.div>
              ))}
            </AnimatePresence>
            {getFilteredProducts().length === 0 && (
               <div className="col-span-full text-center py-12 text-muted-foreground">
                 <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                 <p>No products found.</p>
               </div>
            )}
          </div>
      ) : (
          /* Table View */
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-[10px] tracking-wider border-b border-border">
                         <tr>
                             <th className="px-4 py-3 pl-6">Product</th>
                             <th className="px-4 py-3 text-center">Stock</th>
                             <th className="px-4 py-3 text-right">Selling Price</th>
                             <th className="px-4 py-3 text-right">Buying Price</th>
                             <th className="px-4 py-3 text-right">Profit / Unit</th>
                             <th className="px-4 py-3">Supplier</th>
                             <th className="px-4 py-3 text-right pr-6">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-border/50">
                         {currentItems.map((product) => (
                             <tr key={product.id} className="hover:bg-muted/30 transition-colors group">
                                 <td className="px-4 py-3 pl-6">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-lg bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                                             {product.image_url ? (
                                                 <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                             ) : (
                                                 <Package className="w-4 h-4 text-muted-foreground/50" />
                                             )}
                                         </div>
                                         <div className="flex flex-col min-w-0">
                                            <div className="font-medium text-foreground whitespace-normal break-words max-w-[180px] sm:max-w-[300px] leading-tight">{product.name}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono truncate">{product.sku || '-'}</div>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="px-4 py-3 text-center">
                                     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                          product.stock > (product.min_stock_level || 10) 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : product.stock === 0 
                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                     }`}>
                                         {product.stock}
                                     </span>
                                 </td>
                                 <td className="px-4 py-3 text-right font-medium">
                                     ₹{product.price || 0}
                                 </td>
                                 <td className="px-4 py-3 text-right text-muted-foreground">
                                     ₹{product.buying_price || 0}
                                 </td>
                                 <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                                     ₹{(product.price || 0) - (product.buying_price || 0)}
                                 </td>
                                 <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">
                                     {product.supplier_name || '-'}
                                 </td>
                                 <td className="px-4 py-3 text-right pr-6">
                                     <div className="flex items-center justify-end gap-1">
                                         <button onClick={() => setViewProduct(product)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-md" title="View Details">
                                             <Eye className="w-4 h-4" />
                                         </button>
                                         <button onClick={() => handleEdit(product)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md" title="Edit">
                                             <Pencil className="w-4 h-4" />
                                         </button>
                                         <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Delete">
                                             <Trash2 className="w-4 h-4" />
                                         </button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                         {currentItems.length === 0 && (
                             <tr>
                                 <td colSpan="7" className="px-4 py-12 text-center text-muted-foreground">
                                     <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                     No products found matching your search.
                                 </td>
                             </tr>
                         )}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      {/* Pagination */}
      {filteredProducts.length > itemsPerPage && (
        <Pagination 
           currentPage={currentPage}
           totalPages={totalPages}
           onPageChange={setCurrentPage}
        />
      )}

      {/* FAB */}
      <button 
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex md:hidden items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="text-xl font-bold">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={closeForm} className="p-1 hover:bg-black/10 rounded-full">
                  <X className="w-6 h-6" /> 
                </button>
              </div>
              
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Name</label>
                    <input 
                      required 
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SKU</label>
                    <input 
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      value={newProduct.sku}
                      onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selling Price (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Buying Price (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      value={newProduct.buyingPrice}
                      onChange={e => setNewProduct({...newProduct, buyingPrice: e.target.value})}
                      placeholder="Per Unit Cost"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Stock</label>
                    <input 
                      type="number"
                      required 
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      value={newProduct.stock}
                      onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min Stock Alert</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      value={newProduct.minStock}
                      onChange={e => setNewProduct({...newProduct, minStock: e.target.value})}
                    />
                  </div>
                </div>

                {/* Dealer Name (Visible in Edit too) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Supplier / Dealer Name</label>
                    <input 
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                        placeholder="e.g. ABC Suppliers"
                        value={newProduct.dealerName}
                        onChange={e => setNewProduct({...newProduct, dealerName: e.target.value})}
                    />
                </div>

                {/* Dealer & Payment Section (Only on Add) */}
                {!editingId && (
                    <div className="bg-muted/30 p-4 rounded-xl space-y-4 border border-border/50">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={recordPayment}
                                    onChange={e => setRecordPayment(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                Record Payment Details?
                            </label>
                            {recordPayment && newProduct.buyingPrice && newProduct.stock && (
                                 <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Total: ₹{(parseFloat(newProduct.buyingPrice) * parseInt(newProduct.stock)).toLocaleString()}
                                 </span>
                            )}
                        </div>

                        <AnimatePresence>
                            {recordPayment && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="grid grid-cols-1 gap-4 overflow-hidden pt-2"
                                >
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Amount Paid Now</label>
                                        <input 
                                            type="number"
                                            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                                            placeholder="0.00"
                                            value={newProduct.amountPaid}
                                            onChange={e => setNewProduct({...newProduct, amountPaid: e.target.value})}
                                        />
                                        {newProduct.buyingPrice && newProduct.stock && (
                                            <div className="text-[10px] text-right text-muted-foreground">
                                                Pending: <span className="text-red-500 font-medium">
                                                    ₹{Math.max(0, (parseFloat(newProduct.buyingPrice) * parseInt(newProduct.stock)) - (parseFloat(newProduct.amountPaid) || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
                
                {/* On Edit, no extra field needed as main one is shared */}
                {/* {editingId && ...} removed */}

                <div className="space-y-3">
                    <label className="text-sm font-medium">Product Image</label>
                    <ImageUploader 
                        initialImage={newProduct.image}
                        onUpload={(url) => setNewProduct({ ...newProduct, image: url })}
                        folder="inventory"
                        placeholder="Upload Product Image"
                    />
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                   <button 
                     type="button"
                     onClick={closeForm}
                     className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                   >
                     {editingId ? 'Save Changes' : 'Add Product'}
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
