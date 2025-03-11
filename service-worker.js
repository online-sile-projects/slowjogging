const CACHE_NAME = 'slow-jogging-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/sounds/beep.mp3',
    '/sounds/click.mp3',
    '/sounds/wood.mp3',
    '/sounds/drum.mp3',
    '/sounds/default.mp3'
];

// Audio worklet for background audio
let audioContext = null;
let metronomeInterval = null;
let timerInterval = null;

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
        // Only start audio when explicitly requested
        if (event.data.tempo && event.data.remainingTime) {
            startBackgroundAudio(event.data.tempo, event.data.remainingTime, event.data.soundType);
        }
    }
    else if (event.data.action === 'STOP_AUDIO') {
        stopBackgroundAudio();
    }
    else if (event.data.action === 'PLAY_SOUND') {
        // Only play sound when explicitly requested
        if (event.data.soundType) {
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
    
    // Send a message back to the client to play the sound
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                action: 'PLAY_SOUND',
                soundType: soundType
            });
        });
    });
}

// Handle background audio
function startBackgroundAudio(tempo, remainingTime, soundType = 'default') {
    // Validate parameters to prevent unexpected audio playback
    if (!tempo || !remainingTime) return;
    
    // Stop any existing audio
    stopBackgroundAudio();
    
    const soundNames = {
        'default': '默認聲音',
        'beep': '嗶嗶聲',
        'click': '點擊聲',
        'wood': '木魚聲',
        'drum': '鼓聲'
    };
    
    const soundName = soundNames[soundType] || soundNames.default;
    
    // Show a persistent notification to keep the service worker active
    self.registration.showNotification('慢跑節拍器', {
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
        // Play the selected sound
        playSound(soundType);
    }, beatInterval);
    
    // Use setTimeout for the timer countdown
    let remainingSeconds = remainingTime;
    timerInterval = setInterval(() => {
        remainingSeconds--;
        
        if (remainingSeconds <= 0) {
            stopBackgroundAudio();
            
            // Show a final notification
            self.registration.showNotification('慢跑節拍器', {
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
