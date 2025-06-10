require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
const TOKEN_PATH = path.join(__dirname, 'tokens.json');

let oauth2Client = null; // Correct variable name

/**
 * Creates and returns an OAuth2 client.
 * This should typically be called once at application startup.
 */
function createOAuthClient() {
  const clientId = process.env.YT_CLIENT_ID;
  const clientSecret = process.env.YT_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing YT_CLIENT_ID or YT_CLIENT_SECRET in .env file. Please check your configuration.');
  }

  // Assign to the module-level oauth2Client
  oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2Client;
}

/**
 * Handles the authorization process.
 * Attempts to load existing tokens; if unsuccessful, initiates a new OAuth flow.
 * @returns {google.auth.OAuth2} The authorized OAuth2 client.
 */
async function authorize() {
  // Ensure the OAuth client is created
  if (!oauth2Client) {
    createOAuthClient();
  }

  // --- Attempt to load existing tokens ---
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oauth2Client.setCredentials(token); // Use oauth2Client
      
      // Try to refresh the token to check validity
      await oauth2Client.getAccessToken(); 
      console.log('Successfully refreshed access token from existing tokens.');
      return oauth2Client; // If successful, we're authorized
    } catch (err) {
      console.error('Failed to refresh token or existing token invalid:', err.message);
      console.log('Proceeding to re-authorize...');
      try {
        fs.unlinkSync(TOKEN_PATH); // Delete the invalid token file
        console.log('Old invalid token file deleted.');
      } catch (unlinkErr) {
        console.warn('Could not delete old token file (might not exist or permissions issue):', unlinkErr.message);
      }
    }
  }

  // --- If no valid tokens or refresh failed, perform full authorization flow ---
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request a refresh token
    scope: SCOPES, // Corrected SCOEPS to SCOPES
  });

  console.log('\n--- Authorization Required ---');
  console.log('Visit this URL to authorize your application:');
  console.log(authUrl);
  console.log('------------------------------\n');

  // Attempt to open URL using Electron if available
  try {
    const { shell } = require('electron'); // Lazily require electron to avoid issues if not running in Electron
    shell.openExternal(authUrl);
  } catch (e) {
    console.warn('Electron is not available to open the URL automatically. Please copy and paste the URL into your browser.');
  }

  const code = await waitForCodeInput(); // This await is now inside an async function
  const { tokens } = await oauth2Client.getToken(code); // Use oauth2Client
  oauth2Client.setCredentials(tokens); // Corrected typo
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('Authorization successful! Tokens saved to:', TOKEN_PATH);
  
  return oauth2Client;
}

/**
 * Prompts the user to enter the authorization code received from Google.
 * @returns {Promise<string>} A promise that resolves with the entered code.
 */
function waitForCodeInput() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ // Using 'rl' for readline instance
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter the authorization code you received from Google (from the browser URL after redirect): ', (code) => {
      rl.close();
      resolve(code.trim()); // Trim whitespace from the input
    });
  });
}

/**
 * Returns the initialized and authorized OAuth2 client.
 * Throws an error if authorize() has not been called successfully.
 * @returns {google.auth.OAuth2} The OAuth2 client.
 */
function getOAuthClient() {
  if (!oauth2Client) {
    throw new Error('OAuth client not initialized or authorized. Call authorize() first.');
  }
  return oauth2Client;
}

module.exports = {
  authorize,
  getOAuthClient,
};
