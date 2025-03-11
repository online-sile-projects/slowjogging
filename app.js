// Audio context and variables
let audioContext;
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

// Initialize Web Audio API
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// Create a beep sound
function playBeep() {
    // if (!audioContext) {
    //     initAudio();
    // }
    
    // const oscillator = audioContext.createOscillator();
    // const gainNode = audioContext.createGain();
    
    // oscillator.connect(gainNode);
    // gainNode.connect(audioContext.destination);
    
    // oscillator.type = 'sine';
    // oscillator.frequency.value = 800;
    // gainNode.gain.value = 0.5;
    
    // oscillator.start();
    // gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    // oscillator.stop(audioContext.currentTime + 0.1);
}

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
        // startMetronome();
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

// Start the metronome
function startMetronome() {
    const intervalMs = (60 / tempoValue) * 1000;
    metronomeInterval = setInterval(playBeep, intervalMs);
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
    
    // For Mobile Safari, we need to resume the audio context after a user gesture
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
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
    
    // Notify service worker to keep audio playing in the background
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'START_AUDIO',
            tempo: tempoValue,
            remainingTime: remainingTimeInSeconds
        });
    }
}

// Stop both metronome and timer
function stopAll() {
    isRunning = false;
    clearInterval(metronomeInterval);
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
    clearInterval(metronomeInterval);
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
    startBtn.classList.remove('hidden');
    
    // Reset timer display
    resetTimer();
    
    // Reset tracking variables
    startTime = null;
    totalExerciseTime = 0;
    pauseTime = null;
});

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

// Sound player setup
const sounds = {
    default: new Audio('./sounds/default.mp3'),
    beep: new Audio('./sounds/beep.mp3'),
    click: new Audio('./sounds/click.mp3'),
    wood: new Audio('./sounds/wood.mp3'),
    drum: new Audio('./sounds/drum.mp3')
};

// Preload all sounds
for (const sound in sounds) {
    sounds[sound].load();
}

// Listen for messages from the service worker
navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.action === 'PLAY_SOUND') {
        const soundType = event.data.soundType || 'default';
        
        // Play the selected sound
        if (sounds[soundType]) {
            // Clone the audio to allow rapid repetition
            sounds[soundType].cloneNode(true).play()
                .catch(error => console.error('Failed to play sound:', error));
        }
    }
});

