import type { ManifestService } from '@/modules/manifest/services/ManifestService';
import type {
  ManifestCoverage,
  ManifestDiagnostic,
  StoredManifest
} from '@/modules/manifest/types/Manifest';

/** カタログ行に出す、スキーマ 1 件分の宣言の埋まり具合。 */
export type CoverageCounts = { declared: number; undeclared: number; orphaned: number };

export type ManifestViewModelState = {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  schemaName: string | null;
  stored: StoredManifest | null;
  coverage: ManifestCoverage[];
  diagnostics: ManifestDiagnostic[];
  /** 未保存の下書き。null なら stored と同じ。 */
  draft: unknown | null;
  /** カタログ用。スキーマ名 → 件数。 */
  coverageBySchema: Record<string, CoverageCounts>;
};

export class ManifestViewModel {
  state: ManifestViewModelState = $state({
    isLoading: false,
    isSaving: false,
    errorMessage: null,
    schemaName: null,
    stored: null,
    coverage: [],
    diagnostics: [],
    draft: null,
    coverageBySchema: {}
  });

  constructor(private readonly manifestService: ManifestService) {}

  get blockingCount(): number {
    return this.state.diagnostics.filter((d) => d.severity === 'error').length;
  }

  get undeclaredCount(): number {
    return this.state.coverage.filter((c) => c.state === 'undeclared').length;
  }

  get orphanedCount(): number {
    return this.state.coverage.filter((c) => c.state === 'orphaned').length;
  }

  /**
   * カタログ行に出す件数をまとめて引く。
   * 1 件失敗しても他は出す。一覧が丸ごと空になるより、引けた分を見せるほうが役に立つ。
   */
  async loadCoverageFor(schemaNames: string[]): Promise<void> {
    const next: Record<string, CoverageCounts> = {};
    for (const name of schemaNames) {
      const result = await this.manifestService.loadCoverage(name);
      if (!result.success) continue;
      const counts: CoverageCounts = { declared: 0, undeclared: 0, orphaned: 0 };
      for (const row of result.data) counts[row.state] += 1;
      next[name] = counts;
    }
    this.state.coverageBySchema = next;
  }

  /** 選択したスキーマの骨子をまとめて起こす。保存はしないので件数だけ引き直す。 */
  async draftMany(schemaNames: string[]): Promise<void> {
    for (const name of schemaNames) {
      await this.manifestService.draftManifest(name);
    }
    await this.loadCoverageFor(schemaNames);
  }

  async load(schemaName: string): Promise<void> {
    this.state.isLoading = true;
    this.state.errorMessage = null;
    this.state.schemaName = schemaName;

    const [stored, coverage, diagnostics] = await Promise.all([
      this.manifestService.loadManifest(schemaName),
      this.manifestService.loadCoverage(schemaName),
      this.manifestService.loadDiagnostics(schemaName)
    ]);

    // manifest が未登録でも coverage は引ける。診断だけが失敗しても
    // 「何が宣言されているか」は見せたいので、それぞれ独立に扱う。
    if (stored.success) this.state.stored = stored.data;
    else this.state.errorMessage = stored.error.message;

    this.state.coverage = coverage.success ? coverage.data : [];
    this.state.diagnostics = diagnostics.success ? diagnostics.data : [];
    this.state.draft = null;
    this.state.isLoading = false;
  }

  /**
   * 骨子を作る。保存はしないので、結果は下書きとして持つだけ。
   * 推測した security（要認証）や tags を、人が確認してから保存する。
   */
  async draft(): Promise<void> {
    const schemaName = this.state.schemaName;
    if (!schemaName) return;
    this.state.isLoading = true;
    const result = await this.manifestService.draftManifest(schemaName);
    if (result.success) this.state.draft = result.data;
    else this.state.errorMessage = result.error.message;
    this.state.isLoading = false;
  }

  /** 検証に落ちたら保存されない。診断を引き直して原因を出す。 */
  async save(): Promise<boolean> {
    const schemaName = this.state.schemaName;
    const manifest = this.state.draft ?? this.state.stored?.manifest;
    if (!schemaName || manifest == null) return false;

    this.state.isSaving = true;
    this.state.errorMessage = null;
    const result = await this.manifestService.saveManifest(schemaName, manifest);
    this.state.isSaving = false;

    if (!result.success) {
      this.state.errorMessage = result.error.message;
      const diagnostics = await this.manifestService.loadDiagnostics(schemaName);
      if (diagnostics.success) this.state.diagnostics = diagnostics.data;
      return false;
    }
    await this.load(schemaName);
    return true;
  }
}
