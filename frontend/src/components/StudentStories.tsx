import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import http from '@/api/http';

// ====== 学员故事墙 ======

interface Story {
  name: string;
  role: string;
  company: string;
  year: string;
  quote: string;
  content: string;
  gradient: string;
  initial: string;
}

const DEFAULT_STORIES: Story[] = [
  {
    name: '李明',
    role: '产品经理',
    company: '字节跳动',
    year: '2024届',
    quote: '从迷茫的应届生到字节产品经理，一切都值得。',
    content: '大三时我对未来毫无规划，偶然注册了启航平台。通过简历精修服务，我的简历从石沉大海到收到5家面试邀请；1v1模拟面试让我克服了紧张，最终同时拿到字节、美团、快手3个Offer。',
    gradient: 'from-primary-500 to-emerald-600',
    initial: '李',
  },
  {
    name: '张雪',
    role: '后端开发工程师',
    company: '阿里巴巴',
    year: '2024届',
    quote: '三次面试失败后，通过1v1辅导拿到了阿里P6 Offer。',
    content: '连续三次终面被刷让我几乎放弃，是启航的导师帮我复盘了每次失败的原因——不是技术不行，而是表达逻辑有问题。针对性训练两周后，我一举通过阿里面试。',
    gradient: 'from-blue-500 to-primary-600',
    initial: '张',
  },
  {
    name: '王芳',
    role: '硕士研究生',
    company: '清华大学',
    year: '2023届',
    quote: '跨专业考研上岸清华，启航帮我制定了完美计划。',
    content: '从市场营销跨考到计算机，所有人都觉得不可能。启航的考研规划模块帮我制定了详细的12个月复习计划，从基础数学到专业课，每一步都有明确目标和节奏把控。',
    gradient: 'from-primary-500 to-primary-600',
    initial: '王',
  },
  {
    name: '陈晨',
    role: '留学生',
    company: 'CMU',
    year: '2024届',
    quote: '从院校选择到文书润色，全程都有专业导师指导。',
    content: '申请季最焦虑的不是写文书，而是不知道自己的定位。启航的留学导师帮我精准定位了冲刺校和保底校，文书修改了7版，最终收到CMU、NYU、UIUC三所录取。',
    gradient: 'from-amber-500 to-orange-600',
    initial: '陈',
  },
];

export default function StudentStories() {
  const [stories, setStories] = useState<Story[]>(DEFAULT_STORIES);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // 尝试从后端获取成功案例数据
  useEffect(() => {
    http.get('/config/public')
      .then(res => {
        const config = res.data?.data?.success_cases_page_config;
        if (config?.cases && Array.isArray(config.cases) && config.cases.length > 0) {
          // 将后端数据映射为组件所需格式
          const mapped: Story[] = config.cases.slice(0, 4).map((c: Record<string, string>) => ({
            name: c.name,
            role: c.achievement || '',
            company: c.school?.split('·')[0]?.trim() || '',
            year: '',
            quote: c.quote,
            content: c.quote,
            gradient: c.color || 'from-primary-500 to-primary-600',
            initial: c.avatar || c.name?.[0] || '',
          }));
          setStories(mapped);
        }
      })
      .catch(() => {
        // API 不可用，保留默认故事
      });
  }, []);

  // 自动轮播 6s
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent(p => (p + 1) % stories.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [stories.length]);

  const go = (dir: 'prev' | 'next') => {
    clearInterval(timerRef.current);
    setCurrent(p => dir === 'next' ? (p + 1) % stories.length : (p - 1 + stories.length) % stories.length);
  };

  const story = stories[current];
  const isReversed = current % 2 === 1;

  return (
    <section className="py-12">
      {/* 标题 */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary-300" />
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            他们的故事，也是你的未来
          </h2>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary-300" />
        </div>
        <p className="text-gray-500 text-sm">来自真实学员的求职经历分享</p>
      </div>

      {/* 故事卡片 */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className={`flex ${isReversed ? 'flex-col-reverse md:flex-row-reverse' : 'flex-col md:flex-row'} gap-6 md:gap-8 items-stretch min-h-[320px]`}
          >
            {/* 图片区域 */}
            <div className={`w-full md:w-[40%] rounded-2xl bg-gradient-to-br ${story.gradient} relative overflow-hidden flex items-center justify-center min-h-[200px] md:min-h-0`}>
              {/* 装饰 */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full" />
              <div className="absolute top-6 left-6">
                <Quote className="w-8 h-8 text-white/30" />
              </div>
              {/* 首字母大字 */}
              <span className="text-[120px] md:text-[160px] font-bold text-white/20 select-none leading-none">
                {story.initial}
              </span>
              {/* 姓名标签 */}
              <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-white text-sm font-medium">{story.name}</span>
              </div>
            </div>

            {/* 文字区域 */}
            <div className="w-full md:w-[60%] flex flex-col justify-center py-2 md:py-6">
              <Quote className="w-6 h-6 text-primary-300 mb-3 hidden md:block" />
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 italic leading-snug mb-4">
                "{story.quote}"
              </h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-6">
                {story.content}
              </p>
              {/* 分隔线 + 身份信息 */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{story.name} · {story.role}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{story.company} · {story.year}</p>
                  </div>
                  <Link
                    to="/guidance"
                    className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:text-primary-700 transition-colors"
                  >
                    了解更多
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 导航按钮 */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => go('prev')}
            className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-primary-600 hover:border-primary-300 transition-colors"
            aria-label="上一个故事"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 指示器 */}
          <div className="flex gap-2">
            {stories.map((_, i) => (
              <button
                key={i}
                onClick={() => { clearInterval(timerRef.current); setCurrent(i); }}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-8 bg-primary-600' : 'w-3 bg-gray-300 hover:bg-gray-400'}`}
                aria-label={`第${i + 1}个故事`}
              />
            ))}
          </div>

          <button
            onClick={() => go('next')}
            className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-primary-600 hover:border-primary-300 transition-colors"
            aria-label="下一个故事"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
