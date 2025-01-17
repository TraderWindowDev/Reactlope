import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

const supabaseUrl = 'https://tokxsggxbetgxoypadoo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRva3hzZ2d4YmV0Z3hveXBhZG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMjU0NjgsImV4cCI6MjA1MjYwMTQ2OH0.bagtfIUeeeaDPofMeUc6jnJrOTXm3nlZuc33dCM_BN4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    url: Linking.createURL(''),
  },
});