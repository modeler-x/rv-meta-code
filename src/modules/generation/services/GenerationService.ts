import type { GenerationState } from '@/modules/generation/types/GenerationState';

export class GenerationService {
  decideGenerationResult(tableCount: number, viewCount: number): GenerationState {
    return tableCount + viewCount === 0 ? 'error' : 'done';
  }
}
