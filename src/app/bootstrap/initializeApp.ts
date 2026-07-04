import { PreferencesService } from '@/modules/preferences/services/PreferencesService';
import { setCurrentLanguage } from '@/shared/i18n/i18n.svelte';

export function initializeApp(): void {
  document.documentElement.classList.add('select-none');
  const preferences = new PreferencesService().loadPreferences();
  setCurrentLanguage(preferences.language);
}
