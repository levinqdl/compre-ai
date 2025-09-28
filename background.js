// Background script for Compre AI Chrome Extension
// Load environment configuration
try { importScripts('config.js'); } catch (e) { console.warn('Config not loaded', e); }
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
      message: 'Select text on any webpage to see the translation panel!'
    });
  }
}

console.log('Compre AI Translator background script loaded');