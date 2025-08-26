import http from 'http';

const testAPI = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/beehive/user-stats/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    method: 'GET',
    headers: {
      'x-wallet-address': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('🎯 REAL USER STATS FROM DATABASE:');
      console.log(data);
      try {
        const parsed = JSON.parse(data);
        console.log('\n📊 Parsed Data:');
        console.log(`Direct Referrals: ${parsed.directReferralCount}`);
        console.log(`Total Team: ${parsed.totalTeamCount}`);
        console.log(`Total Earnings: $${parsed.totalEarnings}`);
      } catch (e) {
        console.log('Could not parse JSON response');
      }
    });
  });

  req.on('error', (error) => {
    console.log('API Error:', error.message);
  });

  req.end();
};

// Give server time to start, then test
setTimeout(testAPI, 3000);