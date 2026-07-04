import type { PreferencesService } from '@/modules/preferences/services/PreferencesService';
import type { Preferences } from '@/modules/preferences/types/Preferences';
import { setCurrentLanguage } from '@/shared/i18n/i18n.svelte';

export class PreferencesViewModel {
  preferences: Preferences = $state({ language: 'ja', accentColor: '#0090a8' });

  constructor(private readonly preferencesService: PreferencesService) {}

  loadPreferences(): void {
    this.preferences = this.preferencesService.loadPreferences();
    setCurrentLanguage(this.preferences.language);
  }

  setLanguage(language: Preferences['language']): void {
    this.preferences = { ...this.preferences, language };
    this.preferencesService.savePreferences(this.preferences);
    setCurrentLanguage(language);
  }
}
