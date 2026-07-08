import type { LanguageCode } from '@/shared/i18n/messages';

/**
 * ISO8601 文字列を「n時間前 / n日前」などの相対表記へ整形する。
 * バックエンドは updatedAt を UTC ISO 文字列で返す。
 */
export function formatRelativeTime(iso: string, lang: LanguageCode): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const diffMs = Date.now() - then;
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (lang === 'ja') {
    if (sec < 60) return 'たった今';
    if (min < 60) return `${min}分前`;
    if (hour < 24) return `${hour}時間前`;
    if (day < 30) return `${day}日前`;
    const month = Math.floor(day / 30);
    if (month < 12) return `${month}ヶ月前`;
    return `${Math.floor(month / 12)}年前`;
  }

  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hour < 24) return `${hour}h ago`;
  if (day < 30) return `${day}d ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  return `${Math.floor(month / 12)}y ago`;
}
