import { getLogger } from '../utils/logging.js';

const logger = getLogger();

class GoogleSheetsService {
    constructor() {
        this.isTestMode = process.env.NODE_ENV === 'development';
        logger.info('Google Sheets service initialized in', this.isTestMode ? 'test mode' : 'production mode');
    }

    async addDocument(doc) {
        if (this.isTestMode) {
            logger.info('Test mode: Simulating document addition', doc);
            return true;
        }
        // Real implementation would go here
        throw new Error('Production mode not implemented');
    }

    async updateStatus(docId, status) {
        if (this.isTestMode) {
            logger.info('Test mode: Simulating status update', { docId, status });
            return true;
        }
        // Real implementation would go here
        throw new Error('Production mode not implemented');
    }
}

export default new GoogleSheetsService();
