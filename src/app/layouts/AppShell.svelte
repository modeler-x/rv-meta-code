<script lang="ts">
  import { onMount } from 'svelte';
  import MacWindow from '@/shared/components/MacWindow.svelte';
  import GenerationSheet from '@/shared/components/GenerationSheet.svelte';
  import Sidebar from '@/app/layouts/Sidebar.svelte';
  import MainHeader from '@/app/layouts/MainHeader.svelte';
  import { appProvider } from '@/app/providers/AppProvider';
  import type { AppRoute, AppRouteName } from '@/app/router/AppRoute';
  import WelcomePage from '@/pages/WelcomePage.svelte';
  import SchemaPage from '@/pages/SchemaPage.svelte';
  import DocumentListPage from '@/pages/DocumentListPage.svelte';
  import DocumentDetailPage from '@/pages/DocumentDetailPage.svelte';
  import EntityListPage from '@/pages/EntityListPage.svelte';
  import EntityDetailPage from '@/pages/EntityDetailPage.svelte';
  import OperationDetailPage from '@/pages/OperationDetailPage.svelte';
  import RecentPage from '@/pages/RecentPage.svelte';
  import ProfilePage from '@/pages/ProfilePage.svelte';
  import ConnectionPage from '@/pages/ConnectionPage.svelte';
  import ServerPage from '@/pages/ServerPage.svelte';
  import { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
  import { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
  import { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
  import { RecentViewModel } from '@/modules/recent/viewmodels/RecentViewModel.svelte';
  import type { RecentActivity } from '@/modules/recent/types/RecentActivity';
  import type { CurrentConnectionDto } from '@/modules/connection/dto/ConnectionDto';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let route: AppRoute = $state({ name: 'welcome' });
  let currentConnection = $state<CurrentConnectionDto | null>(null);
  const schemaViewModel = new SchemaViewModel(appProvider.schemaService);
  const documentViewModel = new DocumentViewModel(appProvider.documentService);
  const entityViewModel = new EntityViewModel(appProvider.entityService);
  const generationViewModel = new GenerationViewModel(appProvider.generationService);
  const recentViewModel = new RecentViewModel(appProvider.recentService);
  // 生成成功後はドキュメントを再読込し、履歴に記録する。
  generationViewModel.onCompiled = () => {
    void documentViewModel.loadDocuments();
    const schema = generationViewModel.selectedSchema;
    if (schema) {
      recentViewModel.record({ kind: 'schema', title: schema.name, subtitle: schema.comment ?? 'schema', targetId: schema.name, schemaName: schema.name });
    }
  };

  async function loadCurrentConnection(): Promise<void> {
    const result = await appProvider.connectionService.getCurrentConnection();
    if (result.success) currentConnection = result.data;
  }

  onMount(async () => {
    await Promise.all([loadCurrentConnection(), schemaViewModel.loadSchemas()]);
  });

  function navigate(name: AppRouteName): void {
    route = appProvider.routeService.createRoute(name);
    // 接続の切替を反映するため都度再取得。
    void loadCurrentConnection();
    if (name === 'schema') void schemaViewModel.loadSchemas();
    if (name === 'documents') void documentViewModel.loadDocuments();
    if (name === 'entities') void entityViewModel.loadEntities();
  }
  function openEntity(entityId: string, backRoute: AppRoute = { name: 'entities' }): void {
    route = appProvider.routeService.createEntityRoute(entityId, backRoute);
    void entityViewModel.loadDetail(Number(entityId));
    const entity = entityViewModel.findEntity(entityId);
    if (entity) {
      recentViewModel.record({ kind: 'entity', title: entity.tableName, subtitle: `${entity.tableSchema}.${entity.tableName}`, targetId: String(entity.id), schemaName: entity.tableSchema });
    }
  }
  function openDocument(documentId: string): void {
    route = appProvider.routeService.createDocumentRoute(documentId);
    const document = documentViewModel.findDocument(documentId);
    if (document) {
      void entityViewModel.loadEntities(document.schemaName);
      recentViewModel.record({ kind: 'document', title: document.title, subtitle: `${document.schemaName} / ${document.version}`, targetId: String(document.id), schemaName: document.schemaName });
    }
  }
  function openOperation(entityId: string, operationId: string): void {
    route = appProvider.routeService.createOperationRoute(entityId, operationId);
    const operation = entityViewModel.detail?.operations.find((op) => String(op.id) === operationId);
    const entity = entityViewModel.findEntity(entityId);
    if (operation) {
      recentViewModel.record({ kind: 'operation', title: `${operation.method} ${operation.path}`, subtitle: entity?.tableName ?? '', targetId: String(operation.id), entityId, schemaName: entity?.tableSchema });
    }
  }
  // 履歴からの再オープン。再起動後でも表示できるよう、必要な一覧を先に読み込む。
  async function openRecent(activity: RecentActivity): Promise<void> {
    if (activity.kind === 'document') {
      await documentViewModel.loadDocuments();
      openDocument(activity.targetId ?? '');
    } else if (activity.kind === 'schema') {
      navigate('schema');
    } else if (activity.kind === 'operation') {
      if (activity.schemaName) await entityViewModel.loadEntities(activity.schemaName);
      if (activity.entityId) await entityViewModel.loadDetail(Number(activity.entityId));
      openOperation(activity.entityId ?? '', activity.targetId ?? '');
    } else {
      if (activity.schemaName) await entityViewModel.loadEntities(activity.schemaName);
      openEntity(activity.targetId ?? '');
    }
  }
  function goBack(): void { route = route.backRoute ?? { name: 'welcome' }; }

  const selectedEntity = $derived(entityViewModel.findEntity(route.entityId));
  const selectedDocument = $derived(documentViewModel.findDocument(route.documentId));
  const selectedOperation = $derived(entityViewModel.detail?.operations.find((operation) => String(operation.id) === route.operationId));
  const connectionLabel = $derived(currentConnection ? `${currentConnection.database} / ${currentConnection.host}` : $t('no_connection'));
  const titleMap = $derived({ welcome: $t('title_welcome'), schema: $t('title_schemas'), documents: $t('title_documents'), documentDetail: selectedDocument?.title ?? $t('title_documents'), entities: $t('title_entities'), entityDetail: selectedEntity?.tableName ?? '', operationDetail: selectedOperation?.path ?? $t('sec_operations'), recent: $t('title_recent'), profile: $t('title_profile'), connections: $t('title_connections'), servers: $t('title_servers') });
  const title = $derived(titleMap[route.name]);
</script>

<MacWindow>
  <Sidebar {route} onNavigate={navigate} />
  <main class="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-[color:var(--rvc-bg)]">
    <MainHeader {route} {title} onBack={goBack} {connectionLabel} />
    <section class="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div class="mx-auto max-w-3xl">
        {#if route.name === 'welcome'}
          <WelcomePage onNavigate={navigate} />
        {:else if route.name === 'schema'}
          <SchemaPage viewModel={schemaViewModel} generationViewModel={generationViewModel} />
        {:else if route.name === 'documents'}
          <DocumentListPage viewModel={documentViewModel} onOpenDocument={openDocument} />
        {:else if route.name === 'documentDetail' && selectedDocument}
          <DocumentDetailPage document={selectedDocument} entityViewModel={entityViewModel} onOpenEntity={(entityId) => openEntity(entityId, route)} />
        {:else if route.name === 'entities'}
          <EntityListPage viewModel={entityViewModel} onOpenEntity={(entityId) => openEntity(entityId)} />
        {:else if route.name === 'entityDetail' && selectedEntity}
          <EntityDetailPage entity={selectedEntity} fields={entityViewModel.detail?.fields ?? []} operations={entityViewModel.detail?.operations ?? []} onOpenOperation={(operationId) => openOperation(selectedEntity.id.toString(), operationId)} />
        {:else if route.name === 'operationDetail' && selectedEntity && selectedOperation}
          <OperationDetailPage entity={selectedEntity} operation={selectedOperation} fieldOrder={(entityViewModel.detail?.fields ?? []).map((field) => field.columnName)} components={entityViewModel.detail?.components ?? {}} />
        {:else if route.name === 'recent'}
          <RecentPage viewModel={recentViewModel} onOpen={openRecent} />
        {:else if route.name === 'profile'}
          <ProfilePage />
        {:else if route.name === 'connections'}
          <ConnectionPage />
        {:else if route.name === 'servers'}
          <ServerPage />
        {/if}
      </div>
    </section>
    <GenerationSheet state={generationViewModel.state} schemaName={generationViewModel.selectedSchema?.name ?? ''} progress={generationViewModel.progress} step={generationViewModel.step} detail={generationViewModel.resultDetail} errorMessage={generationViewModel.errorMessage} onCancel={() => generationViewModel.closeGeneration()} onRun={() => generationViewModel.runGeneration()} onOpenDocument={() => { generationViewModel.closeGeneration(); navigate('documents'); }} />
  </main>
</MacWindow>
