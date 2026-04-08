import { Sparkles, Clock, Rocket, Lock, Wrench } from 'lucide-react';

// ====== 功能状态标识组件 ======
// 用于标注功能的开发状态

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
    className: 'bg-purple-50 text-purple-700 border-purple-200',
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
}

export default function FeatureStatus({ status, label, size = 'sm' }: FeatureStatusProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-medium ${config.className} ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
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
