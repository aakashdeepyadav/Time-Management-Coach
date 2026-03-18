
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  try {
    const scheduleDateInput = document.getElementById('schedule-date');
    if (scheduleDateInput) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      scheduleDateInput.value = formattedDate;
    }

    setupEventListeners();

    if (typeof initAI === 'function') {
      await initAI();
    }
  } catch (error) {
    console.error('Error initializing app:', error);
    showNotification('Error initializing application. Please refresh the page.', 'error');
  }
}

function setupEventListeners() {
  const syncTasksBtn = document.getElementById('sync-tasks-btn');
  if (syncTasksBtn) {
    syncTasksBtn.addEventListener('click', async () => {
      try {
        await fetchGoogleTasks();
        showNotification('Tasks synced successfully!', 'success');
      } catch (error) {
        console.error('Error syncing tasks:', error);
        showNotification('Failed to sync tasks. Please try again.', 'error');
      }
    });
  }

  const addTaskForm = document.getElementById('add-task-form');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const taskInput = document.getElementById('new-task-input');
      if (!taskInput) return;

      const taskTitle = taskInput.value.trim();
      if (!taskTitle) return;

      try {
        await addGoogleTask(taskTitle);
        taskInput.value = '';
        showNotification('Task added successfully!', 'success');
      } catch (error) {
        console.error('Error adding task:', error);
        showNotification('Failed to add task. Please try again.', 'error');
      }
    });
  }

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
          const response = await getCoachResponse(message);
          removeLoadingIndicator(loadingId);
          addBotMessage(response);
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

      if (date) {
        try {
          await generateSchedule(date, focus);
        } catch (error) {
          console.error('Error generating schedule:', error);
          showNotification('Failed to generate schedule. Please try again.', 'error');
        }
      } else {
        showNotification('Please select a date', 'error');
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}