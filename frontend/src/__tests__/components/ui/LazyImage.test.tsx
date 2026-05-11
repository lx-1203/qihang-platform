import { render, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import LazyImage from '../../../components/ui/LazyImage';

// ====== IntersectionObserver Mock ======
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

let intersectionCallback: IntersectionObserverCallback | null = null;

function createMockIntersectionObserver(
  callback: IntersectionObserverCallback,
): IntersectionObserver {
  intersectionCallback = callback;
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: () => [],
  };
}

// ====== 图片事件模拟工具 ======
/** 找到实际渲染图片的 <img> 元素（排除骨架屏内 placeholder img） */
function findLoadedImg(): HTMLImageElement | null {
  const imgs = document.querySelectorAll('img');
  for (let i = imgs.length - 1; i >= 0; i--) {
    const img = imgs[i] as HTMLImageElement;
    if (!img.classList.contains('opacity-40')) return img;
  }
  return null;
}

/** 触发图片 onload 事件 */
function triggerImgLoad(img: HTMLImageElement) {
  const event = new Event('load', { bubbles: false, cancelable: false });
  Object.defineProperty(event, 'target', { value: img, enumerable: true });
  Object.defineProperty(event, 'currentTarget', { value: img, enumerable: true });
  img.dispatchEvent(event);
}

/** 触发图片 onerror 事件 */
function triggerImgError(img: HTMLImageElement) {
  const event = new Event('error', { bubbles: false, cancelable: false });
  Object.defineProperty(event, 'target', { value: img, enumerable: true });
  Object.defineProperty(event, 'currentTarget', { value: img, enumerable: true });
  img.dispatchEvent(event);
}

/** 模拟元素进入视口 */
function triggerIntersection() {
  if (!intersectionCallback) return;
  const firstImg = document.querySelector('img');
  if (!firstImg) return;
  const entries = [
    {
      isIntersecting: true,
      target: firstImg,
      intersectionRatio: 1,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    },
  ];
  intersectionCallback(entries as unknown as IntersectionObserverEntry[], {} as IntersectionObserver);
}

// ====== 辅助函数：触发完整加载流程 ======
/** 进入视口 → 图片加载成功 */
function loadImageSuccessfully() {
  act(() => {
    triggerIntersection();
  });
  const img = findLoadedImg();
  if (img) {
    act(() => {
      triggerImgLoad(img);
    });
  }
}

/** 进入视口 → 两次 error（用完 MAX_RETRY=1 重试）→ 最终进入 error 状态 */
function exhaustRetries() {
  vi.useFakeTimers();
  act(() => {
    triggerIntersection();
  });
  // 第一次 error
  let img = findLoadedImg();
  if (img) {
    act(() => {
      triggerImgError(img);
    });
  }
  // 快进 3 秒，等待重试
  act(() => {
    vi.advanceTimersByTime(3100);
  });
  // 第二次 error（重试后再次失败）
  img = findLoadedImg();
  if (img) {
    act(() => {
      triggerImgError(img);
    });
  }
  vi.useRealTimers();
}

