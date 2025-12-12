import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.", 
  variant = 'danger', // 'danger' or 'primary'
  confirmText = "Confirm",
  cancelText = "Cancel",
  showCancel = true
}) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border"
        >
          <div className="p-6 text-center space-y-4">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-primary/10 text-primary'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>

            <div className="flex gap-3 pt-2">
              {showCancel && (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-input rounded-xl text-sm font-medium hover:bg-muted transition-colors bg-background"
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm transition-colors ${
                  variant === 'danger' 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
