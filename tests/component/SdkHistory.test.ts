import { describe, expect, it, beforeEach } from 'vitest';
import { SdkHistory, type SdkRecord } from '@/modules/sdk/services/SdkHistory';

/**
 * SDK は工程の最後の成果物。生成物そのものはファイルシステム上にあるので、
 * 一覧に必要なのは「何をどの契約面から出したか」の記録だけ。
 */
const record = (over: Partial<SdkRecord> = {}): SdkRecord => ({
  packageName: '@robovill/intake-client',
  schemaName: 'rv_intake',
  profile: 'bff',
  generatorId: 'openapi-generator-cli',
  outputDirectory: '/tmp/out',
  fileCount: 38,
  generatedAt: '2026-08-09T00:00:00Z',
  ...over
});

describe('SdkHistory', () => {
  beforeEach(() => localStorage.clear());

  it('由来（スキーマと契約面）ごと残す', () => {
    // 同じスキーマでも契約面が違えば別物。名前だけでは区別できない。
    const history = new SdkHistory();
    const saved = history.record(record())[0];
    expect(saved.schemaName).toBe('rv_intake');
    expect(saved.profile).toBe('bff');
  });

  it('同じパッケージ名は最新で置き換える（作り直しが行として増えない）', () => {
    const history = new SdkHistory();
    history.record(record({ fileCount: 10 }));
    const list = history.record(record({ fileCount: 42 }));
    expect(list).toHaveLength(1);
    expect(list[0].fileCount).toBe(42);
  });

  it('契約面が違えば別の行として並ぶ', () => {
    const history = new SdkHistory();
    history.record(record());
    const list = history.record(record({ packageName: '@robovill/intake-internal', profile: 'postgrest' }));
    expect(list.map((r) => r.profile).sort()).toEqual(['bff', 'postgrest']);
  });

  it('壊れた記録でも一覧は開く', () => {
    // 記録の破損で工程が止まるほうが困る。
    localStorage.setItem('rvc.sdk.history', '{ broken');
    expect(new SdkHistory().list()).toEqual([]);
  });

  it('忘れさせられる', () => {
    const history = new SdkHistory();
    history.record(record());
    expect(history.remove('@robovill/intake-client')).toEqual([]);
  });
});
