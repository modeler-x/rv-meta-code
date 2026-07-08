import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect } from 'vitest';
import DocumentListPage from '@/pages/DocumentListPage.svelte';
import EntityListPage from '@/pages/EntityListPage.svelte';
import { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
import { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
import { DocumentService } from '@/modules/document/services/DocumentService';
import { EntityService } from '@/modules/entity/services/EntityService';
import type { IDocumentRepository } from '@/modules/document/repositories/DocumentRepository';
import type { IEntityRepository } from '@/modules/entity/repositories/EntityRepository';
import { ok, type Result } from '@/shared/result/Result';
import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
import type { EntityDetail, EntitySummary } from '@/modules/entity/types/EntitySummary';

// 初期表示後に非同期で届くデータが一覧へ反映されることを検証する
// （navigate による遅延ロードで初回だけ表示されなかった不具合の回帰テスト）。

class FakeDocumentRepo implements IDocumentRepository {
  async listDocuments(): Promise<Result<OpenApiDocumentSummary[]>> {
    return ok([
      { id: 1, title: 'Doc A', description: 'desc', version: 'v1', schemaName: 'public', updatedAt: '2024-01-01T00:00:00Z' }
    ]);
  }
}

class FakeEntityRepo implements IEntityRepository {
  async listEntities(): Promise<Result<EntitySummary[]>> {
    return ok([
      { id: 1, tableSchema: 'public', tableName: 'users', resourceName: 'users', description: null, fieldCount: 3, operationCount: 2 }
    ]);
  }
  async getEntityDetail(): Promise<Result<EntityDetail>> {
    return ok({ fields: [], operations: [] });
  }
}

describe('list pages reflect data that arrives after mount', () => {
  it('DocumentListPage renders documents loaded after mount', async () => {
    const vm = new DocumentViewModel(new DocumentService(new FakeDocumentRepo()));
    const { container } = render(DocumentListPage, { props: { viewModel: vm, onOpenDocument: () => {} } });
    expect(container.textContent).not.toContain('Doc A');
    await vm.loadDocuments();
    await tick();
    expect(container.textContent).toContain('Doc A');
  });

  it('EntityListPage renders entities loaded after mount', async () => {
    const vm = new EntityViewModel(new EntityService(new FakeEntityRepo()));
    const { container } = render(EntityListPage, { props: { viewModel: vm, onOpenEntity: () => {} } });
    expect(container.textContent).not.toContain('users');
    await vm.loadEntities();
    await tick();
    expect(container.textContent).toContain('users');
  });
});
