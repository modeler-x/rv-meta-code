import { ok, type Result } from '@/shared/result/Result';
import type { EntitySummary } from '@/modules/entity/types/EntitySummary';

export interface IEntityRepository {
  listEntities(): Promise<Result<EntitySummary[]>>;
}

export class EntityRepository implements IEntityRepository {
  async listEntities(): Promise<Result<EntitySummary[]>> {
    return ok([
      {
        id: 'organizations', name: 'organizations', kind: 'Table', schema: 'public', rowCountLabel: '1.2K',
        summary: '4 columns / referenced by users',
        description: 'Top-level tenant record. Every user and downstream row is scoped to exactly one organization.',
        columns: [
          { name: 'id', type: 'bigserial', nullable: false, badge: 'PK' },
          { name: 'name', type: 'text', nullable: false },
          { name: 'plan', type: 'text', nullable: false, extra: "'free'" },
          { name: 'created_at', type: 'timestamptz', nullable: false, extra: 'now()' }
        ],
        relations: [{ kind: 'REF BY', text: 'users.org_id', rule: 'ON DELETE RESTRICT' }]
      },
      {
        id: 'users', name: 'users', kind: 'Table', schema: 'public', rowCountLabel: '48.9K',
        summary: '5 columns / 1 foreign key',
        description: 'Authenticated account. Email is globally unique; each user belongs to one organization and owns their orders.',
        columns: [
          { name: 'id', type: 'bigserial', nullable: false, badge: 'PK' },
          { name: 'email', type: 'text', nullable: false, badge: 'UQ' },
          { name: 'full_name', type: 'text', nullable: true },
          { name: 'org_id', type: 'bigint', nullable: false, badge: 'FK', extra: '→ organizations' },
          { name: 'created_at', type: 'timestamptz', nullable: false, extra: 'now()' }
        ],
        relations: [
          { kind: 'FK', text: 'org_id → organizations.id', rule: 'ON DELETE RESTRICT' },
          { kind: 'REF BY', text: 'orders.user_id', rule: 'ON DELETE CASCADE' }
        ]
      },
      {
        id: 'products', name: 'products', kind: 'Table', schema: 'public', rowCountLabel: '3.4K',
        summary: '6 columns / 1 foreign key',
        description: 'Sellable item catalogue. SKU is unique; each product belongs to a category and is referenced by order line items.',
        columns: [
          { name: 'id', type: 'bigserial', nullable: false, badge: 'PK' },
          { name: 'sku', type: 'text', nullable: false, badge: 'UQ' },
          { name: 'name', type: 'text', nullable: false },
          { name: 'price', type: 'numeric(12,2)', nullable: false, extra: '0' },
          { name: 'category_id', type: 'bigint', nullable: true, badge: 'FK', extra: '→ categories' },
          { name: 'created_at', type: 'timestamptz', nullable: false, extra: 'now()' }
        ],
        relations: [
          { kind: 'FK', text: 'category_id → categories.id', rule: 'ON DELETE SET NULL' },
          { kind: 'REF BY', text: 'order_items.product_id', rule: 'ON DELETE RESTRICT' }
        ]
      },
      {
        id: 'orders', name: 'orders', kind: 'Table', schema: 'public', rowCountLabel: '128K',
        summary: '5 columns / 1 foreign key',
        description: 'A checkout placed by a user. Status drives fulfilment; total is denormalised from the order items for fast reads.',
        columns: [
          { name: 'id', type: 'bigserial', nullable: false, badge: 'PK' },
          { name: 'user_id', type: 'bigint', nullable: false, badge: 'FK', extra: '→ users' },
          { name: 'status', type: 'text', nullable: false, extra: "'pending'" },
          { name: 'total', type: 'numeric(12,2)', nullable: false, extra: '0' },
          { name: 'placed_at', type: 'timestamptz', nullable: false, extra: 'now()' }
        ],
        relations: [
          { kind: 'FK', text: 'user_id → users.id', rule: 'ON DELETE CASCADE' },
          { kind: 'REF BY', text: 'order_items.order_id', rule: 'ON DELETE CASCADE' }
        ]
      },
      {
        id: 'active_users', name: 'active_users', kind: 'View', schema: 'public', rowCountLabel: '—',
        summary: 'derived from users, orders',
        description: 'Materialised-style view exposing users with at least one order placed in the trailing 30 days.',
        columns: [
          { name: 'id', type: 'bigint', nullable: false, extra: '← users' },
          { name: 'email', type: 'text', nullable: false, extra: '← users' },
          { name: 'last_order_at', type: 'timestamptz', nullable: true, extra: 'max(placed_at)' },
          { name: 'order_count', type: 'bigint', nullable: false, extra: 'count(*)' }
        ],
        relations: [{ kind: 'SRC', text: 'users, orders', rule: 'read-only' }]
      },
      {
        id: 'revenue_by_day', name: 'revenue_by_day', kind: 'View', schema: 'public', rowCountLabel: '—',
        summary: 'derived from orders',
        description: 'Daily revenue rollup used by the reporting API. Aggregates paid orders bucketed by calendar day.',
        columns: [
          { name: 'day', type: 'date', nullable: false, extra: 'date_trunc' },
          { name: 'orders', type: 'bigint', nullable: false, extra: 'count(*)' },
          { name: 'revenue', type: 'numeric', nullable: false, extra: 'sum(total)' }
        ],
        relations: [{ kind: 'SRC', text: 'orders', rule: 'read-only' }]
      }
    ]);
  }
}
