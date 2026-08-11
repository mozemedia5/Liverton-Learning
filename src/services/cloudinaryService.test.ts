import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  uploadToCloudinary,
  optimizeCloudinaryUrl,
  mapFileToCloudinaryType,
} from './cloudinaryService';

/* ------------------------------------------------------------------ */
/* mapFileToCloudinaryType                                             */
/* ------------------------------------------------------------------ */

describe('mapFileToCloudinaryType', () => {
  const makeFile = (type: string, name: string, size = 1024): File =>
    new File([new Uint8Array(size)], name, { type });

  it('maps images to the images classification', () => {
    expect(mapFileToCloudinaryType(makeFile('image/png', 'logo.png'))).toBe('image');
  });

  it('maps audio to the audio classification', () => {
    expect(mapFileToCloudinaryType(makeFile('audio/mpeg', 'note.mp3'))).toBe('audio');
  });

  it('maps small videos to shorts and large videos to courses', () => {
    expect(mapFileToCloudinaryType(makeFile('video/mp4', 'clip.mp4', 5 * 1024 * 1024))).toBe('short_video');
    expect(mapFileToCloudinaryType(makeFile('video/mp4', 'lecture.mp4', 25 * 1024 * 1024))).toBe('course_video');
  });

  it('forces small videos to courses preset if isChat flag is true', () => {
    expect(mapFileToCloudinaryType(makeFile('video/mp4', 'clip.mp4', 5 * 1024 * 1024), 'clip.mp4', true)).toBe('course_video');
  });

  it('maps office documents and archives to documents', () => {
    for (const name of ['a.pdf', 'b.docx', 'c.xlsx', 'd.pptx', 'e.zip', 'f.txt']) {
      expect(mapFileToCloudinaryType(makeFile('application/octet-stream', name))).toBe('document');
    }
  });

  it('falls back to documents for unknown types', () => {
    expect(mapFileToCloudinaryType(makeFile('', 'mystery.bin'))).toBe('document');
  });
});

/* ------------------------------------------------------------------ */
/* optimizeCloudinaryUrl                                               */
/* ------------------------------------------------------------------ */

describe('optimizeCloudinaryUrl', () => {
  const base = 'https://res.cloudinary.com/fbciycdw/image/upload/v1700000000/liverton-learning/images/abc.jpg';

  it('injects delivery transformations after /upload/', () => {
    const out = optimizeCloudinaryUrl(base, { width: 800, crop: 'fill', gravity: 'auto' });
    expect(out).toBe(
      'https://res.cloudinary.com/fbciycdw/image/upload/f_auto,q_auto,c_fill,g_auto,w_800/v1700000000/liverton-learning/images/abc.jpg'
    );
  });

  it('includes height and dpr when provided', () => {
    const out = optimizeCloudinaryUrl(base, { width: 400, height: 200, dpr: 2 });
    expect(out).toContain('w_400');
    expect(out).toContain('h_200');
    expect(out).toContain('dpr_2');
  });

  it('returns non-Cloudinary URLs unchanged', () => {
    const other = 'https://example.com/pic.jpg';
    expect(optimizeCloudinaryUrl(other, { width: 100 })).toBe(other);
  });

  it('returns empty/blank input unchanged', () => {
    expect(optimizeCloudinaryUrl('', { width: 100 })).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/* uploadToCloudinary (mocked XHR)                                     */
/* ------------------------------------------------------------------ */

class MockXHR {
  public open = vi.fn();
  public send = vi.fn();
  public timeout = 0;
  public status = 200;
  public responseText = '';
  public upload = { addEventListener: vi.fn() };
  private listeners: Record<string, () => void> = {};

  addEventListener(event: string, cb: () => void) {
    this.listeners[event] = cb;
  }

  trigger(event: string) {
    this.listeners[event]?.();
  }
}

let lastXHR: MockXHR;

beforeEach(() => {
  lastXHR = new MockXHR();
  // Plain function (not arrow) so it can be invoked with `new`
  vi.stubGlobal('XMLHttpRequest', function () {
    return lastXHR;
  });
});

describe('uploadToCloudinary', () => {
  it('resolves with the secure_url on success', async () => {
    lastXHR.responseText = JSON.stringify({ secure_url: 'https://res.cloudinary.com/x/image/upload/v1/ok.jpg' });
    lastXHR.status = 200;

    const promise = uploadToCloudinary(new File(['a'], 'a.png', { type: 'image/png' }), 'image');
    lastXHR.trigger('load');

    await expect(promise).resolves.toBe('https://res.cloudinary.com/x/image/upload/v1/ok.jpg');
    expect(lastXHR.open).toHaveBeenCalledWith('POST', expect.stringContaining('/image/upload'));
  });

  it('reports progress through the callback', async () => {
    lastXHR.responseText = JSON.stringify({ secure_url: 'https://res.cloudinary.com/x/ok.jpg' });
    const progresses: number[] = [];

    const promise = uploadToCloudinary(new File(['a'], 'a.png', { type: 'image/png' }), 'image', {
      showErrorToast: false,
      onProgress: (p) => progresses.push(p),
    });

    // simulate a progress event then completion
    const progressCb = lastXHR.upload.addEventListener.mock.calls[0]?.[1] as (e: ProgressEvent) => void;
    progressCb({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);
    lastXHR.trigger('load');

    await promise;
    expect(progresses).toEqual([50, 100]);
  });

  it('rejects with a readable message on HTTP error', async () => {
    lastXHR.status = 400;
    lastXHR.responseText = JSON.stringify({ error: { message: 'Upload preset not found' } });

    const promise = uploadToCloudinary(new File(['a'], 'a.png', { type: 'image/png' }), 'image', { showErrorToast: false });
    lastXHR.trigger('load');

    await expect(promise).rejects.toThrow('Upload preset not found');
  });

  it('rejects on network failure', async () => {
    const promise = uploadToCloudinary(new File(['a'], 'a.png', { type: 'image/png' }), 'image', { showErrorToast: false });
    lastXHR.trigger('error');

    await expect(promise).rejects.toThrow('Network error occurred during upload');
  });

  it('uses the video resource endpoint for audio uploads', async () => {
    lastXHR.responseText = JSON.stringify({ secure_url: 'https://res.cloudinary.com/x/a.mp3' });

    const promise = uploadToCloudinary(new File(['a'], 'a.mp3', { type: 'audio/mpeg' }), 'audio');
    lastXHR.trigger('load');

    await promise;
    expect(lastXHR.open).toHaveBeenCalledWith('POST', expect.stringContaining('/video/upload'));
  });
});
