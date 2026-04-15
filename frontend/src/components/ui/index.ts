/**
 * UI 组件库统一导出（桶文件）
 * 使用方式: import { LazyImage, Skeleton, ErrorState } from '@/components/ui';
 */

// 骨架屏系列
export {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  ListSkeleton,
  DetailSkeleton,
  TableSkeleton,
} from './Skeleton';

// 图片
export { default as LazyImage } from './LazyImage';

// 错误处理
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as ErrorState } from './ErrorState';

// 状态反馈（四态：Loading/Success/Error/Empty）
export { default as SuccessState } from './SuccessState';
export { default as EmptyState } from './EmptyState';

// 反馈
export { default as ConfirmDialog } from './ConfirmDialog';
export { ToastProvider, useToast, showToast } from './ToastContainer';

// 操作反馈
export { default as Ripple } from './Ripple';
export { default as ProgressButton } from './ProgressButton';

// 文件上传
export { default as FileUpload } from './FileUpload';

// 标签
export { default as Tag } from './Tag';
