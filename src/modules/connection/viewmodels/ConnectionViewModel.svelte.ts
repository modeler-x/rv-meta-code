import type { ConnectionDto } from '@/modules/connection/dto/ConnectionDto';
import type { ConnectionService } from '@/modules/connection/services/ConnectionService';

export class ConnectionViewModel {
  connections: ConnectionDto[] = $state([]);
  draft: ConnectionDto = $state({ id: '', name: '', host: '', port: '5432', database: '', user: '', isCurrent: false });
  isFormOpen = $state(false);

  constructor(private readonly connectionService: ConnectionService) {}

  get isEditingExisting(): boolean {
    return this.draft.id.length > 0;
  }

  async loadConnections(): Promise<void> {
    const result = await this.connectionService.loadConnections();
    if (result.success) {
      this.connections = result.data;
    }
  }

  startAdd(): void {
    this.draft = this.connectionService.createDraft();
    this.isFormOpen = true;
  }

  startEdit(connectionId: string): void {
    const target = this.connections.find((connection) => connection.id === connectionId);
    if (!target) return;
    this.draft = { ...target };
    this.isFormOpen = true;
  }

  cancelForm(): void {
    this.isFormOpen = false;
  }

  saveConnection(): void {
    if (!this.connectionService.isValidDraft(this.draft)) return;
    this.connections = this.connectionService.upsertConnection(this.connections, this.draft);
    this.isFormOpen = false;
  }

  deleteConnection(connectionId: string): void {
    this.connections = this.connectionService.removeConnection(this.connections, connectionId);
    this.isFormOpen = false;
  }

  setCurrentConnection(connectionId: string): void {
    this.connections = this.connectionService.activateConnection(this.connections, connectionId);
  }
}
