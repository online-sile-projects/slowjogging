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
    
    // Hide results when starting a new session
    if (!resultsSection.classList.contains('hidden')) {
        resultsSection.classList.add('hidden');
    }
}

// Event listeners
startBtn.addEventListener('click', () => {
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
    
    // Make sure to remove the hidden class from the results section
    resultsSection.classList.remove('hidden');
    
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
