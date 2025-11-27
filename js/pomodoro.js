

let timer;
let timeLeft;
let isRunning = false;
let currentMode = 'pomodoro';

const timerDisplay = document.getElementById('timer-display');
const startButton = document.getElementById('start-timer');
const pauseButton = document.getElementById('pause-timer');
const resetButton = document.getElementById('reset-timer');
const modeSelect = document.getElementById('timer-mode');

const modes = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15
};


function initTimer() {
  timeLeft = modes.pomodoro * 60;
  updateDisplay();
  

  startButton.addEventListener('click', startTimer);
  pauseButton.addEventListener('click', pauseTimer);
  resetButton.addEventListener('click', resetTimer);
  modeSelect.addEventListener('change', changeMode);
}


function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


function startTimer() {
  if (!isRunning) {
    isRunning = true;
    timer = setInterval(() => {
      timeLeft--;
      updateDisplay();
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        isRunning = false;
        playAlarm();
      }
    }, 1000);
  }
}


function pauseTimer() {
  if (isRunning) {
    clearInterval(timer);
    isRunning = false;
  }
}


function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  const selectedMode = modeSelect.value;
  timeLeft = parseInt(selectedMode) * 60;
  updateDisplay();
}


function changeMode() {
  const selectedMode = modeSelect.value;
  timeLeft = parseInt(selectedMode) * 60;
  updateDisplay();
  
  if (isRunning) {
    clearInterval(timer);
    isRunning = false;
  }
}


function playAlarm() {
  const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
  audio.play();
}


document.addEventListener('DOMContentLoaded', initTimer); 