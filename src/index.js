// Core services
export { routeDocument } from './services/document-router.js';
export { analyzeDocument } from './services/document-analyzer.js';
export { processDocument } from './services/document-processing.js';
export { parseEmailThread } from './services/email-processing.js';
export { processOFWEmail } from './services/ofw-processing.js';

// Analysis services
export { analyzeOutlierPatterns, extractOutlierContext, generateOutlierSuggestions } from './services/outlier-analysis.js';

// Utility services
export { getLogger } from './utils/logging.js';
export { trackProcessingTime, trackError, trackProcessingResult } from './services/monitoring.js';
