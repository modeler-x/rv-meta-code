import type { RecentActivity } from '@/modules/recent/types/RecentActivity';

export class RecentService {
  loadRecentActivities(): RecentActivity[] {
    return [
      { id: 'r1', kind: 'entity', title: 'orders', subtitle: 'Entity / public.orders', timeLabel: '10:24', targetId: 'orders' },
      { id: 'r2', kind: 'schema', title: 'スキーマ', subtitle: 'Commerce API を生成', timeLabel: '10:19' },
      { id: 'r3', kind: 'document', title: 'Catalog API', subtitle: 'OpenAPI document / v1.2.0', timeLabel: '昨日', targetId: 'catalog' }
    ];
  }
}
