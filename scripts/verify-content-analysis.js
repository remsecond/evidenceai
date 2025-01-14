const { enableFeature, disableFeature } = require('../config/feature-flags');
const { compareDocuments, compareMultipleDocuments } = require('../src/services/analysis/tf-idf');
const logger = require('../src/utils/logging');

// Sample documents for testing
const testDocuments = [
  {
    id: 'doc1',
    text: `The quick brown fox jumps over the lazy dog. This classic pangram contains every letter of the English alphabet at least once. Pangrams are often used to display font samples and test keyboards.`
  },
  {
    id: 'doc2',
    text: `A quick brown fox leaps over a lazy dog. This sentence is very similar to the famous pangram but uses different words in places. It's useful for testing document similarity.`
  },
  {
    id: 'doc3',
    text: `Document similarity analysis is a key component of text processing systems. It helps identify related content and measure text relationships using various algorithms.`
  }
];

/**
 * Run comparison tests with both basic and enhanced analysis
 */
async function runComparisonTests() {
  logger.info('Starting content analysis verification...');

  // Test basic matching
  logger.info('\nTesting with basic keyword matching:');
  disableFeature('enhancedAnalysis', 'tfIdf');
  
  console.time('Basic matching');
  const basicResults = compareMultipleDocuments(testDocuments);
  console.timeEnd('Basic matching');

  logger.info('Basic matching results:');
  basicResults.forEach(result => {
    logger.info(`${result.doc1} <-> ${result.doc2}: ${result.similarity.toFixed(4)}`);
  });

  // Test TF-IDF matching
  logger.info('\nTesting with TF-IDF analysis:');
  enableFeature('enhancedAnalysis', 'tfIdf');
  
  console.time('TF-IDF matching');
  const tfidfResults = compareMultipleDocuments(testDocuments);
  console.timeEnd('TF-IDF matching');

  logger.info('TF-IDF matching results:');
  tfidfResults.forEach(result => {
    logger.info(`${result.doc1} <-> ${result.doc2}: ${result.similarity.toFixed(4)}`);
  });

  // Compare results
  logger.info('\nComparison Analysis:');
  for (let i = 0; i < basicResults.length; i++) {
    const basic = basicResults[i];
    const tfidf = tfidfResults[i];
    const diff = Math.abs(basic.similarity - tfidf.similarity);
    
    logger.info(`
    Documents: ${basic.doc1} <-> ${basic.doc2}
    Basic Score: ${basic.similarity.toFixed(4)}
    TF-IDF Score: ${tfidf.similarity.toFixed(4)}
    Difference: ${diff.toFixed(4)}
    `);
  }

  // Test error handling
  logger.info('\nTesting error handling:');
  try {
    const errorResult = compareDocuments('', '');
    logger.info('Empty document handling:', errorResult);
  } catch (error) {
    logger.error('Error handling test failed:', error);
  }

  // Test performance with larger documents
  logger.info('\nTesting performance with larger documents:');
  const largeDoc = testDocuments[0].text.repeat(100);
  
  console.time('Large document comparison');
  const largeResult = compareDocuments(largeDoc, largeDoc);
  console.timeEnd('Large document comparison');
  
  logger.info(`Large document similarity score: ${largeResult.toFixed(4)}`);

  return {
    basicResults,
    tfidfResults,
    performanceMetrics: {
      basicMatchingTime: process.hrtime(),
      tfidfMatchingTime: process.hrtime(),
      largeDocumentTime: process.hrtime()
    }
  };
}

/**
 * Generate verification report
 */
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    featureStatus: {
      tfIdf: require('../config/feature-flags').isFeatureEnabled('enhancedAnalysis', 'tfIdf')
    },
    comparisonResults: {
      basic: results.basicResults,
      tfidf: results.tfidfResults
    },
    performance: results.performanceMetrics,
    recommendations: []
  };

  // Analyze results and make recommendations
  const avgBasicScore = results.basicResults.reduce((sum, r) => sum + r.similarity, 0) / results.basicResults.length;
  const avgTfidfScore = results.tfidfResults.reduce((sum, r) => sum + r.similarity, 0) / results.tfidfResults.length;

  if (Math.abs(avgBasicScore - avgTfidfScore) > 0.3) {
    report.recommendations.push('Significant difference between basic and TF-IDF scores. Consider adjusting thresholds.');
  }

  if (results.performanceMetrics.tfidfMatchingTime[0] > results.performanceMetrics.basicMatchingTime[0] * 2) {
    report.recommendations.push('TF-IDF performance significantly slower. Consider optimization or caching.');
  }

  return report;
}

/**
 * Main verification function
 */
async function verifyContentAnalysis() {
  try {
    logger.info('Starting content analysis verification...');
    
    const results = await runComparisonTests();
    const report = generateReport(results);
    
    logger.info('\nVerification Report:', JSON.stringify(report, null, 2));
    
    return report;
  } catch (error) {
    logger.error('Verification failed:', error);
    throw error;
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyContentAnalysis()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Verification failed:', error);
      process.exit(1);
    });
}

module.exports = {
  verifyContentAnalysis,
  runComparisonTests,
  generateReport
};
