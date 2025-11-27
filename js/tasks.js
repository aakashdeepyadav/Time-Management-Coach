
let userTasks = [];
let defaultTaskList = null;
let googleTasksLoaded = false;
let pendingLocalTasks = [];
let syncTimeout = null;


let tasks = [];
let isGoogleUser = false;


function checkIsGoogleUser() {
  const profile = localStorage.getItem('timeGuardUserProfile');
  const token = localStorage.getItem('timeGuardAccessToken');
  if (profile && token) {
    try {
      const parsed = JSON.parse(profile);
      return parsed.email && !parsed.id.startsWith('guest-') && token.length > 0;
    } catch (e) { return false; }
  }
  return false;
}


async function ensureGapiClient() {
  return new Promise((resolve, reject) => {
    if (gapi.client && gapi.client.tasks) {
      if (typeof accessToken === 'string') {
        gapi.client.setToken({ access_token: accessToken });
      }
      resolve();
    } else {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: CONFIG.GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest']
          });
          if (typeof accessToken === 'string') {
            gapi.client.setToken({ access_token: accessToken });
          }
          resolve();
        } catch (err) {
          showNotification('Google API init failed', 'error');
          console.error('gapi.client.init error', err);
          reject(err);
        }
      });
    }
  });
}


async function getOrCreateDefaultTaskList() {
  await ensureGapiClient();
  try {
    const response = await gapi.client.tasks.tasklists.list();
    let taskLists = response.result.items || [];
    defaultTaskList = taskLists.find(list => list.title === CONFIG.DEFAULT_TASKS_LIST_NAME);
    if (!defaultTaskList) {
      const createResp = await gapi.client.tasks.tasklists.insert({ title: CONFIG.DEFAULT_TASKS_LIST_NAME });
      defaultTaskList = createResp.result;
    }
    return defaultTaskList;
  } catch (err) {
    showNotification('Failed to get Google Task List', 'error');
    console.error('getOrCreateDefaultTaskList error', err);
    throw err;
  }
}


async function initTasks() {
  isGoogleUser = checkIsGoogleUser();
  if (isGoogleUser) {
    await loadGoogleTasks();
  } else {
    loadLocalTasks();
  }
}


function loadLocalTasks() {
  const storedTasks = localStorage.getItem('timeGuardTasks');
  if (storedTasks) {
    tasks = JSON.parse(storedTasks);
    renderTasks();
  }
}


function saveLocalTasks() {
  localStorage.setItem('timeGuardTasks', JSON.stringify(tasks));
}

async function loadGoogleTasks() {
  try {
    await getOrCreateDefaultTaskList();
    const tasksResponse = await gapi.client.tasks.tasks.list({ tasklist: defaultTaskList.id });
    tasks = (tasksResponse.result.items || []).map(task => ({
      id: task.id,
      title: task.title,
      completed: task.status === 'completed',
      due: task.due ? new Date(task.due).toISOString().slice(0, 16) : null
    }));
    renderTasks();
  } catch (error) {
    showNotification('Failed to load Google Tasks', 'error');
    console.error('loadGoogleTasks error', error);
    loadLocalTasks();
  }
}

function displayTasks() {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '';
  
  if (tasks.length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-center">No tasks found. Click Sync Tasks to fetch from Google Tasks.</div>';
    return;
  }
  
  tasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-md';
    taskElement.innerHTML = `
      <div class="flex items-center">
        <input type="checkbox" class="mr-3" ${task.completed ? 'checked' : ''}>
        <span class="${task.completed ? 'line-through text-gray-500' : ''}">${task.title}</span>
      </div>
      <button class="text-red-500 hover:text-red-700" onclick="deleteTask('${task.id}')">×</button>
    `;
    container.appendChild(taskElement);
  });
}


async function addTask(title, notes = '', due = '') {
  isGoogleUser = checkIsGoogleUser();
  if (isGoogleUser) {
    try {
      await getOrCreateDefaultTaskList();
      const response = await gapi.client.tasks.tasks.insert({
        tasklist: defaultTaskList.id,
        resource: {
          title,
          notes,
          due: due ? new Date(due).toISOString() : null,
          status: 'needsAction'
        }
      });
      tasks.push({
        id: response.result.id,
        title,
        notes,
        due,
        completed: false
      });
      renderTasks();
    } catch (error) {
      showNotification('Error adding task to Google', 'error');
      console.error('addTask error', error);
    }
  } else {
    const newTask = {
      id: Date.now().toString(),
      title,
      notes,
      due,
      completed: false
    };
    tasks.push(newTask);
    saveLocalTasks();
    renderTasks();
  }
}

function scheduleGoogleSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncPendingTasksToGoogle, 5 * 60 * 1000); // 5 minutes
}

