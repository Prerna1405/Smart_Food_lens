// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwqadnhmhhvlhbptlbxm.supabase.co';
const supabaseKey = 'sb_publishable_LfoN1-pEt-7oOm8P6sLNDA_iroWOMAd';

export const supabase = createClient(supabaseUrl, supabaseKey);