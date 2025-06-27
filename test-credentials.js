const fs = require('fs-extra');
const path = require('path');

async function testCredentials() {
  const credentialsPath = process.argv[2];

  if (!credentialsPath) {
    console.error('Usage: node test-credentials.js <path-to-credentials.json>');
    process.exit(1);
  }

  console.log(`Testing credentials file: ${credentialsPath}`);

  try {
    // Check if file exists
    if (!(await fs.pathExists(credentialsPath))) {
      console.error('❌ Credentials file not found');
      return;
    }

    // Try to read and parse the file
    const credentials = await fs.readJson(credentialsPath);
    console.log('✅ Credentials file loaded successfully');

    // Check for required fields
    if (credentials.installed) {
      console.log('✅ Desktop application credentials detected');
      console.log(`   Client ID: ${credentials.installed.client_id}`);
      console.log(`   Auth URI: ${credentials.installed.auth_uri}`);
    } else if (credentials.web) {
      console.log('✅ Web application credentials detected');
      console.log(`   Client ID: ${credentials.web.client_id}`);
      console.log(`   Auth URI: ${credentials.web.auth_uri}`);
    } else {
      console.log('⚠️  Unknown credentials format');
      console.log('Available keys:', Object.keys(credentials));
    }
  } catch (error) {
    console.error('❌ Error reading credentials:', error.message);
  }
}

testCredentials();
