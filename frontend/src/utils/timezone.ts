// ====== 时区与双时间核心工具（商业级留学业务红线模块） ======
// 规则：所有时间存储 UTC 时间戳，前端根据目标国家动态渲染双时间

/** 留学目标国家/地区时区数据库 */
export const TIMEZONE_DATABASE: TimezoneEntry[] = [
  // 英国
  { country: '英国', countryCode: 'GB', city: '伦敦', timezone: 'Europe/London', flag: '🇬🇧' },
  // 美国
  { country: '美国 (东部)', countryCode: 'US', city: '纽约', timezone: 'America/New_York', flag: '🇺🇸' },
  { country: '美国 (西部)', countryCode: 'US', city: '洛杉矶', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { country: '美国 (中部)', countryCode: 'US', city: '芝加哥', timezone: 'America/Chicago', flag: '🇺🇸' },
  // 加拿大
  { country: '加拿大 (东部)', countryCode: 'CA', city: '多伦多', timezone: 'America/Toronto', flag: '🇨🇦' },
  { country: '加拿大 (西部)', countryCode: 'CA', city: '温哥华', timezone: 'America/Vancouver', flag: '🇨🇦' },
  // 澳大利亚
  { country: '澳大利亚 (东部)', countryCode: 'AU', city: '悉尼', timezone: 'Australia/Sydney', flag: '🇦🇺' },
  { country: '澳大利亚 (西部)', countryCode: 'AU', city: '珀斯', timezone: 'Australia/Perth', flag: '🇦🇺' },
  // 亚洲
  { country: '中国香港', countryCode: 'HK', city: '香港', timezone: 'Asia/Hong_Kong', flag: '🇭🇰' },
  { country: '新加坡', countryCode: 'SG', city: '新加坡', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { country: '日本', countryCode: 'JP', city: '东京', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  { country: '韩国', countryCode: 'KR', city: '首尔', timezone: 'Asia/Seoul', flag: '🇰🇷' },
  // 欧洲
  { country: '德国', countryCode: 'DE', city: '柏林', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  { country: '法国', countryCode: 'FR', city: '巴黎', timezone: 'Europe/Paris', flag: '🇫🇷' },
  { country: '荷兰', countryCode: 'NL', city: '阿姆斯特丹', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
  { country: '瑞士', countryCode: 'CH', city: '苏黎世', timezone: 'Europe/Zurich', flag: '🇨🇭' },
  { country: '瑞典', countryCode: 'SE', city: '斯德哥尔摩', timezone: 'Europe/Stockholm', flag: '🇸🇪' },
  // 新西兰
  { country: '新西兰', countryCode: 'NZ', city: '奥克兰', timezone: 'Pacific/Auckland', flag: '🇳🇿' },
];

export interface TimezoneEntry {
  country: string;
  countryCode: string;
  city: string;
  timezone: string;
  flag: string;
}

export interface DualTime {
  /** 目标国家/地区的当地时间 */
  localTime: string;
  /** 对应的北京时间 */
  beijingTime: string;
  /** 时区名称（如 GMT+0 / BST） */
  tzAbbr: string;
  /** 是否处于夏令时 */
  isDST: boolean;
  /** UTC 偏移（小时） */
  utcOffset: number;
  /** 标准格式化字符串："伦敦时间 2026-01-15 09:00 | 北京时间 2026-01-15 17:00" */
  formatted: string;
}

/**
 * 获取指定时区的当前时间信息
 * 使用 Intl.DateTimeFormat 原生 API，自动处理夏令时切换
 */
export function getCurrentTimeInZone(timezone: string): { time: string; isDST: boolean; utcOffset: number } {
  const now = new Date();

  // 格式化当地时间
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const time = formatter.format(now);

  // 计算 UTC 偏移量（考虑夏令时）
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });
  const parts = utcFormatter.formatToParts(now);
  const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';

  let utcOffset = 0;
  const offsetMatch = tzPart.match(/GMT([+-]\d+(?::\d+)?)/);
  if (offsetMatch) {
    const [hours, minutes] = offsetMatch[1].split(':').map(Number);
    utcOffset = hours + (minutes ? minutes / 60 * Math.sign(hours) : 0);
  }

  // 判断是否处于夏令时
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const janOffset = getTimezoneOffset(jan, timezone);
  const julOffset = getTimezoneOffset(jul, timezone);
  const stdOffset = Math.max(janOffset, julOffset); // 标准时间偏移量较大
  const currentOffset = getTimezoneOffset(now, timezone);
  const isDST = currentOffset < stdOffset;

  return { time, isDST, utcOffset };
}

/**
 * 获取指定日期在指定时区的 UTC 偏移量（分钟）
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

/**
 * 核心函数：将 UTC 时间戳转为双时间展示格式
 *
 * @param utcTimestamp - UTC 时间戳（毫秒）或 ISO 字符串
 * @param targetTimezone - 目标时区（如 'Europe/London'）
 * @returns DualTime 包含当地时间、北京时间、格式化字符串
 */
export function convertToDualTime(utcTimestamp: number | string, targetTimezone: string): DualTime {
  const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : new Date(utcTimestamp);

  // 目标当地时间
  const localFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: targetTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const localTime = localFormatter.format(date);

  // 北京时间
  const bjFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const beijingTime = bjFormatter.format(date);

  // 时区缩写
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimezone,
    timeZoneName: 'short',
  });
  const tzParts = tzFormatter.formatToParts(date);
  const tzAbbr = tzParts.find(p => p.type === 'timeZoneName')?.value || '';

  // 夏令时判断
  const { isDST, utcOffset } = getCurrentTimeInZone(targetTimezone);

  // 查找国家名称
  const entry = TIMEZONE_DATABASE.find(tz => tz.timezone === targetTimezone);
  const countryLabel = entry ? `${entry.city}时间` : '当地时间';

  const formatted = `${countryLabel} ${localTime} | 北京时间 ${beijingTime}`;

  return { localTime, beijingTime, tzAbbr, isDST, utcOffset, formatted };
}

/**
 * 一键生成双时间标准文案（后台操作人员使用）
 * 输入：目标国家时区 + 当地时间 → 输出标准格式双时间文案
 */
export function generateDualTimeText(
  targetTimezone: string,
  localDateStr: string, // "2026-01-15 09:00" 格式
): string {
  // 将当地时间转为 UTC
  const localDate = new Date(localDateStr);
  // 创建一个临时日期来获取偏移量
  const { utcOffset } = getCurrentTimeInZone(targetTimezone);
  const utcMs = localDate.getTime() - utcOffset * 3600 * 1000;

  const result = convertToDualTime(utcMs, targetTimezone);
  return result.formatted;
}

/**
 * 获取北京当前实时时间（格式化）
 */
export function getBeijingNow(): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}
