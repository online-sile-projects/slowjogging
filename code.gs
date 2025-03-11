// Google Apps Script for BMI Calculator
// Deploy this script as a web app to interact with Google Sheets

// Global variables
const SPREADSHEET_ID = '1RysxHRCxcDqgM40eAJN4aVrJSWx2t8sT5LYiSJGA_3Q'; // Replace with your actual spreadsheet ID

// Set up the web app
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'saveUser') {
      return saveUser(e);
    } else if (action === 'saveRecord') {
      return saveWeightRecord(e);
    } else if (action === 'getHistory') {
      return getWeightHistory(e);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Save user to master sheet
function saveUser(e) {
  const userId = e.parameter.userId;
  const displayName = e.parameter.displayName;
  const pictureUrl = e.parameter.pictureUrl;
  
  if (!userId || !displayName) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Check if master sheet exists, if not create it
  let masterSheet = ss.getSheetByName('MasterSheet');
  if (!masterSheet) {
    masterSheet = ss.insertSheet('MasterSheet');
    masterSheet.appendRow(['userId', 'displayName', 'pictureUrl', 'createdAt']);
  }
  
  // Check if user exists in master sheet
  const data = masterSheet.getDataRange().getValues();
  let userExists = false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      userExists = true;
      break;
    }
  }
  
  if (!userExists) {
    const now = new Date().toISOString();
    masterSheet.appendRow([userId, displayName, pictureUrl, now]);
    
    // Create a sheet for this user
    createUserSheet(userId, ss);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// Create sheet for a specific user
function createUserSheet(userId, ss) {
  let userSheet = ss.getSheetByName(userId);
  
  if (!userSheet) {
    userSheet = ss.insertSheet(userId);
    userSheet.appendRow(['日期', '運動總時間 (分鐘)']);
  }
  
  return userSheet;
}

// Save exercise record
function saveWeightRecord(e) {
  const userId = e.parameter.userId;
  const exerciseTime = e.parameter.exerciseTime;
  
  if (!userId || !exerciseTime) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get or create user sheet
  let userSheet = ss.getSheetByName(userId);
  if (!userSheet) {
    userSheet = createUserSheet(userId, ss);
  }
  
  // Add new exercise record
  const now = new Date().toISOString();
  userSheet.appendRow([now, exerciseTime]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// Get weight history for a user
function getWeightHistory(e) {
  const userId = e.parameter.userId;
  
  if (!userId) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing userId parameter'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get user sheet
  const userSheet = ss.getSheetByName(userId);
  if (!userSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get all data from the sheet
  const data = userSheet.getDataRange().getValues();
  
  // Remove header row
  const records = data.slice(1);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: records
  })).setMimeType(ContentService.MimeType.JSON);
}