import { BookOpen, GraduationCap, Globe, Clock, ChevronRight, Award } from 'lucide-react';

const TIMELINES = [
  { month: '3月-5月', title: '基础复习阶段', desc: '确定目标院校和专业，搜集考研大纲和真题，开始英语和专业课基础轮复习。' },
  { month: '6月-8月', title: '强化提高阶段', desc: '暑期黄金复习期，各科全面展开，参加辅导班或集中刷题，攻克重难点。' },
  { month: '9月-10月', title: '报名与冲刺阶段', desc: '关注招生简章，完成网上报名。政治开始复习，进行全真模拟训练。' },
  { month: '11月-12月', title: '考前押题与心态调整', desc: '背诵核心考点，查漏补缺，调整作息规律，保持良好心态迎接初试。' }
];

export default function Postgrad() {
  return (
    <div className="min-h-screen bg-[#f9fafb] pt-8 pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-white rounded-[24px] p-8 md:p-12 mb-12 shadow-sm border border-gray-100">
          <div className="max-w-xl mb-8 md:mb-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-500 text-[14px] font-medium mb-4 border border-primary-100">
              <GraduationCap className="w-4 h-4" /> 升学深造指南
            </div>
            <h1 className="text-[36px] font-bold text-[#111827] mb-4">考研 / 保研 / 留学</h1>
            <p className="text-[16px] text-[#4b5563] leading-relaxed mb-6">
              汇集全网最全的升学资讯、学长学姐真实经验贴、院校专业分析报告，助你顺利迈向人生的下一个台阶。
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors">
                获取备考资料
              </button>
              <button className="bg-white text-[#111827] border border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                咨询上岸学长
              </button>
            </div>
          </div>
          <div className="hidden md:block w-[320px]">
            <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500&q=80" alt="Graduation" className="w-full h-auto rounded-2xl object-cover shadow-md rotate-2" />
          </div>
        </div>

        {/* Section: Timeline */}
        <div className="mb-16">
          <h2 className="text-[24px] font-bold text-[#111827] mb-8 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-500" /> 2025考研全年规划时间轴
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {TIMELINES.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-primary-500 transition-colors">
                <div className="text-[14px] font-bold text-primary-500 mb-2">{item.month}</div>
                <h3 className="text-[18px] font-bold text-[#111827] mb-3">{item.title}</h3>
                <p className="text-[14px] text-[#6b7280] leading-relaxed">{item.desc}</p>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-bl-3xl"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Channels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Baoyan */}
          <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[24px] border border-indigo-100 relative">
            <Award className="w-10 h-10 text-indigo-500 mb-4" />
            <h3 className="text-[24px] font-bold text-[#111827] mb-2">保研专区 (推免)</h3>
            <p className="text-[#4b5563] mb-6">夏令营通知、九推捡漏、导师套磁信模板、专业笔面试面经汇总。</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-[14px] text-[#4b5563] hover:text-indigo-600 cursor-pointer"><ChevronRight className="w-4 h-4 mr-1"/> 2024年全国高校夏令营入营要求盘点</li>
              <li className="flex items-center text-[14px] text-[#4b5563] hover:text-indigo-600 cursor-pointer"><ChevronRight className="w-4 h-4 mr-1"/> 计算机专业保研机试常见题型解析</li>
              <li className="flex items-center text-[14px] text-[#4b5563] hover:text-indigo-600 cursor-pointer"><ChevronRight className="w-4 h-4 mr-1"/> 如何给心仪的导师发一封高回复率的邮件？</li>
            </ul>
            <button className="text-indigo-600 font-medium text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
              进入保研社区 <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Study Abroad */}
          <div className="bg-gradient-to-br from-sky-50 to-white p-8 rounded-[24px] border border-sky-100 relative">
            <Globe className="w-10 h-10 text-sky-500 mb-4" />
            <h3 className="text-[24px] font-bold text-[#111827] mb-2">留学专区</h3>
            <p className="text-[#4b5563] mb-6">QS前100院校申请要求、雅思/托福备考、文书写作指南、签证办理流程。</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-[14px] text-[#4b5563] hover:text-sky-600 cursor-pointer"><ChevronRight className="w-4 h-4 mr-1"/> 英国G5一年制硕士真实就读体验分享</li>
              <li className="flex items-center text-[14px] text-[#4b5563] hover:text-sky-600 cursor-pointer"><ChevronRight className="w-4 h-4 mr-1"/> 香港地区八大名校跨考商科难度评估</li>
              <li className="flex items-center text-[14px] text-[#4b5563] hover:text-sky-600 cursor-pointer"><ChevronRight className="w-4 h-4 mr-1"/> 零中介费DIY申请美国CS硕士全攻略</li>
            </ul>
            <button className="text-sky-600 font-medium text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
              进入留学社区 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}