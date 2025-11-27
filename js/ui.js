
async function addBotMessage(message) {
  const chatContainer = document.getElementById('chat-container');
  

  const existingThinking = chatContainer.querySelector('.thinking');
  if (existingThinking) {
    const messageDiv = existingThinking.closest('.flex');
    if (messageDiv) {
      messageDiv.remove();
    }
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'flex justify-start mb-3';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'bot-message';
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'bot-avatar';
  avatarDiv.innerHTML = `
    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  `;
  
  messageContent.appendChild(avatarDiv);
  
  if (!message) {
    messageContent.innerHTML += `
      <div class="thinking ml-2">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  } else {

    messageContent.innerHTML = avatarDiv.outerHTML + message;
  }
  
  messageDiv.appendChild(messageContent);
  chatContainer.appendChild(messageDiv);
  scrollChatToBottom();
}


function addUserMessage(message) {
  const chatContainer = document.getElementById('chat-container');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'flex justify-end mb-3';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'user-message';
  
  const userAvatar = document.getElementById('user-avatar').src || 
    'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg';
  
  messageContent.innerHTML = `
    <div class="flex items-start gap-2">
      <div class="flex-grow">${message}</div>
      <img src="${userAvatar}" alt="User" class="w-6 h-6 rounded-full flex-shrink-0">
    </div>
  `;
  
  messageDiv.appendChild(messageContent);
  chatContainer.appendChild(messageDiv);
  scrollChatToBottom();
}

function addLoadingIndicator() {
  const chatContainer = document.getElementById('chat-container');
  
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'flex justify-start mb-3';
  loadingDiv.id = 'loading-indicator';
  
  const loadingContent = document.createElement('div');
  loadingContent.className = 'bg-gray-100 dark:bg-gray-700 rounded-lg p-3';
  loadingContent.innerHTML = '⏳ Thinking...';
  
  loadingDiv.appendChild(loadingContent);
  chatContainer.appendChild(loadingDiv);
  scrollChatToBottom();
  
  return loadingDiv;
}


function removeLoadingIndicator(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function formatMessage(text) {
  let formatted = text.replace(/\n/g, '<br>');

  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g, 
    '<a href="$1" target="_blank" class="text-blue-600">$1</a>'
  );
  
  return formatted;
}


function showLoadingIndicator(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const loadingElement = document.createElement('div');
  loadingElement.className = 'loading-container text-center py-4';
  loadingElement.innerHTML = `
    <div class="loading-dots inline-block">
      <span></span><span></span><span></span>
    </div>
    <p class="text-gray-500 mt-2">Loading...</p>
  `;
  
  loadingElement.dataset.originalContent = container.innerHTML;
  
  container.innerHTML = '';
  container.appendChild(loadingElement);
  
  return loadingElement;
}


function hideLoadingIndicator(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const loadingElement = container.querySelector('.loading-container');
  if (loadingElement) {
    if (loadingElement.dataset.originalContent) {
      container.innerHTML = loadingElement.dataset.originalContent;
    } else {
      container.removeChild(loadingElement);
    }
  }
}


function scrollChatToBottom() {
  const chatContainer = document.getElementById('chat-container');
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showNotification(message, type = 'info') {

  if (type === 'error') {
    return;
  }
  

  const notificationElement = document.createElement('div');
  notificationElement.className = `fixed bottom-4 right-4 p-4 rounded-md shadow-lg max-w-xs notification ${type}`;
  
  switch (type) {
    case 'success':
      notificationElement.classList.add('bg-green-100', 'text-green-800');
      break;
    default:
      notificationElement.classList.add('bg-blue-100', 'text-blue-800');
  }
  
  notificationElement.textContent = message;
  

  document.body.appendChild(notificationElement);

  setTimeout(() => {
    notificationElement.remove();
  }, 4000);
}

function displaySchedule(scheduleData) {
  const scheduleContent = document.getElementById('schedule-content');
}