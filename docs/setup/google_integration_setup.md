# Setting Up Google Integration

This guide explains how to set up Google API credentials and prepare the tracking spreadsheet for EvidenceAI.

## 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google Sheets API
   - Google Drive API

## 2. Create Service Account

1. In Google Cloud Console:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name: "evidenceai-tracking"
   - Role: "Editor"

2. Create Key:
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose JSON format
   - Download the key file

## 3. Set Up Tracking Spreadsheet

1. Create New Spreadsheet:
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet
   - Name it "EvidenceAI Document Tracking"

2. Share with Service Account:
   - Click "Share" button
   - Add service account email
   - Give "Editor" access
   - Copy spreadsheet ID from URL:
     ```
     https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
     ```

## 4. Configure Environment Variables

Create `.env` file with these variables:

```env
# Google API Configuration
GOOGLE_CLIENT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY=your-service-account-private-key
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_SHEET_ID=your-tracking-spreadsheet-id
```

Notes:
- Replace values with your actual credentials
- GOOGLE_PRIVATE_KEY should include newlines as "\n"
- GOOGLE_SHEET_ID is from spreadsheet URL

## 5. Verify Setup

Run the test script:
```bash
node scripts/test-sheets-integration.js
```

This will:
- Create sheet structure
- Add test document
- Update test status
- Add test category

## Sheet Structure

### Document Tracking
- Document ID
- File Name
- Type
- Upload Date
- Status
- Pages
- Word Count
- Processing Time
- Output Location
- Notes

### Processing Status
- Document ID
- Current Stage
- Start Time
- Estimated Completion
- Status Message

### Categories
- Category Name
- Document Count
- Description

## Access Levels

### System Administrators
- Full access to all sheets
- Can modify structure
- Can manage permissions
- Can view all data

### Team Members
- View access to tracking sheet
- Can see document status
- Can view processing history
- Cannot modify structure

## Troubleshooting

### Common Issues

1. Authentication Errors:
   - Verify service account email
   - Check private key format
   - Confirm API is enabled

2. Permission Errors:
   - Check spreadsheet sharing
   - Verify service account roles
   - Confirm API access

3. API Quota Issues:
   - Monitor usage in Cloud Console
   - Check rate limits
   - Consider quota increase

### Support

For technical issues:
1. Check Google Cloud Console logs
2. Verify API status
3. Review service account permissions
4. Check environment variables

## Maintenance

### Regular Tasks
1. Monitor API usage
2. Review access permissions
3. Update API keys if needed
4. Check for API updates

### Best Practices
1. Keep credentials secure
2. Regular backup of tracking data
3. Monitor sheet size and performance
4. Regular access review
