// ====== 平台统一常量 ======

// 课程分类
export const COURSE_CATEGORIES = ['简历指导', '面试辅导', '职业规划', '考研指导', '创业指导', '留学规划'];

// 难度映射
export const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  beginner: { label: '入门', color: 'bg-green-50 text-green-700' },
  intermediate: { label: '中级', color: 'bg-blue-50 text-blue-700' },
  advanced: { label: '高级', color: 'bg-primary-50 text-primary-700' },
};

// 难度选项（用于下拉框）
export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_MAP).map(([value, { label }]) => ({ value, label }));

// 默认头像（替代空字符串和 Unsplash URL）
export const DEFAULT_AVATAR = '/default-avatar.svg';

// 默认封面占位图
export const PLACEHOLDER_COVER = '/placeholder-cover.svg';
