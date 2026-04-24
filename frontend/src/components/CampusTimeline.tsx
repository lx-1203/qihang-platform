import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Megaphone, BookOpen, Building2, Users,
  FileText, RefreshCw, Mail, PartyPopper,
  Calendar,
} from 'lucide-react';
import Tag from '@/components/ui/Tag';
import { useConfigStore } from '@/store/config';

// ====== 图标名称 → Lucide 组件映射 ======
const ICON_MAP: Record<string, typeof Megaphone> = {
  Megaphone, BookOpen, Building2, Users, FileText, RefreshCw, Mail, PartyPopper,
};

// ====== 类型配置（保持不变，属于UI样式常量） ======

const typeConfig = {
  deadline: { color: 'bg-red-500', ring: 'ring-red-200', badge: 'bg-red-50 text-red-700', label: '截止日期' },
  event: { color: 'bg-blue-500', ring: 'ring-blue-200', badge: 'bg-blue-50 text-blue-700', label: '活动' },
  live: { color: 'bg-green-500', ring: 'ring-green-200', badge: 'bg-green-50 text-green-700', label: '直播' },
  tips: { color: 'bg-amber-500', ring: 'ring-amber-200', badge: 'bg-amber-50 text-amber-700', label: '提醒' },
} as const;

// ====== 校招日历默认时间轴数据 ======
// 当后端配置不可用时作为 fallback

const DEFAULT_TIMELINE = [
  {
    date: '2月20日',
    title: '2026春招正式开启',
    description: '首批春招岗位上线，抢先投递赢在起跑线',
    type: 'event' as const,
    icon: 'Megaphone',
    link: '/jobs',
  },
  {
    date: '3月1日',
    title: '简历精修直播课',
    description: 'HR教你打造满分简历，提升面试邀约率',
    type: 'live' as const,
    icon: 'BookOpen',
    link: '/courses',
  },
  {
    date: '3月15日',
    title: '名企春招网申通道开放',
    description: '各大厂集中开放春招网申，务必在截止前投递',
    type: 'deadline' as const,
    icon: 'Building2',
    link: '/jobs',
  },
  {
    date: '4月1日',
    title: '模拟面试训练营报名启动',
    description: '1v1模拟面试，真实还原大厂面试全流程',
    type: 'event' as const,
    icon: 'Users',
    link: '/mentors',
  },
  {
    date: '5月1日',
    title: '暑期实习申请截止提醒',
    description: '名企暑期实习岗位陆续截止，抓紧最后机会',
    type: 'deadline' as const,
    icon: 'FileText',
    link: '/jobs',
  },
  {
    date: '6月15日',
    title: '秋招提前批预告',
    description: '部分企业提前开放秋招通道，提前做好准备',
    type: 'tips' as const,
    icon: 'RefreshCw',
    link: '/jobs',
  },
  {
    date: '8月1日',
    title: '2026秋招提前批启动',
    description: '头部企业率先开启秋招，抢占先机',
    type: 'event' as const,
    icon: 'Megaphone',
    link: '/jobs',
  },
  {
    date: '9月1日',
    title: '秋招全面开启',
    description: '秋招高峰期来临，海量岗位等你来投',
    type: 'tips' as const,
    icon: 'PartyPopper',
    link: '/jobs',
  },
];

export default function CampusTimeline() {
  // 从 config store 读取校招时间轴配置，fallback 到默认值
  const campusTimeline = useConfigStore(s => s.getJson('campus_timeline', DEFAULT_TIMELINE));
  const timeline = Array.isArray(campusTimeline) && campusTimeline.length > 0
    ? campusTimeline
    : DEFAULT_TIMELINE;
  return (
    <section className="py-12">
      {/* 标题 */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary-50 rounded-full px-4 py-1.5 mb-4">
          <Calendar className="w-4 h-4 text-primary-600" />
          <span className="text-xs text-primary-700 font-medium">校招日历</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          校招季重要时间节点
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          关键日期早知道，不错过每一个机会
        </p>
      </div>

      {/* 垂直时间轴 */}
      <div className="relative max-w-2xl mx-auto">
        {/* 竖线 */}
        <div className="absolute left-5 md:left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-300 via-primary-200 to-gray-200" />

        <div className="space-y-6">
          {timeline.map((event, i) => {
            const config = typeConfig[event.type];
            const EventIcon = ICON_MAP[event.icon] || Megaphone;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="relative flex gap-4 md:gap-6 group"
              >
                {/* 节点圆点 */}
                <div className="relative z-10 flex-shrink-0 mt-1">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${config.color} ring-4 ${config.ring} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                    <EventIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                </div>

                {/* 事件内容 */}
                <Link
                  to={event.link}
                  className="flex-1 bg-white rounded-xl p-4 md:p-5 border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group-hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {/* 日期 */}
                    <span className="text-sm font-bold text-gray-900">{event.date}</span>
                    {/* 类型标签 */}
                    <Tag
                      variant={
                        event.type === 'deadline' ? 'red' :
                        event.type === 'event' ? 'blue' :
                        event.type === 'live' ? 'green' : 'yellow'
                      }
                      size="xs"
                    >
                      {config.label}
                    </Tag>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-1">
                    {event.title}
                  </h4>
                  <p className="text-sm text-gray-500">{event.description}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
