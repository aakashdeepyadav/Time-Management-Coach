// Configuration file for API keys and settings
// Copy this file to config.js and add your actual API keys
// IMPORTANT: Never commit config.js to version control!

const CONFIG = {
    // OpenAI API Configuration
    // Get your API key from: https://platform.openai.com/api-keys
    OPENAI_API_KEY: 'your-openai-api-key-here',
    
    // Gemini API Configuration  
    // Get your API key from: https://makersuite.google.com/app/apikey
    GEMINI_API_KEY: 'your-gemini-api-key-here',
    
    // API Settings
    API_TIMEOUT: 10000,
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
