document.addEventListener('DOMContentLoaded', () => {
  const timerDisplay = document.getElementById('break-timer');
  const doneBtn = document.getElementById('done-btn');
  const progressCircle = document.querySelector('.progress-ring__circle');
  const subtitle = document.querySelector('.subtitle');
  
  const radius = progressCircle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  
  progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressCircle.style.strokeDashoffset = 0;

  function setRandomSubtitleFromData(data) {
    if (!subtitle || !data || !data.eye_rest_tips || !Array.isArray(data.eye_rest_tips.distance)) {
      return;
    }
    const tips = data.eye_rest_tips.distance;
    if (!tips.length) {
      return;
    }
    const index = Math.floor(Math.random() * tips.length);
    subtitle.textContent = tips[index];
  }

  const tipsUrl = chrome.runtime.getURL('eye_rest_tips.json');
  fetch(tipsUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to load eye rest tips');
      }
      return response.json();
    })
    .then((data) => {
      setRandomSubtitleFromData(data);
    })
    .catch(() => {});

  let timeLeft;
  let totalTime;
  let intervalId;

  function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  // Get break duration
  chrome.storage.local.get(['breakDuration'], (result) => {
    const breakSecs = result.breakDuration || 20;
    totalTime = breakSecs;
    timeLeft = totalTime;
    
    updateDisplay();
    startTimer();
  });

  function updateDisplay() {
    timerDisplay.textContent = `${timeLeft}s`;
    const percent = (timeLeft / totalTime) * 100;
    setProgress(percent);
  }

  function startTimer() {
    intervalId = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        clearInterval(intervalId);
        // Ensure ring is full/empty
        setProgress(0);
        timerDisplay.textContent = "0s";
        // Maybe highlight DONE button?
        doneBtn.style.backgroundColor = "black";
        doneBtn.style.color = "white";
        // Actually it's already black/white.
        // Maybe change text to "READY"?
        // But prompt says "MUST click 'DONE' button".
      }
      updateDisplay();
    }, 1000);
  }

  doneBtn.addEventListener('click', () => {
    // Send message to background to restart work timer
    chrome.runtime.sendMessage({ action: 'finishBreak' }, () => {
      // Close this tab
      window.close();
    });
  });
});
