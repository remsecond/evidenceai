import puppeteer from 'puppeteer';
import { getLogger } from '../src/utils/logging.js';
import fs from 'fs';

const logger = getLogger();

// Account credentials
const GOOGLE_EMAIL = 'myevidenceai@gmail.com';
const GOOGLE_PASSWORD = 'Vrijmoed1';

async function setupGoogleProject() {
    let browser;
    try {
        logger.info('Starting Google Cloud project setup');

        // Connect to Chrome instead of using Puppeteer's browser
        browser = await puppeteer.launch({
            headless: false,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list',
                `--window-size=1280,800`,
                '--start-maximized',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-blink-features=AutomationControlled'
            ],
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation']
        });

        const page = await browser.newPage();
        
        // Set a proper user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set extra headers to look more like a real browser
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br'
        });

        // Enable JavaScript and cookies
        await page.setJavaScriptEnabled(true);
        
        // Add browser permissions
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://console.cloud.google.com', [
            'geolocation',
            'notifications'
        ]);

        // 1. Sign in to Google Cloud Console
        logger.info('Signing in to Google Cloud Console');
        await page.goto('https://console.cloud.google.com');
        
        // Handle login with increased timeouts and better selectors
        logger.info('Entering email');
        await page.waitForSelector('input[type="email"]', { timeout: 60000 });
        await page.type('input[type="email"]', GOOGLE_EMAIL);
        await page.waitForSelector('#identifierNext', { timeout: 60000 });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('#identifierNext')
        ]);

        logger.info('Entering password');
        await page.waitForSelector('input[type="password"]', { 
            visible: true, 
            timeout: 60000 
        });
        await page.type('input[type="password"]', GOOGLE_PASSWORD);
        await page.waitForSelector('#passwordNext', { timeout: 60000 });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('#passwordNext')
        ]);

        // Wait for login to complete
        logger.info('Waiting for login to complete');
        await page.waitForNavigation({ 
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        // 2. Create new project
        logger.info('Creating new project');
        await page.waitForSelector('button[aria-label="Create Project"]');
        await page.click('button[aria-label="Create Project"]');

        await page.waitForSelector('input[name="projectName"]');
        await page.type('input[name="projectName"]', 'EvidenceAI');
        await page.click('button[type="submit"]');

        // 3. Enable APIs
        logger.info('Enabling required APIs');
        await page.goto('https://console.cloud.google.com/apis/library');

        // Enable Google Sheets API
        await page.waitForSelector('input[aria-label="Search for APIs & Services"]');
        await page.type('input[aria-label="Search for APIs & Services"]', 'Google Sheets API');
        await page.keyboard.press('Enter');
        await page.waitForSelector('a[href*="sheets.googleapis.com"]');
        await page.click('a[href*="sheets.googleapis.com"]');
        await page.waitForSelector('button[aria-label="Enable API"]');
        await page.click('button[aria-label="Enable API"]');

        // Enable Google Drive API
        await page.goto('https://console.cloud.google.com/apis/library');
        await page.waitForSelector('input[aria-label="Search for APIs & Services"]');
        await page.type('input[aria-label="Search for APIs & Services"]', 'Google Drive API');
        await page.keyboard.press('Enter');
        await page.waitForSelector('a[href*="drive.googleapis.com"]');
        await page.click('a[href*="drive.googleapis.com"]');
        await page.waitForSelector('button[aria-label="Enable API"]');
        await page.click('button[aria-label="Enable API"]');

        // 4. Create OAuth consent screen
        logger.info('Setting up OAuth consent screen');
        await page.goto('https://console.cloud.google.com/apis/credentials/consent');
        
        // Select External user type
        await page.waitForSelector('input[value="external"]');
        await page.click('input[value="external"]');
        await page.click('button[type="submit"]');

        // Fill app information
        await page.waitForSelector('input[name="appName"]');
        await page.type('input[name="appName"]', 'EvidenceAI');
        await page.type('input[name="supportEmail"]', GOOGLE_EMAIL);
        await page.click('button[type="submit"]');

        // Skip scopes page
        await page.waitForSelector('button[type="submit"]');
        await page.click('button[type="submit"]');

        // Add test users
        await page.waitForSelector('input[aria-label="Add users"]');
        await page.type('input[aria-label="Add users"]', GOOGLE_EMAIL);
        await page.keyboard.press('Enter');
        await page.click('button[type="submit"]');

        // 5. Create OAuth client ID
        logger.info('Creating OAuth client ID');
        await page.goto('https://console.cloud.google.com/apis/credentials');
        
        await page.waitForSelector('button[aria-label="Create Credentials"]');
        await page.click('button[aria-label="Create Credentials"]');
        await page.click('a[href*="oauthclient"]');

        // Select Web application
        await page.waitForSelector('input[value="web"]');
        await page.click('input[value="web"]');
        
        // Set application name
        await page.type('input[name="displayName"]', 'EvidenceAI Local');

        // Add redirect URI
        await page.type('input[aria-label="Add URI"]', 'http://localhost:3000/oauth2callback');
        await page.keyboard.press('Enter');

        // Create client ID
        await page.click('button[type="submit"]');

        // Wait for credentials dialog
        await page.waitForSelector('div[role="dialog"]');

        // Extract credentials
        const clientId = await page.$eval('span[data-client-id]', el => el.textContent);
        const clientSecret = await page.$eval('span[data-client-secret]', el => el.textContent);

        // Create config file
        const config = {
            clientId,
            clientSecret,
            redirectUri: 'http://localhost:3000/oauth2callback',
            email: GOOGLE_EMAIL,
            password: GOOGLE_PASSWORD,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file'
            ],
            browser: {
                headless: false,
                args: ['--no-sandbox']
            },
            selectors: {
                emailInput: 'input[type="email"]',
                emailNext: '#identifierNext',
                passwordInput: 'input[type="password"]',
                passwordNext: '#passwordNext',
                consentButton: '[role="button"]',
                codeDisplay: 'pre'
            }
        };

        fs.writeFileSync('config/google-auth-config.js', 
            `export const googleConfig = ${JSON.stringify(config, null, 4)};`
        );

        logger.info('Google Cloud project setup complete');
        logger.info('Credentials saved to config/google-auth-config.js');

    } catch (error) {
        logger.error('Error during setup:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            logger.info('Browser closed');
        }
    }
}

// Run setup
setupGoogleProject().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
});
