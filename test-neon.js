const fetch = require('node-fetch');

const API_KEY = 'napi_tix5f0x2t1ncg7silwiuqs2xytfru9se1163obnvu1akadit2n36849rx0rnjj6b';

async function main() {
  try {
    const response = await fetch('https://api.neon.tech/v1/projects', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Error ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return;
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
