// 一覧の行選択状態（Gmail 風の全選択/全解除・複数選択）。
// id 型はページ側で指定する（数値 id / スキーマ名など）。
// Svelte 5 の反応性を確実にするため、変更のたびに新しい Set を代入する。
export class RowSelection<Id = number> {
  selectedIds = $state<Set<Id>>(new Set());

  isSelected(id: Id): boolean {
    return this.selectedIds.has(id);
  }

  get count(): number {
    return this.selectedIds.size;
  }

  toggle(id: Id): void {
    const next = new Set(this.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds = next;
  }

  /** 表示中（filtered）の id 群に対して全選択/全解除する。 */
  setAll(ids: Id[], on: boolean): void {
    const next = new Set(this.selectedIds);
    for (const id of ids) {
      if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }
    this.selectedIds = next;
  }

  clear(): void {
    this.selectedIds = new Set();
  }

  /** 表示中の全 id が選択済みか。 */
  isAllSelected(ids: Id[]): boolean {
    return ids.length > 0 && ids.every((id) => this.selectedIds.has(id));
  }

  /** 一部だけ選択されている（indeterminate 用）か。 */
  isPartiallySelected(ids: Id[]): boolean {
    const selectedCount = ids.filter((id) => this.selectedIds.has(id)).length;
    return selectedCount > 0 && selectedCount < ids.length;
  }

  /** 現在の選択のうち、表示中の id に含まれるものだけを配列で返す。 */
  selectedWithin(ids: Id[]): Id[] {
    return ids.filter((id) => this.selectedIds.has(id));
  }
}
