import type { RecentService } from '@/modules/recent/services/RecentService';
import type { RecentActivity } from '@/modules/recent/types/RecentActivity';

export class RecentViewModel {
  activities: RecentActivity[] = $state([]);

  constructor(private readonly recentService: RecentService) {
    this.activities = this.recentService.load();
  }

  /** 利用したページを1件記録する。同一対象は最新へ更新し、先頭に並べる。 */
  record(entry: Omit<RecentActivity, 'id' | 'at'>): void {
    const id = `${entry.kind}:${entry.entityId ?? ''}:${entry.targetId ?? entry.title}`;
    const at = new Date().toISOString();
    const next = [{ ...entry, id, at }, ...this.activities.filter((activity) => activity.id !== id)].slice(
      0,
      this.recentService.maxItems
    );
    this.activities = next;
    this.recentService.save(next);
  }
}
