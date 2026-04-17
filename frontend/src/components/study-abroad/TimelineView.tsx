import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, AlertTriangle, Video, Lightbulb, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import timelineData from '../../data/study-abroad-timeline.json';
import http from '../../api/http';
import Tag from '@/components/ui/Tag';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'event' | 'deadline' | 'live' | 'tips';
  category: string;
  icon: string;
  color: string;
  link: string | null;
  tags: string[];
}

const typeColors: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  deadline: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
  live: { dot: 'bg-primary-500', bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-100' },
  event: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  tips: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
};

const typeTagVariant: Record<string, 'red' | 'primary' | 'orange' | 'green'> = {
  deadline: 'red',
  live: 'primary',
  event: 'orange',
  tips: 'green',
};

function getTypeIcon(type: string) {
  switch (type) {
    case 'deadline':
      return <AlertTriangle size={14} />;
    case 'live':
      return <Video size={14} />;
    case 'event':
      return <Clock size={14} />;
    case 'tips':
      return <Lightbulb size={14} />;
    default:
      return <Calendar size={14} />;
  }
}

function parseMonthKey(dateStr: string): string {
  // Expected format: "YYYY-MM-DD" or "YYYY/MM/DD" or similar
  const match = dateStr.match(/(\d{4})[-/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}`;
  }
  return dateStr;
}

function formatMonthLabel(monthKey: string): string {
  const match = monthKey.match(/(\d{4})-(\d{2})/);
  if (match) {
    const month = parseInt(match[2], 10);
    return `${month}月`;
  }
  return monthKey;
}

/** 将 API 返回的 snake_case 行映射为 TimelineEvent */
function mapApiTimeline(row: Record<string, unknown>): TimelineEvent {
  const dateVal = typeof row.date === 'string' ? row.date : '';
  return {
    id: String(row.id),
    date: dateVal.slice(0, 10) || dateVal,
    title: (row.title as string) || '',
    description: (row.description as string) || '',
    type: (row.type as TimelineEvent['type']) || 'event',
    category: (row.category as string) || '',
    icon: (row.icon as string) || '',
    color: (row.color as string) || '',
    link: (row.link as string) || null,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (Array.isArray(row.tags) ? row.tags as string[] : []),
  };
}

export default function TimelineView() {
  const [events, setEvents] = useState<TimelineEvent[]>(timelineData as TimelineEvent[]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // 尝试从 API 加载数据，失败则保持 JSON 数据
  useEffect(() => {
    http.get('/study-abroad/timeline')
      .then(res => {
        const apiList = res.data.data;
        if (Array.isArray(apiList) && apiList.length > 0) {
          setEvents(apiList.map(mapApiTimeline));
        }
      })
      .catch(() => {
        // API 不可用时静默使用 JSON 数据
      });
  }, []);

  // Group events by month and get sorted month keys
  const monthGroups = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    events.forEach((event) => {
      const key = parseMonthKey(event.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    });
    return groups;
  }, [events]);

  const sortedMonths = useMemo(
    () => Object.keys(monthGroups).sort(),
    [monthGroups]
  );

  // Filter events based on selected month
  const filteredEvents = useMemo(() => {
    if (!selectedMonth) return events;
    return monthGroups[selectedMonth] || [];
  }, [selectedMonth, events, monthGroups]);

  const CardWrapper = ({
    event,
    children,
  }: {
    event: TimelineEvent;
    children: React.ReactNode;
  }) => {
    if (event.link) {
      return (
        <Link to={event.link} className="block group">
          {children}
        </Link>
      );
    }
    return <>{children}</>;
  };

  return (
    <section className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Calendar size={22} className="text-primary-500" />
        <h2 className="text-xl font-bold text-gray-900">
          重要时间节点
        </h2>
      </div>

      {/* Month cards row */}
      <div className="overflow-x-auto flex gap-2 snap-x snap-mandatory pb-2 scrollbar-hide">
        {/* "All" button */}
        <button
          onClick={() => setSelectedMonth(null)}
          className={`snap-center min-w-[80px] flex flex-col items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-all flex-shrink-0 ${
            selectedMonth === null
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span>全部</span>
          <span
            className={`text-xs mt-0.5 rounded-full px-1.5 ${
              selectedMonth === null ? 'text-primary-100' : 'text-gray-400'
            }`}
          >
            {events.length}
          </span>
        </button>

        {sortedMonths.map((monthKey) => {
          const count = monthGroups[monthKey].length;
          const isActive = selectedMonth === monthKey;
          return (
            <button
              key={monthKey}
              onClick={() => setSelectedMonth(monthKey)}
              className={`snap-center min-w-[80px] flex flex-col items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <span>{formatMonthLabel(monthKey)}</span>
              <span
                className={`text-xs mt-0.5 rounded-full px-1.5 ${
                  isActive ? 'text-primary-100' : 'text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vertical timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {filteredEvents.map((event, index) => {
            const colors = typeColors[event.type] || typeColors.event;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="relative"
              >
                {/* Dot on the line */}
                <div
                  className={`absolute -left-8 top-3 w-[10px] h-[10px] rounded-full ${colors.dot} ring-2 ring-white`}
                  style={{ transform: 'translateX(6px)' }}
                />

                <CardWrapper event={event}>
                  <div
                    className={`bg-white rounded-2xl border ${colors.border} shadow-sm hover:shadow-md transition-all p-4`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Type badge + date */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Tag variant={typeTagVariant[event.type] || 'orange'} size="xs" className="gap-1">
                            {getTypeIcon(event.type)}
                            {event.type === 'deadline'
                              ? '截止日期'
                              : event.type === 'live'
                                ? '直播'
                                : event.type === 'event'
                                  ? '事件'
                                  : '提示'}
                          </Tag>
                          <span className="text-xs font-semibold text-gray-900">
                            {event.date}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-bold text-gray-900 leading-snug">
                          {event.title}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>

                        {/* Tags */}
                        {event.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {event.tags.map((tag) => (
                              <Tag key={tag} variant="gray" size="xs" className="rounded">
                                {tag}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Link indicator */}
                      {event.link && (
                        <ChevronRight
                          size={16}
                          className="text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1"
                        />
                      )}
                    </div>
                  </div>
                </CardWrapper>
              </motion.div>
            );
          })}

          {/* Empty state */}
          {filteredEvents.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              当前月份暂无事件
            </div>
          )}
        </div>
      </div>

      {/* Scrollbar hide style */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
