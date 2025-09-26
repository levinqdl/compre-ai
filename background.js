// Background script for Compre AI Chrome Extension
// Handles extension lifecycle, background tasks, and browser events

// Extension installation and startup
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Compre AI Translator installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Show welcome message
    showWelcomeNotification();
  }
});

// Show welcome notification
function showWelcomeNotification() {
  if (chrome.notifications) {
    chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Compre AI Translator Installed',
      message: 'Select text on any webpage and click the extension icon to translate!'
    });
  }
}

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item for translation
  chrome.contextMenus.create({
    id: 'translateSelectedText',
    title: 'Translate with Compre AI',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab.id) return;
  
  try {
    const selectedText = info.selectionText;
    
    // Send message to content script
    await chrome.tabs.sendMessage(tab.id, {
      action: 'translate-text',
      selectedText: selectedText
    });
  } catch (error) {
    console.error('Translation error:', error);
  }
});

console.log('Compre AI Translator background script loaded');