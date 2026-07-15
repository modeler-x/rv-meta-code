<script lang="ts">
  import IconTile from '@/shared/components/IconTile.svelte';
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import { language } from '@/shared/i18n/i18n.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  type Field = { name: string; required: boolean; desc: string };
  type Section = { key: string; title: string; target: string; intro: string; fields: Field[]; example: string };

  // rv_meta 独自の DML 記述仕様。暗黙値になりがちなので object 種別ごとに明示する。
  const content: Record<'ja' | 'en', Section[]> = {
    ja: [
      {
        key: 'document',
        title: 'スキーマ / ドキュメント',
        target: 'COMMENT ON SCHEMA … IS \'@openapi-document { … }\'',
        intro: 'ドキュメントメタの単一情報源（SoT）。スキーマ COMMENT に @openapi-document で宣言する。未指定の項目はカタログ/既定から推論する。',
        fields: [
          { name: 'title', required: false, desc: '未指定はスキーマ名から推論（例 "Rv Auth API"）。' },
          { name: 'version', required: false, desc: 'API バージョン。未指定は既定値。' },
          { name: 'description', required: false, desc: 'ドキュメント説明。' },
          { name: 'generationMode', required: false, desc: 'entity_and_function（既定）| function_only。function_only は Entity CRUD を出力しない。' },
          { name: 'basePath', required: false, desc: '公開 URL 第1セグメント兼 SDK Service 名の基底。未指定はスキーマ名。単一セグメント（^[a-z][a-z0-9_-]*$）。' }
        ],
        example:
          "COMMENT ON SCHEMA rv_auth IS\n'@openapi-document {\"title\":\"Auth API\",\"version\":\"1.0.0\",\"basePath\":\"auth\",\"generationMode\":\"function_only\"}';"
      },
      {
        key: 'function',
        title: 'ファンクション（Operation）',
        target: 'COMMENT ON FUNCTION … IS \'… @openapi { … }\'',
        intro: '関数を 1 つの API Operation として公開する。@openapi の無い関数は非公開。path は basePath への相対、operationId は method 名（prefix なし）で宣言し、公開 path /{basePath}{path} と operationId {service}{Method} は compile が合成する。',
        fields: [
          { name: 'operationGroup', required: false, desc: 'SDK Service 名。未指定は basePath。指定でサブグループ。' },
          { name: 'operationId', required: true, desc: 'method 名（prefix なし。例 "login"）。合成後は service+Method（例 authLogin）。' },
          { name: 'method', required: true, desc: 'GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS/TRACE。' },
          { name: 'path', required: true, desc: 'basePath への相対（先頭 "/"）。/{basePath} の再宣言は不可（二重化防止）。' },
          { name: 'tags', required: true, desc: '非空配列。分類用（SDK Service とは別）。' },
          { name: 'security', required: true, desc: 'Security Requirement 配列。公開 Operation は [] を明示。' },
          { name: 'parameters', required: false, desc: 'OpenAPI Parameter 配列。path の {param} と in:path が一致すること。' },
          { name: 'requestBody', required: false, desc: 'OpenAPI Request Body Object。' },
          { name: 'responses', required: false, desc: '未指定は OUT/TABLE 列から推論。推論不可なら明示必須。' }
        ],
        example:
          "COMMENT ON FUNCTION rv_auth.login(p_email text, p_password text) IS\n'サインイン。\n@openapi {\"operationId\":\"login\",\"method\":\"POST\",\"path\":\"/login\",\"tags\":[\"Auth\"],\"security\":[]}';\n-- 公開: POST /auth/login / operationId authLogin / service auth"
      },
      {
        key: 'entity',
        title: 'エンティティ（テーブル / ビュー）',
        target: '（DML 宣言なし・カタログから自動生成）',
        intro: 'テーブル/ビューから自動生成され、専用の @openapi 宣言は不要。命名とパスは basePath とカタログから決まる。読取専用はポリシーで制御する。',
        fields: [
          { name: 'resource', required: false, desc: 'lower(table 名, _→-)。パス末尾セグメント。' },
          { name: 'path', required: false, desc: '/{basePath}/{table}。' },
          { name: 'operationId', required: false, desc: '{basePath}_{resource}_{op}。' },
          { name: 'CRUD', required: false, desc: 'list/get/post/put/delete/delete_many。読取専用は list/get のみ。' },
          { name: 'read-only', required: false, desc: 'is_view（カタログ）または is_read_only（UI トグル/ポリシー）。' },
          { name: 'component', required: false, desc: 'PascalCase(schema-resource)。models のスキーマ名。' }
        ],
        example:
          "-- 宣言不要。read-only ポリシーはエンティティ詳細のトグル、または:\nUPDATE rv_meta.openapi_entities SET is_read_only = true\n WHERE table_schema = 'rv_auth' AND table_name = 'session';"
      }
    ],
    en: [
      {
        key: 'document',
        title: 'Schema / Document',
        target: "COMMENT ON SCHEMA … IS '@openapi-document { … }'",
        intro: 'Single source of truth for document metadata, declared with @openapi-document on the schema COMMENT. Unspecified fields are inferred from the catalog/defaults.',
        fields: [
          { name: 'title', required: false, desc: 'Inferred from the schema name when omitted.' },
          { name: 'version', required: false, desc: 'API version. Defaulted when omitted.' },
          { name: 'description', required: false, desc: 'Document description.' },
          { name: 'generationMode', required: false, desc: 'entity_and_function (default) | function_only. function_only omits Entity CRUD.' },
          { name: 'basePath', required: false, desc: 'First URL segment and SDK service-name base. Falls back to the schema name. Single segment (^[a-z][a-z0-9_-]*$).' }
        ],
        example:
          "COMMENT ON SCHEMA rv_auth IS\n'@openapi-document {\"title\":\"Auth API\",\"version\":\"1.0.0\",\"basePath\":\"auth\",\"generationMode\":\"function_only\"}';"
      },
      {
        key: 'function',
        title: 'Function (Operation)',
        target: "COMMENT ON FUNCTION … IS '… @openapi { … }'",
        intro: 'Publishes a function as one API operation. Functions without @openapi are private. The path is relative to basePath and operationId is the bare method name; compile composes the public path /{basePath}{path} and operationId {service}{Method}.',
        fields: [
          { name: 'operationGroup', required: false, desc: 'SDK service name. Defaults to basePath; set it to create a sub-group.' },
          { name: 'operationId', required: true, desc: 'Bare method name (e.g. "login"); composed to service+Method (e.g. authLogin).' },
          { name: 'method', required: true, desc: 'GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS/TRACE.' },
          { name: 'path', required: true, desc: 'Relative to basePath (leading "/"). Restating /{basePath} is rejected.' },
          { name: 'tags', required: true, desc: 'Non-empty array. Classification, independent of the SDK service.' },
          { name: 'security', required: true, desc: 'Security Requirement array. Use [] for public operations.' },
          { name: 'parameters', required: false, desc: 'OpenAPI Parameter array; {param} in path must match in:path parameters.' },
          { name: 'requestBody', required: false, desc: 'OpenAPI Request Body Object.' },
          { name: 'responses', required: false, desc: 'Inferred from OUT/TABLE columns when omitted; required if not inferable.' }
        ],
        example:
          "COMMENT ON FUNCTION rv_auth.login(p_email text, p_password text) IS\n'Sign in.\n@openapi {\"operationId\":\"login\",\"method\":\"POST\",\"path\":\"/login\",\"tags\":[\"Auth\"],\"security\":[]}';\n-- Public: POST /auth/login / operationId authLogin / service auth"
      },
      {
        key: 'entity',
        title: 'Entity (Table / View)',
        target: '(No DML declaration — generated from the catalog)',
        intro: 'Generated automatically from tables/views; no @openapi declaration is needed. Naming and paths come from basePath and the catalog. Read-only is a policy.',
        fields: [
          { name: 'resource', required: false, desc: 'lower(table name, _→-). Last path segment.' },
          { name: 'path', required: false, desc: '/{basePath}/{table}.' },
          { name: 'operationId', required: false, desc: '{basePath}_{resource}_{op}.' },
          { name: 'CRUD', required: false, desc: 'list/get/post/put/delete/delete_many. Read-only emits only list/get.' },
          { name: 'read-only', required: false, desc: 'is_view (catalog) or is_read_only (UI toggle / policy).' },
          { name: 'component', required: false, desc: 'PascalCase(schema-resource). The model schema name.' }
        ],
        example:
          "-- No declaration. Read-only policy via the entity-detail toggle, or:\nUPDATE rv_meta.openapi_entities SET is_read_only = true\n WHERE table_schema = 'rv_auth' AND table_name = 'session';"
      }
    ]
  };

  const sections = $derived(content[$language] ?? content.ja);
