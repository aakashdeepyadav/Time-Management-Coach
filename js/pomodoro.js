class PomodoroTimer {
  constructor(display, startBtn, pauseBtn, resetBtn, modeSelect) {
    this.display = display;
    this.startBtn = startBtn;
    this.pauseBtn = pauseBtn;
    this.resetBtn = resetBtn;
    this.modeSelect = modeSelect;
    
    this.timer = null;
    this.timeLeft = 0;
    this.isRunning = false;
    this.currentMode = 'pomodoro';
    
    this.modes = {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15
    };
    
    this.init();
  }
  
  init() {
    this.timeLeft = this.modes.pomodoro * 60;
    this.updateDisplay();
    
    this.startBtn.addEventListener('click', () => this.start());
    this.pauseBtn.addEventListener('click', () => this.pause());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.modeSelect.addEventListener('change', () => this.changeMode());
  }
  
  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.timer = setInterval(() => {
        this.timeLeft--;
        this.updateDisplay();
        
        if (this.timeLeft <= 0) {
          this.pause();
          this.playAlarm();
        }
      }, 1000);
    }
  }
  
  pause() {
    if (this.isRunning) {
      clearInterval(this.timer);
      this.isRunning = false;
    }
  }
  
  reset() {
    this.pause();
    this.timeLeft = this.modes[this.currentMode] * 60;
    this.updateDisplay();
  }
  
  changeMode() {
    this.currentMode = this.modeSelect.value;
    this.timeLeft = this.modes[this.currentMode] * 60;
    this.updateDisplay();
    this.pause();
  }
  
  playAlarm() {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
    audio.play();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const timerDisplay = document.getElementById('timer-display');
  const startButton = document.getElementById('start-timer');
  const pauseButton = document.getElementById('pause-timer');
  const resetButton = document.getElementById('reset-timer');
  const modeSelect = document.getElementById('timer-mode');
  
  new PomodoroTimer(timerDisplay, startButton, pauseButton, resetButton, modeSelect);
}); 