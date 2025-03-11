// Audio context and variables
let metronomeInterval;
let timerInterval;
let remainingTimeInSeconds = 0;
let isRunning = false;
let tempoValue = 180;
let selectedTimeInMinutes = 30;

// DOM elements
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const continueBtn = document.getElementById('continue-btn');
const endBtn = document.getElementById('end-btn');
const resultsSection = document.getElementById('results-section');
const resultsContent = document.getElementById('results-content');
const tempoSlider = document.getElementById('tempo-slider');
const tempoValueDisplay = document.getElementById('tempo-value');
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const timeButtons = document.querySelectorAll('.time-btn');
const tempoButtons = document.querySelectorAll('.tempo-btn');

// Variables to track exercise data
let startTime = null;
let totalExerciseTime = 0;
let pauseTime = null;

// Update metronome tempo
function updateTempo(tempo) {
    tempoValue = tempo;
    tempoValueDisplay.textContent = tempo;
    tempoSlider.value = tempo;
    
    // Update active state of tempo buttons
    tempoButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.tempo) === tempo);
    });
    
    // Restart metronome if it's running
    if (isRunning) {
        clearInterval(metronomeInterval);
        startMetronome();
    }
}

// Update timer duration
function updateTimer(minutes) {
    selectedTimeInMinutes = minutes;
    remainingTimeInSeconds = minutes * 60;
    updateTimeDisplay();
    
    // Update active state of time buttons
    timeButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.time) === minutes);
    });
}

// Update the time display
function updateTimeDisplay() {
    const minutes = Math.floor(remainingTimeInSeconds / 60);
    const seconds = remainingTimeInSeconds % 60;
    
    minutesDisplay.textContent = minutes.toString().padStart(2, '0');
    secondsDisplay.textContent = seconds.toString().padStart(2, '0');
}

// Start the metronome using service worker
function startMetronome() {
    // 取得選擇的音效類型
    const soundType = document.querySelector('input[name="sound-type"]:checked').value;
    
    // 告知 service worker 開始播放音效
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'START_AUDIO',
            tempo: tempoValue,
            remainingTime: remainingTimeInSeconds,
            soundType: soundType
        });
    }
}

// Start the countdown timer
function startTimer() {
    timerInterval = setInterval(() => {
        remainingTimeInSeconds--;
        updateTimeDisplay();
        
        if (remainingTimeInSeconds <= 0) {
            stopAll();
        }
    }, 1000);
}

// Start both metronome and timer
function startAll() {
    if (isRunning) return;
    
    isRunning = true;
    startMetronome();
    startTimer();
    
    // Record start time if it's not already set
    if (!startTime) {
        startTime = new Date();
    }
    
    // Show/hide appropriate buttons
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    continueBtn.classList.add('hidden');
    endBtn.classList.add('hidden');
}

// Stop both metronome and timer
function stopAll() {
    isRunning = false;
    clearInterval(timerInterval);
    
    // Record pause time
    pauseTime = new Date();
    
    // Show/hide appropriate buttons
    stopBtn.classList.add('hidden');
    continueBtn.classList.remove('hidden');
    endBtn.classList.remove('hidden');
    
    // Notify service worker to stop background audio
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'STOP_AUDIO'
        });
    }
}

// Function to reset the timer display
function resetTimer() {
    // Reset timer display to selected time
    updateTimer(selectedTimeInMinutes);
}

// 監聽 service worker 傳回的訊息
navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.action === 'PLAY_SOUND' && event.data.fromServiceWorker) {
        // 播放收到的音效
        const audioElement = document.getElementById(`sound-${event.data.soundType}`);
        if (audioElement) {
            // 複製音效物件以允許快速重複播放
            audioElement.cloneNode(true).play()
                .catch(error => console.error('播放音效失敗:', error));
        }
    }
});

// Add this code to your app.js file where appropriate

// Listen for messages from the service worker
navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'TIMER_COMPLETE') {
        // Timer has completed, show results section
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
        
        // Automatically stop the timer UI if there's a stop button
        const stopButton = document.getElementById('stop-button');
        if (stopButton) {
            stopButton.click();
        }
        
        // Or call the function that handles stopping directly
        // stopTimer(); // Uncomment and use this if you have a function for stopping the timer
        
        // Show a message to the user
        const messageElement = document.getElementById('completion-message');
        if (messageElement) {
            messageElement.textContent = '計時完成！';
        }
    }
});

// Event listeners
startBtn.addEventListener('click', () => {
    // Hide results when starting a new session
    if (!resultsSection.classList.contains('hidden')) {
        resultsSection.classList.add('hidden');
    }
    
    startAll();
});

stopBtn.addEventListener('click', () => {
    stopAll();
});

continueBtn.addEventListener('click', () => {
    // Add paused time to total
    if (pauseTime) {
        const pauseDuration = (new Date() - pauseTime) / 1000; // in seconds
        pauseTime = null;
    }
    
    startAll();
});

endBtn.addEventListener('click', () => {
    isRunning = false;
    clearInterval(timerInterval);
    
    // Notify service worker to stop background audio
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'STOP_AUDIO'
        });
    }

    // Make sure to remove the hidden class from the results section
    resultsSection.classList.remove('hidden');
    
    // Calculate total exercise time
    let exerciseEndTime = pauseTime || new Date();
    let totalTimeInSeconds = Math.floor((exerciseEndTime - startTime) / 1000);
    
    // Format results
    let minutes = Math.floor(totalTimeInSeconds / 60);
    let seconds = totalTimeInSeconds % 60;
    let formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Get the selected sound type
    const selectedSoundType = document.querySelector('input[name="sound-type"]:checked').value;
    
    // Display results
    resultsContent.innerHTML = `
        <p>運動總時間: ${formattedTime}</p>
        <p>節拍速度: ${tempoValue} BPM</p>
        <p>使用的聲音: ${selectedSoundType}</p>
    `;
    
    // Log to verify execution
    console.log("Results displayed:", resultsContent.innerHTML);
    
    // UI updates
    continueBtn.classList.add('hidden');
    endBtn.classList.add('hidden');
});

// 需要確保在 HTML 中添加音效元素
document.addEventListener('DOMContentLoaded', () => {
    // 預加載音效檔案
    const soundTypes = ['default', 'beep', 'click', 'wood', 'drum'];
    
    // 創建隱藏的音效元素
    soundTypes.forEach(type => {
        const audio = document.createElement('audio');
        audio.id = `sound-${type}`;
        audio.src = `sounds/${type}.mp3`;
        audio.preload = 'auto';
        document.body.appendChild(audio);
    });
    
    // 設置初始節拍和時間
    updateTempo(tempoValue);
    updateTimer(selectedTimeInMinutes);
});

// 在這裡添加其他剩餘的事件監聽器
tempoSlider.addEventListener('input', (e) => {
    updateTempo(parseInt(e.target.value));
});

timeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        updateTimer(parseInt(btn.dataset.time));
    });
});

tempoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        updateTempo(parseInt(btn.dataset.tempo));
    });
});