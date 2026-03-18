document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

const AUTO_TASK_PREF_KEY = 'tmCoachAutoAddTasks';

async function initApp() {
  try {
    const scheduleDateInput = document.getElementById('schedule-date');
    if (scheduleDateInput) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      scheduleDateInput.value = formattedDate;
    }

    setupEventListeners();
    initAutoTaskToggle();
    initCoachMemoryReset();

    if (typeof initAI === 'function') {
      await initAI();
    }
  } catch (error) {
    console.error('Error initializing app:', error);
    showNotification('Error initializing application. Please refresh the page.', 'error');
  }
}

function setupEventListeners() {
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userInput = document.getElementById('user-input');
      if (!userInput) return;

      const message = userInput.value.trim();
      if (!message) return;

      try {
        addUserMessage(message);
        userInput.value = '';

        const loadingId = addLoadingIndicator();

        try {
          const coachResult = typeof getCoachResult === 'function'
            ? await getCoachResult(message)
            : { text: await generateAIResponse(message, false), html: await getCoachResponse(message) };

          removeLoadingIndicator(loadingId);
          addBotMessage(coachResult.html);

          const addedCount = await maybeAutoAddPlanTasks(message, coachResult.text);
          if (addedCount > 0) {
            showNotification(`${addedCount} plan tasks added to your task list`, 'success');
          }
        } catch (error) {
          removeLoadingIndicator(loadingId);
          console.error('Chat request failed:', error);
          showNotification('Error processing your message. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Error in chat:', error);
        showNotification('Error processing your message. Please try again.', 'error');
      }
    });
  }

  const generateScheduleBtn = document.getElementById('generate-schedule-btn');
  if (generateScheduleBtn) {
    generateScheduleBtn.addEventListener('click', async () => {
      const dateInput = document.getElementById('schedule-date');
      const focusInput = document.getElementById('schedule-focus');

      const date = dateInput ? dateInput.value : '';
      const focus = focusInput ? focusInput.value : 'time management';

      if (!date) {
        showNotification('Please select a date', 'error');
        return;
      }

      try {
        await generateSchedule(date, focus);
      } catch (error) {
        console.error('Error generating schedule:', error);
        showNotification('Failed to generate schedule. Please try again.', 'error');
      }
    });
  }

  const addScheduleBtn = document.getElementById('add-schedule-to-tasks');
  if (addScheduleBtn) {
    addScheduleBtn.addEventListener('click', async () => {
      const scheduleContent = document.getElementById('schedule-content');
      if (!scheduleContent) return;

      const scheduleData = scheduleContent.dataset.scheduleData;
      if (!scheduleData) return;

      try {
        const scheduleTasks = JSON.parse(scheduleData);
        const success = await addScheduleTasks(scheduleTasks);
        if (success) {
          showNotification('Schedule added to tasks successfully!', 'success');
        }
      } catch (error) {
        console.error('Error adding schedule to tasks:', error);
        showNotification('Error adding schedule to tasks', 'error');
      }
    });
  }
}

function isAutoTaskSyncEnabled() {
  const storedValue = localStorage.getItem(AUTO_TASK_PREF_KEY);
  if (storedValue === null) {
    return false;
  }
  return storedValue === '1';
}

function initAutoTaskToggle() {
  const toggle = document.getElementById('auto-task-toggle');
  if (!toggle) return;

  toggle.checked = isAutoTaskSyncEnabled();

  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    localStorage.setItem(AUTO_TASK_PREF_KEY, enabled ? '1' : '0');
    showNotification(
      enabled ? 'Task auto-add enabled (explicit request only)' : 'Task auto-add disabled',
      'success'
    );
  });
}

function initCoachMemoryReset() {
  const resetButton = document.getElementById('reset-coach-memory');
  if (!resetButton) return;

  resetButton.addEventListener('click', () => {
    if (typeof clearCoachMemory === 'function') {
      clearCoachMemory();
      showNotification('Coach memory reset successfully', 'success');
    } else {
      showNotification('Memory reset is not available right now', 'error');
    }
  });
}

