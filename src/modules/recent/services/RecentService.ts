import type { RecentActivity } from '@/modules/recent/types/RecentActivity';

const STORAGE_KEY = 'rv_recent_activities';
const MAX_ITEMS = 20;

/**
 * 利用したページの履歴を端末(localStorage)に永続化する。
 * バックエンド不要のクライアント側履歴。
 */
export class RecentService {
  load(): RecentActivity[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RecentActivity[]) : [];
    } catch {
      return [];
    }
  }

  save(activities: RecentActivity[]): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities.slice(0, MAX_ITEMS)));
    } catch {
      // 保存失敗（容量超過等）は履歴なので握りつぶす。
    }
  }

  get maxItems(): number {
    return MAX_ITEMS;
  }
}
