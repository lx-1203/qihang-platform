import { useState } from 'react';
import { ChevronDown, HelpCircle, Briefcase, GraduationCap, Users, BookOpen, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ_ITEMS = [
  { q: '启航平台是什么？', a: '启航平台是一站式大学生综合发展与就业指导平台，融合求职招聘、职业辅导、考研考公、创新创业四大核心场景。', icon: HelpCircle, category: 'general' },
  { q: '如何搜索和投递岗位？', a: '点击顶部导航「找工作」进入岗位列表页，支持按关键词、城市、岗位类型筛选。找到心仪岗位后点击「投递简历」即可。', icon: Briefcase, category: 'job' },
  { q: '如何预约导师咨询？', a: '进入「导师」页面浏览导师列表，选择心仪导师后点击「预约咨询」，选择时间段即可完成预约。', icon: Users, category: 'mentor' },
  { q: '平台课程收费吗？', a: '平台提供丰富的免费课程，涵盖面试技巧、简历指导、行业分析等。部分高级定制课程可能需要付费。', icon: BookOpen, category: 'course' },
  { q: '考研/考公有什么资源？', a: '平台提供完整的考研考公资讯、经验分享和备考课程，访问「考研」或「考公」频道获取更多信息。', icon: GraduationCap, category: 'postgrad' },
  { q: '我的个人信息安全吗？', a: '我们采用银行级加密技术保护你的数据，企业和导师均经过严格资质审核。查看我们的隐私政策了解更多。', icon: Shield, category: 'account' },
  { q: '如何修改个人资料？', a: '登录后进入「个人中心」→「我的资料」即可编辑姓名、头像、教育背景、求职意向等信息。', icon: HelpCircle, category: 'account' },
  { q: '投递的简历状态怎么查看？', a: '登录后进入「个人中心」→「我的投递」可查看所有投递记录和状态（已投递/已查看/面试邀请/已拒绝）。', icon: Briefcase, category: 'job' },
  { q: '如何联系客服？', a: '你可以直接在本聊天窗口发送消息联系在线客服，或点击右下角的「启小航」悬浮按钮发起对话。', icon: HelpCircle, category: 'general' },
  { q: '平台支持哪些浏览器？', a: '启航平台支持 Chrome、Firefox、Safari、Edge 等主流浏览器的最新版本，建议使用 Chrome 获得最佳体验。', icon: HelpCircle, category: 'general' },
];

export default function FAQList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary-500" />
        <h3 className="font-semibold text-gray-900">常见问题</h3>
      </div>
      {FAQ_ITEMS.map((item, i) => {
        const Icon = item.icon;
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
