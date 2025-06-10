require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');
const electron = require('electron');

const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];

// Get persistent app storage path for Electron
const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const TOKEN_PATH = path.join(userDataPath, 'tokens.json');

let oauth2Client = null;

function createOAuthClient() {
  const clientId = process.env.YT_CLIENT_ID;
  const clientSecret = process.env.YT_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing credentials in .env: YT_CLIENT_ID, YT_CLIENT_SECRET, or GOOGLE_REDIRECT_URI');
  }

  oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2Client;
}

async function authorize() {
  if (!oauth2Client) createOAuthClient();

  // Load existing tokens if available
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      oauth2Client.setCredentials(token);
      await oauth2Client.getAccessToken(); // Will refresh token if expired
      return oauth2Client;
    } catch (err) {
      console.warn('⚠️ Failed to refresh token:', err.message);
      fs.unlinkSync(TOKEN_PATH);
    }
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log(`\n🔗 Opening browser for authorization...`);
  try {
    electron.shell.openExternal(authUrl);
  } catch {
    require('open')(authUrl); // fallback for CLI environments
  }

  const code = await listenForOAuthCode();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('✅ Authorization successful. Tokens saved.');

  return oauth2Client;
}

function listenForOAuthCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.end('❌ Authorization failed. You may now close this window.');
        server.close();
        return reject(new Error(error));
      }

      if (code) {
        res.end('✅ Authorization successful! You may now close this window.');
        server.close();
        return resolve(code);
      }

      res.end('No code received.');
    });

    const PORT = Number(process.env.REDIRECT_PORT || 42813);
    server.listen(PORT, () => {
      console.log(`🌐 Listening for OAuth redirect on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      reject(new Error(`Server error: ${err.message}`));
    });
  });
}

function getOAuthClient() {
  if (!oauth2Client) throw new Error('OAuth client not initialized.');
  return oauth2Client;
}

module.exports = {
  authorize,
  getOAuthClient,
};