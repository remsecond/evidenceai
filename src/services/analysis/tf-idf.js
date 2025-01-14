const { isFeatureEnabled } = require('../../../config/feature-flags');
const logger = require('../../utils/logging');

/**
 * Calculate term frequency for a document
 * @param {string} text - Document text
 * @returns {Object} Map of terms to their frequencies
 */
function calculateTermFrequency(text) {
  const terms = text.toLowerCase().split(/\s+/);
  const termFreq = {};
  
  terms.forEach(term => {
    termFreq[term] = (termFreq[term] || 0) + 1;
  });
  
  return termFreq;
}

/**
 * Calculate inverse document frequency
 * @param {Array<string>} documents - Array of document texts
 * @returns {Object} Map of terms to their IDF values
 */
function calculateIDF(documents) {
  const docCount = documents.length;
  const termDocs = {};
  
  documents.forEach(doc => {
    const terms = new Set(doc.toLowerCase().split(/\s+/));
    terms.forEach(term => {
      termDocs[term] = (termDocs[term] || 0) + 1;
    });
  });
  
  const idf = {};
  Object.keys(termDocs).forEach(term => {
    idf[term] = Math.log(docCount / termDocs[term]);
  });
  
  return idf;
}

/**
 * Calculate TF-IDF vector for a document
 * @param {string} text - Document text
 * @param {Object} idf - IDF values for terms
 * @returns {Object} TF-IDF vector
 */
function calculateTFIDF(text, idf) {
  const tf = calculateTermFrequency(text);
  const tfidf = {};
  
  Object.keys(tf).forEach(term => {
    if (idf[term]) {
      tfidf[term] = tf[term] * idf[term];
    }
  });
  
  return tfidf;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Object} vector1 - First TF-IDF vector
 * @param {Object} vector2 - Second TF-IDF vector
 * @returns {number} Similarity score between 0 and 1
 */
function calculateCosineSimilarity(vector1, vector2) {
  const terms = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
  
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  terms.forEach(term => {
    const v1 = vector1[term] || 0;
    const v2 = vector2[term] || 0;
    
    dotProduct += v1 * v2;
    magnitude1 += v1 * v1;
    magnitude2 += v2 * v2;
  });
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Basic keyword matching fallback
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Simple similarity score
 */
function basicKeywordMatching(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Compare two documents using TF-IDF with fallback
 * @param {string} text1 - First document text
 * @param {string} text2 - Second document text
 * @returns {number} Similarity score between 0 and 1
 */
function compareDocuments(text1, text2) {
  try {
    if (!isFeatureEnabled('enhancedAnalysis', 'tfIdf')) {
      logger.info('TF-IDF disabled, using basic keyword matching');
      return basicKeywordMatching(text1, text2);
    }

    const documents = [text1, text2];
    const idf = calculateIDF(documents);
    
    const vector1 = calculateTFIDF(text1, idf);
    const vector2 = calculateTFIDF(text2, idf);
    
    const similarity = calculateCosineSimilarity(vector1, vector2);
    logger.debug('TF-IDF similarity calculated:', similarity);
    
    return similarity;
  } catch (error) {
    logger.error('Error in TF-IDF comparison, falling back to basic matching:', error);
    return basicKeywordMatching(text1, text2);
  }
}

/**
 * Compare multiple documents using TF-IDF
 * @param {Array<{id: string, text: string}>} documents - Array of documents with IDs
 * @returns {Array<{doc1: string, doc2: string, similarity: number}>} Similarity scores
 */
function compareMultipleDocuments(documents) {
  try {
    if (!isFeatureEnabled('enhancedAnalysis', 'tfIdf')) {
      logger.info('TF-IDF disabled, using basic keyword matching for multiple documents');
      return documents.flatMap((doc1, i) => 
        documents.slice(i + 1).map(doc2 => ({
          doc1: doc1.id,
          doc2: doc2.id,
          similarity: basicKeywordMatching(doc1.text, doc2.text)
        }))
      );
    }

    const idf = calculateIDF(documents.map(doc => doc.text));
    const vectors = documents.map(doc => ({
      id: doc.id,
      vector: calculateTFIDF(doc.text, idf)
    }));
    
    const similarities = [];
    
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        similarities.push({
          doc1: vectors[i].id,
          doc2: vectors[j].id,
          similarity: calculateCosineSimilarity(vectors[i].vector, vectors[j].vector)
        });
      }
    }
    
    return similarities;
  } catch (error) {
    logger.error('Error in multiple document comparison, falling back to basic matching:', error);
    return documents.flatMap((doc1, i) => 
      documents.slice(i + 1).map(doc2 => ({
        doc1: doc1.id,
        doc2: doc2.id,
        similarity: basicKeywordMatching(doc1.text, doc2.text)
      }))
    );
  }
}

module.exports = {
  compareDocuments,
  compareMultipleDocuments,
  // Exposed for testing
  calculateTermFrequency,
  calculateIDF,
  calculateTFIDF,
  calculateCosineSimilarity,
  basicKeywordMatching
};
