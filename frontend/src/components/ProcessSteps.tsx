import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  UserPlus, FileEdit, Search, Send,
  Mic, Award, TrendingUp, ChevronRight,
} from 'lucide-react';

// ====== 求职流程步骤条（7步） ======

const steps = [
  { icon: UserPlus, title: '注册账号', desc: '免费30秒快速注册', link: '/register' },
  { icon: FileEdit, title: '完善资料', desc: 'AI智能诊断简历', link: '/student/profile' },
  { icon: Search, title: '浏览岗位', desc: '智能推荐匹配职位', link: '/jobs' },
  { icon: Send, title: '投递简历', desc: '一键投递多家企业', link: '/jobs' },
  { icon: Mic, title: '面试辅导', desc: '1v1真实模拟面试', link: '/mentors' },
  { icon: Award, title: '收获Offer', desc: '薪资谈判技巧指导', link: '/guidance' },
  { icon: TrendingUp, title: '成长进阶', desc: '职场导师长期陪伴', link: '/courses' },
];

export default function ProcessSteps() {
  return (
    <section className="py-12">
      {/* 标题 */}
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          求职全流程，我们陪你走完每一步
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          从注册到入职，7个关键步骤全程护航
        </p>
      </div>

      {/* 步骤条 */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex items-start justify-center gap-0 min-w-[800px] md:min-w-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-start"
            >
              {/* 步骤内容 */}
              <Link
                to={step.link}
                className="flex flex-col items-center w-[110px] md:w-[120px] group cursor-pointer"
              >
                {/* 序号圆 */}
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-md relative">
                  <step.icon className="w-5 h-5" />
                  {/* 步骤编号小标 */}
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-white border-2 border-primary-400 rounded-full text-[10px] font-bold text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all">
                    {i + 1}
                  </span>
                </div>
                {/* 标题 */}
                <h4 className="text-sm font-bold text-gray-900 mt-3 group-hover:text-primary-600 transition-colors">
                  {step.title}
                </h4>
                {/* 描述 */}
                <p className="text-[11px] text-gray-400 mt-1 text-center leading-tight">
                  {step.desc}
                </p>
              </Link>

              {/* 连接箭头（最后一个不显示） */}
              {i < steps.length - 1 && (
                <div className="flex items-center mt-5 mx-1 md:mx-2">
                  <div className="w-6 md:w-10 border-t-2 border-dashed border-gray-300" />
                  <ChevronRight className="w-4 h-4 text-gray-300 -ml-1" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
