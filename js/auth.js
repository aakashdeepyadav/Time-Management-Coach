
let userProfile = null;
let accessToken = null;
let tokenClient = null;

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly'
].join(' ');


const googleSignInBtn = document.getElementById('google-signin-btn');
googleSignInBtn.disabled = true;

function enableGoogleSignIn() {
  googleSignInBtn.disabled = false;
}

function initGoogleAuth() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        accessToken = tokenResponse.access_token;
        await fetchUserProfile();
        handleSuccessfulLogin();
      }
    }
  });
  enableGoogleSignIn();
}

function safeInitGoogleAuth() {
  if (window.google && google.accounts && google.accounts.oauth2) {
    initGoogleAuth();
  } else {
    setTimeout(safeInitGoogleAuth, 200);
  }
}

async function fetchUserProfile() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const profile = await res.json();
  userProfile = {
    id: profile.sub,
    name: profile.name,
    email: profile.email,
    picture: profile.picture
  };
  localStorage.setItem('timeGuardUserProfile', JSON.stringify(userProfile));
  localStorage.setItem('timeGuardAccessToken', accessToken);
}

document.getElementById('google-signin-btn').addEventListener('click', () => {
  tokenClient.requestAccessToken();
});

document.getElementById('skip-login-btn').addEventListener('click', () => {
  userProfile = {
    id: 'guest-' + Date.now(),
    name: 'Guest User',
    email: '',
    picture: 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg'
  };
  localStorage.setItem('timeGuardUserProfile', JSON.stringify(userProfile));
  localStorage.setItem('timeGuardGuest', '1'); 
  localStorage.removeItem('timeGuardAccessToken');
  handleSuccessfulLogin();
});

function clearAppState() {
  if (window.tasks) {
    window.tasks = [];
  }
  if (typeof renderTasks === 'function') {
    renderTasks();
  } else if (document.getElementById('tasks-container')) {
    document.getElementById('tasks-container').innerHTML = '<div class="text-gray-500 text-center">No tasks found. Click Sync Tasks to fetch from Google Tasks.</div>';
  }
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) chatContainer.innerHTML = '';
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  if (userName) userName.textContent = '';
  if (userAvatar) userAvatar.src = '';
  const scheduleContent = document.getElementById('schedule-content');
  if (scheduleContent) scheduleContent.innerHTML = '';
}

document.getElementById('logout-btn').addEventListener('click', () => {
  const theme = localStorage.getItem('theme');
  localStorage.clear();
  if (theme) localStorage.setItem('theme', theme);
  localStorage.removeItem('timeGuardGuest'); 
  userProfile = null;
  accessToken = null;
  clearAppState();
  showLoginScreen();
});

function showWelcomeMessage() {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return;
  chatContainer.innerHTML = '';
  let profile = userProfile;
  if (!profile) {
    try {
      const stored = localStorage.getItem('timeGuardUserProfile');
      if (stored) profile = JSON.parse(stored);
    } catch (e) {}
  }
  if (profile && profile.name && profile.email) {
    const name = profile.name ? profile.name : 'there';
    addBotMessage(`Hi, <b>${name}</b> 👋, I am your time management coach. How may I help you?`);
  } else {
    addBotMessage('Hi, I am your time management coach. How may I help you?');
  }
}

function handleSuccessfulLogin() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('user-name').textContent = userProfile.name;
  document.getElementById('user-avatar').src = userProfile.picture;
  document.getElementById('user-avatar').style.display = 'block';
  
  const isGuest = localStorage.getItem('timeGuardGuest');
  const syncBtn = document.getElementById('sync-tasks-btn');
  if (isGuest === '1' && syncBtn) {
    syncBtn.style.display = 'none';
  } else if (syncBtn) {
    syncBtn.style.display = 'block';
  }
  
  showWelcomeMessage();
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  safeInitGoogleAuth();
  const storedProfile = localStorage.getItem('timeGuardUserProfile');
  const storedToken = localStorage.getItem('timeGuardAccessToken');
  const isGuest = localStorage.getItem('timeGuardGuest');
  if (storedProfile && (storedToken || isGuest)) {
    userProfile = JSON.parse(storedProfile);
    accessToken = storedToken;
    handleSuccessfulLogin();
  }
});