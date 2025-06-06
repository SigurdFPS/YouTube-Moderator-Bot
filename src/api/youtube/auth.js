require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
const TOKEN_PATH = path.join(__dirname, 'tokens.json');

let oauth2Client = null;

function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file');
  }

  oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2Client;
}

async function authorize() {
  const oAuthClient = createOAuthClient();

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuthClient.setCredentials(token);

    try {
      await oAuthClient.getAccessToken(); // will auto-refresh if needed
      return oAuthClient;
    } catch (err) {
      console.error('⚠️ Failed to refresh token, removing tokens.json...');
      fs.unlinkSync(TOKEN_PATH);
    }
  }

  const authUrl = oAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🔗 Authorize this app by visiting this URL:\n', authUrl);
  require('electron').shell.openExternal(authUrl);

  const code = await waitForCodeInput();
  const { tokens } = await oAuthClient.getToken(code);
  oAuthClient.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  return oAuthClient;
}

function waitForCodeInput() {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('Paste the code from the browser here: ', (code) => {
      readline.close();
      resolve(code.trim());
    });
  });
}

function getOAuthClient() {
  if (!oauth2Client) throw new Error('OAuth client not initialized. Call authorize() first.');
  return oauth2Client;
}

module.exports = {
  authorize,
  getOAuthClient,
};