</script>

<div class="mb-6 flex items-center gap-3">
  <IconTile label="?" color="#6b7280" />
  <div>
    <h2 class="text-xl font-bold">{$t('title_help')}</h2>
    <p class="text-xs text-[color:var(--rvc-muted)]">{$t('help_intro')}</p>
  </div>
</div>

{#each sections as section}
  <div class="mt-4"></div>
  <SectionList title={section.title}>
    <SectionListRow>
      <span class="min-w-0 flex-1">
        <span class="block font-mono text-[11px] text-[color:var(--rvc-accent)]">{section.target}</span>
        <span class="mt-1 block text-xs text-[color:var(--rvc-muted)]">{section.intro}</span>
      </span>
    </SectionListRow>
    {#each section.fields as field}
      <SectionListRow>
        <span class="w-40 shrink-0 font-mono text-xs">
          {field.name}{#if field.required}<span class="text-[color:#e5484d]"> *</span>{/if}
        </span>
        <span class="flex-1 text-xs text-[color:var(--rvc-muted)]">{field.desc}</span>
      </SectionListRow>
    {/each}
    <SectionListRow>
      <pre class="w-full select-text overflow-auto whitespace-pre-wrap break-words rounded bg-[color:var(--rvc-search)] p-2 font-mono text-[11px]">{section.example}</pre>
    </SectionListRow>
  </SectionList>
{/each}
