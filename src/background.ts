/// <reference types="chrome" />

try { importScripts('config.js'); } catch (e) { console.warn('Config not loaded', e); }

chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  console.log('Compre AI Translator installed/updated:', details.reason);
  if (details.reason === 'install') {
    showWelcomeNotification();
  }
});

function showWelcomeNotification(): void {
  if (!chrome.notifications) return;
  const options: chrome.notifications.NotificationOptions<true> = {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Compre AI Translator Installed',
    message: 'Select text on any webpage to see the translation panel!'
  };
  chrome.notifications.create('welcome', options);
}

console.log('Compre AI Translator background script loaded');
