document.addEventListener('DOMContentLoaded', () => {
  const timerDisplay = document.getElementById('timer-display');
  const toggleBtn = document.getElementById('toggle-btn');
  const resetBtn = document.getElementById('reset-btn');
  const workSlider = document.getElementById('work-slider');
  const breakSlider = document.getElementById('break-slider');
  const workVal = document.getElementById('work-val');
  const breakVal = document.getElementById('break-val');
  const notifToggle = document.getElementById('smart-notifications');
  const progressCircle = document.querySelector('.progress-ring__circle');
  
  const radius = progressCircle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  
  progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressCircle.style.strokeDashoffset = circumference;

  function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function updateUI(state) {
    const { timeLeft, isRunning, totalTime, mode } = state;
    
    timerDisplay.textContent = formatTime(timeLeft);
    toggleBtn.textContent = isRunning ? '暂停' : '继续陪宝贝';
    
    const percent = (timeLeft / totalTime) * 100;
    setProgress(percent);

    // Update slider values
    workVal.textContent = workSlider.value;
    breakVal.textContent = breakSlider.value;
  }

  // Initial load
  chrome.storage.local.get(['workInterval', 'breakDuration', 'notificationsEnabled'], (result) => {
    if (result.workInterval) {
      workSlider.value = result.workInterval;
      workVal.textContent = result.workInterval;
    }
    if (result.breakDuration) {
      breakSlider.value = result.breakDuration;
      breakVal.textContent = result.breakDuration;
    }
    if (result.notificationsEnabled !== undefined) {
      notifToggle.checked = result.notificationsEnabled;
    }
  });

  // Poll for timer updates
  function fetchState() {
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
      if (response) {
        updateUI(response);
      }
    });
  }

  fetchState();
  const intervalId = setInterval(fetchState, 1000);

  // Event Listeners
  toggleBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'toggleTimer' }, fetchState);
  });

  resetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resetTimer' }, fetchState);
  });

  workSlider.addEventListener('input', () => {
    workVal.textContent = workSlider.value;
  });

  workSlider.addEventListener('change', () => {
    chrome.storage.local.set({ workInterval: parseInt(workSlider.value) });
    chrome.runtime.sendMessage({ action: 'updateSettings' });
  });

  breakSlider.addEventListener('input', () => {
    breakVal.textContent = breakSlider.value;
  });

  breakSlider.addEventListener('change', () => {
    chrome.storage.local.set({ breakDuration: parseInt(breakSlider.value) });
    chrome.runtime.sendMessage({ action: 'updateSettings' });
  });

  notifToggle.addEventListener('change', () => {
    chrome.storage.local.set({ notificationsEnabled: notifToggle.checked });
  });

  // Cleanup
  window.addEventListener('unload', () => {
    clearInterval(intervalId);
  });
});
