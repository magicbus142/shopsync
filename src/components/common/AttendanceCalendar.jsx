import React, { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, Check, X, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

export default function AttendanceCalendar({ workerId, organizationId, onAttendanceChange, mode = 'view' }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [attendance, setAttendance] = useState({})
  const [initialAttendance, setInitialAttendance] = useState({}) // To track changes
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { success, error: toastError } = useToast()

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => {
    fetchAttendance()
  }, [currentDate, workerId])

  const fetchAttendance = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('worker_attendance')
      .select('*')
      .eq('worker_id', workerId)
      .eq('organization_id', organizationId)
      .gte('date', format(monthStart, 'yyyy-MM-dd'))
      .lte('date', format(monthEnd, 'yyyy-MM-dd'))

    if (error) {
      console.error('Error fetching attendance:', error)
    } else {
      const attendanceMap = {}
      data?.forEach(record => {
        attendanceMap[record.date] = record.status
      })
      setAttendance(attendanceMap)
      setInitialAttendance({ ...attendanceMap })
    }
    setLoading(false)
  }

  const handleDayClick = (date) => {
    if (mode === 'view') return

    const dateStr = format(date, 'yyyy-MM-dd')
    const currentStatus = attendance[dateStr]
    
    // Cycle: Present -> Absent -> Clear
    let nextStatus = 'present'
    if (currentStatus === 'present') nextStatus = 'absent'
    else if (currentStatus === 'absent') nextStatus = null

    setAttendance(prev => {
        const next = { ...prev }
        if (nextStatus) next[dateStr] = nextStatus
        else delete next[dateStr]
        return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Identify changes
    const allDates = Array.from(new Set([...Object.keys(initialAttendance), ...Object.keys(attendance)]))
    const toUpsert = []
    const toDelete = []

    allDates.forEach(date => {
        const initial = initialAttendance[date]
        const current = attendance[date]
        
        if (initial !== current) {
            if (current) {
                toUpsert.push({
                    worker_id: workerId,
                    organization_id: organizationId,
                    date: date,
                    status: current
                })
            } else {
                toDelete.push(date)
            }
        }
    })

    try {
        if (toUpsert.length > 0) {
            const { error } = await supabase
                .from('worker_attendance')
                .upsert(toUpsert, { onConflict: 'worker_id, date' })
            if (error) throw error
        }

        if (toDelete.length > 0) {
            const { error } = await supabase
                .from('worker_attendance')
                .delete()
                .eq('worker_id', workerId)
                .in('date', toDelete)
            if (error) throw error
        }

        success('Attendance saved successfully')
        setInitialAttendance({ ...attendance })
        if (onAttendanceChange) onAttendanceChange()
    } catch (err) {
        console.error('Error saving attendance:', err)
        toastError('Failed to save attendance')
    } finally {
        setSaving(false)
    }
  }

  const getDayStyles = (status, isToday) => {
    let base = "aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all shadow-sm "
    
    if (status === 'present') base += "bg-green-500 text-white hover:bg-green-600 "
    else if (status === 'absent') base += "bg-red-500 text-white hover:bg-red-600 " 
    else base += "bg-muted/30 text-muted-foreground hover:bg-muted "

    if (isToday) base += "ring-2 ring-offset-1 ring-primary "
    if (mode === 'view') base += "cursor-default "
    
    return base
  }

  const stats = {
      present: Object.values(attendance).filter(s => s === 'present').length,
  }

  const hasChanges = JSON.stringify(attendance) !== JSON.stringify(initialAttendance)

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm relative">
      <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 items-center bg-muted/20 rounded-lg p-1">
             <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-background rounded-md transition-colors"><ChevronLeft className="w-4 h-4" /></button>
             <span className="text-sm font-semibold px-2 min-w-[100px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
             <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-background rounded-md transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'edit' && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasChanges ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {hasChanges ? 'UNSAVED' : 'SAVED'}
                </span>
            )}
            {(loading || saving) && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Stats */}
          <div className="flex-1 flex flex-col justify-center min-w-[120px]">
              <span className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">{stats.present}</span>
              <span className="text-muted-foreground text-sm font-medium mt-1">Days Worked</span>
              <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500"></div> Present
                  </div>
                  <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded bg-red-500"></div> Absent
                  </div>
              </div>
          </div>

          {/* Right: Calendar Grid */}
          <div className="flex-[3]">
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs text-muted-foreground">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="font-medium">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {daysInMonth.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const status = attendance[dateStr]
                    const isToday = isSameDay(day, new Date())
                    
                    return (
                        <button
                            key={dateStr}
                            onClick={() => handleDayClick(day)}
                            disabled={loading || saving}
                            className={getDayStyles(status, isToday)}
                            title={mode === 'edit' ? (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Click to mark') : ''}
                        >
                            {status === 'present' && <Check className="w-4 h-4" strokeWidth={3} />}
                            {status === 'absent' && <X className="w-4 h-4" strokeWidth={3} />}
                            {!status && format(day, 'd')}
                        </button>
                    )
                })}
            </div>

            {mode === 'edit' && (
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-md ${hasChanges ? 'bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Attendance
                    </button>
                </div>
            )}
          </div>
      </div>
    </div>
  )
}
