const CACHE_NAME = 'slow-jogging-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json'
];

// Audio worklet for background audio
let audioContext = null;
let metronomeInterval = null;
let timerInterval = null;
let oscillator = null;
let gainNode = null;

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});

// Message event - handle background audio
self.addEventListener('message', event => {
    if (event.data.action === 'START_AUDIO') {
        // START_AUDIO: 啟動節拍器，定期播放聲音
        // 根據設定的節拍(tempo)，會重複播放聲音直到計時結束
        // Only start audio when explicitly requested
        if (event.data.tempo && event.data.remainingTime) {
            startBackgroundAudio(event.data.tempo, event.data.remainingTime, event.data.soundType);
        }
    }
    else if (event.data.action === 'STOP_AUDIO') {
        stopBackgroundAudio();
    }
    else if (event.data.action === 'PLAY_SOUND') {
        // PLAY_SOUND: 只播放單一次聲音
        // 與START_AUDIO不同，這裡只會播放一次聲音，不會重複播放
        // Only play sound when explicitly requested
        if (event.data.soundType && !event.data.fromServiceWorker) { // 檢查消息不是來自service worker
            playSound(event.data.soundType);
        }
    }
    else if (event.data.action === 'TOGGLE_PWA') {
        togglePWA(event.data.enabled);
    }
});

// Function to play a specific sound
function playSound(soundType) {
    // Don't play sounds unless explicitly called with a valid sound type
    if (!soundType) return;
    
    // Create sound with Web Audio API instead of sending message
    generateSound(soundType);
}

// Function to generate sound with Web Audio API
function generateSound(soundType) {
    // Create audio context if it doesn't exist
    if (!audioContext) {
        audioContext = new self.AudioContext();
    }
    
    // Create oscillator and gain node
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    // Configure sound based on type
    switch (soundType) {
        case 'beep':
            osc.type = 'sine';
            osc.frequency.value = 880; // A5
            gain.gain.value = 0.5;
            break;
        case 'click':
            osc.type = 'triangle';
            osc.frequency.value = 1200;
            gain.gain.value = 0.3;
            break;
        case 'wood':
            osc.type = 'triangle';
            osc.frequency.value = 600;
            gain.gain.value = 0.6;
            break;
        case 'drum':
            osc.type = 'square';
            osc.frequency.value = 150;
            gain.gain.value = 0.7;
            break;
        default:
            osc.type = 'sine';
            osc.frequency.value = 440; // A4
            gain.gain.value = 0.5;
    }
    
    // Connect nodes
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    // Play sound with envelope
    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gain.gain.value, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    // Start and stop oscillator
    osc.start(now);
    osc.stop(now + 0.1);
    
    // Clean up after sound is played
    osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
    };
}

function startBackgroundAudio(tempo, remainingTime, soundType = 'default') {
    // Validate parameters to prevent unexpected audio playback
    if (!tempo || !remainingTime) return;
    
    // Stop any existing audio
    stopBackgroundAudio();
    
    // Create audio context if it doesn't exist
    if (!audioContext) {
        audioContext = new self.AudioContext();
    }
    
    const soundNames = {
        'default': '默認聲音',
        'beep': '嗶嗶聲',
        'click': '點擊聲',
        'wood': '木魚聲',
        'drum': '鼓聲'
    };
    
    const soundName = soundNames[soundType] || soundNames.default;
    
    // Show a persistent notification to keep the service worker active
    self.registration.showNotification('超慢跑節拍器', {
        body: `正在以 ${tempo} BPM 播放${soundName}節拍`,
        icon: '/images/icon-192x192.png',
        tag: 'metronome',
        renotify: false,
        silent: true,
        ongoing: true
    });
    
    // Calculate the interval between beats in milliseconds
    const beatInterval = 60000 / tempo;
    
    // Start metronome
    metronomeInterval = setInterval(() => {
        // Generate sound directly with Web Audio API
        generateSound(soundType);
    }, beatInterval);
    
    // Use setTimeout for the timer countdown
    let remainingSeconds = remainingTime;
    timerInterval = setInterval(() => {
        remainingSeconds--;
        
        if (remainingSeconds <= 0) {
            stopBackgroundAudio();
            
            // Show a final notification
            self.registration.showNotification('超慢跑節拍器', {
                body: '計時完成！',
                icon: '/images/icon-192x192.png',
                tag: 'timer-complete',
                vibrate: [200, 100, 200],
                requireInteraction: true
            });
        }
    }, 1000);
}

function stopBackgroundAudio() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (metronomeInterval) {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
    }
    
    // Clean up audio resources
    if (audioContext) {
        audioContext.close().then(() => {
            audioContext = null;
        });
    }
    
    // Close any active notifications
    self.registration.getNotifications()
        .then(notifications => {
            notifications.forEach(notification => notification.close());
        });
}

// Function to toggle PWA registration status
function togglePWA(enabled) {
    // Notify clients about the PWA status change
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                action: 'PWA_STATUS_CHANGED',
                enabled: enabled
            });
        });
    });
    
    // Show notification about PWA status
    const statusText = enabled ? '已啟用' : '已停用';
    self.registration.showNotification('慢跑節拍器', {
        body: `PWA功能${statusText}`,
        icon: '/images/icon-192x192.png',
        tag: 'pwa-toggle',
        requireInteraction: false
    });
    
    // If PWA is disabled, unregister the service worker
    if (!enabled) {
        // Only notify, actual unregistration should be done from the client
        console.log('Service Worker: PWA functionality disabled');
    } else {
        console.log('Service Worker: PWA functionality enabled');
    }
}
