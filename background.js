// background.js

const DEFAULT_WORK_MINS = 20;
const DEFAULT_BREAK_SECS = 20;

// Helper to get state
async function getState() {
  const result = await chrome.storage.local.get(['timerState', 'workInterval']);
  const defaultState = {
    status: 'work',
    isRunning: false,
    endTime: null,
    timeRemaining: (result.workInterval || DEFAULT_WORK_MINS) * 60 * 1000,
    totalTime: (result.workInterval || DEFAULT_WORK_MINS) * 60 * 1000
  };
  return result.timerState || defaultState;
}

// Helper to save state
async function saveState(state) {
  await chrome.storage.local.set({ timerState: state });
}

// Alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'workTimerEnd') {
    const state = await getState();
    if (state.isRunning && state.endTime && Date.now() >= state.endTime) {
      state.isRunning = false;
      state.timeRemaining = 0;
      state.endTime = null;
      await saveState(state);
      
      // Check if notifications are enabled and get current break duration
      const result = await chrome.storage.local.get(['notificationsEnabled', 'breakDuration']);
      const isEnabled = result.notificationsEnabled !== false; // Default true
      const breakSecs = result.breakDuration || DEFAULT_BREAK_SECS;

      if (isEnabled) {
        // Show system notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('panda_icon.png'),
          title: '宝贝，我在帮你记着时间呢～',
          message: `抬头看看远处 ${breakSecs} 秒，好吗？🐼 看看远方，眨眨眼睛，休息一下吧 👀✨`,
          priority: 2
        });
      }

      // Always open relax.html as per core requirement, regardless of notification setting?
      // Or should the toggle control this too? 
      // Given the label "Smart Notifications - Automated Reminders", let's assume it controls the interruption.
      if (isEnabled) {
        chrome.tabs.create({ url: 'relax.html' });
      } else {
        // If disabled, maybe just stop? Or notify silently? 
        // If we don't open the tab, the user misses the break.
        // Let's assume the user wants to be left alone if disabled.
      }
    }
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    let state = await getState();
    
    if (request.action === 'getTimerState') {
      let timeLeft = state.timeRemaining;
      if (state.isRunning && state.endTime) {
        timeLeft = Math.max(0, state.endTime - Date.now());
      }
      sendResponse({
        timeLeft: Math.ceil(timeLeft / 1000),
        isRunning: state.isRunning,
        totalTime: state.totalTime / 1000,
        status: state.status
      });
      
    } else if (request.action === 'toggleTimer') {
      if (state.isRunning) {
        // Pause
        state.isRunning = false;
        state.timeRemaining = Math.max(0, state.endTime - Date.now());
        state.endTime = null;
        await chrome.alarms.clear('workTimerEnd');
      } else {
        // Resume
        state.isRunning = true;
        state.endTime = Date.now() + state.timeRemaining;
        await chrome.alarms.create('workTimerEnd', { when: state.endTime });
      }
      await saveState(state);
      sendResponse(true);
      
    } else if (request.action === 'resetTimer') {
      const result = await chrome.storage.local.get(['workInterval']);
      const workMins = result.workInterval || DEFAULT_WORK_MINS;
      state.status = 'work';
      state.isRunning = false;
      state.totalTime = workMins * 60 * 1000;
      state.timeRemaining = state.totalTime;
      state.endTime = null;
      await chrome.alarms.clear('workTimerEnd');
      await saveState(state);
      sendResponse(true);
      
    } else if (request.action === 'updateSettings') {
       // If timer is not running and at start, update the duration immediately
       const result = await chrome.storage.local.get(['workInterval']);
       const workMins = result.workInterval || DEFAULT_WORK_MINS;
       if (!state.isRunning && state.timeRemaining === state.totalTime) {
         state.totalTime = workMins * 60 * 1000;
         state.timeRemaining = state.totalTime;
         await saveState(state);
       }
       sendResponse(true);

    } else if (request.action === 'finishBreak') {
      // Restart work timer
      const result = await chrome.storage.local.get(['workInterval']);
      const workMins = result.workInterval || DEFAULT_WORK_MINS;
      state.status = 'work';
      state.totalTime = workMins * 60 * 1000;
      state.timeRemaining = state.totalTime;
      state.isRunning = true;
      state.endTime = Date.now() + state.timeRemaining;
      
      await chrome.alarms.create('workTimerEnd', { when: state.endTime });
      await saveState(state);
      sendResponse(true);
    }
  })();
  
  return true; // Keep channel open for async response
});
