import { describe, expect, it } from 'vitest';
import { sanitizeHannaDisplayText } from './HannaMarkdown';

describe('Hanna display sanitation', () => {
  it('removes decorative symbol runs without removing normal prose', () => {
    const result = sanitizeHannaDisplayText('A useful answer ##$$**##$¥¥\\}{{{}\\%\nKeep this sentence.');
    expect(result).toContain('A useful answer');
    expect(result).toContain('Keep this sentence.');
    expect(result).not.toMatch(/##|\$\$|\*\*##|¥¥|\\}|\{\{|\\%/);
  });

  it('preserves Markdown headings, bold text, inline math, and fenced code', () => {
    const source = '# Heading\n**Important**\n$E = mc^2$\n```ts\nconst value = 1;\n```';
    expect(sanitizeHannaDisplayText(source)).toBe(source);
  });

  it('preserves table pipes and removes only malformed decoration', () => {
    const source = '| Name | Score |\n| --- | --- |\n| Amina | 90 |\n\n##$';
    const result = sanitizeHannaDisplayText(source);
    expect(result).toContain('| Name | Score |');
    expect(result).toContain('| Amina | 90 |');
    expect(result).not.toContain('##$');
  });
});
