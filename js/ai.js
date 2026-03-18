let isProcessing = false;
let fallbackContext = {
  topic: null,
  days: null
};

const SYSTEM_PROMPTS = {
  general: 'You are a time management coach. Give detailed, practical, and well-structured plans. Use clear sections, short bullet points, and concrete action steps with timelines.',
  schedule: 'You are a time management coach. Return only a JSON array of tasks with fields: time, title, notes.',
  analysis: 'You are a time management coach. Analyze the user context and suggest practical improvements.'
};

function buildStructuredCoachInstruction(prompt) {
  const lower = prompt.toLowerCase();
  const requestedDays = extractRequestedDays(lower);
  const hasPlanIntent = isPlanIntent(lower);
  const topic = detectTopic(lower) || 'time management';

  if (hasPlanIntent || requestedDays) {
    const days = requestedDays || 7;
    return [
      `Create a complete ${days}-day plan for ${topic}.`,
      'Response format requirements:',
      '1) Goal Summary (2-3 lines)',
      `2) Day-by-Day Plan (Day 1 to Day ${days}, each day with 3 study/work blocks and clear outcomes)`,
      '3) Daily Time Template (morning, afternoon, evening)',
      '4) Progress Tracking Metrics (what to measure daily)',
      '5) Risk Management (what to do if behind schedule)',
      'Use practical and realistic workloads. Avoid vague statements.'
    ].join('\n');
  }

  return [
    'Provide a structured coaching answer in these sections:',
    '1) Situation Assessment',
    '2) Step-by-Step Action Plan',
    '3) Suggested Daily Routine',
    '4) How to Measure Progress',
    '5) Next 24 Hours Action Items',
    'Keep it practical, specific, and immediately actionable.'
  ].join('\n');
}

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

    let line = `Day ${day}: ${topicName}\n- Block 1 (2h): Concept learning and notes\n- Block 2 (2h): Guided practice and problem solving\n- Block 3 (1h): Revision, mistakes log, and recap`;

    if (day === days) {
      line = `Day ${day}: Full revision + timed mock practice\n- Block 1 (2h): Mixed timed problems\n- Block 2 (2h): Weak-area fixes\n- Block 3 (1h): Formula/pattern recap and planning`;
    }

    planLines.push(line);
  }

  return [
    `Goal Summary:\nComplete a focused ${days}-day ${topic} plan with measurable daily outcomes.`,
    `\nDay-by-Day Plan:\n${planLines.join('\n\n')}`,
    '\nDaily Time Template:\n- Morning: Deep work on hardest topic\n- Afternoon: Practice and application\n- Evening: Review, recap, and next-day planning',
    '\nProgress Tracking:\n- Number of focused hours\n- Number of tasks/problems completed\n- Mistake categories reduced day by day',
    '\nIf You Fall Behind:\n- Cut low-priority tasks first\n- Keep revision block mandatory\n- Shift unfinished high-priority tasks to next morning'
  ].join('\n');
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
            : SYSTEM_PROMPTS.general
        },
        {
          role: 'user',
          content: expectJson
            ? prompt
            : `${buildStructuredCoachInstruction(prompt)}\n\nUser Request:\n${prompt}`
        }
      ],
      temperature: 0.4,
      max_tokens: expectJson ? 500 : 700,
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
                  text: expectJson
                    ? `${SYSTEM_PROMPTS[promptType]}\n\nUser: ${prompt}`
                    : `${SYSTEM_PROMPTS[promptType]}\n\n${buildStructuredCoachInstruction(prompt)}\n\nUser: ${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: expectJson ? 500 : 900,
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
  const lines = String(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return '<div class="space-y-2"><p>No response generated.</p></div>';
  }

  let html = '<div class="space-y-3">';
  let inList = false;

  for (const line of lines) {
    const safeLine = escapeHtml(line);

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 space-y-1">';
        inList = true;
      }
      html += `<li>${escapeHtml(line.replace(/^[-*]\s+/, ''))}</li>`;
      continue;
    }

    if (inList) {
      html += '</ul>';
      inList = false;
    }

    if (/^[A-Za-z0-9 ]+:$/.test(line)) {
      html += `<h4 class="font-semibold text-surface-900 dark:text-surface-100">${safeLine}</h4>`;
    } else {
      html += `<p>${safeLine}</p>`;
    }
  }

  if (inList) {
    html += '</ul>';
  }

  html += '</div>';
  return html;
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

async function getCoachResult(message) {
  const responseText = await generateAIResponse(message, false);
  return {
    text: responseText,
    html: formatCoachResponse(responseText)
  };
}

async function initAI() {
  console.log('AI module initialized');
}

window.generateAIResponse = generateAIResponse;
window.getCoachResponse = getCoachResponse;
window.getCoachResult = getCoachResult;
window.initAI = initAI;
