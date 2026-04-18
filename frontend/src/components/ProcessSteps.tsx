import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  UserPlus, FileEdit, Search, Send,
  Mic, Award, TrendingUp, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useConfigStore } from '@/store/config';

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus, FileEdit, Search, Send, Mic, Award, TrendingUp,
};

const defaultSteps = [
  { icon: 'UserPlus', title: '注册账号', desc: '免费30秒快速注册', link: '/register' },
  { icon: 'FileEdit', title: '完善资料', desc: 'AI智能诊断简历', link: '/student/profile' },
  { icon: 'Search', title: '浏览岗位', desc: '智能推荐匹配职位', link: '/jobs' },
  { icon: 'Send', title: '投递简历', desc: '一键投递多家企业', link: '/jobs' },
  { icon: 'Mic', title: '面试辅导', desc: '1v1真实模拟面试', link: '/mentors' },
  { icon: 'Award', title: '收获Offer', desc: '薪资谈判技巧指导', link: '/guidance' },
  { icon: 'TrendingUp', title: '成长进阶', desc: '职场导师长期陪伴', link: '/courses' },
];

interface StepItem {
  icon: string;
  title: string;
  desc: string;
  link: string;
}

interface ProcessStepsProps {
  initialActiveStep?: number;
}

export default function ProcessSteps({ initialActiveStep = 0 }: ProcessStepsProps) {
  const [activeStep, setActiveStep] = useState(initialActiveStep);

  const rawApiSteps = useConfigStore(s => s.configs['home_process_steps']);
  const [apiSteps, setApiSteps] = useState<StepItem[]>([]);

  useEffect(() => {
    if (Array.isArray(rawApiSteps) && rawApiSteps.length > 0) {
      setApiSteps(rawApiSteps as StepItem[]);
    }
  }, [rawApiSteps]);

  const rawSteps = apiSteps.length > 0 ? apiSteps : defaultSteps;

  const steps = rawSteps.map(s => ({
    ...s,
    IconComp: ICON_MAP[s.icon] || UserPlus,
  }));

  return (
    <section className="py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          求职全流程，我们陪你走完每一步
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          从注册到入职，7个关键步骤全程护航
        </p>
      </div>

      <div className="overflow-x-auto pb-4 -mx-4 px-4" style={{ overflowY: 'visible' }}>
        <div className="flex items-start justify-center gap-0 min-w-[800px] md:min-w-0 pt-2">
          {steps.map((step, i) => {
            const isActive = i === activeStep;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-start"
              >
                <Link
                  to={step.link}
                  className="flex flex-col items-center w-[110px] md:w-[120px] group cursor-pointer"
                  onClick={() => setActiveStep(i)}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-sm group-hover:shadow-md relative ${
                    isActive
                      ? 'bg-primary-600 text-white ring-4 ring-primary-200 shadow-md'
                      : 'bg-primary-100 text-primary-700 group-hover:bg-primary-600 group-hover:text-white'
                  }`}>
                    <step.IconComp className="w-5 h-5" />
                    <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all z-10 ${
                      isActive
                        ? 'bg-primary-700 text-white border-2 border-primary-300'
                        : 'bg-white border-2 border-primary-400 text-primary-600 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600'
                    }`}>
                      {i + 1}
                    </span>
                  </div>
                  <h4 className={`text-sm font-bold mt-3 transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-900 group-hover:text-primary-600'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1 text-center leading-tight">
                    {step.desc}
                  </p>
                </Link>

                {i < steps.length - 1 && (
                  <div className="flex items-center mt-5 mx-1 md:mx-2">
                    <div className={`w-6 md:w-10 border-t-2 border-dashed transition-colors ${
                      i < activeStep ? 'border-primary-400' : 'border-gray-300'
                    }`} />
                    <ChevronRight className={`w-4 h-4 -ml-1 transition-colors ${
                      i < activeStep ? 'text-primary-400' : 'text-gray-300'
                    }`} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
