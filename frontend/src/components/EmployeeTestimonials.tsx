import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, Loader2 } from 'lucide-react';
import http from '@/api/http';
import { testimonialVariants, getCarouselGPUStyle } from '@/utils/animations';

interface Testimonial {
  id: number;
  name: string;
  department: string;
  title: string;
  school: string;
  major: string;
  quote: string;
  avatar: string | null;
}

export default function EmployeeTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = testimonials.length;

  // 从后端 API 获取伙伴心声数据
  useEffect(() => {
    http.get('/testimonials')
      .then((res) => {
        if (res.data?.code === 200 && Array.isArray(res.data.data)) {
          setTestimonials(res.data.data);
        } else {
          setError('数据格式异常');
        }
      })
      .catch(() => {
        setError('加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const goTo = useCallback((index: number, dir: number) => {
    setDirection(dir);
    setCurrent(index);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % total, 1);
  }, [current, total, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total, -1);
  }, [current, total, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  // 加载状态
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Quote className="w-5 h-5 text-primary-600" />
            伙伴心声
          </h3>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      </div>
    );
  }

  // 错误或无数据
  if (error || total === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Quote className="w-5 h-5 text-primary-600" />
            伙伴心声
          </h3>
        </div>
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          {error || '暂无数据'}
        </div>
      </div>
    );
  }

  const item = testimonials[current];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Quote className="w-5 h-5 text-primary-600" />
          伙伴心声
        </h3>
        <p className="text-xs text-gray-500 mt-1">听听他们怎么说</p>
      </div>

      <div className="relative overflow-hidden" style={{ minHeight: '220px' }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={testimonialVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={getCarouselGPUStyle()}
            className="p-5"
          >
            <div className="relative pl-4 border-l-4 border-primary-200">
              <Quote className="absolute -left-2 -top-1 w-6 h-6 text-primary-300 bg-white" />
              <p className="text-sm text-gray-700 leading-relaxed italic">
                {item.quote}
              </p>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                {item.name[0]}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500">{item.department} · {item.title}</div>
                <div className="text-xs text-gray-400">{item.school} · {item.major}</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/50">
        <div className="flex gap-1.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-primary-500' : 'w-3 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`查看第${i + 1}条推荐语`}
            />
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors
              focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none"
            aria-label="上一条"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors
              focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none"
            aria-label="下一条"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
