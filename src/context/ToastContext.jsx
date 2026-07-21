import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto dismiss
    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const contextValue = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
    remove: removeToast
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

const Toast = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />
  }

  const bgColors = {
    success: 'bg-background border-green-500/20',
    error: 'bg-background border-red-500/20',
    info: 'bg-background border-blue-500/20',
    warning: 'bg-background border-yellow-500/20'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      layout
      className={`min-w-[300px] p-4 rounded-xl border shadow-lg flex items-start gap-3 ${bgColors[type] || 'bg-background'} backdrop-blur-sm`}
    >
      <div className="mt-0.5">{icons[type]}</div>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}
