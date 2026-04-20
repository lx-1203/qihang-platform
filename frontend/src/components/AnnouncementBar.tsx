import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X } from 'lucide-react';
import { announcementVariants } from '@/utils/animations';
import http from '@/api/http';

interface Announcement {
  id: number;
  title: string;
  link?: string;
}

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: 1, title: '2026年校园招聘正式启动，覆盖全国48个城市！', link: '/jobs?type=校园招聘' },
  { id: 2, title: '海外校招通道开放中，欢迎海外留学生投递简历', link: '/jobs?type=海外校招' },
  { id: 3, title: '"顶尖人才"计划招募中，年薪50万+等你来挑战', link: '/jobs?type=顶尖人才' },
];

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // 从后端获取公告数据，失败则使用默认值
  useEffect(() => {
    http.get('/config/public')
      .then(res => {
        const data = res.data?.data;
        if (data?.announcements && Array.isArray(data.announcements) && data.announcements.length > 0) {
          setAnnouncements(data.announcements);
        }
      })
      .catch(() => {
        // API 失败，保留默认公告
      });
  }, []);

  useEffect(() => {
    if (announcements.length <= 1 || !visible) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length, visible]);

  if (!visible || announcements.length === 0) return null;

  const current = announcements[currentIndex];

  return (
    <div className="bg-primary-50 border-b border-primary-100">
      <div className="container-main flex items-center gap-3 py-2.5">
        <Megaphone className="w-4 h-4 text-primary-600 shrink-0" />
        <div className="flex-1 overflow-hidden relative" style={{ minHeight: '20px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              variants={announcementVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-sm text-primary-800 truncate"
            >
              {current.link ? (
                <a
                  href={current.link}
                  className="hover:underline hover:text-primary-600 transition-colors"
                >
                  {current.title}
                </a>
              ) : (
                <span>{current.title}</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="p-1 text-primary-400 hover:text-primary-600 transition-colors shrink-0
            focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none"
          aria-label="关闭公告"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
