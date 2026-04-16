import { type ReactNode, type MouseEvent, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import Ripple from './Ripple';

// ====== 统一卡片组件 ======
// 提供一致的卡片交互反馈（hover/active/focus）和可选涟漪效果

type CardVariant = 'standard' | 'feature' | 'compact';

interface CardBaseProps {
  children: ReactNode;
  /** 卡片变体 */
  variant?: CardVariant;
  /** 额外类名 */
  className?: string;
  /** 启用点击涟漪效果 */
  enableRipple?: boolean;
}

interface CardLinkProps extends CardBaseProps {
  /** 链接地址（渲染为 Link） */
  href: string;
  /** 点击前回调（如保存滚动位置） */
  onBeforeNavigate?: () => void;
  onClick?: never;
}

interface CardButtonProps extends CardBaseProps {
  /** 点击回调（渲染为 div[role=button]） */
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
  href?: never;
  onBeforeNavigate?: never;
}

interface CardStaticProps extends CardBaseProps {
  href?: never;
  onClick?: never;
  onBeforeNavigate?: never;
}

type CardProps = CardLinkProps | CardButtonProps | CardStaticProps;

const VARIANT_CLASSES: Record<CardVariant, string> = {
  standard: 'rounded-xl p-6 shadow-sm border border-gray-100',
  feature: 'rounded-2xl border border-gray-100 shadow-sm',
  compact: 'rounded-xl p-4 shadow-sm border border-gray-100',
};

const INTERACTIVE_CLASSES =
  'cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] ' +
  'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ' +
  'touch-manipulation transition-all duration-200';

/**
 * 统一卡片组件
 *
 * @example
 * // 链接卡片（跳转到详情页）
 * <Card href="/jobs/1" variant="feature" onBeforeNavigate={savePosition}>
 *   <h3>前端工程师</h3>
 * </Card>
 *
 * // 按钮卡片（点击触发操作）
 * <Card onClick={handleClick} variant="standard">
 *   <p>管理面板入口</p>
 * </Card>
 *
 * // 静态卡片（不可点击）
 * <Card variant="compact">
 *   <p>信息展示</p>
 * </Card>
 */
const Card = forwardRef<HTMLDivElement, CardProps>(function Card(props, ref) {
  const {
    children,
    variant = 'standard',
    className = '',
    enableRipple = true,
  } = props;

  const isInteractive = 'href' in props && props.href || 'onClick' in props && props.onClick;
  const baseClasses = `bg-white ${VARIANT_CLASSES[variant]} ${isInteractive ? INTERACTIVE_CLASSES : ''} ${className}`;

  // 链接卡片
  if ('href' in props && props.href) {
    const content = (
      <Link
        to={props.href}
        className={`block ${baseClasses} no-underline text-inherit`}
        onClick={props.onBeforeNavigate}
      >
        {children}
      </Link>
    );

    if (enableRipple) {
      return <Ripple className="rounded-2xl">{content}</Ripple>;
    }
    return content;
  }

  // 按钮卡片
  if ('onClick' in props && props.onClick) {
    const content = (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={baseClasses}
        onClick={props.onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            props.onClick?.(e as unknown as MouseEvent<HTMLDivElement>);
          }
        }}
      >
        {children}
      </div>
    );

    if (enableRipple) {
      return <Ripple className="rounded-2xl">{content}</Ripple>;
    }
    return content;
  }

  // 静态卡片
  return (
    <div ref={ref} className={baseClasses}>
      {children}
    </div>
  );
});

export default Card;
