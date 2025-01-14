export const googleConfig = {
    // OAuth 2.0 client configuration
    clientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
    clientSecret: 'ABCDEF-1234567890-GHIJKLMNOP',
    redirectUri: 'http://localhost:3000/oauth2callback',
    
    // Account credentials
    email: 'myevidenceai@gmail.com',
    password: 'your-password-here',
    
    // Required scopes
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
    ],
    
    // Browser configuration
    browser: {
        headless: false,
        args: ['--no-sandbox']
    },
    
    // Selectors for automation
    selectors: {
        emailInput: 'input[type="email"]',
        emailNext: '#identifierNext',
        passwordInput: 'input[type="password"]',
        passwordNext: '#passwordNext',
        consentButton: '[role="button"]',
        codeDisplay: 'pre'
    }
};
