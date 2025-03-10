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
const tempoSlider = document.getElementById('tempo-slider');
const tempoValueDisplay = document.getElementById('tempo-value');
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const timeButtons = document.querySelectorAll('.time-btn');
const tempoButtons = document.querySelectorAll('.tempo-btn');

// Initialize Web Audio API
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// Create a beep sound
function playBeep() {
    if (!audioContext) {
        initAudio();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.5;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    oscillator.stop(audioContext.currentTime + 0.1);
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
    
    // Notify service worker to stop background audio
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'STOP_AUDIO'
        });
    }
}

// Event listeners
startBtn.addEventListener('click', () => {
    startAll();
});

stopBtn.addEventListener('click', () => {
    stopAll();
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

// Initialize with default values
document.addEventListener('DOMContentLoaded', () => {
    updateTimer(30); // Default to 30 minutes
    updateTempo(180); // Default to 180 BPM

    // Get elements
    const startButton = document.getElementById('start-btn');
    const stopButton = document.getElementById('stop-btn');
    const tempoSlider = document.getElementById('tempo-slider');
    const tempoValue = document.getElementById('tempo-value');
    const minutesDisplay = document.getElementById('minutes');
    const secondsDisplay = document.getElementById('seconds');
    
    // Sound selection elements
    const soundOptions = document.querySelectorAll('input[name="sound-type"]');
    
    // Variables for timer and metronome
    let timerRunning = false;
    let remainingTime = 0;
    let tempo = 150;
    let soundType = 'default';
    
    // Handle sound selection
    soundOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            soundType = e.target.value;
            console.log(`Sound changed to: ${soundType}`);
            
            // If metronome is running, restart it with new sound
            if (timerRunning) {
                stopMetronome();
                startMetronome(tempo, remainingTime, soundType);
            }
        });
    });
    
    // Start button handler
    startButton.addEventListener('click', () => {
        if (!timerRunning && remainingTime > 0) {
            timerRunning = true;
            startMetronome(tempo, remainingTime, soundType);
        }
    });
    
    // Stop button handler
    stopButton.addEventListener('click', () => {
        if (timerRunning) {
            timerRunning = false;
            stopMetronome();
        }
    });
    
    // Function to start metronome
    function startMetronome(tempo, remainingTime, soundType) {
        // Check if service worker is available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'START_AUDIO',
                tempo: tempo,
                remainingTime: remainingTime,
                soundType: soundType
            });
            
            // ...existing code for local timer logic...
        }
    }
    
    // Function to stop metronome
    function stopMetronome() {
        // Check if service worker is available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'STOP_AUDIO'
            });
            
            // ...existing code for stopping local timer...
        }
    }
});
