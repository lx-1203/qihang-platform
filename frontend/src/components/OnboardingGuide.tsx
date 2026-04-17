import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2,
  User, Briefcase, BookOpen, Calendar, Heart,
  Building2, FileText, Search, Settings,
  Video, Users, BarChart, Star, Rocket,
  MessageCircle, Zap
} from 'lucide-react';
import Tag from '@/components/ui/Tag';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ====== 新手引导教程组件 ======
// 根据角色展示不同的操作流程引导
// 首次访问时自动弹出，可手动重新打开

export type GuideRole = 'student' | 'company' | 'mentor' | 'admin';

interface GuideStep {
  title: string;
  desc: string;
  icon: typeof User;
  color: string;
  bg: string;
  link?: string;
  linkText?: string;
  tips?: string[];
  /** 气泡模式：目标元素选择器 */
  targetSelector?: string;
  /** 气泡模式：气泡位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/** 气泡引导步骤配置 */
export interface BubbleGuideStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  icon?: typeof User;
}

const ROLE_GUIDES: Record<GuideRole, { welcome: string; subtitle: string; steps: GuideStep[] }> = {
  student: {
    welcome: '欢迎来到启航平台！',
    subtitle: '你的职业生涯，从这里启航。以下是快速上手指南：',
    steps: [
      {
        title: '第一步：完善个人资料',
        desc: '上传头像、填写教育背景和技能特长，完善的资料能让企业更快注意到你。',
        icon: User,
        color: 'text-primary-600',
        bg: 'bg-primary-50',
        link: '/student/profile',
        linkText: '去完善资料',
        tips: ['填写真实学校和专业信息', '添加至少3个技能标签', '上传简历文件（支持PDF）'],
      },
      {
        title: '第二步：浏览岗位并投递',
        desc: '搜索心仪的实习/校招岗位，一键投递简历，跟踪投递状态。',
        icon: Briefcase,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        link: '/jobs',
        linkText: '去找工作',
        tips: ['使用筛选器精准匹配', '关注岗位截止日期', '投递后可在「我的投递」追踪进度'],
      },
      {
        title: '第三步：预约导师辅导',
        desc: '找到擅长你目标领域的导师，预约1对1辅导，获得专业指导。',
        icon: MessageCircle,
        color: 'text-primary-600',
        bg: 'bg-primary-50',
        link: '/mentors',
        linkText: '去找导师',
        tips: ['查看导师评价和擅长方向', '预约前准备好你的问题', '辅导结束后记得给导师评价'],
      },
      {
        title: '第四步：学习干货课程',
        desc: '免费观看行业大咖的公开课和求职技巧课程，提升竞争力。',
        icon: BookOpen,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        link: '/courses',
        linkText: '去看课程',
        tips: ['按分类筛选感兴趣的方向', '收藏喜欢的课程方便复习'],
      },
      {
        title: '第五步：收藏 & 追踪',
        desc: '收藏感兴趣的职位、课程和导师，在消息中心接收投递反馈通知。',
        icon: Heart,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        link: '/student/favorites',
        linkText: '查看收藏',
        tips: ['定期查看消息中心获取最新动态', '关注企业发来的面试邀请'],
      },
    ],
  },
  company: {
    welcome: '企业招聘平台',
    subtitle: '高效连接优质人才，以下是您的招聘工作流程：',
    steps: [
      {
        title: '第一步：完善企业资料',
        desc: '填写企业基本信息、上传营业执照，提交资质认证审核。认证通过后方可发布职位。',
        icon: Building2,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        link: '/company/profile',
        linkText: '去完善资料',
        tips: ['企业名称需与营业执照一致', '完善的企业简介能吸引更多投递', '审核通常在1-3个工作日内完成'],
      },
      {
        title: '第二步：发布招聘职位',
        desc: '创建实习/校招/全职岗位，设置薪资、要求、工作地点等信息。',
        icon: Briefcase,
        color: 'text-green-600',
        bg: 'bg-green-50',
        link: '/company/jobs',
        linkText: '去发布职位',
        tips: ['详细描述岗位职责和要求', '合理设置薪资区间吸引人才', '可随时上下架职位'],
      },
      {
        title: '第三步：管理简历投递',
        desc: '在简历池中查看所有投递，使用看板式流程管理（待筛选→面试→录用）。',
        icon: FileText,
        color: 'text-primary-600',
        bg: 'bg-primary-50',
        link: '/company/resumes',
        linkText: '查看简历池',
        tips: ['及时查看新投递，避免人才流失', '使用状态流转追踪每位候选人', '可直接发起面试邀请'],
      },
      {
        title: '第四步：搜索人才库',
        desc: '主动搜索平台注册学生，按学校、专业、技能等条件精准筛选。',
        icon: Search,
        color: 'text-primary-600',
        bg: 'bg-primary-50',
        link: '/company/talent',
        linkText: '搜索人才',
        tips: ['支持多维度组合筛选', '收藏优质候选人以便后续联系'],
      },
    ],
  },
  mentor: {
    welcome: '导师工作台',
    subtitle: '分享你的经验，帮助更多学生成长。以下是入驻流程：',
    steps: [
      {
        title: '第一步：完善导师资料',
        desc: '填写个人简介、擅长领域、辅导价格和可预约时间段，提交资质审核。',
        icon: User,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        link: '/mentor/profile',
        linkText: '去完善资料',
        tips: ['详细描述你的从业经历和擅长领域', '设置合理的辅导价格', '提供多个可预约时间段增加曝光'],
      },
      {
        title: '第二步：创建课程内容',
        desc: '上传公开课、录播课程或直播课程，分享你的行业经验和求职技巧。',
        icon: Video,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        link: '/mentor/courses',
        linkText: '去创建课程',
        tips: ['选择合适的课程分类', '添加精准的标签方便学生搜索', '免费课程能帮你快速积累口碑'],
      },
      {
        title: '第三步：管理学生预约',
        desc: '查看和确认学生的辅导预约申请，安排辅导时间。',
        icon: Calendar,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        link: '/mentor/appointments',
        linkText: '查看预约',
        tips: ['及时确认预约避免学生等待', '辅导前了解学生的具体需求', '辅导结束后引导学生评价'],
      },
      {
        title: '第四步：查看评价 & 数据',
        desc: '关注学生评价反馈，查看工作台数据报表，持续优化辅导质量。',
        icon: Star,
        color: 'text-primary-600',
        bg: 'bg-primary-50',
        link: '/mentor/dashboard',
        linkText: '查看数据',
        tips: ['高评分导师会获得平台推荐加权', '积极回复学生评价展示专业态度'],
      },
    ],
  },
  admin: {
    welcome: '管理后台',
    subtitle: '平台全局管控中心，以下是管理工作流程：',
    steps: [
      {
        title: '数据监控',
        desc: '查看平台整体运营数据：用户增长、活跃度、投递量等核心指标。',
        icon: BarChart,
        color: 'text-primary-600',
        bg: 'bg-primary-50',
        link: '/admin/dashboard',
        linkText: '查看数据',
        tips: ['关注日注册量和周活跃趋势', '异常数据波动需及时排查'],
        targetSelector: '[data-guide="stats-cards"]',
        position: 'bottom',
      },
      {
        title: '用户管理',
        desc: '管理所有注册用户，查看角色分布，处理违规账号。',
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        link: '/admin/users',
        linkText: '管理用户',
        tips: ['可按角色筛选查看', '禁用账号前确认违规事实'],
        targetSelector: '[data-guide="role-distribution"]',
        position: 'top',
      },
      {
        title: '内容审核',
        desc: '管理平台上的职位和课程内容，确保信息合规、真实有效。',
        icon: Video,
        color: 'text-green-600',
        bg: 'bg-green-50',
        link: '/admin/content',
        linkText: '管理内容',
        tips: ['定期清理过期的职位信息', '审核课程内容是否符合平台规范'],
        targetSelector: '[data-guide="pending-actions"]',
        position: 'left',
      },
      {
        title: '设置配置',
        desc: '管理站点配置、品牌信息、SEO设置，查看操作审计日志。',
        icon: Settings,
        color: 'text-red-600',
        bg: 'bg-red-50',
        link: '/admin/settings',
        linkText: '去设置',
        tips: ['修改配置后实时生效，请谨慎操作', '定期查看审计日志排查异常'],
        targetSelector: '[data-guide="audit-log"]',
        position: 'right',
      },
    ],
  },
};