// Initialize with default values
document.addEventListener('DOMContentLoaded', () => {
    updateTimer(30); // Default to 30 minutes
    updateTempo(180); // Default to 180 BPM
    
    // Make sure buttons are in correct state on page load
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    continueBtn.classList.add('hidden');
    endBtn.classList.add('hidden');
    resultsSection.classList.add('hidden');
    
    // Debug check to verify elements are properly selected
    console.log("Results section element:", resultsSection);
    console.log("Results content element:", resultsContent);
});

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const tempoSlider = document.getElementById('tempo-slider');
    const tempoValue = document.getElementById('tempo-value');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const continueBtn = document.getElementById('continue-btn');
    const endBtn = document.getElementById('end-btn');
    const minutesDisplay = document.getElementById('minutes');
    const secondsDisplay = document.getElementById('seconds');
    const timeButtons = document.querySelectorAll('.time-btn');
    const tempoButtons = document.querySelectorAll('.tempo-btn');
    const soundOptions = document.querySelectorAll('input[name="sound-type"]');
    const resultsSection = document.getElementById('results-section');
    const resultsContent = document.getElementById('results-content');
    
    // Variables
    let timer;
    let timeRemaining = 0;
    let isRunning = false;
    let isPaused = false;
    let tempo = parseInt(tempoSlider.value);
    let metronome;
    let selectedSound = 'default';
    let startTime = null;
    let audioDictionary = {};
    
    // Initialize audio files
    function initAudio() {
        audioDictionary = {
            'default': new Audio('sounds/default.mp3'),
            'beep': new Audio('sounds/beep.mp3'),
            'click': new Audio('sounds/click.mp3'),
            'wood': new Audio('sounds/wood.mp3'),
            'drum': new Audio('sounds/drum.mp3')
        };
        
        // Loop audio for continuous play
        Object.values(audioDictionary).forEach(audio => {
            audio.preload = 'auto';
        });
    }
    
    // Initialize the app
    function init() {
        initAudio();
        updateTempoDisplay();
        setupEventListeners();
        
        // Check login status and load history
        document.addEventListener('lineLoginStatusChanged', handleLoginStatusChanged);
    }
    
    // Handle login status changed event
    function handleLoginStatusChanged() {
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            // Load exercise history when user logs in
            loadExerciseHistory(userProfile.userId)
                .then(historyData => {
                    displayExerciseHistory(historyData);
                });
        } else {
            // Handle logout
            document.getElementById('history-list').innerHTML = '<p>請先登入以查看您的運動記錄</p>';
        }
    }
    
    // Setup event listeners
    function setupEventListeners() {
        tempoSlider.addEventListener('input', function() {
            tempo = parseInt(this.value);
            updateTempoDisplay();
            if (isRunning && !isPaused) {
                startMetronome();
            }
        });
        
        // Tempo preset buttons
        tempoButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                tempo = parseInt(this.dataset.tempo);
                tempoSlider.value = tempo;
                updateTempoDisplay();
                if (isRunning && !isPaused) {
                    startMetronome();
                }
            });
        });
        
        // Timer preset buttons
        timeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                if (!isRunning) {
                    timeRemaining = parseInt(this.dataset.time) * 60;
                    updateTimerDisplay();
                }
            });
        });
        
        // Sound selection
        soundOptions.forEach(option => {
            option.addEventListener('change', function() {
                selectedSound = this.value;
                if (isRunning && !isPaused) {
                    startMetronome();
                }
            });
        });
        
        // Start button
        startBtn.addEventListener('click', function() {
            startWorkout();
        });
        
        // Stop button
        stopBtn.addEventListener('click', function() {
            pauseWorkout();
        });
        
        // Continue button
        continueBtn.addEventListener('click', function() {
            continueWorkout();
        });
        
        // End button
        endBtn.addEventListener('click', function() {
            endWorkout();
        });
    }
    
    // Update tempo display
    function updateTempoDisplay() {
        tempoValue.textContent = tempo;
    }
    
    // Start metronome
    function startMetronome() {
        // Clear previous metronome if it exists
        if (metronome) {
            clearInterval(metronome);
        }
        
        // Calculate interval between beats (ms)
        const beatInterval = 60000 / tempo;
        
        // Start metronome
        metronome = setInterval(() => {
            playSound();
        }, beatInterval);
    }
    
    // Play sound based on selected option
    function playSound() {
        // Stop any currently playing sound and reset
        Object.values(audioDictionary).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        // Play selected sound
        audioDictionary[selectedSound].play();
    }
    
    // Start timer
    function startTimer() {
        timer = setInterval(() => {
            if (timeRemaining > 0) {
                timeRemaining--;
                updateTimerDisplay();
            } else {
                endWorkout();
            }
        }, 1000);
    }
    
    // Update timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        minutesDisplay.textContent = String(minutes).padStart(2, '0');
        secondsDisplay.textContent = String(seconds).padStart(2, '0');
    }
    
    // Start workout
    function startWorkout() {
        if (timeRemaining <= 0) {
            timeRemaining = 20 * 60; // Default to 20 minutes if not set
        }
        
        isRunning = true;
        isPaused = false;
        startTime = new Date();
        
        // Update UI
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        endBtn.classList.remove('hidden');
        continueBtn.classList.add('hidden');
        
        // Start metronome and timer
        // startMetronome();
        // startTimer();
    }
    
    // Pause workout
    function pauseWorkout() {
        isPaused = true;
        
        // Update UI
        stopBtn.classList.add('hidden');
        continueBtn.classList.remove('hidden');
        
        // Stop metronome and timer
        clearInterval(metronome);
        clearInterval(timer);
    }
    
    // Continue workout
    function continueWorkout() {
        isPaused = false;
        
        // Update UI
        continueBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        
        // Restart metronome and timer
        // startMetronome();
        // startTimer();
    }
    
    // End workout
    function endWorkout() {
        // Stop everything
        isRunning = false;
        isPaused = false;
        clearInterval(metronome);
        clearInterval(timer);
        
        // Calculate workout duration in minutes
        const endTime = new Date();
        const durationMs = isPaused ? 0 : endTime - startTime;
        const durationMinutes = Math.round(durationMs / 60000);
        
        // Update UI
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        continueBtn.classList.add('hidden');
        endBtn.classList.add('hidden');
        
        // Show results
        showResults(durationMinutes, tempo);
        
        // Save results to Google Sheets if user is logged in
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            saveExerciseRecord(
                userProfile.userId,
                durationMinutes,
                tempo,
                new Date().toISOString()
            ).then(() => {
                // Reload exercise history
                return loadExerciseHistory(userProfile.userId);
            }).then(historyData => {
                displayExerciseHistory(historyData);
            });
        }
    }
    
    // Show workout results
    function showResults(duration, tempo) {
        // Calculate calories (very approximate)
        // Assume 10 calories per minute at 180 BPM, adjust according to tempo
        const calorieMultiplier = tempo / 180;
        const calories = Math.round(duration * 10 * calorieMultiplier);
        
        // Create results HTML
        resultsContent.innerHTML = `
            <div class="result-item">
                <span class="result-label">運動時間:</span>
                <span class="result-value">${duration} 分鐘</span>
            </div>
            <div class="result-item">
                <span class="result-label">平均節拍:</span>
                <span class="result-value">${tempo} BPM</span>
            </div>
            <div class="result-item">
                <span class="result-label">預估消耗熱量:</span>
                <span class="result-value">${calories} 卡路里</span>
            </div>
        `;
        
        // Show results section
        resultsSection.style.display = 'block';
        
        // Show login prompt if not logged in
        const userProfile = getCurrentUserProfile();
        if (!userProfile) {
            resultsContent.innerHTML += `
                <div class="login-prompt">
                    <p>登入 Line 帳號以保存和查看您的運動記錄</p>
                </div>
            `;
        }
    }
    
    // Start the app
    init();
});
