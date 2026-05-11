export const PLATFORM_RESET_RULES = {
  community: ['社区', '论坛', '交流区', '圈子'],
  publicMentorBooking: ['预约导师', '导师1v1', '一对一导师', '优先预约权', '/student/appointments'],
  publicMentorBookingFuzzy: [/导师.*预约|预约.*导师|1v1.*咨询.*导师/i],
} as const;

const RULE_GROUPS = Object.values(PLATFORM_RESET_RULES);

export function collectPlatformResetViolations(source: string): string[] {
  const matches: string[] = [];

  for (const group of RULE_GROUPS) {
    for (const pattern of group) {
      if (typeof pattern === 'string') {
        if (source.includes(pattern) && !matches.includes(pattern)) {
          matches.push(pattern);
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(source)) {
          const patternStr = pattern.toString();
          if (!matches.includes(patternStr)) {
            matches.push(patternStr);
          }
        }
      }
    }
  }

  return matches;
}
