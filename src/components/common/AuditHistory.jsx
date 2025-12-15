import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { History, ChevronDown, ChevronRight, User } from 'lucide-react'

// Generic component to show history of any record
// Props: tableName (required), recordId (required)
export default function AuditHistory({ tableName, recordId }) {
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (isOpen && recordId && tableName) {
            fetchHistory()
        }
    }, [isOpen, recordId, tableName])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            // Join with profiles/users if possible to get names, but for now we might just have IDs
            // Note: Supabase direct join with auth.users is restricted. 
            // We'll rely on stored changed_by ID or simple lookup if we have a users table copy.
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('table_name', tableName)
                .eq('record_id', recordId)
                .order('changed_at', { ascending: false })

            if (error) throw error
            setHistory(data || [])
        } catch (err) {
            console.error('Error fetching history:', err)
        } finally {
            setLoading(false)
        }
    }

    // Helper to format differences
    const getDiff = (oldData, newData) => {
        if (!oldData || !newData) return null
        const changes = []
        
        // Check new data keys against old
        Object.keys(newData).forEach(key => {
            if (key === 'updated_at' || key === 'id' || key === 'organization_id') return // Skip meta fields

            if (JSON.stringify(newData[key]) !== JSON.stringify(oldData[key])) {
                changes.push({
                    field: key,
                    old: oldData[key],
                    new: newData[key]
                })
            }
        })
        return changes
    }

    if (!recordId) return null

    return (
        <div className="mt-4 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Detailed Change History</span>
                    <span className="text-xs bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">
                        {history.length > 0 ? history.length : 'View'}
                    </span>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: 'auto' }} 
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="text-center text-sm text-zinc-500 py-4">Loading history...</div>
                            ) : history.length === 0 ? (
                                <div className="text-center text-sm text-zinc-500 py-4">No specific history recorded yet.</div>
                            ) : (
                                <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-2 space-y-6">
                                    {history.map((log) => {
                                        const diffs = log.action === 'UPDATE' ? getDiff(log.old_data, log.new_data) : null

                                        return (
                                            <div key={log.id} className="relative pl-6">
                                                {/* Timeline Dot */}
                                                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900" />
                                                
                                                <div className="flex flex-col gap-1 mb-1">
                                                    <span className="text-xs text-zinc-400 font-mono">
                                                        {format(new Date(log.changed_at), 'MMM dd, yyyy h:mm a')}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold uppercase px-1.5 rounded ${
                                                            log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                                                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {log.action}
                                                        </span>
                                                        {/* Optional: User ID if needed */}
                                                        {/* <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <User className="w-3 h-3" /> User {log.changed_by?.slice(0,4)}
                                                        </span> */}
                                                    </div>
                                                </div>

                                                {/* Changes */}
                                                {log.action === 'INSERT' && (
                                                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                                        Record Created.
                                                    </div>
                                                )}

                                                {log.action === 'UPDATE' && diffs && (
                                                    <div className="mt-2 text-xs space-y-1 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                                        {diffs.map((d, i) => (
                                                            <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                                                                <span className="font-semibold text-zinc-700 dark:text-zinc-300 w-24 shrink-0">{d.field}:</span>
                                                                <span className="text-red-500 line-through decoration-red-500/50 mr-2">{String(d.old || 'empty')}</span>
                                                                <span className="text-zinc-400 text-[10px] mr-2">→</span>
                                                                <span className="text-green-600 font-medium">{String(d.new || 'empty')}</span>
                                                            </div>
                                                        ))}
                                                        {diffs.length === 0 && <span className="text-zinc-400 italic">No visible field changes (meta update)</span>}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
