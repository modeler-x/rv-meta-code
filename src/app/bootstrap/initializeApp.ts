import { PreferencesService } from '@/modules/preferences/services/PreferencesService';
import { setCurrentLanguage } from '@/shared/i18n/i18n.svelte';

export function initializeApp(): void {
  const preferences = new PreferencesService().loadPreferences();
  setCurrentLanguage(preferences.language);
}
