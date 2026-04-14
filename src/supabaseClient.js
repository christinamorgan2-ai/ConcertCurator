import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jojbqbheyxjljunjoidg.supabase.co'
const supabaseKey = 'sb_publishable_7K3oqheKRtD0_q-U9xDTmQ_1CuFo4if'

export const supabase = createClient(supabaseUrl, supabaseKey)