interface OnboardingGuideProps {
  role: GuideRole;
  /** 是否以内嵌卡片形式展示（而非弹窗） */
  inline?: boolean;
  /** 是否使用气泡式引导模式（定位到页面元素） */
  bubbleMode?: boolean;
  /** 外部控制是否显示 */
  forceShow?: boolean;
}

export default function OnboardingGuide({ role, inline = false, bubbleMode = false, forceShow }: OnboardingGuideProps) {
  const storageKey = `qihang_onboarding_${role}`;
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const prefersReduced = useReducedMotion();

  // 根据用户动画偏好选择过渡配置
  const modalTransition = prefersReduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 300, damping: 30 };
  const bubbleTransition = prefersReduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 300, damping: 25 };
  const stepTransition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.2 };

  const guide = ROLE_GUIDES[role];
  const steps = guide.steps;

  // 计算气泡位置
  const updateBubblePosition = useCallback((stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step?.targetSelector) {
      setBubblePos(null);
      return;
    }

    // 先清理旧目标元素的高亮样式（安全网）
    if (targetRef.current) {
      targetRef.current.style.boxShadow = '';
      targetRef.current.style.position = '';
      targetRef.current.style.zIndex = '';
      targetRef.current = null;
    }

    const target = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!target) {
      setBubblePos(null);
      return;
    }

    targetRef.current = target;
    const rect = target.getBoundingClientRect();

    // 高亮目标元素
    target.style.boxShadow = '0 0 0 3px rgba(20, 184, 166, 0.4), 0 0 20px rgba(20, 184, 166, 0.2)';
    target.style.position = 'relative';
    target.style.zIndex = '9992';

    let top = 0;
    let left = 0;
    const position = step.position || 'bottom';

    switch (position) {
      case 'top':
        top = rect.top - 120 + window.scrollY;
        left = rect.left + rect.width / 2 - 140 + window.scrollX;
        break;
      case 'bottom':
        top = rect.bottom + 16 + window.scrollY;
        left = rect.left + rect.width / 2 - 140 + window.scrollX;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - 60 + window.scrollY;
        left = rect.left - 320 + window.scrollX;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - 60 + window.scrollY;
        left = rect.right + 16 + window.scrollX;
        break;
    }

    setBubblePos({ top, left });
  }, [steps]);

  useEffect(() => {
    if (inline) return;

    // 首次访问或强制显示
    const seen = localStorage.getItem(storageKey);
    if (!seen || forceShow) {
      setVisible(true);
    }
  }, [role, inline, storageKey, forceShow]);

  // 气泡模式下更新位置
  useEffect(() => {
    if (visible && bubbleMode && bubblePos === null) {
      // 延迟一帧确保 DOM 已渲染
      requestAnimationFrame(() => {
        updateBubblePosition(currentStep);
      });
    }
  }, [visible, bubbleMode, currentStep, bubblePos, updateBubblePosition]);

  function handleClose() {
    setVisible(false);
    localStorage.setItem(storageKey, 'true');
    // 清除高亮
    if (targetRef.current) {
      targetRef.current.style.boxShadow = '';
      targetRef.current.style.position = '';
      targetRef.current.style.zIndex = '';
    }
    setBubblePos(null);
  }

  function handleReset() {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
    setCompleted(new Set());
    setVisible(true);
    if (bubbleMode) {
      setBubblePos(null);
    }
  }

  function markDone(idx: number) {
    setCompleted(prev => new Set(prev).add(idx));
  }

  // 气泡模式：定位到页面元素的分步引导
  if (bubbleMode && visible) {
    const step = steps[currentStep];
    return (
      <>
        {/* 遮罩层 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.2 }}
          className="fixed inset-0 bg-black/30 z-[9990]"
          onClick={handleClose}
        />

        {/* 气泡提示卡片 */}
        {bubblePos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={bubbleTransition}
            className="fixed z-[9991] w-[300px] bg-white rounded-xl shadow-2xl border border-primary-100 overflow-hidden"
            style={{ top: bubblePos.top, left: bubblePos.left }}
          >
            {/* 箭头指示器 - 根据 position 动态定位 */}
            {(() => {
              const pos = step?.position || 'bottom';
              // 根据气泡相对于目标的位置，决定箭头指向目标的反方向
              const arrowStyles: Record<string, string> = {
                top: 'absolute w-3 h-3 bg-white border-l border-t border-primary-100 rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2',      // 气泡在上方，箭头朝下
                bottom: 'absolute w-3 h-3 bg-white border-l border-t border-primary-100 rotate-45 -top-1.5 left-1/2 -translate-x-1/2',   // 气泡在下方，箭头朝上
                left: 'absolute w-3 h-3 bg-white border-l border-t border-primary-100 rotate-45 -right-1.5 top-1/2 -translate-y-1/2',    // 气泡在左方，箭头朝右
                right: 'absolute w-3 h-3 bg-white border-l border-t border-primary-100 rotate-45 -left-1.5 top-1/2 -translate-y-1/2',    // 气泡在右方，箭头朝左
              };
              return <div className={arrowStyles[pos] || arrowStyles.bottom} />;
            })()}

            {/* 内容区 */}
            <div className="p-4">
              <div className={`w-10 h-10 ${step?.bg || 'bg-primary-50'} rounded-lg flex items-center justify-center mb-3`}>
                {step && <step.icon className={`w-5 h-5 ${step.color}`} />}
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">
                {step?.title} ({currentStep + 1}/{steps.length})
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">{step?.desc}</p>

              {step?.link && (
                <Link
                  to={step.link}
                  onClick={handleClose}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  {step.linkText} <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* 底部导航 */}
            <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50">
              <button
                onClick={() => {
                  if (currentStep > 0) {
                    // 清除旧高亮
                    if (targetRef.current) {
                      targetRef.current.style.boxShadow = '';
                      targetRef.current.style.position = '';
                      targetRef.current.style.zIndex = '';
                    }
                    setCurrentStep(prev => prev - 1);
                    setBubblePos(null);
                  }
                }}
                disabled={currentStep === 0}
                className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
              >
                <ChevronLeft className="w-3 h-3 inline mr-0.5" /> 上一步
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => {
                    // 清除旧高亮
                    if (targetRef.current) {
                      targetRef.current.style.boxShadow = '';
                      targetRef.current.style.position = '';
                      targetRef.current.style.zIndex = '';
                    }
                    setCurrentStep(prev => prev + 1);
                    setBubblePos(null);
                  }}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  下一步 <ChevronRight className="w-3 h-3 inline ml-0.5" />
                </button>
              ) : (
                <button
                  onClick={handleClose}
                  className="text-xs font-medium bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700"
                >
                  完成
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* 关闭按钮 */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReduced ? { duration: 0 } : undefined}
          onClick={handleClose}
          className="fixed top-6 right-6 z-[9992] w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </motion.button>

        {/* 跳过按钮 */}
        <button
          onClick={handleClose}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9991] text-xs text-white/70 hover:text-white underline"
        >
          跳过引导
        </button>
      </>
    );
  }

  // 内嵌模式：直接渲染步骤卡片列表
  if (inline) {
    return (
      <div className="space-y-3">
        {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={prefersReduced ? { duration: 0 } : { delay: idx * 0.08 }}
            className={`rounded-xl border p-4 transition-all ${
              completed.has(idx)
                ? 'bg-gray-50 border-gray-200 opacity-60'
                : `${step.bg} border-transparent`
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                completed.has(idx) ? 'bg-green-100' : 'bg-white shadow-sm'
              }`}>
                {completed.has(idx) ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-bold ${completed.has(idx) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {step.title}
                  </h4>
                  <Tag
                    variant={completed.has(idx) ? 'green' : 'gray'}
                    size="xs"
                  >
                    {completed.has(idx) ? '已完成' : `${idx + 1}/${steps.length}`}
                  </Tag>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                {!completed.has(idx) && step.tips && (
                  <ul className="mt-2 space-y-1">
                    {step.tips.map((tip, ti) => (
                      <li key={ti} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                        <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {step.link && !completed.has(idx) && (
                    <Link
                      to={step.link}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors ${
                        step.color.replace('text-', 'bg-').replace('-600', '-500')
                      } hover:opacity-90`}
                    >
                      {step.linkText} →
                    </Link>
                  )}
                  {!completed.has(idx) && (
                    <button
                      onClick={() => markDone(idx)}
                      className="text-xs text-gray-400 hover:text-green-600 font-medium transition-colors"
                    >
                      标记已完成
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // 弹窗模式
  return (
    <>
      {/* 触发按钮 — 教程已关闭时显示 */}
      {!visible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={prefersReduced ? { duration: 0 } : undefined}
          onClick={handleReset}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9998] bg-gradient-to-r from-primary-500 to-primary-500 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl flex items-center gap-2 text-sm font-medium transition-shadow"
          title="重新查看引导教程"
        >
          <Rocket className="w-4 h-4" />
          使用教程
        </motion.button>
      )}

      <AnimatePresence>
        {visible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={prefersReduced ? { duration: 0 } : undefined}
              className="fixed inset-0 bg-black/40 z-[9990]"
              onClick={handleClose}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={modalTransition}
              className="fixed inset-x-4 top-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[580px] z-[9991] bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              {/* 头部 */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5 relative">
                <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-400 rounded-xl flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{guide.welcome}</h2>
                    <p className="text-sm text-slate-300">{guide.subtitle}</p>
                  </div>
                </div>
                {/* 进度条 */}
                <div className="flex gap-1.5 mt-4">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors cursor-pointer ${
                        i === currentStep ? 'bg-primary-400' : i < currentStep ? 'bg-primary-600' : 'bg-slate-700'
                      }`}
                      onClick={() => setCurrentStep(i)}
                    />
                  ))}
                </div>
              </div>

              {/* 步骤内容 */}
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={stepTransition}
                  >
                    {(() => {
                      const step = steps[currentStep];
                      return (
                        <div>
                          <div className={`w-16 h-16 ${step.bg} rounded-2xl flex items-center justify-center mb-4`}>
                            <step.icon className={`w-8 h-8 ${step.color}`} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                          <p className="text-gray-600 leading-relaxed mb-4">{step.desc}</p>

                          {step.tips && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                小贴士
                              </p>
                              <ul className="space-y-2">
                                {step.tips.map((tip, ti) => (
                                  <li key={ti} className="text-sm text-gray-600 flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {step.link && (
                            <Link
                              to={step.link}
                              onClick={handleClose}
                              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
                            >
                              {step.linkText}
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 底部导航 */}
              <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一步
                </button>
                <span className="text-xs text-gray-400">
                  {currentStep + 1} / {steps.length}
                </span>
                {currentStep < steps.length - 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex items-center gap-1 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
                  >
                    下一步
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="flex items-center gap-1 text-sm bg-primary-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    开始使用
                    <Rocket className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
