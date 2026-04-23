import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwqadnhmhhvlhbptlbxm.supabase.co';
const supabaseAnonKey = 'sb_publishable_LfoN1-pEt-7oOm8P6sLNDA_iroWOMAd';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