async function syncPendingTasksToGoogle() {
  if (!checkIsGoogleUser() || pendingLocalTasks.length === 0) return;
  await ensureGapiClient();
  if (!defaultTaskList) {
    await loadGoogleTasks();
  }
  const stillPending = [];
  for (const task of pendingLocalTasks) {
    try {
      const response = await gapi.client.tasks.tasks.insert({
        tasklist: defaultTaskList.id,
        resource: {
          title: task.title,
          notes: task.notes,
          due: task.due ? new Date(task.due).toISOString() : null,
          status: 'needsAction'
        }
      });
      task.id = response.result.id;
      task._pendingGoogle = false;
    } catch (e) {
      stillPending.push(task);
    }
  }
  pendingLocalTasks = stillPending;
  tasks = tasks.map(t => {
    if (t._pendingGoogle === false) {
      const { _pendingGoogle, ...rest } = t;
      return rest;
    }
    return t;
  });
  saveLocalTasks();
  renderTasks();
}

async function toggleTaskCompletion(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  isGoogleUser = checkIsGoogleUser();
  if (isGoogleUser) {
    try {
      await getOrCreateDefaultTaskList();
      await gapi.client.tasks.tasks.patch({
        tasklist: defaultTaskList.id,
        task: taskId,
        resource: {
          status: task.completed ? 'completed' : 'needsAction'
        }
      });
      renderTasks();
    } catch (error) {
      showNotification('Error updating task in Google', 'error');
      console.error('toggleTaskCompletion error', error);
    }
  } else {
    saveLocalTasks();
    renderTasks();
  }
}


async function deleteTask(taskId) {
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;
  isGoogleUser = checkIsGoogleUser();
  if (isGoogleUser) {
    try {
      await getOrCreateDefaultTaskList();
      await gapi.client.tasks.tasks.delete({
        tasklist: defaultTaskList.id,
        task: taskId
      });
      renderTasks();
    } catch (error) {
      showNotification('Error deleting task from Google', 'error');
      console.error('deleteTask error', error);
      return;
    }
  }
  tasks.splice(taskIndex, 1);
  if (!isGoogleUser) {
    saveLocalTasks();
  }
  renderTasks();
}


window.addEventListener('storage', (e) => {
  if (e.key === 'timeGuardUserProfile' && !localStorage.getItem('timeGuardUserProfile')) {
    tasks = [];
    renderTasks();
  }
});


document.getElementById('sync-tasks-btn').addEventListener('click', async () => {
  isGoogleUser = checkIsGoogleUser();
  if (isGoogleUser) {
    await loadGoogleTasks();
  } else {
    loadLocalTasks();
  }
});

document.getElementById('add-task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('new-task-input');
  const dueInput = document.getElementById('task-due');
  const title = input.value.trim();
  const due = dueInput.value;
  if (title) {
    addTask(title, '', due);
    input.value = '';
    dueInput.value = '';
  }
});


document.addEventListener('DOMContentLoaded', () => {
  pendingLocalTasks = [];
  initTasks();
});

function renderTasks() {
  const container = document.getElementById('tasks-container');
  const syncButton = document.getElementById('sync-tasks-btn');
  if (!container) return;

  if (syncButton) {
    syncButton.style.display = isGoogleUser ? 'block' : 'none';
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.due && b.due) {
      return new Date(a.due) - new Date(b.due);
    }
    return a.due ? -1 : 1;
  });

  container.innerHTML = sortedTasks.map(task => {
    const isOverdue = task.due && new Date(task.due) < new Date() && !task.completed;
    const dueDate = task.due ? new Date(task.due) : null;
    const formattedDate = dueDate ? dueDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }) : '';
    const formattedTime = dueDate ? dueDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    }) : '';

    return `
      <div class="task-item flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-3">
        <div class="flex items-center space-x-3 flex-grow">
          <input 
            type="checkbox" 
            class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            ${task.completed ? 'checked' : ''}
            onchange="toggleTaskCompletion('${task.id}')"
          >
          <div class="flex-grow">
            <h3 class="text-lg font-medium ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}">
              ${escapeHtml(task.title)}
            </h3>
            ${task.due ? `
              <div class="flex items-center space-x-2 text-sm ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}">
                <span>📅 ${formattedDate} at ${formattedTime}</span>
                ${isOverdue ? '<span class="text-red-500">(Overdue)</span>' : ''}
              </div>
            ` : ''}
          </div>
        </div>
        <button 
          onclick="deleteTask('${task.id}')"
          class="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
        >
          <span class="text-xl">×</span>
        </button>
      </div>
    `;
  }).join('') || '<div class="text-gray-500 dark:text-gray-400 text-center py-4">No tasks found</div>';
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function showLoadingIndicator(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>';
  }
}

function hideLoadingIndicator(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '';
  }
}


function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-md ${
    type === 'error' ? 'bg-red-100 text-red-700' :
    type === 'success' ? 'bg-green-100 text-green-700' :
    'bg-blue-100 text-blue-700'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}


function clearTasks() {
  userTasks = [];
  defaultTaskList = null;
  document.getElementById('tasks-container').innerHTML = 
    '<div class="text-gray-500 text-center">No tasks found. Click Sync Tasks to fetch from Google Tasks.</div>';
}