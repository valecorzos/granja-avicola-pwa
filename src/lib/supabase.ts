import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vauavydioioddxfqskzv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWF2eWRpb2lvZGR4ZnFza3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjA2NDgsImV4cCI6MjA5NTI5NjY0OH0.wRKXysVRbqmbewnMbYrdZ5si6JMVvrx6ZxXP8edHnh8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
