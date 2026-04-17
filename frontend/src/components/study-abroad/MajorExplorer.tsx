import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Tag from '@/components/ui/Tag';
import {
  Monitor,
  TrendingUp,
  Cpu,
  BookOpen,
  Heart,
  Palette,
  Target,
  ChevronRight,
  Flame,
} from 'lucide-react';
import majorsData from '../../data/study-abroad-majors.json';

// ---------- 类型定义 ----------

interface Major {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  hot: boolean;
  avgSalary: string;
  topCountries: string[];
  topSchools: string[];
  careerPaths: string[];
}

interface MajorCategory {
  category: string;
  icon: string;
  color: string;
  majors: Major[];
}

// ---------- 图标 & 颜色映射 ----------

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Laptop: Monitor,
  TrendingUp,
  Cpu,
  BookOpen,
  HeartPulse: Heart,
  Palette,
};

const colorMap: Record<string, { text: string; bg: string }> = {
  blue: { text: 'text-blue-500', bg: 'bg-blue-50' },
  emerald: { text: 'text-emerald-500', bg: 'bg-emerald-50' },
  indigo: { text: 'text-indigo-500', bg: 'bg-indigo-50' },
  rose: { text: 'text-rose-500', bg: 'bg-rose-50' },
  red: { text: 'text-red-500', bg: 'bg-red-50' },
  purple: { text: 'text-purple-500', bg: 'bg-purple-50' },
};

// ---------- 常量 ----------

const MAX_VISIBLE = 4;

// ---------- 组件 ----------

export default function MajorExplorer() {
  // 每个分类独立的展开状态
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (category: string) =>
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));

  const categories = majorsData as MajorCategory[];

  return (
    <section className="py-12">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/10">
          <Target className="text-primary-500" size={22} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          <span className="mr-1">🎯</span>探索专业方向
        </h2>
      </div>

      {/* 3×2 网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat, idx) => {
          const Icon = iconMap[cat.icon] ?? Monitor;
          const colors = colorMap[cat.color] ?? colorMap.blue;
          const isExpanded = !!expanded[cat.category];
          const visibleMajors = isExpanded
            ? cat.majors
            : cat.majors.slice(0, MAX_VISIBLE);
          const hasMore = cat.majors.length > MAX_VISIBLE;

          return (
            <motion.div
              key={cat.category}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
            >
              {/* 头部：图标 + 分类名 + 数量角标 */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-lg ${colors.bg}`}
                >
                  <Icon className={colors.text} size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {cat.category}
                </h3>
                <Tag variant="gray" size="sm" className="ml-auto">
                  {cat.majors.length} 个专业
                </Tag>
              </div>

              {/* 专业列表 */}
              <ul className="flex-1 space-y-1">
                {visibleMajors.map((major) => (
                  <li key={major.id}>
                    <Link
                      to={`/study-abroad/programs?major=${encodeURIComponent(major.name)}`}
                      className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-sm text-gray-900 group-hover:text-primary-500 transition-colors">
                        {major.name}
                        {major.hot && (
                          <Flame
                            size={14}
                            className="text-orange-500 flex-shrink-0"
                          />
                        )}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        {major.avgSalary}
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-500"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* 查看更多 / 收起 */}
              {hasMore && (
                <button
                  onClick={() => toggle(cat.category)}
                  className="mt-3 text-sm font-medium text-primary-500 hover:text-primary-700 transition-colors self-start flex items-center gap-1"
                >
                  {isExpanded ? '收起' : '查看更多'}
                  <ChevronRight
                    size={14}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
