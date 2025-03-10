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
        startBackgroundAudio(event.data.tempo, event.data.remainingTime, event.data.soundType);
    }
    else if (event.data.action === 'STOP_AUDIO') {
        stopBackgroundAudio();
    }
});

// Handle background audio
function startBackgroundAudio(tempo, remainingTime, soundType = 'default') {
    // Stop any existing audio
    stopBackgroundAudio();
    
    // Using Web Audio API would require audioWorklet which has limitations in service workers
    // Instead, we use self.registration.showNotification to keep the service worker alive
    
    // Get the sound name for display
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
        icon: '/icon-192x192.png',
        tag: 'metronome',
        renotify: false,
        silent: true,
        ongoing: true
    });
    
    // Use setTimeout for the timer countdown
    let remainingSeconds = remainingTime;
    timerInterval = setInterval(() => {
        remainingSeconds--;
        
        if (remainingSeconds <= 0) {
            stopBackgroundAudio();
            
            // Show a final notification
            self.registration.showNotification('慢跑節拍器', {
                body: '計時完成！',
                icon: '/icon-192x192.png',
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
    
    // Close any active notifications
    self.registration.getNotifications()
        .then(notifications => {
            notifications.forEach(notification => notification.close());
        });
}
