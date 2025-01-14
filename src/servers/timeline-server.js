import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import timelineProcessor from '../simple-pdf-processor/src/services/timeline-processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3002;

// Enable CORS
app.use(cors());

// Serve static files from Web directory
app.use(express.static(path.join(__dirname, '../Web')));

// Timeline data API endpoint
app.get('/api/timeline-data', async (req, res) => {
    try {
        // Get filter parameters
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const docType = req.query.type || 'all';

        // Get timeline data from processor
        const timelineData = await timelineProcessor.getTimelineData();

        // Apply filters if provided
        let filteredData = timelineData;
        if (startDate) {
            filteredData = filteredData.filter(event => 
                new Date(event.temporal_info.event_date) >= new Date(startDate)
            );
        }
        if (endDate) {
            filteredData = filteredData.filter(event => 
                new Date(event.temporal_info.event_date) <= new Date(endDate)
            );
        }
        if (docType !== 'all') {
            filteredData = filteredData.filter(event => 
                event.event_info.type === docType
            );
        }

        // Get storage stats
        const stats = await timelineProcessor.getStorageStats();

        res.json({
            timelineEvents: filteredData,
            stats: stats
        });
    } catch (error) {
        console.error('Error fetching timeline data:', error);
        res.status(500).json({ error: 'Error fetching timeline data' });
    }
});

// Serve the timeline interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Web/mission-control-timeline.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Timeline server running at http://localhost:${port}`);
});
