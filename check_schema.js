
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lstcbwtkycctpabgptys.supabase.co'
const supabaseKey = 'sb_publishable_kwlw75P7_KqvvusIoWl-Cg_zVmHPFfA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('Checking columns...')
  const { data: productsCols, error: pError } = await supabase
    .rpc('get_columns', { table_name: 'products' }) // Assume RPC doesn't exist, use simple select if possible, but reading info schema is restricted usually.
  
  // Since we can't easily query information_schema from client, we'll try to select one row and see the keys
  const { data: pData } = await supabase.from('products').select('*').limit(1)
  console.log('Product Keys:', pData && pData[0] ? Object.keys(pData[0]) : 'No data')

  const { data: tData } = await supabase.from('transactions').select('*').limit(1)
  console.log('Transaction Keys:', tData && tData[0] ? Object.keys(tData[0]) : 'No data')

  const { data: wData } = await supabase.from('workers').select('*').limit(1)
  console.log('Worker Keys:', wData && wData[0] ? Object.keys(wData[0]) : 'No data')
}

checkSchema()
