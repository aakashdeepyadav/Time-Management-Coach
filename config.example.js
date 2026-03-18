// Configuration file for API keys and settings
// Copy this file to config.js and add your actual API keys
// IMPORTANT: Never commit config.js to version control!

window.CONFIG = {
    // OpenAI API Configuration
    // Get your API key from: https://platform.openai.com/api-keys
    OPENAI_API_KEY: 'your-openai-api-key-here',
    
    // Gemini API Configuration  
    // Get your API key from: https://makersuite.google.com/app/apikey
    GEMINI_API_KEY: 'your-gemini-api-key-here',

    // Google OAuth Client ID for Google Sign-In/Tasks
    // Create from Google Cloud Console OAuth credentials
    GOOGLE_CLIENT_ID: 'your-google-client-id-here',
    
    // API Settings
    API_TIMEOUT: 10000,
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000
};

// Export for use in Node tests if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CONFIG;
}
