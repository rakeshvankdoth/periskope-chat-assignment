// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zmqsiiwssojykmpfwvzn.supabase.co';        // <-- Paste your Supabase project URL here
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcXNpaXdzc29qeWttcGZ3dnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4OTQyMzAsImV4cCI6MjA2MzQ3MDIzMH0.6EAPM_KD-J6mzvvr8nAwzjH6OnVPd-Gdk9ciwa1J0wA'; // <-- Paste your Supabase anon public key here

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey?.slice(0, 8) + '...'); // don't print full key!