async function generateSchedule(date, focus) {
  const generateButton = document.getElementById('generate-schedule-btn');

  try {
    if (generateButton) {
      generateButton.textContent = 'Generating...';
      generateButton.disabled = true;
    }

    const displayDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    const prompt = `Create a detailed time management schedule for a college student on ${displayDate} with a focus on ${focus}. Include specific time blocks from morning to evening with activities, breaks, and study sessions. Return only a JSON array of tasks with fields: time, title, notes.`;

    const scheduleResponse = await generateAIResponse(prompt, true);

    let scheduleTasks = [];
    try {
      scheduleTasks = JSON.parse(scheduleResponse);
    } catch (error) {
      console.error('Error parsing schedule JSON:', error);
      throw new Error('Could not parse schedule data');
    }

    if (!Array.isArray(scheduleTasks) || scheduleTasks.length === 0) {
      throw new Error('Invalid schedule format received');
    }

    let scheduleHTML = `<h3 class="font-semibold mb-2">Schedule for ${displayDate}</h3>`;
    scheduleHTML += '<div class="space-y-2">';

    scheduleTasks.forEach(task => {
      scheduleHTML += `
        <div class="border-l-4 border-blue-400 pl-3 py-1">
          <div class="font-medium">${escapeHtml(task.time)}: ${escapeHtml(task.title)}</div>
          ${task.notes ? `<div class="text-gray-600 text-sm">${escapeHtml(task.notes)}</div>` : ''}
        </div>
      `;
    });

    scheduleHTML += '</div>';

    const scheduleContent = document.getElementById('schedule-content');
    if (!scheduleContent) {
      return;
    }

    scheduleContent.innerHTML = scheduleHTML;
    scheduleContent.dataset.scheduleData = JSON.stringify(scheduleTasks);

    const scheduleResult = document.getElementById('schedule-result');
    if (scheduleResult) {
      scheduleResult.classList.remove('hidden');
      scheduleResult.classList.add('show');
    }
  } catch (error) {
    console.error('Error generating schedule:', error);
    showNotification('Failed to generate schedule. Please try again.', 'error');
  } finally {
    if (generateButton) {
      generateButton.textContent = 'Generate Schedule';
      generateButton.disabled = false;
    }
  }
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function shouldAutoCreateTasksFromPrompt(prompt) {
  const lower = prompt.toLowerCase();
  return lower.includes('plan') ||
    lower.includes('schedule') ||
    lower.includes('roadmap') ||
    /\b\d+\s*days?\b/.test(lower) ||
    lower.includes('dsa');
}

function userExplicitlyRequestedTaskCreation(prompt) {
  const lower = prompt.toLowerCase();
  const explicitPatterns = [
    /\badd\b.{0,35}\btasks?\b/,
    /\bcreate\b.{0,35}\btasks?\b/,
    /\bmake\b.{0,35}\btasks?\b/,
    /\bsave\b.{0,35}\btasks?\b/,
    /\bput\b.{0,35}\btasks?\b/,
    /\bconvert\b.{0,35}\bto\b.{0,20}\btasks?\b/,
    /\btaskify\b/,
    /\badd this plan\b/,
    /\badd this to my tasks\b/
  ];

  return explicitPatterns.some((pattern) => pattern.test(lower));
}

function responseLooksLikeTaskPlan(responseText) {
  const text = String(responseText || '');
  return /^Day\s*\d+\s*:/im.test(text) || /^-\s*Block\b/im.test(text);
}

function getExistingTaskTitles() {
  const titleNodes = document.querySelectorAll('#tasks-container .task-item h3');
  return new Set(Array.from(titleNodes).map(node => node.textContent.trim().toLowerCase()));
}

function buildDueDateForDayOffset(dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(0, dayOffset));
  date.setHours(9, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function extractTaskCandidatesFromPlan(planText) {
  const lines = String(planText).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const extracted = [];

  for (const line of lines) {
    const dayMatch = line.match(/^Day\s*(\d+)\s*:\s*(.+)$/i);
    if (dayMatch) {
      extracted.push({
        title: `Day ${dayMatch[1]}: ${dayMatch[2]}`,
        notes: 'Generated from AI coaching plan',
        dayOffset: parseInt(dayMatch[1], 10) - 1
      });
      continue;
    }

    if (line.startsWith('- Block')) {
      extracted.push({
        title: line.replace(/^-\s*/, ''),
        notes: 'Suggested execution block from AI plan',
        dayOffset: 0
      });
    }
  }

  return extracted.slice(0, 8);
}

async function maybeAutoAddPlanTasks(userPrompt, responseText) {
  if (typeof addTask !== 'function') {
    return 0;
  }

  if (!isAutoTaskSyncEnabled()) {
    return 0;
  }

  if (!shouldAutoCreateTasksFromPrompt(userPrompt)) {
    return 0;
  }

  if (!userExplicitlyRequestedTaskCreation(userPrompt)) {
    return 0;
  }

  if (!responseLooksLikeTaskPlan(responseText)) {
    return 0;
  }

  const candidates = extractTaskCandidatesFromPlan(responseText);
  if (candidates.length === 0) {
    return 0;
  }

  const existingTitles = getExistingTaskTitles();
  let added = 0;

  for (const candidate of candidates) {
    const normalized = candidate.title.toLowerCase();
    if (existingTitles.has(normalized)) {
      continue;
    }

    const due = buildDueDateForDayOffset(candidate.dayOffset);
    await addTask(candidate.title, candidate.notes, due);
    existingTitles.add(normalized);
    added += 1;
  }

  return added;
}
