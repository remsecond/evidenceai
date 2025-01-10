import puppeteer from 'puppeteer';
import { google } from 'googleapis';
import fs from 'fs';
import { getLogger } from '../src/utils/logging.js';

const logger = getLogger();

import { googleConfig } from '../config/google-auth-config.js';

// Create OAuth client from config
const oauth2Client = new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirectUri
);

/**
 * Handle Google login process
 * @param {Page} page - Puppeteer page object
 */
async function handleLogin(page) {
    try {
        // Enter email
        await page.waitForSelector(googleConfig.selectors.emailInput);
        await page.type(googleConfig.selectors.emailInput, googleConfig.email);
        await page.click(googleConfig.selectors.emailNext);

        // Enter password
        await page.waitForSelector(googleConfig.selectors.passwordInput, { visible: true });
        await page.type(googleConfig.selectors.passwordInput, googleConfig.password);
        await page.click(googleConfig.selectors.passwordNext);

        logger.info('Login successful');
    } catch (error) {
        logger.error('Login failed:', error);
        throw error;
    }
}

/**
 * Handle consent page
 * @param {Page} page - Puppeteer page object
 */
async function handleConsent(page) {
    try {
        await page.waitForSelector(googleConfig.selectors.consentButton);
        await page.click(googleConfig.selectors.consentButton);
        logger.info('Consent granted');
    } catch (error) {
        logger.error('Consent handling failed:', error);
        throw error;
    }
}

/**
 * Automate Google OAuth process
 */
async function automateGoogleAuth() {
    let browser;
    try {
        // Generate auth URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: googleConfig.scopes,
            login_hint: googleConfig.email,
            prompt: 'consent' // Force consent screen
        });

        logger.info('Starting automated authentication');

        // Launch browser with config
        browser = await puppeteer.launch(googleConfig.browser);
        const page = await browser.newPage();

        // Set viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Navigate to auth URL
        await page.goto(authUrl, { waitUntil: 'networkidle0' });

        // Handle login
        await handleLogin(page);

        // Handle consent
        await handleConsent(page);

        // Wait for and extract code
        await page.waitForSelector(googleConfig.selectors.codeDisplay);
        const code = await page.$eval(googleConfig.selectors.codeDisplay, el => el.textContent);

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Save tokens with timestamp
        const tokenData = {
            ...tokens,
            created_at: new Date().toISOString()
        };
        
        fs.writeFileSync('google-token.json', JSON.stringify(tokenData, null, 2));
        logger.info('Token stored to google-token.json');

        return tokenData;
    } catch (error) {
        logger.error('Error during automated authentication:', error);
        throw error;
    }
}

// Run automation
automateGoogleAuth().catch(error => {
    console.error('Authentication failed:', error);
    process.exit(1);
});
