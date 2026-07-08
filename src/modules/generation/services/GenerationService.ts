import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';

export type CompileResult = {
  schemaName: string;
  documentId: number | null;
  operationCount: number;
};

export class GenerationService {
  /**
   * 現在接続中DBで rv_meta.compile(schema) を実行し、
   * 生成後のドキュメントID・オペレーション総数を返す。
   */
  async compile(schemaName: string): Promise<Result<CompileResult>> {
    try {
      const result = await invokeTauri<CompileResult>('compile_schema', {
        request: { schemaName }
      });
      return ok(result);
    } catch (error) {
      const shape = error as { message?: string } | null;
      return fail<CompileResult>(
        'COMPILE_ERROR',
        shape && typeof shape.message === 'string' ? shape.message : String(error)
      );
    }
  }
}
