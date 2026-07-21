import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Package, Download, Pencil, Trash2, Eye, X, Activity, Tag, Activity as TrendingUp, LayoutGrid, List } from 'lucide-react'
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
  const [viewType, setViewType] = useState('grid') // Default to grid view
  
  // View/History State
  const [viewProduct, setViewProduct] = useState(null)
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
  const itemsPerPage = 12 // Updated as per previous requirement

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
    if (!currentOrg) return
    setLoading(true)
    try {
      const { data: prods, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error

      // Fetch all income transactions for this org to calculate total sold per product
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

      // Sync product stock if necessary
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
    } finally {
      setLoading(false)
    }
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
      dealerName: product.supplier_name || '',
      amountPaid: ''
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
       supplier_name: newProduct.dealerName || null 
    }
    
    if (!editingId) {
        item.user_id = user.id
        item.initial_stock = parseInt(newProduct.stock)
    }

    const executeSave = async () => {
        try {
            const cost = parseFloat(newProduct.buyingPrice) || 0

            if (editingId) {
                const { error } = await supabase
                    .from('products')
                    .update(item)
                    .eq('id', editingId)
                    
                if (error) throw error;
                toast.success("Product updated successfully")
            } else {
                const { data: prodData, error } = await supabase.from('products').insert([item]).select()
                if (error) throw error;
                toast.success("Product added successfully")
                
                const totalAmount = parseInt(newProduct.stock) * cost
                if (totalAmount > 0) {
                    const { error: txError, data: txData } = await supabase.from('transactions').insert([{
                        organization_id: currentOrg.id,
                        user_id: user.id,
                        type: 'expense',
                        amount: totalAmount,
                        amount_paid: totalAmount,
                        category: 'Inventory Purchase',
                        description: `Stock Purchase: ${newProduct.stock} x ${newProduct.name}`,
                        date: new Date().toISOString().split('T')[0],
                        payment_status: 'paid',
                        payment_method: 'Cash',
                        party_name: newProduct.dealerName
                    }]).select()

                    if (txError) {
                        console.error('Error adding expense:', txError)
                        toast.error("Product added, but failed to record expense info: " + txError.message)
                    } else if (txData?.[0]?.id) {
                         const { error: payError } = await supabase.from('transaction_payments').insert([{
                             transaction_id: txData[0].id,
                             amount: totalAmount,
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
            <div className="hidden md:flex bg-card border border-border rounded-lg p-1 mr-2">
              <button 
                onClick={() => setViewType('grid')}
                className={`p-1.5 rounded ${viewType === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewType('list')}
                className={`p-1.5 rounded ${viewType === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
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
              {/* Modal Content */}
              <div className="p-0 relative">
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
                        {/* Left: Image Box */}
                        <div className="w-full md:w-auto flex flex-col gap-4">
                            <div className="w-full md:w-52 aspect-square rounded-2xl bg-muted border border-border overflow-hidden relative shadow-inner flex items-center justify-center">
                                {viewProduct.image_url ? (
                                    <img src={viewProduct.image_url} alt={viewProduct.name} className="w-full h-full object-contain p-4" />
                                ) : (
                                    <Package className="w-16 h-16 text-muted-foreground/20" />
                                )}
                            </div>
                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                <h4 className="text-base font-bold mb-0.5 truncate">{viewProduct.name}</h4>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">SKU: {viewProduct.sku || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Right: Info Panels */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/5 border border-indigo-100 dark:border-indigo-900/10">
                                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Selling Price</p>
                                    <p className="text-xl font-bold">₹{viewProduct.price}</p>
                                </div>
                                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/5 border border-emerald-100 dark:border-emerald-900/10">
                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Buying Price</p>
                                    <p className="text-xl font-bold">₹{viewProduct.buying_price || 0}</p>
                                </div>
                                <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-900/5 border border-orange-100 dark:border-orange-900/10">
                                    <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Value</p>
                                    <p className="text-xl font-bold">₹{(viewProduct.stock * (viewProduct.buying_price || 0)).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-border bg-card/50">
                                <div className="flex justify-between items-center mb-3">
                                    <h5 className="text-xs font-bold flex items-center gap-2 text-muted-foreground">
                                        <Package className="w-3.5 h-3.5 text-primary" /> CURRENT STOCK
                                    </h5>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        viewProduct.stock > (viewProduct.min_stock_level || 10) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                        {viewProduct.stock > (viewProduct.min_stock_level || 10) ? 'HEALTHY' : 'LOW STOCK'}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2 mb-2 pt-1">
                                    <span className="text-3xl font-bold">{viewProduct.stock}</span>
                                    <span className="text-sm text-muted-foreground font-bold">/ {viewProduct.initial_stock || viewProduct.stock} Units</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">
                                    Inventory Capacity Status
                                </div>
                            </div>

                            {viewProduct.supplier_name && (
                                <div className="p-4 rounded-xl border border-border bg-card/50">
                                    <h5 className="text-xs font-bold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                        <Activity className="w-3.5 h-3.5 text-indigo-500" /> Supplier Info
                                    </h5>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                            {viewProduct.supplier_name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-base font-bold leading-tight">{viewProduct.supplier_name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">Verified Partner</p>
                                        </div>
                                    </div>
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

      {/* Main Content View */}
      <div className="flex-1">
          {/* MOBILE VIEW */}
          <div className="md:hidden space-y-4">
              <AnimatePresence mode="popLayout">
                  {currentItems.map((product) => (
                      <motion.div
                          key={product.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-card border border-border rounded-xl p-4 flex gap-4 shadow-sm"
                      >
                          <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center">
                              {product.image_url ? (
                                  <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                  <Package className="w-8 h-8 text-muted-foreground/20" />
                              )}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                  <h3 className="font-bold truncate pr-6">{product.name}</h3>
                                  <button onClick={() => setViewProduct(product)} className="p-1 hover:bg-muted rounded-md">
                                      <Eye className="w-4 h-4 text-muted-foreground" />
                                  </button>
                              </div>
                              <p className="text-lg font-bold mt-1 text-primary">₹{product.price}</p>
                              <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                      product.stock > (product.min_stock_level || 10) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                      {product.stock} Units
                                  </span>
                              </div>
                          </div>
                      </motion.div>
                  ))}
              </AnimatePresence>
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden md:block">
              {viewType === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <AnimatePresence mode="popLayout">
                          {currentItems.map((product) => (
                             <motion.div
                                key={product.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-card border border-border rounded-[20px] p-4 flex gap-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                             >
                                {/* Selection/Checkbox indicator if needed, or simple status dot */}
                                <div className={`absolute top-0 right-0 w-1.5 h-full ${product.stock > (product.min_stock_level || 10) ? 'bg-green-500' : 'bg-red-500'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                
                                {/* Left: Image Box */}
                                <div className="w-22 h-22 rounded-[14px] bg-slate-50 dark:bg-muted/40 flex-shrink-0 flex items-center justify-center border border-border shadow-inner group-hover:border-primary/20 transition-colors overflow-hidden">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <Package className="w-8 h-8 text-muted-foreground/30" />
                                    )}
                                </div>

                                {/* Right: Card Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <h3 className="text-base font-bold text-indigo-600 dark:text-indigo-400 leading-tight truncate group-hover:text-primary transition-colors pr-1" title={product.name}>
                                                {product.name}
                                            </h3>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                <button onClick={() => setViewProduct(product)} className="p-1 hover:bg-slate-100 dark:hover:bg-muted rounded text-slate-400 hover:text-primary transition-colors" title="View Details"><Eye className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleEdit(product)} className="p-1 hover:bg-slate-100 dark:hover:bg-muted rounded text-slate-400 hover:text-blue-500 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDelete(product.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">SKU: {product.sku || 'N/A'}</p>
                                    </div>

                                    <div className="mt-2 text-right">
                                         <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm uppercase tracking-wide border ${
                                            product.stock > (product.min_stock_level || 10) 
                                            ? 'bg-green-50 text-green-700 border-green-200' 
                                            : 'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                            {product.stock > (product.min_stock_level || 10) ? 'In Stock' : 'Low Stock'}
                                        </span>
                                    </div>

                                    <div className="mt-2">
                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Price</span>
                                                <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">₹{product.price}</span>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{product.stock} / {product.initial_stock || product.stock}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Units</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </motion.div>
                          ))}
                      </AnimatePresence>
                  </div>
              ) : (
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
                                                      <div className="font-medium text-foreground leading-tight truncate max-w-[200px]">{product.name}</div>
                                                      <div className="text-[10px] text-muted-foreground font-mono truncate">{product.sku || '-'}</div>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                                  product.stock > (product.min_stock_level || 10) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                              }`}>
                                                  {product.stock}
                                              </span>
                                          </td>
                                          <td className="px-4 py-3 text-right font-medium text-foreground">₹{product.price || 0}</td>
                                          <td className="px-4 py-3 text-right text-muted-foreground font-medium">₹{product.buying_price || 0}</td>
                                          <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">₹{(product.price || 0) - (product.buying_price || 0)}</td>
                                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap truncate max-w-[120px]">{product.supplier_name || '-'}</td>
                                          <td className="px-4 py-3 text-right pr-6">
                                              <div className="flex items-center justify-end gap-1">
                                                  <button onClick={() => setViewProduct(product)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"><Eye className="w-4 h-4" /></button>
                                                  <button onClick={() => handleEdit(product)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md"><Pencil className="w-4 h-4" /></button>
                                                  <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
          </div>
          
          {currentItems.length === 0 && (
              <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl mt-4">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <h3 className="text-xl font-medium text-muted-foreground">No matching products found</h3>
                  <p className="text-sm text-muted-foreground/60">Try searching for something else or clear filters.</p>
              </div>
          )}
      </div>

      {/* Footer Actions: Pagination */}
      {filteredProducts.length > itemsPerPage && (
        <div className="pt-8">
            <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
      )}

      {/* FAB Mobile Only */}
      <button 
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex md:hidden items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Add/Edit Modal */}
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
                <button onClick={closeForm} className="p-1 hover:bg-muted rounded-full">
                  <X className="w-6 h-6" /> 
                </button>
              </div>
              
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Product Name</label>
                    <input required className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SKU (Optional)</label>
                    <input className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Initial Stock</label>
                    <input type="number" required className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selling Price (₹)</label>
                    <input type="number" className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Buying Price (₹)</label>
                    <input type="number" className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={newProduct.buyingPrice} onChange={e => setNewProduct({...newProduct, buyingPrice: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Supplier / Dealer Name</label>
                    <input className="w-full px-3 py-2 border border-input rounded-lg bg-background" value={newProduct.dealerName} onChange={e => setNewProduct({...newProduct, dealerName: e.target.value})} placeholder="e.g. ABC Wholesalers" />
                </div>


                <div className="space-y-3">
                    <label className="text-sm font-medium">Product Image</label>
                    <ImageUploader 
                        initialImage={newProduct.image}
                        onUpload={(url) => setNewProduct({ ...newProduct, image: url })}
                        folder="inventory"
                        placeholder="Upload Image"
                    />
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                   <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg">Cancel</button>
                   <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 shadow-md">
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
