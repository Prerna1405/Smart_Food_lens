import { supabase } from './lib/supabase';

/**
 * Authentication Test Suite
 * Run these tests to verify Supabase Auth integration.
 */
export const testAuth = async () => {
  console.log('--- Starting Auth Tests ---');

  // Test 1: Check connection
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Test 1 Failed: Connection error', error.message);
    return false;
  }
  console.log('Test 1 Passed: Connected to Supabase Auth');

  // Test 2: Login failure (invalid credentials)
  try {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: 'invalid@test.com',
      password: 'wrongpassword',
    });
    if (loginError) {
      console.log('Test 2 Passed: Correctly caught invalid login');
    } else {
      console.error('Test 2 Failed: Invalid login should have failed');
    }
  } catch (e) {
    console.log('Test 2 Passed: Caught exception on invalid login');
  }

  // Test 3: Sign up validation (short password)
  const { error: signUpError } = await supabase.auth.signUp({
    email: 'test@test.com',
    password: '123',
  });
  if (signUpError) {
    console.log('Test 3 Passed: Correctly caught weak password', signUpError.message);
  } else {
    console.error('Test 3 Failed: Weak password should have failed');
  }

  console.log('--- Auth Tests Complete ---');
  return true;
};

/**
 * Scan Module Test Suite
 */
export const testScanModule = async (apiUrl: string) => {
  console.log('--- Starting Scan Module Tests ---');
  
  try {
    const res = await fetch(`${apiUrl}/health`);
    const data = await res.json();
    if (data.status === 'ok') {
      console.log('Test 4 Passed: Backend is healthy');
    } else {
      console.error('Test 4 Failed: Backend health check returned non-ok status');
    }
  } catch (e) {
    console.error('Test 4 Failed: Could not reach backend', e);
  }

  console.log('--- Scan Module Tests Complete ---');
};
