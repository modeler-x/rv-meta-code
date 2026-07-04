import type { GenerationService } from '@/modules/generation/services/GenerationService';
import type { GenerationState } from '@/modules/generation/types/GenerationState';
import type { SchemaSummary } from '@/modules/schema/types/SchemaSummary';

const STEP_COUNT = 5;
const STEP_INTERVAL_MS = 650;

export class GenerationViewModel {
  state: GenerationState = $state('idle');
  progress = $state(0);
  step = $state(1);
  selectedSchema: SchemaSummary | null = $state(null);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly generationService: GenerationService) {}

  askGeneration(schema: SchemaSummary): void {
    this.clearTimer();
    this.selectedSchema = schema;
    this.progress = 0;
    this.step = 1;
    this.state = 'confirm';
  }

  runGeneration(): void {
    if (!this.selectedSchema) return;
    const schema = this.selectedSchema;
    const isEmpty = this.generationService.decideGenerationResult(schema.tableCount, schema.viewCount) === 'error';
    this.clearTimer();
    this.state = 'running';
    this.step = 1;
    this.progress = 8;
    this.timer = setInterval(() => {
      const nextStep = this.step + 1;
      if (isEmpty && nextStep >= 2) {
        this.clearTimer();
        this.step = 2;
        this.progress = 40;
        this.state = 'error';
        return;
      }
      if (nextStep > STEP_COUNT) {
        this.clearTimer();
        this.step = STEP_COUNT;
        this.progress = 100;
        this.state = 'done';
        return;
      }
      this.step = nextStep;
      this.progress = Math.round((nextStep / STEP_COUNT) * 100);
    }, STEP_INTERVAL_MS);
  }

  closeGeneration(): void {
    this.clearTimer();
    this.state = 'idle';
    this.progress = 0;
    this.step = 1;
    this.selectedSchema = null;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
