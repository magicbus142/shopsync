
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lstcbwtkycctpabgptys.supabase.co'
const supabaseKey = 'sb_publishable_kwlw75P7_KqvvusIoWl-Cg_zVmHPFfA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProfiles() {
  console.log('Checking profiles...')
  // Select columns that definitely exist
  const { data, error } = await supabase.from('profiles').select('id, shop_name, full_name')
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Found profiles:', data)
  }
}

checkProfiles()
