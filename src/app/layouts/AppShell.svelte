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
  import { SchemaViewModel } from '@/modules/schema/viewmodels/SchemaViewModel.svelte';
  import { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
  import { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import { GenerationViewModel } from '@/modules/generation/viewmodels/GenerationViewModel.svelte';
  import { OperationViewModel } from '@/modules/operation/viewmodels/OperationViewModel';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let route: AppRoute = $state({ name: 'welcome' });
  const schemaViewModel = new SchemaViewModel(appProvider.schemaService);
  const documentViewModel = new DocumentViewModel(appProvider.documentService);
  const entityViewModel = new EntityViewModel(appProvider.entityService);
  const generationViewModel = new GenerationViewModel(appProvider.generationService);
  const operationViewModel = new OperationViewModel(appProvider.operationService);

  onMount(async () => {
    await Promise.all([schemaViewModel.loadSchemas(), documentViewModel.loadDocuments(), entityViewModel.loadEntities()]);
  });

  function navigate(name: AppRouteName): void { route = appProvider.routeService.createRoute(name); }
  function openEntity(entityId: string, backRoute: AppRoute = { name: 'entities' }): void { route = appProvider.routeService.createEntityRoute(entityId, backRoute); }
  function openDocument(documentId: string): void { route = appProvider.routeService.createDocumentRoute(documentId); }
  function openOperation(entityId: string, operationId: string): void { route = appProvider.routeService.createOperationRoute(entityId, operationId); }
  function goBack(): void { route = route.backRoute ?? { name: 'welcome' }; }

  const selectedEntity = $derived(entityViewModel.findEntity(route.entityId));
  const selectedDocument = $derived(documentViewModel.findDocument(route.documentId));
  const titleMap = $derived({ welcome: $t('title_welcome'), schema: $t('title_schemas'), documents: $t('title_documents'), documentDetail: selectedDocument?.name ?? $t('title_documents'), entities: $t('title_entities'), entityDetail: selectedEntity?.name ?? '', operationDetail: route.operationId ?? $t('sec_operations'), recent: $t('title_recent'), profile: $t('title_profile'), connections: $t('title_connections') });
  const title = $derived(titleMap[route.name]);
  const selectedOperation = $derived(operationViewModel.findOperation(selectedEntity, route.operationId));
</script>

<MacWindow>
  <Sidebar {route} onNavigate={navigate} />
  <main class="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-[color:var(--rvc-bg)]">
    <MainHeader {route} {title} onBack={goBack} />
    <section class="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div class="mx-auto max-w-3xl">
        {#if route.name === 'welcome'}
          <WelcomePage onNavigate={navigate} />
        {:else if route.name === 'schema'}
          <SchemaPage viewModel={schemaViewModel} generationViewModel={generationViewModel} />
        {:else if route.name === 'documents'}
          <DocumentListPage viewModel={documentViewModel} entityViewModel={entityViewModel} onOpenDocument={openDocument} />
        {:else if route.name === 'documentDetail' && selectedDocument}
          <DocumentDetailPage document={selectedDocument} entityViewModel={entityViewModel} onOpenEntity={(entityId) => openEntity(entityId, route)} />
        {:else if route.name === 'entities'}
          <EntityListPage viewModel={entityViewModel} onOpenEntity={(entityId) => openEntity(entityId)} />
        {:else if route.name === 'entityDetail' && selectedEntity}
          <EntityDetailPage entity={selectedEntity} operations={operationViewModel.listOperations(selectedEntity)} onOpenOperation={(operationId) => openOperation(selectedEntity.id, operationId)} />
        {:else if route.name === 'operationDetail' && selectedEntity && selectedOperation}
          <OperationDetailPage entity={selectedEntity} operation={selectedOperation} />
        {:else if route.name === 'recent'}
          <RecentPage onOpenEntity={(entityId) => openEntity(entityId)} onOpenDocument={openDocument} />
        {:else if route.name === 'profile'}
          <ProfilePage />
        {:else if route.name === 'connections'}
          <ConnectionPage />
        {/if}
      </div>
    </section>
    <GenerationSheet state={generationViewModel.state} schemaName={generationViewModel.selectedSchema?.name ?? ''} progress={generationViewModel.progress} step={generationViewModel.step} detail={generationViewModel.selectedSchema?.documentName ?? ''} onCancel={() => generationViewModel.closeGeneration()} onRun={() => generationViewModel.runGeneration()} onOpenDocument={() => { const documentId = generationViewModel.selectedSchema?.documentId; generationViewModel.closeGeneration(); if (documentId) openDocument(documentId); }} />
  </main>
</MacWindow>
