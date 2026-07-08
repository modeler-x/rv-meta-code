import type { GenerationService } from '@/modules/generation/services/GenerationService';
import type { GenerationState } from '@/modules/generation/types/GenerationState';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';

export class GenerationViewModel {
  state: GenerationState = $state('idle');
  progress = $state(0);
  step = $state(1);
  selectedSchema: SchemaSummary | null = $state(null);
  resultDetail = $state('');
  errorMessage = $state('');

  /** 生成成功後に呼ばれる（AppShell がドキュメント再読込などに使う）。 */
  onCompiled: (() => void) | null = null;

  constructor(private readonly generationService: GenerationService) {}

  askGeneration(schema: SchemaSummary): void {
    this.selectedSchema = schema;
    this.progress = 0;
    this.step = 1;
    this.resultDetail = '';
    this.errorMessage = '';
    this.state = 'confirm';
  }

  async runGeneration(): Promise<void> {
    if (!this.selectedSchema) return;
    const schema = this.selectedSchema;

    // 「続行(実行)」で rv_meta.compile(schema) を実際に実行する。
    this.state = 'running';
    this.step = 4;
    this.progress = 30;

    const result = await this.generationService.compile(schema.name);

    if (result.success) {
      this.progress = 100;
      this.resultDetail = `${result.data.operationCount} operations`;
      this.state = 'done';
      this.onCompiled?.();
    } else {
      this.errorMessage = result.error.message;
      this.state = 'error';
    }
  }

  closeGeneration(): void {
    this.state = 'idle';
    this.progress = 0;
    this.step = 1;
    this.selectedSchema = null;
    this.resultDetail = '';
    this.errorMessage = '';
  }
}
