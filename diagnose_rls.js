
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lstcbwtkycctpabgptys.supabase.co'
const supabaseKey = 'sb_publishable_kwlw75P7_KqvvusIoWl-Cg_zVmHPFfA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---')
  
  // 1. Try to read data anonymously (Should be 0 if RLS is ON)
  const { data, error } = await supabase.from('transactions').select('id, user_id, amount').limit(5)
  
  if (error) {
    console.log('Read Error (Good if explicit deny):', error.message)
  } else {
    console.log(`Anonymous Read: Found ${data.length} records.`)
    console.log('Sample:', data)
    if (data.length > 0) {
        console.error('CRITICAL: Data is leaking to anonymous users! All policies failed.')
    } else {
        console.log('Anonymous Read: Secure (0 records).')
    }
  }
}

diagnose()
