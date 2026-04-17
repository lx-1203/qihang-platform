import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, type PanInfo } from 'framer-motion';
import { MessageCircle, X, Send, HelpCircle, Calendar, Briefcase, Maximize2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

// ====== 悬浮客服按钮 "启小航" ======
// 支持自由拖拽 + 位置持久化 + 边界约束 + 边缘吸附

const STORAGE_KEY = 'qihang-float-pos';
const DRAG_THRESHOLD = 5; // 拖拽阈值(px)，低于此值视为点击
const EDGE_PADDING = 16; // 边缘吸附时距屏幕边缘的距离(px)
const BUTTON_SIZE = 56; // 按钮尺寸(px)

const quickQuestions = [
  { text: '如何投递简历？', icon: Briefcase, link: '/jobs' },
  { text: '怎么预约导师？', icon: Calendar, link: '/mentors' },
  { text: '找不到合适岗位？', icon: HelpCircle, link: '/guidance' },
];

// 从 localStorage 读取保存的位置
function getSavedPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos;
      }
    }
  } catch {
    // ignore
  }
  return { x: 0, y: 0 };
}

// 限制位置不超出屏幕边界
function clampPosition(x: number, y: number, elWidth = 56, elHeight = 56) {
  const minX = -(window.innerWidth - elWidth - 24); // 相对于 right-6 的偏移
  const minY = -(window.innerHeight - elHeight - 24);
  return {
    x: Math.max(minX, Math.min(0, x)), // x 为负值时向左移，0 为初始位置(right-6)
    y: Math.max(minY, Math.min(0, y)), // y 为负值时向上移，0 为初始位置(bottom-6)
  };
}

// 计算边缘吸附位置（吸附到最近的水平边缘）
function snapToEdge(currentX: number, elWidth = BUTTON_SIZE): number {
  // 按钮默认 fixed right-24px，x 偏移为负值代表向左移动
  // 按钮在屏幕上的实际 X 位置 = window.innerWidth - 24(right-6) - elWidth + currentX 的反方向
  // 因为 x 是从右侧的偏移量(负值向左)，实际屏幕 X = (window.innerWidth - 24 - elWidth) + currentX
  const screenX = (window.innerWidth - 24 - elWidth) + currentX;
  const centerX = screenX + elWidth / 2;
  const screenMid = window.innerWidth / 2;

  if (centerX < screenMid) {
    // 吸附到左边缘：目标 screenX = EDGE_PADDING
    // targetX = EDGE_PADDING - (window.innerWidth - 24 - elWidth)
    return EDGE_PADDING - (window.innerWidth - 24 - elWidth);
  } else {
    // 吸附到右边缘：目标 screenX = window.innerWidth - EDGE_PADDING - elWidth
    // targetX = (window.innerWidth - EDGE_PADDING - elWidth) - (window.innerWidth - 24 - elWidth) = 24 - EDGE_PADDING
    return 24 - EDGE_PADDING; // 当 EDGE_PADDING=16 时为 8，接近原始位置
  }
}

export default function FloatingService() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(getSavedPosition);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // 用于边缘吸附动画的 motion values
  const motionX = useMotionValue(position.x);
  const motionY = useMotionValue(position.y);

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // 拖拽开始：记录起始位置和时间
  const handleDragStart = useCallback(() => {
    dragStartRef.current = {
      x: position.x,
      y: position.y,
      time: Date.now(),
    };
    setIsDragging(true);
  }, [position]);

  // 拖拽结束：保存位置，区分点击和拖拽，边缘吸附
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const totalOffset = Math.abs(info.offset.x) + Math.abs(info.offset.y);
    const elapsed = Date.now() - dragStartRef.current.time;

    // 计算新位置并限制边界
    const clampedPos = clampPosition(
      dragStartRef.current.x + info.offset.x,
      dragStartRef.current.y + info.offset.y,
    );

    // 边缘吸附：X 轴吸附到最近的水平边缘
    const snappedX = snapToEdge(clampedPos.x);
    const newPos = { x: snappedX, y: clampedPos.y };

    setPosition(newPos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));

    // 用 spring 动画平滑吸附到边缘
    motionX.set(snappedX);
    motionY.set(clampedPos.y);

    // 短距离 + 短时间 = 点击
    if (totalOffset < DRAG_THRESHOLD && elapsed < 200) {
      setIsOpen(prev => !prev);
    }

    // 延迟重置拖拽状态，防止触发 onClick
    requestAnimationFrame(() => setIsDragging(false));
  }, [motionX, motionY]);

  // 点击按钮（仅非拖拽时响应）
  const handleButtonClick = useCallback(() => {
    if (!isDragging) {
      setIsOpen(prev => !prev);
    }
  }, [isDragging]);

  // "开始咨询"按钮行为
  const handleStartChat = useCallback(() => {
    setIsOpen(false);
    if (isAuthenticated) {
      navigate('/chat');
    } else {
      navigate('/login?returnUrl=/chat');
    }
  }, [isAuthenticated, navigate]);

  return (
    <motion.div
      ref={panelRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={{ x: position.x, y: position.y, opacity: isDragging ? 0.8 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ touchAction: 'manipulation' }}
      className="fixed bottom-6 right-6 z-[60]"
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          /* ====== 展开面板 ====== */
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="w-80 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          >
            {/* 顶部渐变条 */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">启小航</h4>
                  <p className="text-white/70 text-[10px]">在线服务</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* 打开完整聊天页 */}
                <button
                  onClick={handleStartChat}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="打开完整聊天页"
                  title="打开完整聊天页"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* 问候语 */}
            <div className="px-5 pt-4 pb-2">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  👋 你好！我是启航平台的智能助手。
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  有什么可以帮你的？点击下方快捷问题或直接咨询。
                </p>
              </div>
            </div>

            {/* 快捷问题 */}
            <div className="px-5 py-3 space-y-2">
              {quickQuestions.map((q) => (
                <Link
                  key={q.text}
                  to={q.link}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary-50 transition-colors group"
                >
                  <q.icon className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  <span className="text-sm text-gray-700 group-hover:text-primary-700 transition-colors">{q.text}</span>
                </Link>
              ))}
            </div>

            {/* 底部操作 */}
            <div className="px-5 pb-4 pt-1">
              <button
                onClick={handleStartChat}
                className="flex items-center justify-center gap-2 w-full bg-primary-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                开始咨询
              </button>
            </div>
          </motion.div>
        ) : (
          /* ====== 收起按钮（可拖拽） ====== */
          <motion.button
            key="button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleButtonClick}
            className="relative flex flex-col items-center cursor-grab active:cursor-grabbing"
            aria-label="打开客服助手"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow">
              <MessageCircle className="w-6 h-6 text-white" />
              {/* 呼吸光圈 */}
              <span className="absolute inset-0 rounded-full bg-primary-400/30 animate-ping" style={{ animationDuration: '3s' }} />
            </div>
            <span className="text-[10px] text-gray-500 font-medium mt-1">启小航</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
