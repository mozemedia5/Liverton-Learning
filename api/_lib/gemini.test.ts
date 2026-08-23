import { afterEach, describe, expect, it } from 'vitest';
import { getModelName } from './gemini';

describe('Hanna model selection', () => {
  const originalModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  });

  it('uses the supported default when no model override is configured', () => {
    delete process.env.GEMINI_MODEL;
    expect(getModelName()).toBe('gemini-3.6-flash');
  });

  it('ignores the known stale Gemini 2.5 override', () => {
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    expect(getModelName()).toBe('gemini-3.6-flash');
  });

  it('accepts the supported 3.6 model override', () => {
    process.env.GEMINI_MODEL = 'gemini-3.6-flash';
    expect(getModelName()).toBe('gemini-3.6-flash');
  });
});
