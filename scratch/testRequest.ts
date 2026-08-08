import dotenv from 'dotenv';
dotenv.config({ override: true });

async function testRequest() {
  try {
    console.log('Logging in as superadmin...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@babelglobal.com',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json() as any;
    console.log('Login Response:', loginData);
    const token = loginData.token || (loginData.data && loginData.data.token);
    console.log('Login successful! Token acquired:', token ? 'YES' : 'NO');

    console.log('Querying GET /api/settings...');
    const settingsRes = await fetch('http://localhost:5000/api/settings', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Status code:', settingsRes.status);
    const settingsData = await settingsRes.json();
    console.log('Settings Response Data:', JSON.stringify(settingsData, null, 2));
  } catch (error: any) {
    console.error('Error caught in scratch script:', error);
  }
}

testRequest();
