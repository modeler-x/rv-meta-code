/**
 * 生成した SDK の記録。
 *
 * SDK は成果物なので、他の工程と同じく一覧で確認・作り直しができる必要がある。
 * ただし生成物そのものはファイルシステム上にあり、DB には残らない。
 * 何をどの契約面から出したかだけをブラウザ側へ残し、一覧の材料にする。
 *
 * 由来（schema と profile）を必ず持たせるのは、profile が「どの API 面か」を表し、
 * 同じスキーマから別物の SDK が出るため。名前だけでは区別できない。
 */
export type SdkRecord = {
  /** パッケージ名。人が決めるので profile からは導かない。 */
  packageName: string;
  schemaName: string;
  profile: string;
  generatorId: string;
  outputDirectory: string;
  fileCount: number;
  /** ISO8601(UTC)。 */
  generatedAt: string;
};

const STORAGE_KEY = 'rvc.sdk.history';
const LIMIT = 50;

export interface ISdkHistory {
  list(): SdkRecord[];
  record(entry: SdkRecord): SdkRecord[];
  remove(packageName: string): SdkRecord[];
}

export class SdkHistory implements ISdkHistory {
  list(): SdkRecord[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SdkRecord[]) : [];
    } catch {
      // 壊れた記録で一覧が開かなくなるほうが困る。空として扱う。
      return [];
    }
  }

  /** 同じパッケージ名は最新で置き換える。作り直しが行として増えない。 */
  record(entry: SdkRecord): SdkRecord[] {
    const next = [entry, ...this.list().filter((item) => item.packageName !== entry.packageName)];
    return this.save(next.slice(0, LIMIT));
  }

  remove(packageName: string): SdkRecord[] {
    return this.save(this.list().filter((item) => item.packageName !== packageName));
  }

  private save(records: SdkRecord[]): SdkRecord[] {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      }
    } catch {
      // 保存に失敗しても、この実行の一覧は返す。
    }
    return records;
  }
}
