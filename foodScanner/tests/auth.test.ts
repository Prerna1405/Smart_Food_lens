import { supabase } from '../lib/supabase';

/**
 * Production Auth Integration Tests
 */
export const runAuthTests = async () => {
  console.log('--- 🚀 Starting Auth Integration Tests ---');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testUsername = 'testuser';

  // 1. Connection Test
  try {
    const { data: { session }, error: connError } = await supabase.auth.getSession();
    if (connError) throw connError;
    console.log('✅ Test 1: Supabase Connection - SUCCESS');
  } catch (e) {
    console.error('❌ Test 1: Supabase Connection - FAILED', e);
    return;
  }

  // 2. Signup Test
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: { data: { username: testUsername } }
    });
    if (error) {
      if (error.status === 429) {
        console.warn('⚠️ Test 2: Signup - RATE LIMITED (Expected for Supabase Free Tier)');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Test 2: Signup Request - SUCCESS');
    }
  } catch (e) {
    console.error('❌ Test 2: Signup - FAILED', e);
  }

  // 3. Login Test (Invalid Credentials)
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
    if (error && error.message.toLowerCase().includes('invalid login credentials')) {
      console.log('✅ Test 3: Login (Invalid Creds) - SUCCESS (Correctly caught)');
    } else {
      console.error('❌ Test 3: Login (Invalid Creds) - FAILED (Should have failed with invalid creds)');
    }
  } catch (e) {
    console.error('❌ Test 3: Login (Invalid Creds) - ERROR', e);
  }

  // 4. Password Reset Test
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(testEmail);
    if (error) {
      if (error.status === 429) {
        console.warn('⚠️ Test 4: Password Reset - RATE LIMITED');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Test 4: Password Reset Request - SUCCESS');
    }
  } catch (e) {
    console.error('❌ Test 4: Password Reset - FAILED', e);
  }

  console.log('--- 🏁 Auth Integration Tests Complete ---');
};
