import express from 'express';
import { getLogger } from '../src/utils/logging.js';

const logger = getLogger();
const app = express();
const port = 3000;

app.get('/oauth2callback', (req, res) => {
    const code = req.query.code;
    if (code) {
        // Display the code to the user
        res.send(`
            <h1>Authorization Successful</h1>
            <p>Please copy this code and paste it in the terminal:</p>
            <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px;">${code}</pre>
        `);
        logger.info('Received authorization code');
    } else {
        res.status(400).send('No authorization code received');
        logger.error('No authorization code in callback');
    }
});

app.listen(port, () => {
    logger.info(`OAuth callback server listening at http://localhost:${port}`);
});
