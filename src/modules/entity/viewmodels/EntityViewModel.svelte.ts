import type { EntityService } from '@/modules/entity/services/EntityService';
import type { EntityDetail, EntitySummary } from '@/modules/entity/types/EntitySummary';

export class EntityViewModel {
  entities: EntitySummary[] = $state([]);
  detail: EntityDetail | null = $state(null);
  isDetailLoading = $state(false);
  isReadOnlyUpdating = $state(false);
  // 直近に読み込んだスキーマ（read-only 一括更新後の再読込に使う）。
  private lastSchema: string | undefined = undefined;

  constructor(private readonly entityService: EntityService) {}

  /** schema 未指定なら全ドキュメント横断。 */
  async loadEntities(schema?: string): Promise<void> {
    this.lastSchema = schema;
    const result = await this.entityService.loadEntities(schema);
    if (result.success) {
      this.entities = result.data;
    }
  }

  async loadDetail(entityId: number): Promise<void> {
    this.isDetailLoading = true;
    this.detail = null;
    const result = await this.entityService.loadEntityDetail(entityId);
    if (result.success) {
      this.detail = result.data;
    }
    this.isDetailLoading = false;
  }

  /**
   * entity の参照専用ポリシーを切り替える。
   * 成功時はローカルの一覧状態を更新し、operations を再取得して詳細へ反映する。
   */
  async toggleReadOnly(entity: EntitySummary, isReadOnly: boolean): Promise<void> {
    this.isReadOnlyUpdating = true;
    const result = await this.entityService.setReadOnly(entity.tableSchema, entity.tableName, isReadOnly);
    if (result.success) {
      await this.loadDetail(entity.id);
      const operationCount = this.detail?.operations.length ?? entity.operationCount;
      this.entities = this.entities.map((item) =>
        item.id === entity.id ? { ...item, isReadOnly, operationCount } : item
      );
    }
    this.isReadOnlyUpdating = false;
  }

  /**
   * 選択された複数 entity の参照専用ポリシーを一括で切り替える。
   * 全件適用後に一覧を再読込して operationCount / isReadOnly を反映する。
   */
  async setReadOnlyMany(entityIds: number[], isReadOnly: boolean): Promise<void> {
    if (entityIds.length === 0) return;
    this.isReadOnlyUpdating = true;
    const targets = this.entities.filter((entity) => entityIds.includes(entity.id));
    for (const entity of targets) {
      await this.entityService.setReadOnly(entity.tableSchema, entity.tableName, isReadOnly);
    }
    await this.loadEntities(this.lastSchema);
    this.isReadOnlyUpdating = false;
  }

  findEntity(entityId?: string): EntitySummary | undefined {
    return this.entities.find((entity) => String(entity.id) === entityId);
  }
}
