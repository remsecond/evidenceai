const {
  calculateTermFrequency,
  calculateIDF,
  calculateTFIDF,
  calculateCosineSimilarity,
  basicKeywordMatching,
  compareDocuments,
  compareMultipleDocuments
} = require('../../../src/services/analysis/tf-idf');

const { enableFeature, disableFeature } = require('../../../config/feature-flags');

describe('TF-IDF Analysis', () => {
  beforeEach(() => {
    // Reset feature flags before each test
    disableFeature('enhancedAnalysis', 'tfIdf');
  });

  describe('Term Frequency', () => {
    test('calculates correct term frequencies', () => {
      const text = 'the cat and the dog';
      const result = calculateTermFrequency(text);
      
      expect(result).toEqual({
        'the': 2,
        'cat': 1,
        'and': 1,
        'dog': 1
      });
    });

    test('handles empty text', () => {
      const result = calculateTermFrequency('');
      expect(result).toEqual({});
    });
  });

  describe('Inverse Document Frequency', () => {
    test('calculates correct IDF values', () => {
      const documents = [
        'the cat',
        'the dog',
        'the cat and dog'
      ];
      
      const result = calculateIDF(documents);
      
      expect(result.the).toBe(0); // ln(3/3) = 0
      expect(result.cat).toBeCloseTo(Math.log(3/2)); // ln(3/2)
      expect(result.dog).toBeCloseTo(Math.log(3/2)); // ln(3/2)
      expect(result.and).toBeCloseTo(Math.log(3/1)); // ln(3/1)
    });

    test('handles empty document list', () => {
      const result = calculateIDF([]);
      expect(result).toEqual({});
    });
  });

  describe('TF-IDF Calculation', () => {
    test('calculates correct TF-IDF values', () => {
      const text = 'the cat and cat';
      const idf = {
        'the': Math.log(2),
        'cat': Math.log(2),
        'and': Math.log(2)
      };
      
      const result = calculateTFIDF(text, idf);
      
      expect(result.the).toBeCloseTo(Math.log(2)); // tf=1, idf=ln(2)
      expect(result.cat).toBeCloseTo(2 * Math.log(2)); // tf=2, idf=ln(2)
      expect(result.and).toBeCloseTo(Math.log(2)); // tf=1, idf=ln(2)
    });
  });

  describe('Cosine Similarity', () => {
    test('calculates correct similarity for identical vectors', () => {
      const vector = { 'term1': 1, 'term2': 2 };
      const similarity = calculateCosineSimilarity(vector, vector);
      expect(similarity).toBe(1);
    });

    test('calculates correct similarity for orthogonal vectors', () => {
      const vector1 = { 'term1': 1 };
      const vector2 = { 'term2': 1 };
      const similarity = calculateCosineSimilarity(vector1, vector2);
      expect(similarity).toBe(0);
    });

    test('handles empty vectors', () => {
      const similarity = calculateCosineSimilarity({}, {});
      expect(similarity).toBe(0);
    });
  });

  describe('Basic Keyword Matching', () => {
    test('calculates correct similarity score', () => {
      const text1 = 'the cat and dog';
      const text2 = 'the cat and bird';
      const similarity = basicKeywordMatching(text1, text2);
      expect(similarity).toBe(0.75); // 3 common words out of 4 unique words
    });

    test('handles empty texts', () => {
      expect(basicKeywordMatching('', '')).toBe(0);
      expect(basicKeywordMatching('text', '')).toBe(0);
    });
  });

  describe('Document Comparison', () => {
    const text1 = 'the quick brown fox';
    const text2 = 'the quick brown cat';

    test('uses basic matching when feature is disabled', () => {
      disableFeature('enhancedAnalysis', 'tfIdf');
      const similarity = compareDocuments(text1, text2);
      expect(similarity).toBe(0.75); // 3 common words out of 4 unique words
    });

    test('uses TF-IDF when feature is enabled', () => {
      enableFeature('enhancedAnalysis', 'tfIdf');
      const similarity = compareDocuments(text1, text2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    test('falls back to basic matching on error', () => {
      enableFeature('enhancedAnalysis', 'tfIdf');
      const similarity = compareDocuments('', '');
      expect(similarity).toBe(0);
    });
  });

  describe('Multiple Document Comparison', () => {
    const documents = [
      { id: 'doc1', text: 'the quick brown fox' },
      { id: 'doc2', text: 'the quick brown cat' },
      { id: 'doc3', text: 'the lazy dog' }
    ];

    test('compares multiple documents with basic matching when disabled', () => {
      disableFeature('enhancedAnalysis', 'tfIdf');
      const results = compareMultipleDocuments(documents);
      
      expect(results).toHaveLength(3); // 3C2 = 3 comparisons
      expect(results[0]).toHaveProperty('doc1');
      expect(results[0]).toHaveProperty('doc2');
      expect(results[0]).toHaveProperty('similarity');
    });

    test('compares multiple documents with TF-IDF when enabled', () => {
      enableFeature('enhancedAnalysis', 'tfIdf');
      const results = compareMultipleDocuments(documents);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThan(0);
        expect(result.similarity).toBeLessThan(1);
      });
    });

    test('handles empty document list', () => {
      const results = compareMultipleDocuments([]);
      expect(results).toHaveLength(0);
    });
  });
});
