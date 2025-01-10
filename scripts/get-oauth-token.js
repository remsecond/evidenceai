import express from 'express';
import { google } from 'googleapis';
import open from 'open';
import { getLogger } from '../src/utils/logging.js';
import fs from 'fs';

const logger = getLogger();

// OAuth 2.0 client configuration
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
);

// Required scopes
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
];

// Create Express app for handling OAuth callback
const app = express();
const port = 3000;

app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        res.status(400).send('No authorization code received');
        return;
    }

    try {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        
        // Save tokens to file
        const tokenData = {
            ...tokens,
            created_at: new Date().toISOString()
        };
        
        fs.writeFileSync('google-token.json', JSON.stringify(tokenData, null, 2));
        
        res.send(`
            <h1>Authorization Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
        `);

        logger.info('Token saved to google-token.json');
        
        // Exit process after saving token
        setTimeout(() => process.exit(0), 1000);
    } catch (error) {
        logger.error('Error getting token:', error);
        res.status(500).send('Error getting authorization token');
    }
});

// Start server and open authorization URL
app.listen(port, async () => {
    logger.info(`OAuth callback server listening on port ${port}`);
    
    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
    
    logger.info('Opening authorization URL in browser');
    await open(authUrl);
});
