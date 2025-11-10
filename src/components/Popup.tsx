/// <reference types="chrome" />
import { useState, useEffect } from 'react';

interface UserData {
  name?: string;
  email?: string;
}

type NotificationType = 'success' | 'info' | 'error';

const SITE_PREF_KEY = 'enabledSites';

export default function Popup() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [siteToggleEnabled, setSiteToggleEnabled] = useState(false);
  const [siteToggleDisabled, setSiteToggleDisabled] = useState(true);
  const [currentHostname, setCurrentHostname] = useState('');
  const [siteToggleHint, setSiteToggleHint] = useState('');

  useEffect(() => {
    loadAuthStatus();
    initSiteToggle();
  }, []);

  useEffect(() => {
    const listener = (changes: Record<string, any>, areaName: 'sync' | 'local' | 'managed' | 'session') => {
      if (areaName === 'sync' && Object.prototype.hasOwnProperty.call(changes, SITE_PREF_KEY)) {
        applySitePreference(changes[SITE_PREF_KEY]?.newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [currentHostname]);

  async function initSiteToggle() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab || !tab.url) {
        disableToggle('Unavailable on this page');
        return;
      }
      let pageUrl;
      try {
        pageUrl = new URL(tab.url);
      } catch (error) {
        console.error('Invalid tab URL', error);
        disableToggle('Unavailable on this page');
        return;
      }
      if (!['http:', 'https:'].includes(pageUrl.protocol)) {
        disableToggle('Unavailable on this page');
        return;
      }
      const hostname = pageUrl.hostname.toLowerCase();
      setCurrentHostname(hostname);
      const enabledSites = await loadEnabledSites();
      updateToggleUI(enabledSites.includes(hostname));
    } catch (error) {
      console.error('Site toggle init error:', error);
      disableToggle('Unavailable on this page');
    }
  }

  async function handleSiteToggleChange(checked: boolean) {
    if (!currentHostname) return;
    setSiteToggleDisabled(true);
    const previousState = siteToggleEnabled;
    try {
      const enabledSites = await loadEnabledSites();
      const normalized = new Set(enabledSites);
      if (checked) {
        normalized.add(currentHostname);
      } else {
        normalized.delete(currentHostname);
      }
      const updated = Array.from(normalized);
      await chrome.storage.sync.set({ [SITE_PREF_KEY]: updated });
      updateToggleHint(checked);
      const message = checked ? `Compre AI enabled on ${currentHostname}` : `Compre AI disabled on ${currentHostname}`;
      showNotification(message, checked ? 'success' : 'info');
    } catch (error) {
      console.error('Error updating site preference', error);
      setSiteToggleEnabled(previousState);
      showNotification('Unable to update site preference.', 'error');
    } finally {
      setSiteToggleDisabled(false);
    }
  }

  async function loadEnabledSites(): Promise<string[]> {
    try {
      const stored = await chrome.storage.sync.get([SITE_PREF_KEY]);
      const list = stored[SITE_PREF_KEY];
      if (!Array.isArray(list)) return [];
      return list.map((item) => (item || '').toString().toLowerCase().trim()).filter(Boolean);
    } catch (error) {
      console.error('Error loading enabled sites', error);
      return [];
    }
  }

  function updateToggleUI(enabled: boolean) {
    setSiteToggleEnabled(enabled);
    setSiteToggleDisabled(false);
    setSiteToggleHint(enabled ? 'Enabled for this page' : 'Disabled for this page');
  }

  function updateToggleHint(enabled: boolean) {
    setSiteToggleEnabled(enabled);
    setSiteToggleHint(enabled ? 'Enabled for this page' : 'Disabled for this page');
  }

  function disableToggle(message: string) {
    setSiteToggleEnabled(false);
    setSiteToggleDisabled(true);
    setCurrentHostname('');
    setSiteToggleHint(message);
  }

  function applySitePreference(list: unknown) {
    const normalized = Array.isArray(list)
      ? list.map((item) => (item || '').toString().toLowerCase().trim()).filter(Boolean)
      : [];
    const enabled = normalized.includes(currentHostname);
    setSiteToggleEnabled(enabled);
    setSiteToggleHint(enabled ? 'Enabled for this page' : 'Disabled for this page');
  }

  async function loadAuthStatus() {
    try {
      const loginUrl = ((window as any).API_BASE_URL) || 'https://your-translation-api.com';
      const response = await fetch(`${loginUrl}/api/verify`, { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setIsAuthenticated(true);
          setUserData(data.user);
        } else {
          setIsAuthenticated(false);
          setUserData(null);
        }
      } else {
        setIsAuthenticated(false);
        setUserData(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUserData(null);
    }
  }

  async function handleLogin() {
    try {
      showNotification('Opening login page...', 'info');
      const loginUrl = ((window as any).API_BASE_URL) || 'https://your-translation-api.com';
      await chrome.tabs.create({ url: `${loginUrl}?client_type=extension` });
    } catch (error) {
      console.error('Login error:', error);
      showNotification('❌ Failed to open login page.', 'error');
    }
  }

  async function handleLogout() {
    try {
      const loginUrl = ((window as any).API_BASE_URL) || 'https://your-translation-api.com';
      await chrome.tabs.create({ url: `${loginUrl}?client_type=extension` });
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('❌ Failed to open logout page.', 'error');
    }
  }

  function showNotification(message: string, type: NotificationType) {
    setNotification({ message, type });
    if (type === 'success') {
      setTimeout(() => setNotification(null), 3000);
    }
  }

  return (
    <div className="w-[300px] min-h-[200px] text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-5">
        <div className="text-center mb-5">
          <div className="text-2xl font-bold mb-2">Compre AI</div>
          <div className="text-sm opacity-80">Text Translator</div>
        </div>
        
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
          <div className="bg-white/5 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex-1">
                <div className="text-sm font-medium">Enable on this site</div>
                {currentHostname && <div className="text-xs opacity-70">{currentHostname}</div>}
              </div>
              <label className="relative inline-block w-11 h-6">
                <input
                  type="checkbox"
                  checked={siteToggleEnabled}
                  disabled={siteToggleDisabled}
                  onChange={(e) => handleSiteToggleChange(e.target.checked)}
                  className="opacity-0 w-0 h-0 peer"
                />
                <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-white/30 transition-all duration-200 rounded-xl before:absolute before:content-[''] before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-200 before:rounded-full peer-checked:bg-green-500/80 peer-checked:before:translate-x-[18px] peer-disabled:bg-white/20 peer-disabled:cursor-not-allowed"></span>
              </label>
            </div>
            <div className="text-[10px] opacity-70">{siteToggleHint}</div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            {!isAuthenticated ? (
              <div
                onClick={handleLogin}
                className="flex items-center mb-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/10"
              >
                <div className="w-6 h-6 mr-3 text-lg">🔐</div>
                <div className="text-sm">Login to Enable Translation</div>
              </div>
            ) : (
              <div>
                <div className="text-xs mb-2 opacity-90">
                  Welcome, {userData?.name || 'User'}!
                  {userData?.email && <div className="text-[10px] opacity-70">{userData.email}</div>}
                </div>
                <div
                  onClick={handleLogout}
                  className="flex items-center mb-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/10"
                >
                  <div className="w-6 h-6 mr-3 text-lg">🚪</div>
                  <div className="text-sm">Logout</div>
                </div>
              </div>
            )}
            {notification && (
              <div className={`text-[11px] p-1.5 rounded mt-2 text-center ${
                notification.type === 'success' ? 'bg-green-500/80' :
                notification.type === 'error' ? 'bg-red-500/80' :
                'bg-blue-500/80'
              }`}>
                {notification.message}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-5 text-center text-xs opacity-70">
          Version 1.0.0
        </div>
      </div>
    </div>
  );
}