// ====== Test Suite ======
describe('LazyImage', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', createMockIntersectionObserver);
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    mockDisconnect.mockClear();
    intersectionCallback = null;
    vi.stubEnv('VITE_CDN_URL', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // ========== 1. 正常渲染 ==========
  describe('normal rendering', () => {
    it('renders a container with overflow-hidden and relative classes', () => {
      const { container } = render(<LazyImage src="/test.jpg" alt="Test image" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.className).toContain('overflow-hidden');
      expect(wrapper.className).toContain('relative');
    });

    it('sets correct alt text on loaded img after entering viewport', () => {
      render(<LazyImage src="/test.jpg" alt="Test image description" />);
      act(() => {
        triggerIntersection();
      });
      const img = document.querySelector('img[alt="Test image description"]');
      expect(img).toBeInTheDocument();
    });

    it('applies cover variant (aspect-video + rounded-xl)', () => {
      const { container } = render(
        <LazyImage src="/cover.jpg" alt="Cover" variant="cover" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('aspect-video');
      expect(wrapper.className).toContain('rounded-xl');
    });

    it('applies avatar variant (rounded-full + aspect-square)', () => {
      const { container } = render(
        <LazyImage src="/avatar.jpg" alt="Avatar" variant="avatar" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('rounded-full');
      expect(wrapper.className).toContain('aspect-square');
    });

    it('applies banner variant (w-full)', () => {
      const { container } = render(
        <LazyImage src="/banner.jpg" alt="Banner" variant="banner" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('w-full');
    });

    it('applies custom containerClassName', () => {
      const { container } = render(
        <LazyImage src="/custom.jpg" alt="Custom" containerClassName="my-custom" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('my-custom');
    });

    it('applies custom img className after entering viewport', () => {
      render(
        <LazyImage src="/styled.jpg" alt="Styled" className="custom-img-class" />,
      );
      act(() => {
        triggerIntersection();
      });
      const img = document.querySelector('img.custom-img-class');
      expect(img).toBeInTheDocument();
    });
  });

  // ========== 2. 加载状态（骨架屏） ==========
  describe('skeleton loading state', () => {
    it('shows skeleton (bg-gray-200) before image loads', () => {
      const { container } = render(<LazyImage src="/slow.jpg" alt="Loading" />);
      const skeleton = container.querySelector('.bg-gray-200');
      expect(skeleton).toBeInTheDocument();
    });

    it('uses rounded-full skeleton for avatar variant', () => {
      const { container } = render(
        <LazyImage src="/av.jpg" alt="Avatar" variant="avatar" />,
      );
      const skeleton = container.querySelector('.bg-gray-200');
      expect(skeleton?.className).toContain('rounded-full');
    });

    it('uses rounded-lg skeleton for non-avatar (cover) variant', () => {
      const { container } = render(
        <LazyImage src="/cv.jpg" alt="Cover" variant="cover" />,
      );
      const skeleton = container.querySelector('.bg-gray-200');
      expect(skeleton?.className).toContain('rounded-lg');
    });

    it('hides skeleton after image loads successfully', () => {
      const { container } = render(<LazyImage src="/loaded.jpg" alt="Loaded" />);
      act(() => {
        triggerIntersection();
      });
      const img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgLoad(img);
        });
      }
      const skeleton = container.querySelector('.bg-gray-200');
      expect(skeleton).toBeNull();
    });

    it('uses skeletonShape="circle" for backward-compatible circle skeleton', () => {
      const { container } = render(
        <LazyImage src="/compat.jpg" alt="Compat" skeletonShape="circle" />,
      );
      const skeleton = container.querySelector('.bg-gray-200');
      expect(skeleton?.className).toContain('rounded-full');
    });
  });

  // ========== 3. 错误状态：显示 placeholder-cover.svg ==========
  describe('error state — placeholder-cover.svg', () => {
    it('shows /placeholder-cover.svg after all retries are exhausted', () => {
      vi.useFakeTimers();

      render(<LazyImage src="/broken-final.jpg" alt="Broken final" />);

      act(() => {
        triggerIntersection();
      });

      // 第一次 error → 触发重试
      let img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      // 快进 3 秒 → 重试后新的 URL 加载
      act(() => {
        vi.advanceTimersByTime(3100);
      });

      // 重试后的 img 再次 error → 最终标记错误
      img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      // 此时 error=true，应渲染 placeholder-cover.svg
      const placeholderImg = document.querySelector(
        'img[alt="图片加载失败"]',
      ) as HTMLImageElement;
      expect(placeholderImg).toBeInTheDocument();
      expect(placeholderImg?.getAttribute('src')).toBe('/placeholder-cover.svg');

      vi.useRealTimers();
    });

    it('placeholder image has object-cover and absolute inset-0 classes', () => {
      vi.useFakeTimers();

      render(<LazyImage src="/err.jpg" alt="Error" />);

      act(() => {
        triggerIntersection();
      });
      let img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      const placeholderNode = document.querySelector(
        'img[alt="图片加载失败"]',
      ) as HTMLImageElement;
      expect(placeholderNode).toBeInTheDocument();
      expect(placeholderNode?.className).toContain('object-cover');
      expect(placeholderNode?.className).toContain('inset-0');

      vi.useRealTimers();
    });

    it('placeholder is rounded-full for avatar variant on error', () => {
      vi.useFakeTimers();

      render(<LazyImage src="/err-av.jpg" alt="Error avatar" variant="avatar" />);

      act(() => {
        triggerIntersection();
      });
      let img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      const placeholderNode = document.querySelector(
        'img[alt="图片加载失败"]',
      ) as HTMLImageElement;
      expect(placeholderNode?.className).toContain('rounded-full');

      vi.useRealTimers();
    });
  });

  // ========== 4. onError 回调 ==========
  // 注意：LazyImage 组件内部 `onError={handleError}` 写在 `{...props}` 之前，
  // 因此当用户传入 onError 时，内部 handleError 会被覆盖，onError 在第一次错误时即触发
  describe('onError callback', () => {
    it('fires onError prop immediately on image error', () => {
      const onError = vi.fn();

      render(<LazyImage src="/fail.jpg" alt="Fail" onError={onError} />);

      act(() => {
        triggerIntersection();
      });

      const img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      // 由于 {...props} 覆盖了内部 handleError，onError 在第一次错误时即触发
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('onError receives a SyntheticEvent-like argument', () => {
      const onError = vi.fn();

      render(<LazyImage src="/detail-fail.jpg" alt="Detail fail" onError={onError} />);

      act(() => {
        triggerIntersection();
      });

      const img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      expect(onError).toHaveBeenCalledTimes(1);
      // 参数应为合成事件对象（由 React 包装）
      const eventArg = onError.mock.calls[0][0];
      expect(eventArg).toBeDefined();
      expect(eventArg.type || eventArg.nativeEvent?.type).toBeTruthy();
    });
  });

  // ========== 5. 重试机制 ==========
  describe('retry mechanism (3-second delay, max 1 retry)', () => {
    it('schedules retry after 3 seconds on first failure', () => {
      vi.useFakeTimers();

      render(<LazyImage src="/retry.jpg" alt="Retry" />);

      act(() => {
        triggerIntersection();
      });

      const img = findLoadedImg();
      const originalSrc = img?.getAttribute('src') || '';

      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      // 2 秒时，src 不应改变
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      // Src might still be the same or empty; the key thing is retry hasn't triggered yet.
      // After the retry timer fires, imageSrc is updated to include _retry=

      // 再前进 2 秒（总共 4 秒，超过 3 秒延迟）
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // 重试后 src 应包含 _retry=
      const retryImg = findLoadedImg();
      const retrySrc = retryImg?.getAttribute('src') || '';
      expect(retrySrc).toContain('_retry=');

      vi.useRealTimers();
    });

    it('appends _retry=1 query parameter on retry', () => {
      vi.useFakeTimers();

      render(<LazyImage src="/count.jpg" alt="Count" />);

      act(() => {
        triggerIntersection();
      });

      let img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      act(() => {
        vi.advanceTimersByTime(3100);
      });

      img = findLoadedImg();
      const src = img?.getAttribute('src') || '';
      expect(src).toContain('_retry=1');

      vi.useRealTimers();
    });

    it('clears retry timer on component unmount', () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <LazyImage src="/unmount.jpg" alt="Unmount" />,
      );

      act(() => {
        triggerIntersection();
      });

      const img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      unmount();

      // clearTimeout 应在卸载时被调用
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  // ========== 6. CDN URL 处理 ==========
  describe('CDN URL handling', () => {
    it('uses raw URL when useCDN is false', () => {
      render(<LazyImage src="/direct.jpg" alt="Direct" useCDN={false} />);
      act(() => {
        triggerIntersection();
      });
      const img = findLoadedImg();
      expect(img?.getAttribute('src')).toBe('/direct.jpg');
    });

    it('uses raw URL when VITE_CDN_URL is empty (even with useCDN=true)', () => {
      render(<LazyImage src="/nocdn.jpg" alt="No CDN" useCDN={true} />);
      act(() => {
        triggerIntersection();
      });
      const img = findLoadedImg();
      expect(img?.getAttribute('src')).toBe('/nocdn.jpg');
    });
  });

  // ========== 7. src 变化时状态重置 ==========
  describe('src change resets state', () => {
    it('re-shows skeleton when src prop changes', () => {
      vi.useFakeTimers();

      const { rerender } = render(<LazyImage src="/old.jpg" alt="Old" />);

      act(() => {
        triggerIntersection();
      });

      // 用完重试次数让旧 src 进入 error 态
      let img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      img = findLoadedImg();
      if (img) {
        act(() => {
          triggerImgError(img);
        });
      }

      // 切换 src → 应重置
      rerender(<LazyImage src="/new.jpg" alt="New" />);

      // 骨架屏应重新出现
      const skeletons = document.querySelectorAll('.bg-gray-200');
      expect(skeletons.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });

  // ========== 8. 无 IntersectionObserver 时的降级 ==========
  describe('without IntersectionObserver (fallback)', () => {
    it('loads image immediately when IntersectionObserver is unavailable', () => {
      vi.stubGlobal('IntersectionObserver', undefined);

      render(<LazyImage src="/immediate.jpg" alt="Immediate" />);

      const img = document.querySelector('img[alt="Immediate"]');
      const src = img?.getAttribute('src') || '';
      // 应该直接设置 imageSrc，使用原始 src（CDN URL 为空）
      expect(src).toContain('/immediate.jpg');
    });
  });
});