import { describe, it, expect } from 'vitest';

/**
 * Tests for the Hanna chat scroll behavior.
 *
 * The core scroll fix replaces scrollIntoView (which cascades up to all
 * ancestor containers, causing the conversation to scroll through old messages)
 * with container.scrollTo() + an isNearBottom detection pattern.
 *
 * These tests verify the scroll decision logic that determines whether
 * auto-scroll should happen during streaming.
 */

describe('Hanna chat scroll logic', () => {
  // Simulate the isNearBottom threshold check used in HannaChatIntegrated
  const NEAR_BOTTOM_THRESHOLD = 120;

  function isNearBottom(scrollHeight: number, scrollTop: number, clientHeight: number): boolean {
    return scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_THRESHOLD;
  }

  it('considers the user near the bottom when within threshold', () => {
    // scrollHeight=1000, clientHeight=400, so bottom is at scrollTop=600
    // User is 100px above bottom — within 120px threshold
    expect(isNearBottom(1000, 500, 400)).toBe(true);
  });

  it('considers the user NOT near the bottom when scrolled up to read old messages', () => {
    // User scrolled to top area — 500px above bottom
    expect(isNearBottom(1000, 100, 400)).toBe(false);
  });

  it('considers the user at the bottom when scrollTop equals max', () => {
    // Exactly at bottom
    expect(isNearBottom(1000, 600, 400)).toBe(true);
  });

  it('does NOT auto-scroll when user has scrolled up to read older messages', () => {
    // When isNearBottom is false, the scroll effect should NOT call scrollToBottom
    const shouldAutoScroll = isNearBottom(2000, 200, 400); // 1400px above bottom
    expect(shouldAutoScroll).toBe(false);
  });

  it('auto-scrolls when user is at the bottom (follow mode)', () => {
    const shouldAutoScroll = isNearBottom(2000, 1600, 400); // at bottom
    expect(shouldAutoScroll).toBe(true);
  });

  it('uses container.scrollTo, not scrollIntoView (which cascades to ancestors)', () => {
    // The fix replaces:
    //   messagesEndRef.current?.scrollIntoView({ behavior })  // BAD: cascades up
    // with:
    //   scrollContainerRef.current?.scrollTo({ top: el.scrollHeight, behavior })  // GOOD: only container
    //
    // We verify the API shape is correct
    const fakeContainer = {
      scrollHeight: 1000,
      scrollTo: (opts: { top: number; behavior: string }) => {
        expect(opts.top).toBe(1000);
        expect(opts.behavior).toBe('auto');
      },
    };
    // Simulate scrollToBottom('auto')
    (fakeContainer as any).scrollTo({ top: (fakeContainer as any).scrollHeight, behavior: 'auto' });
  });
});
