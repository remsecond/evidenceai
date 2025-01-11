import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGoogleAccess() {
    try {
        // Load token from file
        const token = JSON.parse(fs.readFileSync('google-token.json', 'utf8'));
        
        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'http://localhost:3000/oauth2callback'
        );
        
        // Set credentials
        oauth2Client.setCredentials(token);
        
        // Create Google Sheets instance
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        
        // Create a new spreadsheet
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: 'EvidenceAI Test Sheet'
                }
            }
        });
        
        console.log('Success! Created spreadsheet with ID:', spreadsheet.data.spreadsheetId);
        
        // Write some test data
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheet.data.spreadsheetId,
            range: 'A1:B2',
            valueInputOption: 'RAW',
            requestBody: {
                values: [
                    ['Test', 'Data'],
                    ['Hello', 'World']
                ]
            }
        });
        
        console.log('Successfully wrote test data to the spreadsheet');
        console.log(`You can view the spreadsheet at: https://docs.google.com/spreadsheets/d/${spreadsheet.data.spreadsheetId}`);
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
    }
}

testGoogleAccess();
