import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ivovcceeilqxqjjuffdf.supabase.co'
const supabaseAnonKey = 'sb_publishable_ZZ28Y1nUCdh8X_TyDFCFhw_WVSrPW11'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
