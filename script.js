document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('bmi-form');
    const resultDiv = document.getElementById('result');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const historyListDiv = document.getElementById('history-list');
    
    // 載入之前儲存的資料
    loadFromLocalStorage();
    
    // 檢查用戶登錄狀態並載入歷史記錄
    checkLoginAndLoadHistory();
    
    // 表單提交處理
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 獲取輸入值
        const height = parseFloat(heightInput.value) / 100; // 轉換成米
        const weight = parseFloat(weightInput.value);
        
        // 檢查輸入是否有效
        if (isNaN(height) || isNaN(weight) || height <= 0 || weight <= 0) {
            resultDiv.innerHTML = '<p class="error">請輸入有效的身高和體重數值</p>';
            return;
        }
        
        // 計算 BMI
        const bmi = weight / (height * height);
        const roundedBmi = bmi.toFixed(2);
        
        // 確定 BMI 類別
        let category = '';
        let categoryClass = '';
        
        if (bmi < 18.5) {
            category = '體重過輕';
            categoryClass = 'underweight';
        } else if (bmi < 24) {
            category = '正常範圍';
            categoryClass = 'normal';
        } else if (bmi < 27) {
            category = '過重';
            categoryClass = 'overweight';
        } else if (bmi < 30) {
            category = '輕度肥胖';
            categoryClass = 'obese-mild';
        } else if (bmi < 35) {
            category = '中度肥胖';
            categoryClass = 'obese-moderate';
        } else {
            category = '重度肥胖';
            categoryClass = 'obese-severe';
        }
        
        // 顯示結果
        resultDiv.innerHTML = `
            <div class="result-content ${categoryClass}">
                <p class="bmi-result">您的 BMI 為: <strong>${roundedBmi}</strong></p>
                <p class="bmi-category">${category}</p>
            </div>
        `;
        
        // 將資料儲存到 localStorage
        saveToLocalStorage(heightInput.value, weightInput.value, roundedBmi, category, categoryClass);
        
        // 如果用戶已經登錄，保存記錄到 Google Sheets
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            try {
                // 保存用戶資料到主表
                await saveUserToMasterSheet(userProfile);
                
                // 保存體重記錄到用戶專屬表格
                await saveWeightRecord(
                    userProfile.userId, 
                    heightInput.value, 
                    weightInput.value, 
                    roundedBmi, 
                    category
                );
                
                // 重新載入體重歷史記錄
                loadWeightHistory();
            } catch (error) {
                console.error('Error saving data to Google Sheets:', error);
            }
        } else {
            resultDiv.innerHTML += `
                <p class="login-prompt">登入 Line 帳號以保存您的 BMI 記錄</p>
            `;
        }
    });
    
    // 儲存資料到 localStorage
    function saveToLocalStorage(height, weight, bmi, category, categoryClass) {
        const bmiData = {
            height: height,
            weight: weight,
            bmi: bmi,
            category: category,
            categoryClass: categoryClass,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('bmiData', JSON.stringify(bmiData));
    }
    
    // 從 localStorage 讀取資料
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('bmiData');
        
        if (savedData) {
            const bmiData = JSON.parse(savedData);
            
            // 設置表單的值
            heightInput.value = bmiData.height;
            weightInput.value = bmiData.weight;
            
            // 顯示上次計算的結果
            resultDiv.innerHTML = `
                <div class="result-content ${bmiData.categoryClass}">
                    <p class="bmi-result">您的 BMI 為: <strong>${bmiData.bmi}</strong></p>
                    <p class="bmi-category">${bmiData.category}</p>
                    <p class="timestamp">上次計算時間: ${new Date(bmiData.timestamp).toLocaleString()}</p>
                </div>
            `;
        }
    }
    
    // 保存用戶到主表
    async function saveUserToMasterSheet(userProfile) {
        try {
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
    
    // 保存體重記錄
    async function saveWeightRecord(userId, height, weight, bmi, category) {
        try {
            const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=saveRecord&userId=${encodeURIComponent(userId)}&height=${encodeURIComponent(height)}&weight=${encodeURIComponent(weight)}&bmi=${encodeURIComponent(bmi)}&category=${encodeURIComponent(category)}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error saving weight record:', error);
            return false;
        }
    }
    
    // 檢查用戶登錄狀態並載入歷史記錄
    function checkLoginAndLoadHistory() {
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            loadWeightHistory();
        } else {
            historyListDiv.innerHTML = '<p>請先登入以查看您的體重記錄</p>';
        }
    }
    
    // 載入體重歷史記錄
    async function loadWeightHistory() {
        const userProfile = getCurrentUserProfile();
        if (!userProfile) {
            historyListDiv.innerHTML = '<p>請先登入以查看您的體重記錄</p>';
            return;
        }
        
        try {
            const response = await fetch(`${GAS_CONFIG.webAppUrl}?action=getHistory&userId=${encodeURIComponent(userProfile.userId)}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                let historyHTML = '<div class="history-table">';
                historyHTML += '<div class="history-header">';
                historyHTML += '<div class="history-cell">日期</div>';
                historyHTML += '<div class="history-cell">體重 (kg)</div>';
                historyHTML += '<div class="history-cell">BMI</div>';
                historyHTML += '<div class="history-cell">類別</div>';
                historyHTML += '</div>';
                
                // 最多顯示10筆記錄
                const recentHistory = result.data.slice(0, 10);
                
                recentHistory.forEach(record => {
                    const date = new Date(record[0]).toLocaleDateString();
                    const weight = record[1];
                    const bmi = record[3];
                    const category = record[4];
                    
                    historyHTML += '<div class="history-row">';
                    historyHTML += `<div class="history-cell">${date}</div>`;
                    historyHTML += `<div class="history-cell">${weight}</div>`;
                    historyHTML += `<div class="history-cell">${bmi}</div>`;
                    historyHTML += `<div class="history-cell">${category}</div>`;
                    historyHTML += '</div>';
                });
                
                historyHTML += '</div>';
                historyListDiv.innerHTML = historyHTML;
            } else {
                historyListDiv.innerHTML = '<p>暫無體重記錄</p>';
            }
        } catch (error) {
            console.error('Error loading weight history:', error);
            historyListDiv.innerHTML = '<p>載入體重記錄失敗</p>';
        }
    }
    
    // 監聽 Line 登錄狀態變化
    document.addEventListener('lineLoginStatusChanged', function() {
        const userProfile = getCurrentUserProfile();
        if (userProfile) {
            loadWeightHistory();
        } else {
            historyListDiv.innerHTML = '<p>請先登入以查看您的體重記錄</p>';
        }
    });
});