import { Briefcase, Target, FileText, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const SERVICES = [
  {
    id: 1,
    title: '1v1 简历精修',
    desc: 'BAT大厂资深HR/业务主管亲自操刀，深挖个人亮点，打造高转化率简历。',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    features: ['逐字逐句精修', '匹配目标岗位', '突出核心竞争力', '不限次修改直至满意']
  },
  {
    id: 2,
    title: '全真模拟面试',
    desc: '还原大厂真实面试场景，涵盖群面、单面、专业面、HR面，全方位提升面试技巧。',
    icon: Users,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    features: ['真实题库抽取', '现场录像复盘', '深入点评弱项', '面试礼仪指导']
  },
  {
    id: 3,
    title: '职业生涯规划',
    desc: '通过专业的测评工具结合导师经验，帮你理清职业发展方向，少走弯路。',
    icon: Target,
    color: 'text-[#14b8a6]',
    bgColor: 'bg-[#f0fdfa]',
    features: ['MBTI/霍兰德测评', '行业前景分析', '个人优劣势挖掘', '制定3-5年发展路径']
  }
];

export default function Guidance() {
  return (
    <div className="min-h-screen bg-[#f9fafb] pt-8 pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h1 className="text-[36px] font-bold text-[#111827] flex items-center justify-center gap-3 mb-4">
            <Briefcase className="w-10 h-10 text-[#14b8a6]" />
            就业指导服务
          </h1>
          <p className="text-[16px] text-[#4b5563] leading-relaxed">
            为您提供从职业规划、简历制作到面试通关的一站式护航服务。<br/>
            让求职不再迷茫，斩获心仪Offer。
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.id} className="bg-white rounded-[20px] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className={`w-14 h-14 rounded-2xl ${service.bgColor} flex items-center justify-center mb-6`}>
                  <Icon className={`w-7 h-7 ${service.color}`} />
                </div>
                
                <h3 className="text-[22px] font-bold text-[#111827] mb-3">{service.title}</h3>
                <p className="text-[15px] text-[#6b7280] mb-8 leading-relaxed min-h-[66px]">
                  {service.desc}
                </p>
                
                <ul className="space-y-3 mb-8">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[14px] text-[#4b5563]">
                      <CheckCircle2 className={`w-5 h-5 ${service.color} shrink-0`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button className="w-full py-3.5 rounded-xl border-2 border-[#14b8a6] text-[#14b8a6] font-semibold text-[15px] group-hover:bg-[#14b8a6] group-hover:text-white transition-colors">
                  立即预约
                </button>
              </div>
            );
          })}
        </div>

        {/* Banner */}
        <div className="bg-[#111827] rounded-[24px] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#14b8a6]/20 to-transparent"></div>
          <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-white max-w-xl">
              <h2 className="text-[28px] md:text-[32px] font-bold mb-4">不确定适合什么岗位？</h2>
              <p className="text-[16px] text-gray-300 mb-0">
                完成专业的职业性格测试，只需 15 分钟，获取专属你的职业发展建议报告。
              </p>
            </div>
            <button className="shrink-0 bg-[#14b8a6] hover:bg-[#0f766e] text-white px-8 py-4 rounded-full font-bold text-[16px] transition-colors flex items-center gap-2">
              开始免费测试 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}