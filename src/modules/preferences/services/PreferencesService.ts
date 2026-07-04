import type { Preferences } from '@/modules/preferences/types/Preferences';

const STORAGE_KEY = 'rvMetaPreferences';

export class PreferencesService {
  loadPreferences(): Preferences {
    const fallback: Preferences = { language: 'ja', accentColor: '#0090a8' };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
      return fallback;
    }
  }

  savePreferences(preferences: Preferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }
}
