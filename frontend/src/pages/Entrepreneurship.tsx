import { useState, useEffect } from 'react';
import { Lightbulb, Rocket, Trophy, Users, Zap, ExternalLink, ChevronRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Tag from '@/components/ui/Tag';
import { useConfigStore } from '@/store/config';
import http from '@/api/http';

// 默认文案配置（从配置中心读取，不含动态数据）
const DEFAULT_ENTREPRENEURSHIP_CONFIG = {
  heroTitle: '点燃你的创业梦',
  heroDesc: '寻找志同道合的合伙人，获取专业的创业指导，参与顶级赛事，对接天使投资。让每一个疯狂的想法都有机会改变世界。'
};

interface Competition {
  id: number;
  title?: string;
  name?: string;
  level: string;
  status: string;
  deadline: string;
  tags?: string[];
}

interface Resource {
  id: number;
  title: string;
  description: string;
}

export default function Entrepreneurship() {
  const navigate = useNavigate();
  const entrepreneurshipConfig = useConfigStore(s => s.getJson('entrepreneurship_page_config', DEFAULT_ENTREPRENEURSHIP_CONFIG));
  const heroTitle = entrepreneurshipConfig.heroTitle || DEFAULT_ENTREPRENEURSHIP_CONFIG.heroTitle;
  const heroDesc = entrepreneurshipConfig.heroDesc || DEFAULT_ENTREPRENEURSHIP_CONFIG.heroDesc;

  // API 数据状态
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionsTotal, setCompetitionsTotal] = useState(0);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const [competitionsError, setCompetitionsError] = useState(false);

  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState(false);

  // 加载竞赛列表
  useEffect(() => {
    http.get('/competitions', { params: { status: '报名中', pageSize: 4 } })
      .then(res => {
        if (res.data?.code === 200) {
          setCompetitions(res.data.data.list || []);
          setCompetitionsTotal(res.data.data.total || 0);
        } else {
          setCompetitionsError(true);
        }
      })
      .catch(() => setCompetitionsError(true))
      .finally(() => setCompetitionsLoading(false));
  }, []);

  // 加载创业资料
  useEffect(() => {
    http.get('/resources', { params: { pageSize: 5 } })
      .then(res => {
        if (res.data?.code === 200) {
          setResources(res.data.data.list || []);
        } else {
          setResourcesError(true);
        }
      })
      .catch(() => setResourcesError(true))
      .finally(() => setResourcesLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-16">
      <div className="container-main">

        {/* Hero Section */}
        <div className="bg-gray-900 rounded-[24px] overflow-hidden relative mb-12">
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 mix-blend-luminosity"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>

          <div className="relative z-10 p-10 md:p-16 flex flex-col items-start max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[14px] font-medium mb-6">
              <Rocket className="w-4 h-4 text-primary-500" /> 激发无限潜能
            </div>
            <h1 className="text-[36px] md:text-[48px] font-bold text-white mb-4 leading-tight">
              {heroTitle}
            </h1>
            <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed mb-8">
              {heroDesc}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/partners')}
                className="bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
              >
                发布招募信息
              </button>
              <button onClick={() => navigate('/partners')} className="bg-white text-primary-600 border-2 border-white px-8 py-3.5 rounded-xl font-bold hover:bg-primary-50 transition-colors shadow-lg">
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
              <Link to="/guidance/articles" className="text-gray-500 hover:text-gray-900 text-[14px] font-medium flex items-center transition-colors">
                全部赛事 <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {competitionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : competitionsError ? (
              <div className="text-center py-12 text-gray-400">
                <p>加载竞赛数据失败</p>
                <button onClick={() => window.location.reload()} className="text-primary-500 text-sm mt-2 hover:underline">点击重试</button>
              </div>
            ) : competitions.length === 0 ? (
              <p className="text-center text-gray-400 py-8">暂无报名中的赛事</p>
            ) : (
              <div className="space-y-4">
                {competitions.map((comp) => (
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
                      <h3 className="text-[18px] font-bold text-gray-900 mb-2">{comp.title || comp.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-[13px] text-gray-500">
                        <span>截止日期: {comp.deadline}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <div className="flex gap-2">
                          {(comp.tags || []).map(tag => <span key={tag} className="text-gray-500">#{tag}</span>)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/guidance/articles`)}
                      className="shrink-0 md:w-auto w-full py-2.5 px-6 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors flex justify-center items-center gap-2"
                    >
                      查看详情 <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                缺技术？缺运营？在这里发布招募贴，快速集结你的梦幻初创团队。{competitionsTotal > 0 && (<>目前已有 <span className="text-primary-500 font-bold">{competitionsTotal.toLocaleString()}</span> 个赛事可参与。</>)}
              </p>
              <button onClick={() => navigate('/partners')} className="w-full bg-white border border-primary-500 text-primary-500 py-3 rounded-xl font-bold hover:bg-primary-500 hover:text-white transition-colors">
                进入大厅
              </button>
            </div>

            {/* Resources */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-[18px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" /> 创业资料库
              </h3>
              {resourcesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : resourcesError ? (
                <p className="text-sm text-gray-400 py-2">加载失败</p>
              ) : resources.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">暂无资料</p>
              ) : (
                <ul className="space-y-4">
                  {resources.map((resource) => (
                    <li key={resource.id} className="flex gap-3 group">
                      <div className="w-10 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-primary-500 group-hover:border-primary-500 transition-colors">
                        <Zap className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-medium text-gray-900 group-hover:text-primary-500 transition-colors mb-0.5">{resource.title}</h4>
                        <p className="text-[12px] text-gray-500">{resource.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
