export type RecentActivityKind = 'entity' | 'document' | 'schema';

export type RecentActivity = {
  id: string;
  kind: RecentActivityKind;
  title: string;
  subtitle: string;
  timeLabel: string;
  targetId?: string;
};
