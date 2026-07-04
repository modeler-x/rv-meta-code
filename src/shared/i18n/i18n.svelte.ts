import { derived, get, writable } from 'svelte/store';
import { generationSteps, messages, type LanguageCode, type MessageKey } from '@/shared/i18n/messages';

export const language = writable<LanguageCode>('ja');

export const translate = derived(language, ($language) => (key: MessageKey): string => messages[$language][key]);

export const genSteps = derived(language, ($language) => generationSteps[$language]);

export function setCurrentLanguage(next: LanguageCode): void {
  language.set(next);
}

export function getCurrentLanguage(): LanguageCode {
  return get(language);
}
