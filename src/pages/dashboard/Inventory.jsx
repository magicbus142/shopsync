import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Package, Download, Upload, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import ConfirmationModal from '../../components/ui/ConfirmationModal'

export default function Inventory() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', stock: '', minStock: '10', image: '', price: '' })
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: () => {},
    variant: 'danger' 
  })

  // Start with loading products
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  const handleImageUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      if (data) {
          setNewProduct({ ...newProduct, image: data.publicUrl })
      }
    } catch (error) {
      alert('Error uploading image: ' + error.message)
    } finally {
      setUploading(false)
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
                   setConfirmModal({
                       isOpen: true,
                       title: 'Cannot Delete Product',
                       message: 'This product is part of existing transactions. You cannot delete it while it has associated records. Please delete the transactions first.',
                       variant: 'danger',
                       showCancel: false,
                       confirmText: 'Okay',
                       onConfirm: () => {}
                   })
               } else {
                   alert('Error deleting product')
               }
             } else {
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
      price: product.price || ''
    })
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
    
    // [TESTING MODE] Get User ID
    let userId = null
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
    else {
       const local = localStorage.getItem('user')
       if (local) userId = JSON.parse(local).id
    }

    if (!userId) {
       alert('User not found')
       return
    }

    const item = {
       user_id: userId,
       name: newProduct.name,
       sku: newProduct.sku,
       stock: parseInt(newProduct.stock),
       min_stock_level: parseInt(newProduct.minStock),
       image_url: newProduct.image || null,
       price: parseFloat(newProduct.price) || 0
    }
    
    if (!editingId) {
        item.initial_stock = parseInt(newProduct.stock)
    }

    const executeSave = async () => {
        if (editingId) {
            const { error } = await supabase
                .from('products')
                .update(item)
                .eq('id', editingId)
                
            if (error) {
               alert('Failed to update product')
               console.error(error)
            } else {
                setShowAddForm(false)
                setNewProduct({ name: '', sku: '', stock: '', minStock: '10', image: '', price: '' })
                setEditingId(null)
                fetchProducts() 
            }
        } else {
            const { error } = await supabase.from('products').insert([item])
    
            if (error) {
               alert('Failed to add product')
               console.error(error)
            } else {
                setShowAddForm(false)
                setNewProduct({ name: '', sku: '', stock: '', minStock: '10', image: '', price: '' })
                fetchProducts() 
            }
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
       executeSave()
    }
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

  return (
    <div className="w-full space-y-6 relative min-h-[80vh]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pr-14 md:pr-0">
         <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
         <div className="flex gap-2">
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

      {/* Product List - Grid on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {getFilteredProducts().map((product) => {
            const status = getStockStatus(product)
            return (
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

                       {/* Action Buttons (Hover only or visible on mobile) */}
                       <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
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
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Received</p>
                          <p className={`text-lg font-bold leading-none mt-0.5 ${product.stock >= (product.initial_stock || 0) ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {product.initial_stock ? `+${product.initial_stock}` : '-'}
                          </p>
                       </div>
                   </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {getFilteredProducts().length === 0 && (
           <div className="col-span-full text-center py-12 text-muted-foreground">
             <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p>No products found.</p>
           </div>
        )}
        
      </div>

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
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="text-xl font-bold">Add New Product</h3>
                <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-black/10 rounded-full">
                  <span className="sr-only">Close</span>
                  <Plus className="w-6 h-6 rotate-45" /> 
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
                    <label className="text-sm font-medium">Price (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Initial Stock</label>
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

                <div className="space-y-3">
                    <label className="text-sm font-medium">Product Image</label>
                    <div className="flex gap-4 items-start">
                        <div className="flex-1 space-y-2">
                            <input 
                              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                              placeholder="Image URL (https://...)"
                              value={newProduct.image}
                              onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">OR</span>
                                <label className="cursor-pointer text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-md transition-colors flex items-center gap-2">
                                    <Upload className="w-3 h-3" /> 
                                    {uploading ? 'Uploading...' : 'Upload Photo'}
                                    <input 
                                       type="file" 
                                       className="hidden" 
                                       accept="image/*"
                                       onChange={handleImageUpload}
                                       disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>
                        {newProduct.image && (
                            <div className="w-16 h-16 rounded-lg border border-border bg-muted overflow-hidden">
                                <img 
                                  src={newProduct.image} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none' }} 
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                   <button 
                     type="button"
                     onClick={() => setShowAddForm(false)}
                     className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     disabled={uploading}
                     className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                   >
                     {uploading ? 'Wait...' : 'Add Product'}
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
