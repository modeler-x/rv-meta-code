import type { OperationGroupService } from '@/modules/operation-group/services/OperationGroupService';
import type {
  OperationGroupDetail,
  OperationGroupSummary
} from '@/modules/operation-group/types/OperationGroupSummary';
import type { OperationSummary } from '@/modules/operation/types/OperationSummary';

// 一覧・詳細ともに loading / error / empty / success を区別して保持する。
// 「正常な空」と「取得エラー」を UI で見分けられるようにする。
export class OperationGroupViewModel {
  groups: OperationGroupSummary[] = $state([]);
  isGroupsLoading = $state(false);
  groupsError: string | null = $state(null);

  detail: OperationGroupDetail | null = $state(null);
  isDetailLoading = $state(false);
  detailError: string | null = $state(null);

  constructor(private readonly operationGroupService: OperationGroupService) {}

  async loadGroups(schema: string): Promise<void> {
    this.isGroupsLoading = true;
    this.groupsError = null;
    const result = await this.operationGroupService.loadOperationGroups(schema);
    if (result.success) {
      this.groups = result.data;
    } else {
      this.groups = [];
      this.groupsError = result.error.message;
    }
    this.isGroupsLoading = false;
  }

  async loadDetail(schema: string, groupKey: string): Promise<void> {
    this.isDetailLoading = true;
    this.detail = null;
    this.detailError = null;
    const result = await this.operationGroupService.loadOperationGroupDetail(schema, groupKey);
    if (result.success) {
      this.detail = result.data;
    } else {
      this.detailError = result.error.message;
    }
    this.isDetailLoading = false;
  }

  findGroup(groupKey?: string): OperationGroupSummary | undefined {
    return this.groups.find((group) => group.groupKey === groupKey);
  }

  /** operationRowId（openapi_operations.id）で Operation を引く。 */
  findOperation(operationRowId?: string): OperationSummary | undefined {
    return this.detail?.operations.find((operation) => String(operation.id) === operationRowId);
  }
}
