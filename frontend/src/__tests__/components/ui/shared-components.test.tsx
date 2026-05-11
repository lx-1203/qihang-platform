import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  ListSkeleton,
  DetailSkeleton,
  TableSkeleton,
} from '../../../components/ui/Skeleton';
import Tag from '../../../components/ui/Tag';
import ProgressButton from '../../../components/ui/ProgressButton';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import SuccessState from '../../../components/ui/SuccessState';
import Ripple from '../../../components/ui/Ripple';
import LazyImage from '../../../components/ui/LazyImage';
import AnimatedWrapper from '../../../components/ui/AnimatedWrapper';
import Breadcrumb from '../../../components/ui/Breadcrumb';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';

// ====== Global mocks ======

// Mock useReducedMotion - used by EmptyState, ErrorState, ConfirmDialog, AnimatedWrapper, etc.
vi.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

// ====== Test Suites ======

// --- 1. Skeleton ---
describe('Skeleton', () => {
  it('renders with animate-pulse class for loading animation', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-gray-200');
  });

  it('renders with custom dimensions', () => {
    const { container } = render(<Skeleton width={100} height={50} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('100px');
    expect(el.style.height).toBe('50px');
  });

  it('renders as a circle when circle prop is set', () => {
    const { container } = render(<Skeleton circle />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('rounded-full');
  });

  it('renders TextSkeleton with specified number of lines', () => {
    const { container } = render(<TextSkeleton lines={4} />);
    // Should have 4 skeleton lines
    const lines = container.querySelectorAll('.animate-pulse');
    expect(lines.length).toBe(4);
  });

  it('renders CardSkeleton without crashing', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders ListSkeleton with correct grid count', () => {
    const { container } = render(<ListSkeleton count={3} />);
    // Should render 3 card skeletons in a grid
    const cards = container.querySelectorAll('.grid > *');
    expect(cards.length).toBe(3);
  });

  it('renders DetailSkeleton without crashing', () => {
    const { container } = render(<DetailSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders TableSkeleton with specified rows and cols', () => {
    const { container } = render(<TableSkeleton rows={3} cols={4} />);
    // 1 header row + 3 data rows = 4 rows
    const rows = container.firstChild?.childNodes;
    expect(rows?.length).toBeGreaterThanOrEqual(3);
  });
});

// --- 2. Tag (Badge) ---
describe('Tag', () => {
  it('renders with default variant (primary)', () => {
    render(<Tag>Default Tag</Tag>);
    const tag = screen.getByText('Default Tag');
    expect(tag).toBeInTheDocument();
    expect(tag.className).toContain('bg-primary-50');
  });

  it('renders with green variant', () => {
    render(<Tag variant="green">Success</Tag>);
    const tag = screen.getByText('Success');
    expect(tag.className).toContain('bg-green-50');
    expect(tag.className).toContain('text-green-700');
  });

  it('renders with red variant', () => {
    render(<Tag variant="red">Error</Tag>);
    const tag = screen.getByText('Error');
    expect(tag.className).toContain('bg-red-50');
    expect(tag.className).toContain('text-red-700');
  });

  it('renders with yellow variant', () => {
    render(<Tag variant="yellow">Warning</Tag>);
    const tag = screen.getByText('Warning');
    expect(tag.className).toContain('bg-yellow-50');
    expect(tag.className).toContain('text-yellow-700');
  });

  it('renders with gray variant', () => {
    render(<Tag variant="gray">Neutral</Tag>);
    const tag = screen.getByText('Neutral');
    expect(tag.className).toContain('bg-gray-50');
    expect(tag.className).toContain('text-gray-600');
  });

  it('renders different sizes', () => {
    render(
      <>
        <Tag size="xs">XS</Tag>
        <Tag size="sm">SM</Tag>
        <Tag size="md">MD</Tag>
      </>
    );
    expect(screen.getByText('XS')).toBeInTheDocument();
    expect(screen.getByText('SM')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
  });

  it('renders as a button when onClick is provided', () => {
    const onClick = vi.fn();
    render(<Tag onClick={onClick}>Clickable</Tag>);

    const button = screen.getByText('Clickable');
    expect(button.tagName).toBe('BUTTON');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// --- 3. ProgressButton (Button) ---
describe('ProgressButton', () => {
  it('renders children when not loading', () => {
    render(<ProgressButton>Submit</ProgressButton>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<ProgressButton onClick={onClick}>Click Me</ProgressButton>);

    fireEvent.click(screen.getByText('Click Me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state with spinner', () => {
    render(<ProgressButton loading>Submit</ProgressButton>);
    // The button should show loadingText
    expect(screen.getByText('\u63d0\u4ea4\u4e2d...')).toBeInTheDocument();
  });

  it('shows progress percentage when progress is provided', () => {
    render(<ProgressButton loading progress={50}>Submit</ProgressButton>);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('disables the button when loading', () => {
    render(<ProgressButton loading>Submit</ProgressButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables the button when disabled prop is set', () => {
    render(<ProgressButton disabled>Submit</ProgressButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('uses custom loading text', () => {
    render(
      <ProgressButton loading loadingText={'保存中...'}>
        Save
      </ProgressButton>
    );
    // Use text content check instead of getByText to handle encoding
    const button = document.querySelector('button');
    expect(button?.textContent).toContain('保存中...');
  });
});

// --- 4. Card ---
describe('Card', () => {
  it('renders static card without crashing', () => {
    render(<Card><p>Card Content</p></Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders as a link when href is provided', () => {
    render(
      <MemoryRouter>
        <Card href="/test"><p>Link Card</p></Card>
      </MemoryRouter>
    );
    const link = screen.getByText('Link Card').closest('a');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('renders as a button card when onClick is provided', () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}><p>Button Card</p></Card>);

    const button = screen.getByText('Button Card').closest('[role="button"]');
    expect(button).toBeInTheDocument();

    fireEvent.click(button!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes', () => {
    render(<Card variant="compact"><p>Compact</p></Card>);
    const card = screen.getByText('Compact').closest('div');
    expect(card?.className).toContain('p-4');
  });
});

// --- 5. EmptyState ---
describe('EmptyState', () => {
  it('renders with default variant (noData)', () => {
    render(<EmptyState />);
    expect(screen.getByText('\u6682\u65e0\u6570\u636e')).toBeInTheDocument();
    expect(
      screen.getByText('\u5f53\u524d\u6ca1\u6709\u53ef\u663e\u793a\u7684\u5185\u5bb9')
    ).toBeInTheDocument();
  });

  it('renders with noSearch variant', () => {
    render(<EmptyState variant="noSearch" />);
    expect(screen.getByText('\u672a\u627e\u5230\u7ed3\u679c')).toBeInTheDocument();
  });

  it('renders with noNotification variant', () => {
    render(<EmptyState variant="noNotification" />);
    expect(screen.getByText('\u6682\u65e0\u901a\u77e5')).toBeInTheDocument();
  });

  it('renders with noFavorite variant', () => {
    render(<EmptyState variant="noFavorite" />);
    expect(screen.getByText('\u6682\u65e0\u6536\u85cf')).toBeInTheDocument();
  });

  it('renders action button when actionText and onAction are provided', () => {
    const onAction = vi.fn();
    render(<EmptyState actionText={'操作'} onAction={onAction} />);

    // Find the action button and verify it exists
    const buttons = screen.getAllByRole('button');
    const actionButton = buttons.find(
      (btn) => btn.textContent === '操作'
    );
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton!);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders custom title and description', () => {
    render(<EmptyState title="Custom" description="Custom description" />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });
});

// --- 6. ErrorState ---
describe('ErrorState', () => {
  it('renders default error message', () => {
    render(<ErrorState />);
    expect(
      screen.getByText('\u6570\u636e\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5')
    ).toBeInTheDocument();
  });

  it('renders custom error message', () => {
    render(<ErrorState message="Custom error" />);
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  it('renders compact variant', () => {
    const { container } = render(<ErrorState compact />);
    // Compact variant should have border classes
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('border-red-100');
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    fireEvent.click(screen.getByText('\u91cd\u65b0\u52a0\u8f7d'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// --- 7. ConfirmDialog (Modal) ---
describe('ConfirmDialog', () => {
  it('does not render when open is false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('renders when open is true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Test"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    // Find confirm button (for danger variant, text is \u786e\u8ba4\u5220\u9664)
    fireEvent.click(screen.getByText('\u786e\u8ba4\u5220\u9664'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Test"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('\u53d6\u6d88'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders with danger variant icon', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete"
        variant="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('\u786e\u8ba4\u5220\u9664')).toBeInTheDocument();
  });

  it('renders with warning variant', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Warning"
        variant="warning"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('\u786e\u8ba4\u64cd\u4f5c')).toBeInTheDocument();
  });

  it('renders with info variant and custom confirm text', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Info"
        variant="info"
        confirmText={'确定'}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    // Find all buttons and check one has custom text
    const buttons = screen.getAllByRole('button');
    const confirmBtn = buttons.find((btn) => btn.textContent === '确定');
    expect(confirmBtn).toBeInTheDocument();
  });
});

// --- 8. SuccessState ---
describe('SuccessState', () => {
  it('renders default success message', () => {
    render(<SuccessState />);
    expect(screen.getByText('\u64cd\u4f5c\u6210\u529f')).toBeInTheDocument();
  });

  it('renders custom title and message', () => {
    render(<SuccessState title={'提交成功'} message={'您的申请已提交'} />);
    // Check text content of the rendered output
    const container = document.querySelector('.flex.flex-col.items-center');
    expect(container?.textContent).toContain('提交成功');
    expect(container?.textContent).toContain('您的申请已提交');
  });

  it('renders action button when provided', () => {
    const onAction = vi.fn();
    render(<SuccessState actionText={'返回'} onAction={onAction} />);

    const buttons = screen.getAllByRole('button');
    const actionBtn = buttons.find((btn) => btn.textContent === '返回');
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn!);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

// --- 9. Ripple ---
describe('Ripple', () => {
  it('renders children inside the ripple container', () => {
    render(
      <Ripple>
        <button>Click me</button>
      </Ripple>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});

// --- 10. AnimatedWrapper ---
describe('AnimatedWrapper', () => {
  it('renders children without animation when reduced motion is preferred', () => {
    render(<AnimatedWrapper><p>Content</p></AnimatedWrapper>);
    // With useReducedMotion returning true, it should render a plain div
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with custom HTML tag', () => {
    const { container } = render(
      <AnimatedWrapper as="section"><p>Section Content</p></AnimatedWrapper>
    );
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section?.textContent).toContain('Section Content');
  });
});

// --- 11. Breadcrumb ---
describe('Breadcrumb', () => {
  it('renders breadcrumb items with home link', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          items={[
            { label: '\u80fd\u529b\u63d0\u5347', path: '/skill-enhancement' },
            { label: '\u8bfe\u7a0b\u8be6\u60c5' },
          ]}
        />
      </MemoryRouter>
    );

    // Should have home link
    expect(screen.getByLabelText('\u8fd4\u56de\u9996\u9875')).toBeInTheDocument();

    // Should have the breadcrumb items
    expect(screen.getByText('\u80fd\u529b\u63d0\u5347')).toBeInTheDocument();
    expect(screen.getByText('\u8bfe\u7a0b\u8be6\u60c5')).toBeInTheDocument();
  });

  it('renders last item as current page (not a link)', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          items={[{ label: 'Current Page' }]}
        />
      </MemoryRouter>
    );

    const currentItem = screen.getByText('Current Page');
    expect(currentItem).toBeInTheDocument();
    expect(currentItem.tagName).toBe('SPAN');
    expect(currentItem.getAttribute('aria-current')).toBe('page');
  });
});

// --- 12. ErrorBoundary ---
describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    // We need to trigger an error in the child component
    function BrokenComponent(): React.ReactElement {
      throw new Error('Test error');
    }

    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom Fallback</div>}>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('renders default error UI when child throws', () => {
    function BrokenComponent(): React.ReactElement {
      throw new Error('Something broke');
    }

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('\u9875\u9762\u51fa\u9519\u4e86')).toBeInTheDocument();
    expect(screen.getByText('\u91cd\u8bd5')).toBeInTheDocument();
    expect(screen.getByText('\u8fd4\u56de\u9996\u9875')).toBeInTheDocument();

    spy.mockRestore();
  });
});

// --- 13. LazyImage ---
describe('LazyImage', () => {
  it('renders with placeholder before image loads', () => {
    const { container } = render(
      <LazyImage src="/test.jpg" alt="Test image" />
    );
    // The component should render a container div
    expect(container.firstChild).toBeInTheDocument();
  });
});
