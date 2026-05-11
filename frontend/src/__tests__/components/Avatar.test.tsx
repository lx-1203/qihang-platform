import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Avatar from '../../components/Avatar';

// ====== Mock LazyImage ======
// Avatar 内部使用 LazyImage，我们 mock 它来简化测试，
// 专注于 Avatar 自身的逻辑：尺寸、fallback、错误处理
vi.mock('../../components/ui/LazyImage', () => ({
  default: vi.fn(
    ({
      src,
      alt,
      onError,
      className,
      containerClassName,
      useCDN,
      skeletonShape,
    }: {
      src: string;
      alt: string;
      onError?: () => void;
      className?: string;
      containerClassName?: string;
      useCDN?: boolean;
      skeletonShape?: string;
    }) => (
      <div className={containerClassName} data-testid="lazy-image-wrapper">
        <img
          src={src}
          alt={alt}
          className={className}
          data-testid="lazy-image"
          data-skeleton-shape={skeletonShape}
          data-use-cdn={useCDN}
          onError={onError}
        />
      </div>
    ),
  ),
}));

// ====== Test Suite ======
describe('Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== 1. 正常渲染 ==========
  describe('normal rendering', () => {
    it('renders with src provided via LazyImage', () => {
      render(<Avatar src="/avatar.jpg" alt="John Doe" />);

      const lazyImg = screen.getByTestId('lazy-image');
      expect(lazyImg).toBeInTheDocument();
      expect(lazyImg.getAttribute('src')).toBe('/avatar.jpg');
      expect(lazyImg.getAttribute('alt')).toBe('John Doe');
    });

    it('renders as a circle (rounded-full container)', () => {
      render(<Avatar src="/avatar.jpg" alt="User" />);

      const container = document.querySelector('.rounded-full');
      expect(container).toBeInTheDocument();
    });

    it('passes skeletonShape="circle" to LazyImage', () => {
      render(<Avatar src="/avatar.jpg" alt="User" />);

      const lazyImg = screen.getByTestId('lazy-image');
      expect(lazyImg.getAttribute('data-skeleton-shape')).toBe('circle');
    });

    it('passes useCDN={true} by default to LazyImage', () => {
      render(<Avatar src="/avatar.jpg" alt="User" />);

      const lazyImg = screen.getByTestId('lazy-image');
      expect(lazyImg.getAttribute('data-use-cdn')).toBe('true');
    });

    it('passes useCDN={false} to LazyImage when specified', () => {
      render(<Avatar src="/avatar.jpg" alt="User" useCDN={false} />);

      const lazyImg = screen.getByTestId('lazy-image');
      expect(lazyImg.getAttribute('data-use-cdn')).toBe('false');
    });

    it('applies object-cover and object-center to the lazy image', () => {
      render(<Avatar src="/avatar.jpg" alt="User" />);

      const lazyImg = screen.getByTestId('lazy-image');
      expect(lazyImg.className).toContain('object-cover');
      expect(lazyImg.className).toContain('object-center');
      expect(lazyImg.className).toContain('rounded-full');
    });
  });

  // ========== 2. 无 src 时的首字母回退 ==========
  describe('initials fallback (no src)', () => {
    it('displays initials from alt text when no src provided', () => {
      render(<Avatar alt="John Doe" />);

      // alt="John Doe" -> initials: "JD"
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('displays initials from alt text with single word', () => {
      render(<Avatar alt="John" />);

      // alt="John" -> initials: "J"
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('displays fallbackInitials when explicitly provided', () => {
      render(<Avatar alt="John Doe" fallbackInitials="XY" />);

      // fallbackInitials 优先
      expect(screen.getByText('XY')).toBeInTheDocument();
      // alt 的首字母不应出现
      expect(screen.queryByText('JD')).not.toBeInTheDocument();
    });

    it('uppercases initials (max 2 chars)', () => {
      render(<Avatar alt="john michael doe" />);

      // "john michael doe" -> initials: "JM" (前两个单词首字母，大写)
      expect(screen.getByText('JM')).toBeInTheDocument();
    });

    it('renders User icon when no alt and no fallbackInitials', () => {
      // Avatar receives empty string alt
      render(<Avatar alt="" />);

      // 应有 lucide-react User 图标渲染
      const container = document.querySelector('.inline-flex');
      expect(container).toBeInTheDocument();
      // 不应有文本节点
      const span = container?.querySelector('span');
      expect(span).toBeNull();
    });

    it('renders initials span with correct text styling', () => {
      // alt="AB" has no space, so getInitials returns "A" (single initial)
      render(<Avatar alt="A B" />);

      const initialsSpan = screen.getByText('AB');
      const spanEl = initialsSpan.closest('span');
      expect(spanEl?.className).toContain('text-primary-700');
      expect(spanEl?.className).toContain('font-semibold');
    });
  });

  // ========== 3. 加载失败时显示 default-avatar.svg ==========
  describe('error fallback to default-avatar.svg', () => {
    it('shows default-avatar.svg when LazyImage triggers onError', () => {
      render(<Avatar src="/broken.jpg" alt="Broken" />);

      // 初始状态：LazyImage 渲染中（无错误）
      expect(screen.getByTestId('lazy-image')).toBeInTheDocument();
      expect(screen.queryByAltText('Broken')).toBeInTheDocument();

      // 模拟 LazyImage 的 onError 回调
      const lazyImg = screen.getByTestId('lazy-image');
      fireEvent.error(lazyImg);

      // 现在应该显示 default-avatar.svg
      const fallbackImg = screen.getByAltText('Broken');
      expect(fallbackImg).toBeInTheDocument();
      expect(fallbackImg.getAttribute('src')).toBe('/default-avatar.svg');
    });

    it('default-avatar.svg has object-cover and object-center and rounded-full', () => {
      render(<Avatar src="/broken.jpg" alt="Broken" />);

      // 触发错误
      const lazyImg = screen.getByTestId('lazy-image');
      fireEvent.error(lazyImg);

      const fallbackImg = screen.getByAltText('Broken');
      expect(fallbackImg.className).toContain('object-cover');
      expect(fallbackImg.className).toContain('object-center');
      expect(fallbackImg.className).toContain('rounded-full');
    });

    it('resets error state when src changes', () => {
      const { rerender } = render(<Avatar src="/broken.jpg" alt="Broken" />);

      // 触发第一次错误
      let lazyImg = screen.getByTestId('lazy-image');
      fireEvent.error(lazyImg);

      // 确认 fallback 显示
      expect(screen.getByAltText('Broken').getAttribute('src')).toBe('/default-avatar.svg');

      // 切换到新的 src
      rerender(<Avatar src="/new-avatar.jpg" alt="New" />);

      // 应重置为 LazyImage（不再显示 default-avatar.svg）
      expect(screen.getByTestId('lazy-image')).toBeInTheDocument();
      expect(screen.queryByAltText('New')?.getAttribute('src')).not.toBe('/default-avatar.svg');
    });
  });

  // ========== 4. 不同 size 的 class/style 正确应用 ==========
  describe('size prop — sm/md/lg/xl', () => {
    it('renders with default size md (40px)', () => {
      render(<Avatar src="/avatar.jpg" alt="MD" />);

      const container = document.querySelector('.inline-flex') as HTMLElement;
      expect(container?.style.width).toBe('40px');
      expect(container?.style.height).toBe('40px');
    });

    it('renders size xs (24px)', () => {
      render(<Avatar src="/avatar.jpg" alt="XS" size="xs" />);

      const container = document.querySelector('.inline-flex') as HTMLElement;
      expect(container?.style.width).toBe('24px');
      expect(container?.style.height).toBe('24px');
    });

    it('renders size sm (32px)', () => {
      render(<Avatar src="/avatar.jpg" alt="SM" size="sm" />);

      const container = document.querySelector('.inline-flex') as HTMLElement;
      expect(container?.style.width).toBe('32px');
      expect(container?.style.height).toBe('32px');
    });

    it('renders size lg (48px)', () => {
      render(<Avatar src="/avatar.jpg" alt="LG" size="lg" />);

      const container = document.querySelector('.inline-flex') as HTMLElement;
      expect(container?.style.width).toBe('48px');
      expect(container?.style.height).toBe('48px');
    });

    it('renders size xl (64px)', () => {
      render(<Avatar src="/avatar.jpg" alt="XL" size="xl" />);

      const container = document.querySelector('.inline-flex') as HTMLElement;
      expect(container?.style.width).toBe('64px');
      expect(container?.style.height).toBe('64px');
    });

    it('renders size company (80px)', () => {
      render(<Avatar src="/logo.png" alt="Company" size="company" />);

      const container = document.querySelector('.inline-flex') as HTMLElement;
      expect(container?.style.width).toBe('80px');
      expect(container?.style.height).toBe('80px');
    });

    it('renders size mentor (300px)', () => {
      render(<Avatar src="/mentor.jpg" alt="Mentor" size="mentor" />);

      const container = document.querySelector('.inline-flex') as HTMLElement;
      expect(container?.style.width).toBe('300px');
      expect(container?.style.height).toBe('300px');
    });

    it('adjusts initials font-size based on dimension', () => {
      // size xl = 64px, fontSize should be max(64 * 0.35, 12) = max(22.4, 12) = 22.4
      render(<Avatar alt="John Doe" size="xl" />);

      const initialsSpan = screen.getByText('JD');
      const spanEl = initialsSpan.closest('span');
      // fontSize should be ~22.4px for xl size
      expect(spanEl?.style.fontSize).toBe('22.4px');
    });

    it('initials minimum font-size is 12px for xs size', () => {
      // size xs = 24px, fontSize should be max(24 * 0.35, 12) = max(8.4, 12) = 12
      render(<Avatar alt="John Doe" size="xs" />);

      const initialsSpan = screen.getByText('JD');
      const spanEl = initialsSpan.closest('span');
      expect(spanEl?.style.fontSize).toBe('12px');
    });
  });

  // ========== 5. 非正方形图片使用 object-cover ==========
  describe('object-cover for non-square images', () => {
    it('LazyImage className includes object-cover', () => {
      render(<Avatar src="/rect.jpg" alt="Rectangle" />);

      const lazyImg = screen.getByTestId('lazy-image');
      // Avatar 传给 LazyImage 的 className 包含 object-cover
      expect(lazyImg.className).toContain('object-cover');
    });

    it('default-avatar.svg fallback also uses object-cover', () => {
      render(<Avatar src="/broken.jpg" alt="Broken" />);

      const lazyImg = screen.getByTestId('lazy-image');
      fireEvent.error(lazyImg);

      const fallbackImg = screen.getByAltText('Broken');
      expect(fallbackImg.className).toContain('object-cover');
    });

    it('container has rounded-full to force circle crop', () => {
      render(<Avatar src="/rect.jpg" alt="Rectangle" />);

      const container = document.querySelector('.rounded-full');
      // Combined with object-cover, this ensures non-square images are center-cropped to a circle
      expect(container).toBeInTheDocument();
    });
  });

  // ========== 6. 容器样式 ==========
  describe('container styling', () => {
    it('renders as inline-flex container', () => {
      render(<Avatar src="/avatar.jpg" alt="User" />);

      const container = document.querySelector('.inline-flex');
      expect(container).toBeInTheDocument();
    });

    it('container has bg-primary-100 background', () => {
      render(<Avatar src="/avatar.jpg" alt="User" />);

      const container = document.querySelector('.inline-flex');
      expect(container?.className).toContain('bg-primary-100');
    });

    it('container has overflow-hidden', () => {
      render(<Avatar src="/avatar.jpg" alt="User" />);

      const container = document.querySelector('.inline-flex');
      expect(container?.className).toContain('overflow-hidden');
    });

    it('applies custom className', () => {
      render(
        <Avatar src="/avatar.jpg" alt="User" className="my-custom-avatar" />,
      );

      const container = document.querySelector('.inline-flex');
      expect(container?.className).toContain('my-custom-avatar');
    });
  });
});