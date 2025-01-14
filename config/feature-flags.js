/**
 * Feature flags for controlling enhanced functionality
 * Each flag should be explicitly enabled through configuration
 * Default to false for safety
 */
const FEATURES = {
  // Content Analysis Features
  enhancedAnalysis: {
    enabled: false,
    tfIdf: false,
    embeddings: false,
    privacyChecks: false
  },

  // LLM Processing Features
  llmProcessing: {
    enabled: false,
    summarization: false,
    topicExtraction: false,
    relationshipInference: false
  },

  // Output Enhancement Features
  outputEnhancement: {
    enabled: false,
    visualization: false,
    feedbackSystem: false
  }
};

/**
 * Check if a specific feature is enabled
 * @param {string} feature - The feature to check
 * @param {string} [subFeature] - Optional sub-feature to check
 * @returns {boolean} - Whether the feature is enabled
 */
function isFeatureEnabled(feature, subFeature = null) {
  if (!FEATURES[feature]) {
    return false;
  }

  if (subFeature) {
    return FEATURES[feature].enabled && FEATURES[feature][subFeature];
  }

  return FEATURES[feature].enabled;
}

/**
 * Enable a specific feature
 * @param {string} feature - The feature to enable
 * @param {string} [subFeature] - Optional sub-feature to enable
 */
function enableFeature(feature, subFeature = null) {
  if (!FEATURES[feature]) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  if (subFeature) {
    if (!FEATURES[feature].hasOwnProperty(subFeature)) {
      throw new Error(`Unknown sub-feature: ${subFeature} for feature: ${feature}`);
    }
    FEATURES[feature].enabled = true;
    FEATURES[feature][subFeature] = true;
  } else {
    FEATURES[feature].enabled = true;
  }
}

/**
 * Disable a specific feature
 * @param {string} feature - The feature to disable
 * @param {string} [subFeature] - Optional sub-feature to disable
 */
function disableFeature(feature, subFeature = null) {
  if (!FEATURES[feature]) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  if (subFeature) {
    if (!FEATURES[feature].hasOwnProperty(subFeature)) {
      throw new Error(`Unknown sub-feature: ${subFeature} for feature: ${feature}`);
    }
    FEATURES[feature][subFeature] = false;
    // Check if all sub-features are disabled
    const allDisabled = Object.entries(FEATURES[feature])
      .filter(([key]) => key !== 'enabled')
      .every(([_, value]) => !value);
    if (allDisabled) {
      FEATURES[feature].enabled = false;
    }
  } else {
    FEATURES[feature].enabled = false;
    // Disable all sub-features
    Object.keys(FEATURES[feature]).forEach(key => {
      if (key !== 'enabled') {
        FEATURES[feature][key] = false;
      }
    });
  }
}

module.exports = {
  FEATURES,
  isFeatureEnabled,
  enableFeature,
  disableFeature
};
