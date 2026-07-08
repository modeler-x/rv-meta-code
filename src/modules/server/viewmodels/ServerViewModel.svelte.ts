import type { ServerDraft, ServerDto, TestServerResult } from '@/modules/server/dto/ServerDto';
import type { ServerService } from '@/modules/server/services/ServerService';

export type ServerTestState = 'idle' | 'testing' | 'ok' | 'fail';

export class ServerViewModel {
  servers: ServerDto[] = $state([]);
  draft: ServerDraft = $state({
    id: null,
    name: '',
    environment: 'dev',
    baseUrl: '',
    description: '',
    variablesText: '',
    healthPath: '',
    expectedStatus: 200,
    timeoutMs: 3000,
    enabled: true
  });
  isFormOpen = $state(false);
  isBusy = $state(false);
  errorMessage = $state('');
  testState: ServerTestState = $state('idle');
  testMessage = $state('');

  constructor(private readonly serverService: ServerService) {}

  get isEditingExisting(): boolean {
    return this.draft.id !== null;
  }

  async loadServers(): Promise<void> {
    const result = await this.serverService.loadServers();
    if (result.success) {
      this.servers = result.data;
      this.errorMessage = '';
    } else {
      this.errorMessage = result.error.message;
    }
  }

  startAdd(): void {
    this.draft = this.serverService.createDraft();
    this.resetFeedback();
    this.isFormOpen = true;
  }

  startEdit(serverId: number): void {
    const target = this.servers.find((server) => server.id === serverId);
    if (!target) return;
    this.draft = this.serverService.toDraft(target);
    this.resetFeedback();
    this.isFormOpen = true;
  }

  cancelForm(): void {
    this.isFormOpen = false;
  }

  async saveServer(): Promise<void> {
    if (!this.serverService.isValidDraft(this.draft)) {
      this.errorMessage = 'name and base URL are required';
      return;
    }
    const variables = this.serverService.parseVariables(this.draft.variablesText);
    if (!variables.success) {
      this.errorMessage = variables.error.message;
      return;
    }
    this.isBusy = true;
    this.errorMessage = '';
    const result = await this.serverService.saveServer(this.serverService.toSaveInput(this.draft, variables.data));
    this.isBusy = false;
    if (!result.success) {
      this.errorMessage = result.error.message;
      return;
    }
    this.isFormOpen = false;
    await this.loadServers();
  }

  async deleteServer(serverId: number): Promise<void> {
    this.isBusy = true;
    const result = await this.serverService.deleteServer(serverId);
    this.isBusy = false;
    if (!result.success) {
      this.errorMessage = result.error.message;
      return;
    }
    this.isFormOpen = false;
    await this.loadServers();
  }

  async testConnectivity(): Promise<void> {
    const variables = this.serverService.parseVariables(this.draft.variablesText);
    if (!variables.success) {
      this.testState = 'fail';
      this.testMessage = variables.error.message;
      return;
    }
    this.testState = 'testing';
    this.testMessage = '';
    const input = this.serverService.toTestInput(this.draft, variables.data);
    const result = await this.serverService.testServer(input);
    if (!result.success) {
      this.testState = 'fail';
      this.testMessage = result.error.message;
      return;
    }
    this.applyTestResult(result.data);
  }

  private applyTestResult(result: TestServerResult): void {
    this.testState = result.isOk ? 'ok' : 'fail';
    const parts: string[] = [];
    if (result.status !== null) parts.push(String(result.status));
    parts.push(result.message);
    if (result.latencyMs !== null) parts.push(`${result.latencyMs}ms`);
    this.testMessage = `${result.url} — ${parts.join(' · ')}`;
  }

  private resetFeedback(): void {
    this.errorMessage = '';
    this.testState = 'idle';
    this.testMessage = '';
  }
}
