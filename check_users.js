
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lstcbwtkycctpabgptys.supabase.co'
const supabaseKey = 'sb_publishable_kwlw75P7_KqvvusIoWl-Cg_zVmHPFfA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUsers() {
  console.log('Checking profiles...')
  const { data, error } = await supabase.from('profiles').select('email, shop_name')
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Found profiles:', data)
  }
}

checkUsers()
