// ====== 统一标签组件 ======
// 替代项目中散落的各种 span 标签样式，确保全局视觉一致

type TagVariant = 'primary' | 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'orange';
type TagSize = 'xs' | 'sm' | 'md';

interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  className?: string;
  onClick?: () => void;
}

const VARIANT_STYLES: Record<TagVariant, string> = {
  primary: 'bg-primary-50 text-primary-700 border-primary-100',
  gray: 'bg-gray-50 text-gray-600 border-gray-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
};

const SIZE_STYLES: Record<TagSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Tag({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
  onClick,
}: TagProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium border transition-colors';
  const variantClasses = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const sizeClasses = SIZE_STYLES[size] || SIZE_STYLES.sm;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} hover:opacity-80 cursor-pointer ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <span className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
}
