import { useState } from 'react';
import { ChevronDown, HelpCircle, Briefcase, GraduationCap, BookOpen, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfigStore } from '@/store/config';

const ICON_MAP: Record<string, LucideIcon> = {
  HelpCircle, Briefcase, GraduationCap, BookOpen, Shield,
};

interface FAQItem {
  q: string;
  a: string;
  icon: string;
  category: string;
}

const DEFAULT_FAQ_ITEMS: FAQItem[] = [
  {
    q: '启航平台是什么？',
    a: '启航平台是一站式大学生成长平台，当前公开端聚焦职业规划、能力提升、升学深造、求职招聘与创业等核心板块。',
    icon: 'HelpCircle',
    category: 'general',
  },
  {
    q: '如何搜索和投递岗位？',
    a: '点击顶部导航中的「求职招聘」进入岗位列表页，支持按关键词、城市、岗位类型筛选。找到目标岗位后即可投递简历。',
    icon: 'Briefcase',
    category: 'job',
  },
  {
    q: '能力提升板块有什么？',
    a: '能力提升板块整合了职业指导外链、图文资源库和成功案例内容。免费资源可直接访问，VIP 资源会明确标识。',
    icon: 'BookOpen',
    category: 'resource',
  },
  {
    q: '升学相关资源在哪里看？',
    a: '考研、保研、留学等内容已统一归入「升学深造」板块，可按目标方向查看时间线、案例和准备建议。',
    icon: 'GraduationCap',
    category: 'postgrad',
  },
  {
    q: '我的个人信息安全吗？',
    a: '平台会对身份信息和业务数据做严格保护，企业和导师账号也需要经过资质审核后才能开放完整能力。',
    icon: 'Shield',
    category: 'account',
  },
  {
    q: '如何修改个人资料？',
    a: '登录后进入「个人中心」中的资料页，即可编辑姓名、头像、教育背景、求职意向等信息。',
    icon: 'HelpCircle',
    category: 'account',
  },
  {
    q: '投递的简历状态怎么查看？',
    a: '登录后进入「个人中心」中的投递记录页可查看所有投递记录和状态更新。企业简历池按待筛选、通过、淘汰三状态流转。',
    icon: 'Briefcase',
    category: 'job',
  },
  {
    q: '如何联系客服？',
    a: '你可以直接在当前聊天窗口发送消息联系在线客服，或点击右下角悬浮入口发起对话。',
    icon: 'HelpCircle',
    category: 'general',
  },
  {
    q: '平台支持哪些浏览器？',
    a: '启航平台支持 Chrome、Firefox、Safari、Edge 等主流浏览器的最新版本，建议优先使用 Chrome。',
    icon: 'HelpCircle',
    category: 'general',
  },
];

export default function FAQList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items: FAQItem[] = useConfigStore.getState().getJson?.('faq_items') || DEFAULT_FAQ_ITEMS;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary-500" />
        <h3 className="font-semibold text-gray-900">常见问题</h3>
      </div>
      {items.map((item, i) => {
        const Icon = ICON_MAP[item.icon] || HelpCircle;
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 flex-1">{item.q}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 pt-0 pl-11">
                    <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
