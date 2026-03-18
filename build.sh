#!/bin/bash
echo "Creating config.js..."
echo "window.CONFIG = {" > config.js
echo "  GOOGLE_CLIENT_ID: \"$GOOGLE_CLIENT_ID\"," >> config.js
echo "  GEMINI_API_KEY: \"$GEMINI_API_KEY\"," >> config.js
echo "  OPENAI_API_KEY: \"$OPENAI_API_KEY\"," >> config.js
echo "  DEFAULT_TASKS_LIST_NAME: \"$DEFAULT_TASKS_LIST_NAME\"" >> config.js
echo "};" >> config.js
echo "config.js created successfully."
