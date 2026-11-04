import { describe, expect, it } from 'vitest';
import { contrastRatio, themes } from '../src/index.js';

describe.each(Object.entries(themes))('%s theme meets WCAG AA', (_name, t) => {
  it.each([
    ['text on bg', t.text, t.bg, 4.5],
    ['text on surface', t.text, t.surface, 4.5],
    ['muted on bg', t.textMuted, t.bg, 4.5],
    ['onPrimary on primary', t.onPrimary, t.primary, 4.5],
    ['link on bg', t.link, t.bg, 4.5],
    ['danger on bg', t.danger, t.bg, 4.5],
    ['focus ring on bg', t.focus, t.bg, 3],
  ])('%s', (_label, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
