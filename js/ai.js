
let chatHistory = [];
let isProcessing = false;
let userSchedule = [];

const SYSTEM_PROMPTS = {
  general: `You are a time management coach. Your role is to help users improve their productivity and time management skills.
            Provide concise, actionable advice about time management, productivity, and task organization.
            Focus on practical tips and techniques that can be implemented immediately.
            For urgent exam preparation, prioritize high-impact study strategies and time allocation.`,
  
  schedule: `You are a time management coach helping to create a daily schedule.
            For urgent exam preparation, focus on priority topics and effective review techniques.
            Consider remaining time constraints and suggest optimal time blocks for different subjects.
            Format the schedule in a clear, time-blocked structure with specific review goals.`,
  
  analysis: `You are a time management coach analyzing the user's current schedule and tasks.
            For exam preparation, identify critical areas to focus on in limited time.
            Suggest ways to maximize retention and understanding in short study sessions.
            Focus on practical strategies for last-minute review and stress management.`
};

async function initAI() {
  console.log('AI initialized with Gemini API');
  const savedSchedule = localStorage.getItem('userSchedule');
  if (savedSchedule) {
    userSchedule = JSON.parse(savedSchedule);
  }
}

async function generateResponse(prompt) {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // First, try OpenAI
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI request failed');
      }

      const data = await response.json();
      const responseText = data.choices[0].message.content.trim();
      return formatResponse(responseText);

    } catch (error) {
      console.warn('OpenAI failed, falling back to Gemini:', error);

      // Fallback to Gemini
      const promptType = determinePromptType(prompt);
      const systemPrompt = SYSTEM_PROMPTS[promptType];
      const context = await getContextForPrompt(promptType);

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nContext: ${context}\n\nUser's message: ${prompt}\n\nPlease provide a concise response (max 3-4 sentences) focusing on practical time management advice.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!geminiResponse.ok) {
        throw new Error(`HTTP error! status: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      const responseText = geminiData.candidates[0].content.parts[0].text;
      return formatResponse(responseText);
    }
  } catch (error) {
    console.error('Error generating response from both services:', error);
    return 'I apologize, but I encountered an error. Please try again.';
  } finally {
    isProcessing = false;
  }
}

function determinePromptType(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('schedule') || lowerPrompt.includes('timetable') || 
      lowerPrompt.includes('plan') || lowerPrompt.includes('organize my day')) {
    return 'schedule';
  } else if (lowerPrompt.includes('analyze') || lowerPrompt.includes('review') || 
             lowerPrompt.includes('how am i doing') || lowerPrompt.includes('improve')) {
    return 'analysis';
  }
  return 'general';
}

async function getContextForPrompt(promptType) {
  let context = '';
  
  if (promptType === 'schedule' || promptType === 'analysis') {
    const tasks = await getCurrentTasks();
    context += `Current tasks: ${JSON.stringify(tasks)}\n`;
    
    if (userSchedule.length > 0) {
      context += `Current schedule: ${JSON.stringify(userSchedule)}\n`;
    }
  }
  
  return context;
}

async function getCurrentTasks() {
  const tasks = [];
  const taskElements = document.querySelectorAll('.task-item');
  
  taskElements.forEach(taskElement => {
    const title = taskElement.querySelector('h3').textContent;
    const dueDate = taskElement.querySelector('.text-sm')?.textContent || '';
    const completed = taskElement.querySelector('input[type="checkbox"]').checked;
    
    tasks.push({
      title,
      dueDate,
      completed
    });
  });
  
  return tasks;
}

function parseAndStoreSchedule(scheduleText) {
  const timeBlocks = scheduleText.match(/\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM)\s*:\s*[^\n]+/g);
  
  if (timeBlocks) {
    userSchedule = timeBlocks.map(block => {
      const [time, activity] = block.split(':');
      return {
        time: time.trim(),
        activity: activity.trim()
      };
    });
    
    localStorage.setItem('userSchedule', JSON.stringify(userSchedule));
  }
}

async function addMessage(message, isUser = false) {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `flex items-start space-x-3 p-4 ${isUser ? 'justify-end' : 'justify-start'} chat-message`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'flex-shrink-0';
  
  if (isUser) {
    const userAvatar = document.getElementById('user-avatar').src || 
                      'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg';
    avatarDiv.innerHTML = `
      <div class="relative">
        <img src="${userAvatar}" alt="User" class="w-10 h-10 rounded-full ring-2 ring-blue-500">
        <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
      </div>
    `;
  } else {
    avatarDiv.innerHTML = `
      <div class="relative">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center ring-2 ring-blue-500">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800"></div>
      </div>
    `;
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = `max-w-[70%] rounded-2xl p-4 ${
    isUser 
      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
      : 'bg-white dark:bg-gray-800'
  }`;
  
  contentDiv.innerHTML = message;
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  chatHistory.push({ message, isUser });
}

function formatResponse(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const conciseSentences = sentences.slice(0, 3);
  
  return `
    <div class="space-y-3">
      ${conciseSentences.map((sentence, index) => {
        const cleanSentence = sentence.trim();
        if (index === 0) {
          return `
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="font-semibold text-lg text-blue-600 dark:text-blue-400">${cleanSentence}</div>
            </div>
          `;
        } else {
          return `
            <div class="flex items-start space-x-3 group">
              <div class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5 transform group-hover:scale-110 transition-transform">
                <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">${cleanSentence}</div>
            </div>
          `;
        }
      }).join('')}
    </div>
  `;
}

const style = document.createElement('style');
style.textContent = `
  .thinking-dots {
    padding: 8px;
  }
  
  .thinking-dots div {
    animation: bounce 0.8s infinite;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  
  .chat-message {
    opacity: 0;
    transform: translateY(10px);
    animation: messageAppear 0.3s ease-out forwards;
  }
  
  @keyframes messageAppear {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .chat-message:hover {
    transform: translateY(-2px);
    transition: transform 0.2s ease;
  }
`;
document.head.appendChild(style);

document.getElementById('chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  input.disabled = true;
  input.value = '';
  
  try {
    addUserMessage(message);
    
    if (!isTimeManagementQuery(message)) {
      await addBotMessage(`
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="text-gray-700 dark:text-gray-300">
            I am your time management coach. I can only help with questions about time management, productivity, scheduling, and task organization. Please ask me something related to these topics!
          </div>
        </div>
      `);
      return;
    }
    
    await addBotMessage('');
    
    const response = await generateResponse(message);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await addBotMessage(response);
    
  } catch (error) {
    console.error('Error generating response:', error);
    await addBotMessage('I apologize, but I encountered an error. Please try again.');
  } finally {
    input.disabled = false;
    input.focus();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initAI();
  showWelcomeMessage();
});

function isTimeManagementQuery(query) {
  const timeManagementKeywords = [
    'time', 'schedule', 'task', 'todo', 'deadline', 'productivity',
    'focus', 'distraction', 'procrastination', 'organize', 'plan',
    'routine', 'habit', 'balance', 'priority', 'efficient', 'pomodoro',
    'break', 'work', 'study', 'meeting', 'calendar', 'reminder',
    'goal', 'project', 'deadline', 'timeline', 'manage', 'coach',
    'advice', 'help', 'suggest', 'recommend', 'improve', 'better',
    'struggle', 'problem', 'issue', 'challenge', 'difficult', 'hard',
    'exam', 'prepare', 'preparation', 'test', 'review', 'revise',
    'hours', 'minutes', 'last minute', 'cramming', 'quick',
    
    'assignment', 'homework', 'class', 'lecture', 'tutorial', 'quiz',
    'semester', 'final', 'midterm', 'course', 'subject', 'grade',
    'syllabus', 'curriculum', 'learn', 'understand', 'remember',
    'concentrate', 'memorize', 'notes', 'revision', 'practice',
    
    'morning', 'afternoon', 'evening', 'night', 'today', 'tomorrow',
    'weekend', 'week', 'month', 'daily', 'weekly', 'monthly',
    'due', 'urgent', 'important', 'soon', 'later', 'now',
    
    'burnout', 'stress', 'overwhelm', 'tired', 'exhausted', 'rest',
    'energy', 'motivation', 'concentration', 'discipline', 'method',
    'technique', 'strategy', 'approach', 'system', 'track', 'monitor',
    'progress', 'achieve', 'complete', 'finish', 'start', 'begin',
    
    'anxious', 'worried', 'nervous', 'calm', 'relax', 'focus',
    'concentrate', 'mind', 'brain', 'mental', 'physical', 'health',
    'balance', 'lifestyle', 'habit', 'routine', 'structure',
    
    'need', 'want', 'must', 'should', 'could', 'would', 'will',
    'trying', 'starting', 'finishing', 'doing', 'making', 'planning',
    'organizing', 'managing', 'scheduling', 'arranging', 'setting',
    
    'success', 'achieve', 'accomplish', 'complete', 'master',
    'excel', 'perform', 'improve', 'enhance', 'optimize', 'maximize',
    'effective', 'efficient', 'productive', 'successful', 'better'
  ];

  const queryWords = query.toLowerCase().split(/\s+/);
  return queryWords.some(word => timeManagementKeywords.includes(word)) ||
         timeManagementKeywords.some(keyword => query.toLowerCase().includes(keyword));
}

async function getAIResponse(userInput) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a time management coach. Provide concise, actionable advice about time management, productivity, and task organization. Focus on practical tips that can be implemented immediately. Keep responses brief and to the point. User's question: ${userInput}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 150
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error getting AI response:', error);
    throw error;
  }
}

async function handleUserInput(userInput) {
  if (!userInput.trim()) return;

  addMessageToChat('user', userInput);
  
  if (!isTimeManagementQuery(userInput)) {
    addMessageToChat('assistant', `
      <div class="flex items-center space-x-2">
        <span>💡 I am a time management coach. I cannot answer that question.</span>
      </div>
    `);
    return;
  }
  
  const loadingId = addLoadingIndicator();
  
  try {
    const response = await Promise.race([
      getAIResponse(userInput),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Response timeout')), 3000)
      )
    ]);
    
    removeLoadingIndicator(loadingId);
    
    addMessageToChat('assistant', response);
  } catch (error) {
    removeLoadingIndicator(loadingId);
    
    addMessageToChat('error', '⚠️ Sorry, I encountered an error. Please try again.');
    console.error('Error getting AI response:', error);
  }
}

function addMessageToChat(role, content) {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-3`;
  
  const messageContent = document.createElement('div');
  messageContent.className = `max-w-[80%] rounded-lg p-3 ${
    role === 'user' 
      ? 'bg-blue-600 text-white' 
      : role === 'error'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
  }`;
  
  const icon = role === 'user' 
    ? '👤 '
    : role === 'error'
    ? '⚠️ '
    : '💡 ';
  
  messageContent.innerHTML = `${icon}${content}`;
  messageDiv.appendChild(messageContent);
  chatContainer.appendChild(messageDiv);
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addLoadingIndicator() {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return null;

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'flex justify-start mb-3';
  loadingDiv.id = 'loading-indicator';
  
  const loadingContent = document.createElement('div');
  loadingContent.className = 'bg-gray-100 dark:bg-gray-700 rounded-lg p-3';
  loadingContent.innerHTML = '⏳ Thinking...';
  
  loadingDiv.appendChild(loadingContent);
  chatContainer.appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  return 'loading-indicator';
}

function removeLoadingIndicator(id) {
  const loadingDiv = document.getElementById(id);
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

window.showWelcomeMessage = function() {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return;
  chatContainer.innerHTML = '';
  let profile = null;
  try {
    const stored = localStorage.getItem('timeGuardUserProfile');
    if (stored) profile = JSON.parse(stored);
  } catch (e) {}
  if (profile && profile.name && profile.email) {
    const name = profile.name ? profile.name : 'there';
    addBotMessage(`Hi, <b>${name}</b> 👋, I am your time management coach. How may I help you?`);
  } else {
    addBotMessage('Hi, I am your time management coach. How may I help you?');
  }
};

async function initAIChat() {
    try {
    } catch (error) {
    }
}

async function handleUserMessage(message) {
    try {
        addMessageToChat('user', message);
        
        const response = await generateAIResponse(message);
        addMessageToChat('assistant', response);
    } catch (error) {
        addMessageToChat('error', 'Sorry, I encountered an error. Please try again.');
    }
}

async function generateAIResponse(message) {
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'I understand you want help with time management. Here are some tips...';
    } catch (error) {
        return 'I\'m sorry, I couldn\'t process your request. Please try again.';
  }
}