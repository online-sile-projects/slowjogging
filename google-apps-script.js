/**
 * Google Apps Script code to deploy as a Web App for handling Google Sheets operations
 * 
 * Instructions:
 * 1. Create a new Google Apps Script project
 * 2. Copy this code into the script editor
 * 3. Deploy as a web app with "Anyone, even anonymous" access
 * 4. Copy the web app URL to your config.js file
 */

// Spreadsheet ID - replace with your actual spreadsheet ID
const SPREADSHEET_ID = '1234567890abcdefghijklmnopqrstuvwxyz';

// Main doGet function that handles all requests
function doGet(e) {
  // Enable CORS
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Get parameters
  var params = e.parameter;
  var action = params.action;
  
  // Route to appropriate function based on action
  var result;
  try {
    switch(action) {
      case 'saveUser':
        result = saveUser(params.userId, params.displayName, params.pictureUrl);
        break;
      case 'saveExercise':
        result = saveExercise(params.userId, params.duration, params.tempo, params.date);
        break;
      case 'getExerciseHistory':
        result = getExerciseHistory(params.userId);
        break;
      default:
        result = { success: false, message: 'Invalid action' };
    }
  } catch(error) {
    result = { success: false, message: error.toString() };
  }
  
  // Return result as JSON
  output.setContent(JSON.stringify(result));
  return output;
}

// Save user to master sheet
function saveUser(userId, displayName, pictureUrl) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Try to get master sheet or create if it doesn't exist
    var masterSheet;
    try {
      masterSheet = ss.getSheetByName('Users');
    } catch(e) {
      masterSheet = ss.insertSheet('Users');
      masterSheet.appendRow(['userId', 'displayName', 'pictureUrl', 'firstSeen', 'lastSeen']);
    }
    
    // Check if user already exists
    var userData = masterSheet.getDataRange().getValues();
    var userRow = -1;
    for(var i = 1; i < userData.length; i++) {
      if(userData[i][0] == userId) {
        userRow = i + 1;
        break;
      }
    }
    
    // Current timestamp
    var now = new Date().toISOString();
    
    // Update or insert user
    if(userRow > 0) {
      // User exists, update
      masterSheet.getRange(userRow, 2).setValue(displayName);
      masterSheet.getRange(userRow, 3).setValue(pictureUrl);
      masterSheet.getRange(userRow, 5).setValue(now);
    } else {
      // New user
      masterSheet.appendRow([userId, displayName, pictureUrl, now, now]);
      
      // Create user-specific sheet
      var userSheet = ss.insertSheet(userId.substring(0, 10)); // Use part of userId as sheet name
      userSheet.appendRow(['date', 'duration', 'tempo']);
    }
    
    return { success: true };
  } catch(error) {
    return { success: false, message: error.toString() };
  }
}

// Save exercise record
function saveExercise(userId, duration, tempo, date) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Get user's sheet (using first 10 chars of userId)
    var sheetName = userId.substring(0, 10);
    var sheet;
    
    try {
      sheet = ss.getSheetByName(sheetName);
    } catch(e) {
      // If sheet doesn't exist, create it
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['date', 'duration', 'tempo']);
    }
    
    // Add exercise record
    sheet.appendRow([date, duration, tempo]);
    
    return { success: true };
  } catch(error) {
    return { success: false, message: error.toString() };
  }
}

// Get exercise history for a user
function getExerciseHistory(userId) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Get user's sheet (using first 10 chars of userId)
    var sheetName = userId.substring(0, 10);
    var sheet;
    
    try {
      sheet = ss.getSheetByName(sheetName);
    } catch(e) {
      // If sheet doesn't exist, return empty array
      return { success: true, data: [] };
    }
    
    // Get all data except header row
    var data = sheet.getDataRange().getValues();
    var records = [];
    
    if(data.length > 1) {
      // Remove header row and reverse to show newest first
      records = data.slice(1).reverse();
    }
    
    return { success: true, data: records };
  } catch(error) {
    return { success: false, message: error.toString() };
  }
}
