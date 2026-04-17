import { Lightbulb, Rocket, Trophy, Users, Zap, ExternalLink, ChevronRight } from 'lucide-react';
import Tag from '@/components/ui/Tag';

const COMPETITIONS = [
  { id: 1, name: '“挑战杯”全国大学生课外学术科技作品竞赛', level: '国家级', status: '报名中', deadline: '2024-05-30', tags: ['学术研究', '科技创新'] },
  { id: 2, name: '中国国际“互联网+”大学生创新创业大赛', level: '国家级', status: '即将开始', deadline: '2024-06-15', tags: ['创业项目', '商业计划'] },
  { id: 3, name: '全国大学生电子商务“创新、创意及创业”挑战赛', level: '国家级', status: '进行中', deadline: '2024-04-20', tags: ['电商', '三创'] },
  { id: 4, name: '全国大学生数学建模竞赛', level: '国家级', status: '报名中', deadline: '2024-09-01', tags: ['算法', '数据分析'] }
];

export default function Entrepreneurship() {
  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-16">
      <div className="container-main">
        
        {/* Hero Section */}
        <div className="bg-gray-900 rounded-[24px] overflow-hidden relative mb-12">
          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32d7?w=1000&q=80')] bg-cover bg-center mix-blend-luminosity"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
          
          <div className="relative z-10 p-10 md:p-16 flex flex-col items-start max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[14px] font-medium mb-6">
              <Rocket className="w-4 h-4 text-primary-500" /> 激发无限潜能
            </div>
            <h1 className="text-[36px] md:text-[48px] font-bold text-white mb-4 leading-tight">
              点燃你的<span className="text-primary-500">创业梦</span>
            </h1>
            <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed mb-8">
              寻找志同道合的合伙人，获取专业的创业指导，参与顶级赛事，对接天使投资。让每一个疯狂的想法都有机会改变世界。
            </p>
            <div className="flex gap-4">
              <button className="bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">
                发布创业项目
              </button>
              <button className="bg-white/20 backdrop-blur-md text-white border border-white/20 px-8 py-3.5 rounded-xl font-bold hover:bg-white/30 transition-colors">
                寻找合伙人
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Competitions */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary-500" /> 热门赛事推荐
              </h2>
              <button className="text-gray-500 hover:text-gray-900 text-[14px] font-medium flex items-center transition-colors">
                全部赛事 <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            
            <div className="space-y-4">
              {COMPETITIONS.map((comp) => (
                <div key={comp.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag variant="red" size="sm">
                        {comp.level}
                      </Tag>
                      {comp.status === '报名中' && (
                        <span className="flex items-center gap-1 text-primary-500 text-[12px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                          报名中
                        </span>
                      )}
                    </div>
                    <h3 className="text-[18px] font-bold text-gray-900 mb-2">{comp.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-[13px] text-gray-500">
                      <span>截止日期: {comp.deadline}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <div className="flex gap-2">
                        {comp.tags.map(tag => <span key={tag} className="text-gray-500">#{tag}</span>)}
                      </div>
                    </div>
                  </div>
                  <button className="shrink-0 md:w-auto w-full py-2.5 px-6 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors flex justify-center items-center gap-2">
                    查看详情 <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Team up */}
            <div className="bg-gradient-to-b from-primary-50 to-white p-6 rounded-2xl border border-primary-100">
              <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg shadow-primary-500/20">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-[20px] font-bold text-gray-900 mb-2">组队大厅</h3>
              <p className="text-[14px] text-gray-500 mb-6">
                缺技术？缺运营？在这里发布招募贴，快速集结你的梦幻初创团队。目前已有 <span className="text-primary-500 font-bold">1,204</span> 个项目正在招募。
              </p>
              <button className="w-full bg-white border border-primary-500 text-primary-500 py-3 rounded-xl font-bold hover:bg-primary-500 hover:text-white transition-colors">
                进入大厅
              </button>
            </div>

            {/* Resources */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-[18px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" /> 创业资料库
              </h3>
              <ul className="space-y-4">
                <li className="flex gap-3 group cursor-pointer">
                  <div className="w-10 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-primary-500 group-hover:border-primary-500 transition-colors">
                    <Zap className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-medium text-gray-900 group-hover:text-primary-500 transition-colors mb-0.5">商业计划书 (BP) 黄金模板</h4>
                    <p className="text-[12px] text-gray-500">包含互联网、医疗、教育等8大行业</p>
                  </div>
                </li>
                <li className="flex gap-3 group cursor-pointer">
                  <div className="w-10 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-primary-500 group-hover:border-primary-500 transition-colors">
                    <Zap className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-medium text-gray-900 group-hover:text-primary-500 transition-colors mb-0.5">大学生创业扶持政策解读</h4>
                    <p className="text-[12px] text-gray-500">2024最新无息贷款与补贴申请指南</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}