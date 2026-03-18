let isProcessing = false;
let fallbackContext = {
  topic: null,
  days: null
};

const SYSTEM_PROMPTS = {
  general: 'You are a time management coach. Give concise, practical advice in 3-4 sentences max.',
  schedule: 'You are a time management coach. Return only a JSON array of tasks with fields: time, title, notes.',
  analysis: 'You are a time management coach. Analyze the user context and suggest practical improvements.'
};

function getConfig() {
  if (typeof window !== 'undefined' && window.CONFIG) {
    return window.CONFIG;
  }

  if (typeof CONFIG !== 'undefined') {
    return CONFIG;
  }

  return {};
}

function getApiKey(keyName) {
  const config = getConfig();
  const value = config[keyName];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('your-openai-api-key-here') || trimmed.includes('your-gemini-api-key-here')) {
    return null;
  }

  return trimmed;
}

function getMockResponse(prompt, expectJson = false) {
  if (expectJson) {
    return JSON.stringify([
      {
        time: '08:00 AM',
        title: 'Plan Top 3 Priorities',
        notes: 'List high-impact tasks and estimated effort.'
      },
      {
        time: '10:00 AM',
        title: 'Deep Work Session',
        notes: '50 min focus + 10 min break using Pomodoro.'
      },
      {
        time: '02:00 PM',
        title: 'Review and Adjust',
        notes: 'Check progress and move unfinished tasks.'
      }
    ]);
  }

  const lower = prompt.toLowerCase();
  const detectedDays = extractRequestedDays(lower);
  const detectedTopic = detectTopic(lower);

  if (detectedDays) {
    fallbackContext.days = detectedDays;
  }

  if (detectedTopic) {
    fallbackContext.topic = detectedTopic;
  }

  const activeDays = fallbackContext.days || detectedDays;
  const activeTopic = fallbackContext.topic || detectedTopic || 'your goal';

  if (isPlanIntent(lower) && activeDays) {
    return createDayWisePlan(activeTopic, activeDays);
  }

  if (lower.includes('how do i plan') || lower.includes('how to plan')) {
    if (activeDays) {
      return `Use this ${activeDays}-day structure: split each day into 3 blocks (learn, practice, review), track progress with solved questions, and keep one revision block at night. Start with easy problems, move to medium by day 2, and reserve the final day for mock tests and weak-topic revision.`;
    }
    return 'Plan in three layers: define your daily target, allocate focused study blocks, then end with a short review of mistakes. Keep one clear metric each day like problems solved or topics completed.';
  }

  if (lower.includes('exam') || lower.includes('test')) {
    return 'Start with the highest-weight topics first. Use 50 minutes focused study and 10 minutes break cycles. End with active recall and quick revision of weak areas.';
  }

  if (lower.includes('dsa')) {
    return 'For DSA, prioritize one topic block, one coding practice block, and one revision block daily. Focus on arrays/strings first, then hashmaps/sliding window, then trees/graphs. Solve and review at least 15 to 20 problems each day with error notes.';
  }

  return 'Block your day by priority, not by urgency alone. Start with one deep-work block, then batch shallow tasks later. Review progress at the end of the day and adjust tomorrow\'s plan.';
}

function extractRequestedDays(lowerPrompt) {
  const numericMatch = lowerPrompt.match(/(\d{1,2})\s*days?/);
  if (numericMatch && numericMatch[1]) {
    const parsed = parseInt(numericMatch[1], 10);
    if (parsed >= 1 && parsed <= 30) {
      return parsed;
    }
  }

  if (lowerPrompt.includes('one week') || lowerPrompt.includes('a week') || lowerPrompt.includes('weekly')) {
    return 7;
  }

  if (lowerPrompt.includes('five days')) {
    return 5;
  }

  if (lowerPrompt.includes('seven days')) {
    return 7;
  }

  return null;
}

function detectTopic(lowerPrompt) {
  if (lowerPrompt.includes('dsa')) {
    return 'DSA';
  }
  if (lowerPrompt.includes('exam')) {
    return 'exam preparation';
  }
  if (lowerPrompt.includes('interview')) {
    return 'interview preparation';
  }
  return null;
}

function isPlanIntent(lowerPrompt) {
  return lowerPrompt.includes('plan') ||
    lowerPrompt.includes('schedule') ||
    lowerPrompt.includes('roadmap') ||
    lowerPrompt.includes('prepare');
}

