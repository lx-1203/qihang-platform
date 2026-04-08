// ====== 用户与认证类型 ======

/** 用户角色 */
export type UserRole = 'student' | 'company' | 'mentor' | 'admin';

/** 用户基础信息 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

/** 登录请求 */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 注册请求 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
}

/** 登录/注册响应 */
export interface AuthResponse {
  code: number;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

/** 修改密码请求 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// ====== 通用类型 ======

/** API 统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页列表响应 */
export interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
  };
}

/** 分页查询参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// ====== 职位类型 ======

export interface Job {
  id: number;
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  salary: string;
  type: string;
  category: string;
  description: string;
  requirements: string;
  benefits?: string;
  company_id: number;
  status: 'active' | 'closed' | 'draft';
  created_at: string;
}

// ====== 课程类型 ======

export interface Course {
  id: number;
  title: string;
  description: string;
  cover?: string;
  mentor_id: number;
  mentor_name?: string;
  category: string;
  tags: string[];
  price: number;
  views: number;
  rating: number;
  status: 'published' | 'draft' | 'archived';
  created_at: string;
}

// ====== 导师类型 ======

export interface Mentor {
  id: number;
  user_id: number;
  name: string;
  avatar?: string;
  title: string;
  company: string;
  specialties: string[];
  rating: number;
  review_count: number;
  price_per_hour: number;
  bio: string;
  experience_years: number;
  status: 'active' | 'inactive' | 'pending';
}

// ====== 通知类型 ======

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  type: 'system' | 'appointment' | 'resume' | 'course' | 'review';
  is_read: boolean;
  link?: string;
  created_at: string;
}

// ====== 时区类型（商业级留学业务核心） ======

/** 时区信息 */
export interface TimezoneInfo {
  id: string;
  country: string;
  countryCode: string;
  timezone: string;
  utcOffset: number;
  isDST: boolean;
  localTime: string;
  beijingTime: string;
}

/** 双时间展示格式 */
export interface DualTimeDisplay {
  localTime: string;
  localTimezone: string;
  beijingTime: string;
  formattedDual: string; // "伦敦时间 2026-01-15 09:00 | 北京时间 2026-01-15 17:00"
}

// ====== 操作日志类型（审计用） ======

export interface AuditLog {
  id: number;
  operator_id: number;
  operator_name: string;
  operator_role: UserRole;
  action: string;
  target_type: string;
  target_id?: number;
  before_data?: string;
  after_data?: string;
  ip_address: string;
  created_at: string;
}

// ====== 后台配置类型（数据全可控） ======

export interface SiteConfig {
  key: string;
  value: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'json' | 'datetime';
  group: string;
  editable: boolean;
}
