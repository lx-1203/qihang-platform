import { useRef, useCallback, type ReactNode, type MouseEvent } from 'react';

interface RippleProps {
  children: ReactNode;
  /** 自定义类名（应用到外层容器） */
  className?: string;
  /** 波纹颜色，默认自适应（深色背景白波纹，浅色背景品牌色波纹） */
  color?: string;
  /** 是否禁用波纹 */
  disabled?: boolean;
}

/**
 * 点击波纹效果组件
 * 用法: <Ripple><button>Click me</button></Ripple>
 */
export default function Ripple({
  children,
  className = '',
  color = 'rgba(20, 184, 166, 0.35)',
  disabled = false,
}: RippleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (disabled || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      transform: scale(0);
      opacity: 1;
      pointer-events: none;
      animation: ripple-effect 0.6s ease-out forwards;
    `;

    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }, [color, disabled]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onPointerDown={handleClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
      <style>{`
        @keyframes ripple-effect {
          to {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
