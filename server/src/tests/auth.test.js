const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = '';

const testAuth = async () => {
  try {
    console.log('🧪 Starting Authentication Tests...\n');

    // Test 1: Register a vendor
    console.log('Test 1: Register Vendor');
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test Vendor',
      email: 'vendor@test.com',
      password: 'password123',
      role: 'vendor'
    });
    console.log('✅ Register Success:', {
      success: registerRes.data.success,
      user: registerRes.data.user
    });
    console.log('Token received:', registerRes.data.token ? '✅' : '❌');
    authToken = registerRes.data.token;
    console.log('\n-------------------\n');

    // Test 2: Login with the created account
    console.log('Test 2: Login');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'vendor@test.com',
      password: 'password123'
    });
    console.log('✅ Login Success:', {
      success: loginRes.data.success,
      user: loginRes.data.user
    });
    console.log('Token received:', loginRes.data.token ? '✅' : '❌');
    console.log('\n-------------------\n');

    // Test 3: Get current user profile
    console.log('Test 3: Get Profile');
    const profileRes = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Profile Success:', {
      success: profileRes.data.success,
      user: profileRes.data.user
    });
    console.log('\n-------------------\n');

    // Test 4: Try to register with same email (should fail)
    console.log('Test 4: Duplicate Registration');
    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: 'Test Vendor 2',
        email: 'vendor@test.com',
        password: 'password123',
        role: 'vendor'
      });
    } catch (error) {
      console.log('✅ Duplicate Registration Prevented:', error.response.data);
    }
    console.log('\n-------------------\n');

    // Test 5: Try to login with wrong password
    console.log('Test 5: Invalid Login');
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: 'vendor@test.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ Invalid Login Prevented:', error.response.data);
    }
    console.log('\n-------------------\n');

    console.log('🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Test Failed:', {
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    });
  }
};

// Run tests
testAuth(); 