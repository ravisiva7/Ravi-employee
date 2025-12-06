import { createClient } from '@supabase/supabase-js';

// Using the keys provided by the user.
// Note: In standard Supabase setups, the key usually starts with 'ey...' (JWT).
// If 'sb_publishable' is a custom domain token, this will work. 
// If connection fails, please check Project Settings > API > anon public key.
const supabaseUrl = 'https://fcrtejzmehcvpatulubd.supabase.co';
const supabaseKey = 'sb_publishable_1zpzd-Fj3oT7cTTLoO9kkA_JBzcoc7y';

export const supabase = createClient(supabaseUrl, supabaseKey);