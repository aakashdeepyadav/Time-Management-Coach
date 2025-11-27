
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  try {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('schedule-date').value = formattedDate;
    
    setupEventListeners();
    
    checkStoredAuth();
  } catch (error) {
    console.error('Error initializing app:', error);
    showNotification('Error initializing application. Please refresh the page.', 'error');
  }
}

function setupEventListeners() {
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  document.getElementById('sync-tasks-btn').addEventListener('click', async () => {
    try {
      await fetchGoogleTasks();
      showNotification('Tasks synced successfully!', 'success');
    } catch (error) {
      console.error('Error syncing tasks:', error);
      showNotification('Failed to sync tasks. Please try again.', 'error');
    }
  });
  
  document.getElementById('add-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskInput = document.getElementById('new-task-input');
    const taskTitle = taskInput.value.trim();
    
    if (taskTitle) {
      try {
        await addGoogleTask(taskTitle);
        taskInput.value = '';
        showNotification('Task added successfully!', 'success');
      } catch (error) {
        console.error('Error adding task:', error);
        showNotification('Failed to add task. Please try again.', 'error');
      }
    }
  });
  
  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (message) {
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
          showNotification('Error processing your message. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Error in chat:', error);
        showNotification('Error processing your message. Please try again.', 'error');
      }
    }
  });
  
  document.getElementById('generate-schedule-btn').addEventListener('click', async () => {
    const date = document.getElementById('schedule-date').value;
    const focus = document.getElementById('schedule-focus').value;
    
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
  
  document.getElementById('add-schedule-to-tasks').addEventListener('click', async () => {
    const scheduleContent = document.getElementById('schedule-content');
    const scheduleData = scheduleContent.dataset.scheduleData;
    
    if (scheduleData) {
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
    }
  });
}

async function generateSchedule(date, focus) {
  try {
    document.getElementById('generate-schedule-btn').textContent = 'Generating...';
    document.getElementById('generate-schedule-btn').disabled = true;
    
    const displayDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    const prompt = `Create a detailed time management schedule for a college student on ${displayDate} with a focus on ${focus}. 
                  Include specific time blocks from morning to evening with activities, breaks, and study sessions. 
                  Format the response as a JSON array of tasks with 'time', 'title', and 'notes' fields that I can add to my task list.`;
                    
    const scheduleResponse = await generateAIResponse(prompt, true);
    
    let scheduleTasks = [];
    try {
      const jsonMatch = scheduleResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        scheduleTasks = JSON.parse(jsonMatch[1]);
      } else {
        const arrayMatch = scheduleResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          scheduleTasks = JSON.parse(arrayMatch[0]);
        }
      }
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
          <div class="font-medium">${task.time}: ${escapeHtml(task.title)}</div>
          ${task.notes ? `<div class="text-gray-600 text-sm">${escapeHtml(task.notes)}</div>` : ''}
        </div>
      `;
    });
    
    scheduleHTML += '</div>';
    
    const scheduleContent = document.getElementById('schedule-content');
    scheduleContent.innerHTML = scheduleHTML;
    scheduleContent.dataset.scheduleData = JSON.stringify(scheduleTasks);
    
    document.getElementById('schedule-result').classList.remove('hidden');
    document.getElementById('schedule-result').classList.add('show');
    
  } catch (error) {
    console.error('Error generating schedule:', error);
    showNotification('Failed to generate schedule. Please try again.', 'error');
  } finally {
    document.getElementById('generate-schedule-btn').textContent = 'Generate Schedule';
    document.getElementById('generate-schedule-btn').disabled = false;
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