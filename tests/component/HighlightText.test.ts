import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import HighlightText from '@/shared/components/HighlightText.svelte';

describe('HighlightText', () => {
  it('wraps the matched substring in <mark> (case-insensitive)', () => {
    const { container } = render(HighlightText, { props: { text: 'Public Orders', query: 'ord' } });
    const marks = container.querySelectorAll('mark.rvc-mark');
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe('Ord');
    expect(container.textContent).toBe('Public Orders');
  });

  it('highlights every occurrence', () => {
    const { container } = render(HighlightText, { props: { text: 'aXaXa', query: 'a' } });
    expect(container.querySelectorAll('mark.rvc-mark').length).toBe(3);
  });

  it('renders plain text when query is empty', () => {
    const { container } = render(HighlightText, { props: { text: 'schema', query: '' } });
    expect(container.querySelectorAll('mark').length).toBe(0);
    expect(container.textContent).toBe('schema');
  });
});
