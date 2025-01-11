# Setting Up Google OAuth Authentication

This guide explains how to set up OAuth 2.0 authentication for Google Sheets integration.

## 1. Create OAuth 2.0 Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable APIs:
   - Google Sheets API
   - Google Drive API
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth client ID"
6. Configure OAuth consent screen:
   - User Type: External
   - App name: EvidenceAI
   - Support email: myevidenceai@gmail.com

7. Create OAuth client ID:
   - Application type: Web application
   - Name: EvidenceAI Local
   - Authorized redirect URIs:
     - http://localhost:3000/oauth2callback

8. Save the client ID and client secret

## 2. Get Authorization Token

1. Install dependencies:
```bash
npm install express googleapis
```

2. Create .env file with OAuth credentials:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

3. Start OAuth callback server:
```bash
node scripts/oauth-server.js
```

4. In another terminal, run token generator:
```bash
node scripts/get-google-token.js
```

5. Follow the authorization URL in your browser
6. Copy the code from the callback page
7. Paste the code in the terminal
8. Token will be saved to google-token.json

## 3. Set Up Tracking Spreadsheet

1. Create new spreadsheet in Google Drive
2. Share with myevidenceai@gmail.com
3. Copy spreadsheet ID from URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

## 4. Update Environment Variables

Add these to your .env file:
```env
GOOGLE_REFRESH_TOKEN=from-google-token.json
GOOGLE_SHEET_ID=your-spreadsheet-id
```

## 5. Test Integration

Run the test script:
```bash
node scripts/test-sheets-integration.js
```

This will:
- Create sheet structure
- Add test document
- Update test status
- Add test category

## Troubleshooting

### Common Issues

1. Token Errors:
   - Check client ID and secret
   - Verify redirect URI
   - Ensure APIs are enabled

2. Permission Errors:
   - Check spreadsheet sharing
   - Verify OAuth scopes
   - Confirm API access

3. Refresh Token Missing:
   - Ensure access_type=offline in auth URL
   - Clear browser cookies and try again
   - Check google-token.json contents

### Support

For technical issues:
1. Check Google Cloud Console logs
2. Verify API status
3. Review OAuth consent screen
4. Check environment variables

## Security Notes

1. Keep credentials secure:
   - Never commit .env file
   - Protect google-token.json
   - Use environment variables

2. Token Management:
   - Refresh tokens don't expire
   - Access tokens expire hourly
   - Service auto-refreshes tokens

3. Best Practices:
   - Regular security review
   - Monitor API usage
   - Update consent screen
   - Review access permissions
