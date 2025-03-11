/**
 * Google Sheets Integration Module
 * Handles saving and retrieving data from Google Sheets via Google Apps Script
 */

// Save user to master sheet
async function saveUserToMasterSheet(userProfile) {
    try {
        if (!userProfile) return false;
        
        const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=saveUser&userId=${encodeURIComponent(userProfile.userId)}&displayName=${encodeURIComponent(userProfile.displayName)}&pictureUrl=${encodeURIComponent(userProfile.pictureUrl)}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error saving user data:', error);
        return false;
    }
}

// Save exercise record to user's sheet
async function saveExerciseRecord(userId, duration, tempo, date) {
    try {
        if (!userId) return false;
        
        const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=saveExercise&userId=${encodeURIComponent(userId)}&duration=${encodeURIComponent(duration)}&tempo=${encodeURIComponent(tempo)}&date=${encodeURIComponent(date)}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error saving exercise record:', error);
        return false;
    }
}

// Load exercise history for user
async function loadExerciseHistory(userId) {
    try {
        if (!userId) return { success: false, data: [] };
        
        const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=getExerciseHistory&userId=${encodeURIComponent(userId)}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error loading exercise history:', error);
        return { success: false, data: [] };
    }
}

// Display exercise history in the UI
function displayExerciseHistory(historyData) {
    const historyListDiv = document.getElementById('history-list');
    
    if (!historyData || !historyData.success || !historyData.data || historyData.data.length === 0) {
        historyListDiv.innerHTML = '<p>暫無運動記錄</p>';
        return;
    }
    
    let historyHTML = '<div class="history-table">';
    historyHTML += '<div class="history-header">';
    historyHTML += '<div class="history-cell">日期</div>';
    historyHTML += '<div class="history-cell">時長（分鐘）</div>';
    historyHTML += '<div class="history-cell">節拍</div>';
    historyHTML += '</div>';
    
    // 最多顯示10筆記錄
    const recentHistory = historyData.data.slice(0, 10);
    
    recentHistory.forEach(record => {
        const date = new Date(record[0]).toLocaleDateString();
        const duration = record[1];
        const tempo = record[2];
        
        historyHTML += '<div class="history-row">';
        historyHTML += `<div class="history-cell">${date}</div>`;
        historyHTML += `<div class="history-cell">${duration}</div>`;
        historyHTML += `<div class="history-cell">${tempo}</div>`;
        historyHTML += '</div>';
    });
    
    historyHTML += '</div>';
    historyListDiv.innerHTML = historyHTML;
}
