// auth.js

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
const TOKEN_PATH = path.join(__dirname, 'tokens.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json'); // user must supply this

let oauth2Client = null;

function createOAuthClient() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  return oauth2Client;
}

async function authorize() {
  if (!fs.existsSync(CREDENTIALS_PATH)) throw new Error('Missing credentials.json');

  const oAuthClient = createOAuthClient();

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuthClient.setCredentials(token);

    // Attempt refresh
    try {
      await oAuthClient.getAccessToken();
      return oAuthClient;
    } catch (err) {
      console.error('⚠️ Failed to refresh token, deleting...');
      fs.unlinkSync(TOKEN_PATH);
    }
  }

  const authUrl = oAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🔗 Authorize this app by visiting this URL:', authUrl);
  require('electron').shell.openExternal(authUrl);

  const code = await waitForCodeInput(); // implemented below
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
      resolve(code);
    });
  });
}

function getOAuthClient() {
  if (!oauth2Client) throw new Error('Not authorized. Call authorize() first.');
  return oauth2Client;
}

module.exports = {
  authorize,
  getOAuthClient,
};