import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'public-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const channel = supabase.channel('test');
const res = channel.send({ type: 'broadcast', event: 'test', payload: {} });
console.log("SEND RETURNS:", res);
