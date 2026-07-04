import type { RecentService } from '@/modules/recent/services/RecentService';
import type { RecentActivity } from '@/modules/recent/types/RecentActivity';

export class RecentViewModel {
  activities: RecentActivity[] = $state([]);

  constructor(private readonly recentService: RecentService) {}

  loadRecentActivities(): void {
    this.activities = this.recentService.loadRecentActivities();
  }
}
