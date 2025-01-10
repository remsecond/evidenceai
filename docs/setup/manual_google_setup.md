# Manual Google Cloud Setup Guide

This guide walks you through setting up Google Cloud and obtaining OAuth credentials for EvidenceAI.

## 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with myevidenceai@gmail.com
3. Click "Create Project" at the top
4. Name: "EvidenceAI"
5. Click "Create"

## 2. Enable Required APIs

1. Go to "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - Google Sheets API
   - Google Drive API

## 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Fill in app information:
   - App name: "EvidenceAI"
   - User support email: myevidenceai@gmail.com
   - Developer contact email: myevidenceai@gmail.com
4. Click "Save and Continue"
5. Add scopes:
   - ../auth/spreadsheets
   - ../auth/drive.file
6. Click "Save and Continue"
7. Add test users:
   - myevidenceai@gmail.com
8. Click "Save and Continue"

## 4. Create OAuth Client ID

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Name: "EvidenceAI Local"
5. Add Authorized redirect URI:
   - http://localhost:3000/oauth2callback
6. Click "Create"
7. Save the client ID and client secret

## 5. Set Up Environment Variables

Create or update your .env file with:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## 6. Get OAuth Token

Run the token generation script:
```bash
node scripts/get-oauth-token.js
```

This will:
1. Start a local server
2. Open browser for authentication
3. Save the token to google-token.json

## 7. Create Tracking Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "EvidenceAI Document Tracking"
4. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
5. Add to .env file:
   ```env
   GOOGLE_SHEET_ID=your-spreadsheet-id
   ```

## Troubleshooting

### Common Issues

1. "Invalid Client" error:
   - Verify redirect URI matches exactly
   - Check client ID and secret

2. "Access Not Configured" error:
   - Ensure APIs are enabled
   - Wait a few minutes for changes to propagate

3. Token generation fails:
   - Clear browser cookies
   - Try in incognito window
   - Check all scopes are added

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
