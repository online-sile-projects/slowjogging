/**
 * Line Authentication Module
 * Handles Line login, user profile retrieval, and session management
 */

// Global user profile object
let lineUserProfile = null;

// Initialize Line SDK
document.addEventListener('DOMContentLoaded', () => {
    initializeLineLogin();
    setupLoginButton();
});

// Initialize LIFF (LINE Front-end Framework)
async function initializeLineLogin() {
    try {
        await liff.init({ liffId: LINE_CONFIG.liffId });
        document.getElementById('login-status').textContent = 'Line SDK 初始化成功';
        
        // Check if user is logged in
        if (liff.isLoggedIn()) {
            document.getElementById('login-status').textContent = '已登入';
            await fetchUserProfile();
            displayUserProfile();
            document.getElementById('line-login-btn').textContent = '登出';
            // 觸發登錄狀態改變事件
            triggerLoginStatusChanged();
        } else {
            document.getElementById('login-status').textContent = '未登入';
        }
    } catch (error) {
        document.getElementById('login-status').textContent = `Line SDK 初始化失敗: ${error.message}`;
        console.error('LIFF initialization failed', error);
    }
}

// Setup login button behavior
function setupLoginButton() {
    const loginButton = document.getElementById('line-login-btn');
    loginButton.addEventListener('click', async () => {
        if (liff.isLoggedIn()) {
            // Logout
            liff.logout();
            lineUserProfile = null;
            document.getElementById('user-profile').innerHTML = '';
            document.getElementById('login-status').textContent = '已登出';
            loginButton.textContent = '使用 Line 登入';
            
            // 觸發登錄狀態改變事件
            triggerLoginStatusChanged();
        } else {
            // Login
            try {
                await liff.login();
                // 登入成功後，獲取資料並觸發事件
                await fetchUserProfile();
                displayUserProfile();
                loginButton.textContent = '登出';
                document.getElementById('login-status').textContent = '已登入';
                
                // 觸發登錄狀態改變事件
                triggerLoginStatusChanged();
            } catch (error) {
                document.getElementById('login-status').textContent = `登入失敗: ${error.message}`;
                console.error('Line login failed', error);
            }
        }
    });
}

// Fetch user profile from Line
async function fetchUserProfile() {
    try {
        if (liff.isLoggedIn()) {
            lineUserProfile = await liff.getProfile();
            return lineUserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        document.getElementById('login-status').textContent = `獲取用戶資料失敗: ${error.message}`;
        return null;
    }
}

// Display user profile in the UI
function displayUserProfile() {
    if (!lineUserProfile) return;
    
    const userProfileElement = document.getElementById('user-profile');
    userProfileElement.innerHTML = `
        <div class="profile-container">
            <img src="${lineUserProfile.pictureUrl}" alt="用戶頭像" class="profile-image">
            <div class="profile-info">
                <p class="profile-name">${lineUserProfile.displayName}</p>
                <p class="profile-id">ID: ${lineUserProfile.userId}</p>
            </div>
        </div>
    `;
}

// Get current user profile (for other modules to use)
function getCurrentUserProfile() {
    return lineUserProfile;
}

// 觸發登錄狀態改變事件
function triggerLoginStatusChanged() {
    const event = new Event('lineLoginStatusChanged');
    document.dispatchEvent(event);
}