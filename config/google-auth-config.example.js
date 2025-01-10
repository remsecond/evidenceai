export const googleConfig = {
    // OAuth 2.0 client configuration
    // Get these from Google Cloud Console > APIs & Services > Credentials
    clientId: 'your-client-id.apps.googleusercontent.com',
    clientSecret: 'your-client-secret',
    redirectUri: 'http://localhost:3000/oauth2callback',
    
    // Account credentials
    // Use your Google account that has access to the spreadsheet
    email: 'your-email@gmail.com',
    password: 'your-password',
    
    // Required scopes for Google Sheets and Drive access
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
    ],
    
    // Browser configuration for Puppeteer
    browser: {
        headless: false,  // Set to true in production
        args: ['--no-sandbox']
    },
    
    // Selectors for Google login automation
    // These might need updating if Google changes their login page
    selectors: {
        emailInput: 'input[type="email"]',
        emailNext: '#identifierNext',
        passwordInput: 'input[type="password"]',
        passwordNext: '#passwordNext',
        consentButton: '[role="button"]',
        codeDisplay: 'pre'
    }
};
