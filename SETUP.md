# API Configuration Setup

## Issue Fixed
The errors you encountered were:
1. **OpenAI 429 (Too Many Requests)**: Rate limiting from OpenAI API
2. **Gemini 404 (Not Found)**: Missing or invalid API key configuration

## Solution

### Step 1: Create your config.js file
The `config.js` file is excluded from version control for security reasons. You need to create it manually:

1. Copy `config.example.js` to `config.js`:
   ```bash
   cp config.example.js config.js
   ```

2. Or create `config.js` manually with the following content:

```javascript
// Configuration file for API keys and settings
const CONFIG = {
    // OpenAI API Configuration
    OPENAI_API_KEY: 'your-openai-api-key-here',
    
    // Gemini API Configuration  
    GEMINI_API_KEY: 'your-gemini-api-key-here',
    
    // API Settings
    API_TIMEOUT: 10000,
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000
};
```

### Step 2: Get your API keys

#### For OpenAI API Key:
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and replace `your-openai-api-key-here` in config.js

#### For Gemini API Key:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and replace `your-gemini-api-key-here` in config.js

### Step 3: Update your config.js
Replace the placeholder values with your actual API keys:

```javascript
const CONFIG = {
    OPENAI_API_KEY: 'sk-your-actual-openai-key-here',
    GEMINI_API_KEY: 'AIzaSyYourActualGeminiKeyHere',
    // ... other settings
};
```

## What was fixed in the code:

1. **Better error handling**: The code now provides specific error messages for different failure scenarios
2. **CONFIG validation**: Checks if CONFIG object exists before using API keys
3. **Rate limit handling**: Properly handles OpenAI 429 errors and falls back to Gemini
4. **Model fallback**: Tries Gemini 2.0 Flash first, then falls back to 1.5 Flash
5. **Response validation**: Validates API response structure before accessing properties

## Testing
After setting up your API keys, refresh your application and test the chat functionality. The errors should now be resolved.

## Security Note
- Never commit your actual `config.js` file to version control
- The `.gitignore` file already excludes `config.js` for this reason
- Keep your API keys secure and don't share them publicly
