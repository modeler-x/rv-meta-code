import { ok, fail, type Result } from '@/shared/result/Result';
import { invokeTauri } from '@/shared/ipc/invokeTauri';

export type CompileResult = {
  schemaName: string;
  documentId: number | null;
  operationCount: number;
};

/** Entity 自動 CRUD と @openapi 関数の method+path 衝突の1件（診断結果）。 */
export type RouteConflict = {
  method: string;
  path: string;
  functionName: string;
  entityTable: string;
  entityResource: string;
  recommendation: string;
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
      const shape = error as { code?: string; message?: string; hint?: string } | null;
      return fail<CompileResult>(
        shape && typeof shape.code === 'string' ? shape.code : 'COMPILE_ERROR',
        shape && typeof shape.message === 'string' ? shape.message : String(error),
        shape && typeof shape.hint === 'string' ? shape.hint : undefined
      );
    }
  }

  /**
   * Entity 自動 CRUD と @openapi 関数の method+path 衝突を列挙する（副作用なし）。
   * compile 失敗時に「どのルートが衝突しているか」を提示するために使う。
   */
  async diagnoseRouteConflicts(schemaName: string): Promise<Result<RouteConflict[]>> {
    try {
      const result = await invokeTauri<RouteConflict[]>('diagnose_route_conflicts', {
        schemaName
      });
      return ok(result);
    } catch (error) {
      const shape = error as { code?: string; message?: string } | null;
      return fail<RouteConflict[]>(
        shape && typeof shape.code === 'string' ? shape.code : 'DIAGNOSE_ERROR',
        shape && typeof shape.message === 'string' ? shape.message : String(error)
      );
    }
  }
}
