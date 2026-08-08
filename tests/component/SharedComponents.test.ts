import { render, fireEvent, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, afterEach } from 'vitest';
import ListRow from '@/shared/components/ListRow.svelte';
import FieldGrid from '@/shared/components/FieldGrid.svelte';
import DiagnosticList from '@/shared/components/DiagnosticList.svelte';
import type { FieldSpec } from '@/shared/components/Field.svelte';
import type { ManifestDiagnostic } from '@/modules/manifest/types/Manifest';

/**
 * 一覧の行・編集フォーム・診断は 3 画面で同じ部品を使う。
 * 契約をここで 1 度だけ確かめ、ページ側は「何を並べるか」だけをテストする。
 * 同じことを画面ごとに書くと、同じ事実を 3 回確かめることになる。
 */
afterEach(cleanup);

function testids(root: ParentNode, testid: string, extra = ''): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-testid="${testid}"]${extra}`));
}

describe('ListRow', () => {
  const base = {
    testid: 'row',
    data: { 'data-key': 'k1' },
    title: 'alpha',
    subtitle: 'beta',
    badges: [{ testid: 'state', label: 'ok', tone: 'success' as const, data: { 'data-state': 'present' } }]
  };

  it('行と選択欄とバッジを、値で引ける形で出す', () => {
    const { container } = render(ListRow, { props: { ...base, selected: false, onToggle: () => {} } });

    const row = testids(container, 'row', '[data-key="k1"]')[0];
    expect(row).toBeTruthy();
    // 選択欄の testid は行の testid から導く。画面ごとに命名を決めない。
    expect(testids(row, 'row-select')).toHaveLength(1);
    expect(testids(row, 'state', '[data-state="present"]')).toHaveLength(1);
    expect(row.textContent).toContain('alpha');
    expect(row.textContent).toContain('beta');
  });

  it('選択機構を使わない一覧では選択欄を出さない', () => {
    const { container } = render(ListRow, { props: base });
    expect(testids(container, 'row-select')).toHaveLength(0);
  });

  it('本体は onOpen、無ければ onToggle を呼ぶ', async () => {
    const calls: string[] = [];
    const { container } = render(ListRow, {
      props: { ...base, onToggle: () => calls.push('toggle'), onOpen: () => calls.push('open') }
    });
    await fireEvent.click(container.querySelectorAll('button')[0]);
    expect(calls).toEqual(['open']);
  });

  it('操作ボタンは指定したときだけ出て、独自の testid を持つ', async () => {
    const calls: string[] = [];
    const { container } = render(ListRow, {
      props: { ...base, action: { testid: 'open-x', label: '開く', onClick: () => calls.push('action') } }
    });
    await fireEvent.click(testids(container, 'open-x')[0]);
    expect(calls).toEqual(['action']);
  });

  it('検索語の一致を強調する', () => {
    const { container } = render(ListRow, { props: { ...base, query: 'lph' } });
    expect(container.querySelectorAll('mark').length).toBeGreaterThan(0);
  });
});

describe('FieldGrid / Field', () => {
  const fields: FieldSpec[] = [
    { name: 'a', kind: 'text', value: 'one' },
    { name: 'b', kind: 'select', value: 'x', options: [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }] },
    { name: 'c', kind: 'textarea', value: 'body' },
    { name: 'd', kind: 'text', value: '', suggestions: ['s1', 's2'] }
  ];

  it('宣言した項目だけを、名前で引ける形で並べる', () => {
    const { container } = render(FieldGrid, { props: { fields, onInput: () => {} } });
    expect(testids(container, 'field')).toHaveLength(fields.length);
    for (const spec of fields) {
      expect(testids(container, 'field', `[data-field="${spec.name}"]`)).toHaveLength(1);
    }
  });

  it('集まりを分ける data-* を各項目へ配る', () => {
    // profile ごとなど、同じ項目名が同じ画面に複数あるときに区別する。
    const { container } = render(FieldGrid, {
      props: { fields, testid: 'profile-field', data: { 'data-profile': 'bff' }, onInput: () => {} }
    });
    expect(testids(container, 'profile-field', '[data-profile="bff"]')).toHaveLength(fields.length);
  });

  it('種別ごとに対応する要素を出す', () => {
    const { container } = render(FieldGrid, { props: { fields, onInput: () => {} } });
    expect(testids(container, 'field', '[data-field="b"]')[0].tagName).toBe('SELECT');
    expect(testids(container, 'field', '[data-field="c"]')[0].tagName).toBe('TEXTAREA');
    // 入力候補があるときだけ datalist を結ぶ。打ち直しを減らすための仕掛け。
    expect(testids(container, 'field', '[data-field="d"]')[0].getAttribute('list')).toBe('rvc-list-d');
    expect(testids(container, 'field', '[data-field="a"]')[0].getAttribute('list')).toBeNull();
  });

  it('変更を項目名つきで返す', async () => {
    const changes: [string, string][] = [];
    const { container } = render(FieldGrid, {
      props: { fields, onInput: (name: string, value: string) => changes.push([name, value]) }
    });

    await fireEvent.input(testids(container, 'field', '[data-field="a"]')[0], { target: { value: 'two' } });
    await fireEvent.change(testids(container, 'field', '[data-field="b"]')[0], { target: { value: 'y' } });
    await tick();

    expect(changes).toEqual([['a', 'two'], ['b', 'y']]);
  });

  it('空文字もそのまま返す（未指定として扱うのは呼び出し側）', async () => {
    // ここで握り潰すと、既定の推論へ戻す操作ができなくなる。
    const changes: string[] = [];
    const { container } = render(FieldGrid, {
      props: { fields, onInput: (_name: string, value: string) => changes.push(value) }
    });
    await fireEvent.input(testids(container, 'field', '[data-field="a"]')[0], { target: { value: '' } });
    expect(changes).toEqual(['']);
  });
});

describe('DiagnosticList', () => {
  const diagnostics: ManifestDiagnostic[] = [
    {
      severity: 'error',
      location: 'operations."f(a text)".publicRoutes[0].bind.a',
      code: 'bind_missing_argument',
      message: 'msg',
      hint: 'hint'
    },
    { severity: 'warning', location: 'profiles.bff.basePath', code: 'base_path_invalid', message: 'msg', hint: null },
    { severity: 'info', location: 'operations."g()"', code: 'function_not_declared', message: 'msg', hint: null }
  ];

  it('全件を出し、severity を色だけでなくラベルでも示す', () => {
    // 最初の 1 件で止めないのが manifest 方式の利点。色だけでは伝わらない。
    const { container } = render(DiagnosticList, { props: { diagnostics } });
    expect(testids(container, 'diagnostic')).toHaveLength(3);
    for (const severity of ['error', 'warning', 'info']) {
      expect(testids(container, 'diagnostic-severity', `[data-severity="${severity}"]`)).toHaveLength(1);
    }
  });

  it('関数を指す指摘にだけ移動の導線を出す', async () => {
    // profiles の指摘には飛び先の operation が無い。
    const opened: string[] = [];
    const { container } = render(DiagnosticList, {
      props: { diagnostics, onOpen: (key: string) => opened.push(key) }
    });
    expect(testids(container, 'diagnostic-jump')).toHaveLength(2);

    await fireEvent.click(testids(container, 'diagnostic-jump')[0]);
    expect(opened).toEqual(['f(a text)']);
  });

  it('onOpen を渡さなければ導線は出ない', () => {
    const { container } = render(DiagnosticList, { props: { diagnostics } });
    expect(testids(container, 'diagnostic-jump')).toHaveLength(0);
  });

  it('違反が無ければその旨を出す', () => {
    const { container } = render(DiagnosticList, { props: { diagnostics: [] } });
    expect(testids(container, 'diagnostic')).toHaveLength(0);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });
});
