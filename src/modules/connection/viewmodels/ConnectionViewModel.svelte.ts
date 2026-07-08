import type { ConnectionDraft, ConnectionDto } from '@/modules/connection/dto/ConnectionDto';
import type { ConnectionService } from '@/modules/connection/services/ConnectionService';

export type TestState = 'idle' | 'testing' | 'ok' | 'fail';

export class ConnectionViewModel {
  connections: ConnectionDto[] = $state([]);
  draft: ConnectionDraft = $state({ id: '', name: '', host: '', port: '5432', database: '', user: '', password: '', isCurrent: false, hasPassword: false, excludedSchemas: [] });
  isFormOpen = $state(false);
  isBusy = $state(false);
  errorMessage = $state('');
  testState: TestState = $state('idle');
  testMessage = $state('');
  schemaInput = $state('');

  constructor(private readonly connectionService: ConnectionService) {}

  get isEditingExisting(): boolean {
    return this.draft.id.length > 0;
  }

  async loadConnections(): Promise<void> {
    const result = await this.connectionService.loadConnections();
    if (result.success) {
      this.connections = result.data;
      this.errorMessage = '';
    } else {
      this.errorMessage = result.error.message;
    }
  }

  startAdd(): void {
    this.draft = this.connectionService.createDraft();
    this.resetFeedback();
    this.isFormOpen = true;
  }

  startEdit(connectionId: string): void {
    const target = this.connections.find((connection) => connection.id === connectionId);
    if (!target) return;
    this.draft = this.connectionService.toDraft(target);
    this.resetFeedback();
    this.isFormOpen = true;
  }

  cancelForm(): void {
    this.isFormOpen = false;
  }

  async saveConnection(): Promise<void> {
    if (!this.connectionService.isValidDraft(this.draft)) {
      this.errorMessage = 'name and host are required';
      return;
    }
    this.isBusy = true;
    this.errorMessage = '';
    const result = await this.connectionService.saveConnection(this.connectionService.toSaveInput(this.draft));
    this.isBusy = false;
    if (!result.success) {
      this.errorMessage = result.error.message;
      return;
    }
    this.isFormOpen = false;
    await this.loadConnections();
  }

  async deleteConnection(connectionId: string): Promise<void> {
    this.isBusy = true;
    const result = await this.connectionService.deleteConnection(connectionId);
    this.isBusy = false;
    if (!result.success) {
      this.errorMessage = result.error.message;
      return;
    }
    this.isFormOpen = false;
    await this.loadConnections();
  }

  async setCurrentConnection(connectionId: string): Promise<void> {
    const result = await this.connectionService.setActiveConnection(connectionId);
    if (!result.success) {
      this.errorMessage = result.error.message;
      return;
    }
    await this.loadConnections();
  }

  async testConnection(): Promise<void> {
    this.testState = 'testing';
    this.testMessage = '';
    const result = await this.connectionService.testConnection(this.connectionService.toTestInput(this.draft));
    if (!result.success) {
      this.testState = 'fail';
      this.testMessage = result.error.message;
      return;
    }
    this.testState = result.data.isOk ? 'ok' : 'fail';
    this.testMessage = result.data.serverVersion
      ? `${result.data.message} (${result.data.serverVersion})`
      : result.data.message;
  }

  addExcludedSchema(): void {
    // カンマ・空白・改行区切りで複数まとめて追加できる（例: `_timescale*, cron`）。
    const values = this.schemaInput
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (values.length === 0) return;
    const merged = [...this.draft.excludedSchemas];
    for (const value of values) {
      if (!merged.includes(value)) merged.push(value);
    }
    this.draft.excludedSchemas = merged;
    this.schemaInput = '';
  }

  removeExcludedSchema(schema: string): void {
    this.draft.excludedSchemas = this.draft.excludedSchemas.filter((item) => item !== schema);
  }

  private resetFeedback(): void {
    this.errorMessage = '';
    this.testState = 'idle';
    this.testMessage = '';
    this.schemaInput = '';
  }
}
