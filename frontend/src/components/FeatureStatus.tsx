import { Sparkles, Clock, Rocket, Lock, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

// ====== 功能状态标识组件 ======
// 用于标注功能的开发状态，支持点击跳转

type StatusType = 'coming' | 'beta' | 'new' | 'dev' | 'locked';

const STATUS_CONFIG: Record<StatusType, { label: string; icon: typeof Clock; className: string }> = {
  coming: {
    label: '即将上线',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  beta: {
    label: '测试中',
    icon: Wrench,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  new: {
    label: '新功能',
    icon: Sparkles,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  dev: {
    label: '开发中',
    icon: Rocket,
    className: 'bg-primary-50 text-primary-700 border-primary-200',
  },
  locked: {
    label: '需认证',
    icon: Lock,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

interface FeatureStatusProps {
  status: StatusType;
  /** 自定义标签文字 */
  label?: string;
  /** 大小 */
  size?: 'sm' | 'md';
  /** 点击跳转链接 */
  linkTo?: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否禁用点击 */
  disabled?: boolean;
}

export default function FeatureStatus({ status, label, size = 'sm', linkTo, onClick, disabled = false }: FeatureStatusProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isClickable = (linkTo || onClick) && !disabled;
  const baseClasses = `inline-flex items-center gap-1 border rounded-full font-medium ${config.className} ${
    size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  } ${isClickable ? 'cursor-pointer hover:shadow-md transition-all hover:scale-105' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  // 如果有链接，渲染为 Link
  if (linkTo && !disabled) {
    return (
      <Link to={linkTo} className={baseClasses}>
        <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        {label || config.label}
      </Link>
    );
  }

  // 如果有点击回调或不可点击
  return (
    <span
      className={baseClasses}
      onClick={onClick && !disabled ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {label || config.label}
    </span>
  );
}

/**
 * 功能不可用时的覆盖层
 */
export function FeatureOverlay({
  status = 'coming',
  message,
  children,
}: {
  status?: StatusType;
  message?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-2">
        <FeatureStatus status={status} size="md" />
        {message && <p className="text-xs text-gray-500 max-w-[200px] text-center">{message}</p>}
      </div>
    </div>
  );
}
