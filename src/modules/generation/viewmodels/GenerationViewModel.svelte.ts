import type {
  GenerationService,
  RouteConflict
} from '@/modules/generation/services/GenerationService';
import type { GenerationState } from '@/modules/generation/types/GenerationState';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';

export class GenerationViewModel {
  state: GenerationState = $state('idle');
  progress = $state(0);
  step = $state(1);
  // 選択されたスキーマ群（1件でも配列で扱う）。
  selectedSchemas: SchemaSummary[] = $state([]);
  // 実行中に処理中のスキーマ名。
  currentSchemaName = $state('');
  totalCount = $state(0);
  doneCount = $state(0);
  resultDetail = $state('');
  errorMessage = $state('');
  // 解決の手掛かり（Postgres の HINT）。compile 失敗時のみ設定。
  errorHint = $state('');
  // 失敗時に自動診断した method+path 衝突の一覧（UI で解決導線を示すため）。
  routeConflicts: RouteConflict[] = $state([]);

  /** 生成成功後に呼ばれる（AppShell がドキュメント再読込などに使う）。 */
  onCompiled: (() => void) | null = null;

  constructor(private readonly generationService: GenerationService) {}

  askGeneration(schemas: SchemaSummary[]): void {
    if (schemas.length === 0) return;
    this.selectedSchemas = schemas;
    this.totalCount = schemas.length;
    this.doneCount = 0;
    this.currentSchemaName = schemas.length === 1 ? schemas[0].name : '';
    this.progress = 0;
    this.step = 1;
    this.resultDetail = '';
    this.errorMessage = '';
    this.errorHint = '';
    this.routeConflicts = [];
    this.state = 'confirm';
  }

  async runGeneration(): Promise<void> {
    const schemas = this.selectedSchemas;
    if (schemas.length === 0) return;

    // 「続行(実行)」で rv_meta.compile(schema) を順に実行する。
    // 進捗率は完了スキーマ数 / 総数で表す。
    this.state = 'running';
    this.step = 4;
    this.doneCount = 0;
    this.progress = 0;
    let totalOperations = 0;

    for (let index = 0; index < schemas.length; index += 1) {
      this.currentSchemaName = schemas[index].name;
      const result = await this.generationService.compile(schemas[index].name);
      if (!result.success) {
        this.errorMessage = result.error.message;
        this.errorHint = result.error.hint ?? '';
        this.state = 'error';
        // 失敗スキーマの method+path 衝突を自動診断し、function_only での解決導線を示す。
        // 診断自体の失敗は無視（本来のエラー表示を優先する）。
        const diagnosis = await this.generationService.diagnoseRouteConflicts(schemas[index].name);
        this.routeConflicts = diagnosis.success ? diagnosis.data : [];
        return;
      }
      totalOperations += result.data.operationCount;
      this.doneCount = index + 1;
      this.progress = Math.round((this.doneCount / this.totalCount) * 100);
    }

    this.resultDetail = `${this.totalCount} documents / ${totalOperations} operations`;
    this.state = 'done';
    this.onCompiled?.();
  }

  closeGeneration(): void {
    this.state = 'idle';
    this.progress = 0;
    this.step = 1;
    this.selectedSchemas = [];
    this.currentSchemaName = '';
    this.totalCount = 0;
    this.doneCount = 0;
    this.resultDetail = '';
    this.errorMessage = '';
    this.errorHint = '';
    this.routeConflicts = [];
  }
}