function createDayWisePlan(topic, days) {
  const dsaTopics = [
    'Arrays and Strings',
    'Hashing and Two Pointers',
    'Sliding Window and Binary Search',
    'Recursion and Backtracking',
    'Linked List and Stack/Queue',
    'Trees and Heaps',
    'Graphs and Dynamic Programming'
  ];

  const planLines = [];
  for (let day = 1; day <= days; day += 1) {
    const topicName = topic === 'DSA'
      ? dsaTopics[(day - 1) % dsaTopics.length]
      : `${topic} - priority module ${day}`;

    let line = `Day ${day}: ${topicName} -> 2h concept learning, 2h problem solving, 1h revision and error log.`;

    if (day === days) {
      line = `Day ${day}: Full revision + timed mock practice -> 2h mixed problems, 2h weak-area fixes, 1h formula/pattern recap.`;
    }

    planLines.push(line);
  }

  return `Here is your ${days}-day ${topic} plan:\n${planLines.join('\n')}\n\nDaily rule: use 50/10 focus cycles, track solved problems, and review mistakes every night.`;
}

function determinePromptType(prompt, expectJson = false) {
  if (expectJson) {
    return 'schedule';
  }

  const lower = prompt.toLowerCase();
  if (lower.includes('schedule') || lower.includes('plan') || lower.includes('timetable')) {
    return 'schedule';
  }
  if (lower.includes('analyze') || lower.includes('review') || lower.includes('improve')) {
    return 'analysis';
  }
  return 'general';
}

async function callOpenAI(prompt, expectJson = false) {
  const openAiKey = getApiKey('OPENAI_API_KEY');
  if (!openAiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: expectJson
            ? SYSTEM_PROMPTS.schedule
            : 'You are a time management coach. Keep answers practical and concise.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: expectJson ? 400 : 220,
      response_format: expectJson ? { type: 'json_object' } : undefined
    })
  });

  if (response.status === 429) {
    throw new Error('OpenAI rate limited');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';

  if (!content || typeof content !== 'string') {
    throw new Error('OpenAI returned empty response');
  }

  if (!expectJson) {
    return content.trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error('OpenAI JSON parse failed');
  }

  if (Array.isArray(parsed)) {
    return JSON.stringify(parsed);
  }

  if (Array.isArray(parsed.tasks)) {
    return JSON.stringify(parsed.tasks);
  }

  throw new Error('OpenAI JSON format invalid for schedule');
}

async function callGemini(prompt, expectJson = false) {
  const geminiKey = getApiKey('GEMINI_API_KEY');
  if (!geminiKey) {
    throw new Error('Gemini API key not configured');
  }

  const promptType = determinePromptType(prompt, expectJson);
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  for (const modelName of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_PROMPTS[promptType]}\n\nUser: ${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: expectJson ? 400 : 220,
            responseMimeType: expectJson ? 'application/json' : 'text/plain'
          }
        })
      }
    );

    if (response.status === 404) {
      continue;
    }

    if (response.status === 429) {
      throw new Error('Gemini rate limited');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
      ? data.candidates[0].content.parts[0].text
      : '';

    if (!text || typeof text !== 'string') {
      throw new Error('Gemini returned empty response');
    }

    return expectJson ? normalizeJsonArray(text) : text.trim();
  }

  throw new Error('No Gemini model available');
}

function normalizeJsonArray(text) {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed);
    }
    if (Array.isArray(parsed.tasks)) {
      return JSON.stringify(parsed.tasks);
    }
  } catch (error) {
    // Continue to regex fallback
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    return normalizeJsonArray(fenced[1]);
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  throw new Error('Could not normalize JSON array');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCoachResponse(text) {
  const cleaned = escapeHtml(text).replace(/\n/g, '<br>');
  return `<div class="space-y-2"><p>${cleaned}</p></div>`;
}

async function generateAIResponse(prompt, expectJson = false) {
  if (isProcessing) {
    throw new Error('Please wait for the previous response to finish');
  }

  isProcessing = true;
  try {
    try {
      return await callOpenAI(prompt, expectJson);
    } catch (openAiError) {
      console.warn('OpenAI failed, trying Gemini:', openAiError);
      return await callGemini(prompt, expectJson);
    }
  } catch (apiError) {
    console.error('All AI providers failed, using mock response:', apiError);
    return getMockResponse(prompt, expectJson);
  } finally {
    isProcessing = false;
  }
}

async function getCoachResponse(message) {
  const responseText = await generateAIResponse(message, false);
  return formatCoachResponse(responseText);
}

async function initAI() {
  console.log('AI module initialized');
}

window.generateAIResponse = generateAIResponse;
window.getCoachResponse = getCoachResponse;
window.initAI = initAI;
