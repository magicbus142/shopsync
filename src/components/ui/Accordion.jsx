import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, GripVertical } from 'lucide-react'

export function AccordionItem({ title, icon: Icon, isOpen, onToggle, children, actions }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4 shadow-sm transition-all hover:shadow-md">
      <div 
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
            <div className={`p-2 rounded-lg ${isOpen ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {Icon && <Icon className="w-4 h-4" />}
            </div>
            <span className="font-semibold text-foreground">{title}</span>
        </div>
        
        <div className="flex items-center gap-2">
            {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
            <motion.div 
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
            >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="border-t border-border p-5 bg-card">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
