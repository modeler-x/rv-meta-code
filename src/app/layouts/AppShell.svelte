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
  import OperationGroupDetailPage from '@/pages/OperationGroupDetailPage.svelte';
  import SdkGenerationPage from '@/pages/SdkGenerationPage.svelte';
  import ComponentsPage from '@/pages/ComponentsPage.svelte';
  import RecentPage from '@/pages/RecentPage.svelte';
  import ProfilePage from '@/pages/ProfilePage.svelte';
  import ConnectionPage from '@/pages/ConnectionPage.svelte';
  import ServerPage from '@/pages/ServerPage.svelte';
  import { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
  import { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
  import { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { OperationGroupViewModel } from '@/modules/operation-group/viewmodels/OperationGroupViewModel.svelte';
  import { SdkGenerationViewModel } from '@/modules/sdk/viewmodels/SdkGenerationViewModel.svelte';
  import { ComponentViewModel } from '@/modules/component/viewmodels/ComponentViewModel.svelte';
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
  const operationGroupViewModel = new OperationGroupViewModel(appProvider.operationGroupService);
  const sdkGenerationViewModel = new SdkGenerationViewModel(appProvider.sdkGenerationService);
  const componentViewModel = new ComponentViewModel(appProvider.componentService);
  const generationViewModel = new GenerationViewModel(appProvider.generationService);
  const recentViewModel = new RecentViewModel(appProvider.recentService);
  // 生成成功後はドキュメントを再読込し、履歴に記録する。
  generationViewModel.onCompiled = () => {
    void documentViewModel.loadDocuments();
    for (const schema of generationViewModel.selectedSchemas) {
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
      void operationGroupViewModel.loadGroups(document.schemaName);
      void documentViewModel.loadDetail(document.schemaName);
      recentViewModel.record({ kind: 'document', title: document.title, subtitle: `${document.schemaName} / ${document.version}`, targetId: String(document.id), schemaName: document.schemaName });
    }
  }
  function openOperationGroup(schemaName: string, groupKey: string, backRoute: AppRoute): void {
    route = appProvider.routeService.createOperationGroupRoute(schemaName, groupKey, backRoute);
    void operationGroupViewModel.loadDetail(schemaName, groupKey);
  }
  function openSdkGeneration(schemaName: string, backRoute: AppRoute): void {
    route = appProvider.routeService.createSdkGenerationRoute(schemaName, backRoute);
    sdkGenerationViewModel.reset();
  }
  function openComponents(schemaName: string, backRoute: AppRoute): void {
    route = appProvider.routeService.createComponentsRoute(schemaName, backRoute);
    void componentViewModel.load(schemaName);
  }
  function openFunctionOperation(schemaName: string, groupKey: string, operationRowId: string, backRoute: AppRoute): void {
    route = appProvider.routeService.createFunctionOperationRoute(schemaName, groupKey, operationRowId, backRoute);
    const operation = operationGroupViewModel.findOperation(operationRowId);
    if (operation) {
      recentViewModel.record({ kind: 'operation', title: `${operation.method} ${operation.path}`, subtitle: selectedGroup?.displayName ?? '', targetId: String(operation.id), schemaName });
    }
  }
  function openOperation(entityId: string, operationRowId: string): void {
    route = appProvider.routeService.createOperationRoute(entityId, operationRowId);
    const operation = entityViewModel.detail?.operations.find((op) => String(op.id) === operationRowId);
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
  const selectedOperation = $derived(entityViewModel.detail?.operations.find((operation) => String(operation.id) === route.operationRowId));
  const selectedGroup = $derived(operationGroupViewModel.findGroup(route.groupKey));
  const selectedFunctionOperation = $derived(operationGroupViewModel.findOperation(route.operationRowId));
  const connectionLabel = $derived(currentConnection ? `${currentConnection.database} / ${currentConnection.host}` : $t('no_connection'));
  const titleMap = $derived({ welcome: $t('title_welcome'), schema: $t('title_schemas'), documents: $t('title_documents'), documentDetail: selectedDocument?.title ?? $t('title_documents'), entities: $t('title_entities'), entityDetail: selectedEntity?.tableName ?? '', operationDetail: selectedOperation?.path ?? $t('sec_operations'), operationGroupDetail: selectedGroup?.displayName ?? $t('title_operation_group'), functionOperationDetail: selectedFunctionOperation?.path ?? $t('sec_operations'), sdkGeneration: $t('title_sdk'), components: $t('title_components'), recent: $t('title_recent'), profile: $t('title_profile'), connections: $t('title_connections'), servers: $t('title_servers') });
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
          <DocumentDetailPage document={selectedDocument} documentViewModel={documentViewModel} entityViewModel={entityViewModel} operationGroupViewModel={operationGroupViewModel} onOpenEntity={(entityId) => openEntity(entityId, route)} onOpenGroup={(groupKey) => openOperationGroup(selectedDocument.schemaName, groupKey, route)} onGenerateSdk={() => openSdkGeneration(selectedDocument.schemaName, route)} onOpenComponents={() => openComponents(selectedDocument.schemaName, route)} />
        {:else if route.name === 'sdkGeneration'}
          <SdkGenerationPage viewModel={sdkGenerationViewModel} schema={route.schemaName ?? ''} />
        {:else if route.name === 'components'}
          <ComponentsPage viewModel={componentViewModel} schema={route.schemaName ?? ''} />
        {:else if route.name === 'entities'}
          <EntityListPage viewModel={entityViewModel} onOpenEntity={(entityId) => openEntity(entityId)} />
        {:else if route.name === 'entityDetail' && selectedEntity}
          <EntityDetailPage entity={selectedEntity} fields={entityViewModel.detail?.fields ?? []} operations={entityViewModel.detail?.operations ?? []} relations={entityViewModel.detail?.relations ?? []} onOpenOperation={(operationId) => openOperation(selectedEntity.id.toString(), operationId)} onToggleReadOnly={(isReadOnly) => entityViewModel.toggleReadOnly(selectedEntity, isReadOnly)} isReadOnlyUpdating={entityViewModel.isReadOnlyUpdating} />
        {:else if route.name === 'operationDetail' && selectedEntity && selectedOperation}
          <OperationDetailPage entity={selectedEntity} operation={selectedOperation} fieldOrder={(entityViewModel.detail?.fields ?? []).map((field) => field.columnName)} components={entityViewModel.detail?.components ?? {}} />
        {:else if route.name === 'operationGroupDetail' && selectedGroup}
          <OperationGroupDetailPage group={selectedGroup} operations={operationGroupViewModel.detail?.operations ?? []} isLoading={operationGroupViewModel.isDetailLoading} onOpenOperation={(operationRowId) => openFunctionOperation(route.schemaName ?? '', route.groupKey ?? '', operationRowId, route)} />
        {:else if route.name === 'functionOperationDetail' && selectedFunctionOperation}
          <OperationDetailPage
            subtitle={selectedGroup?.displayName ?? ''}
            groupKey={selectedGroup?.groupKey ?? route.groupKey ?? ''}
            operation={selectedFunctionOperation}
            components={operationGroupViewModel.detail?.components ?? {}}
          />
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
    <GenerationSheet state={generationViewModel.state} schemaName={generationViewModel.currentSchemaName} totalCount={generationViewModel.totalCount} doneCount={generationViewModel.doneCount} progress={generationViewModel.progress} step={generationViewModel.step} detail={generationViewModel.resultDetail} errorMessage={generationViewModel.errorMessage} onCancel={() => generationViewModel.closeGeneration()} onRun={() => generationViewModel.runGeneration()} onOpenDocument={() => { generationViewModel.closeGeneration(); navigate('documents'); }} />
  </main>
</MacWindow>
