import { 
  Briefcase, 
  FileText, 
  Eye, 
  MessageSquare, 
  TrendingUp, 
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Users
} from 'lucide-react';

const STATS = [
  { label: '在招职位数', value: '12', change: '+2', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: '今日新投递', value: '156', change: '+24%', icon: FileText, color: 'text-green-500', bg: 'bg-green-50' },
  { label: '职位浏览量', value: '4.2w', change: '+12%', icon: Eye, color: 'text-purple-500', bg: 'bg-purple-50' },
  { label: '待处理面试', value: '8', change: '-3', icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50' },
];

const RECENT_RESUMES = [
  { id: 1, name: '张同学', university: '清华大学', major: '计算机科学', applyJob: '前端开发工程师', time: '10分钟前', status: '待筛选' },
  { id: 2, name: '李同学', university: '北京大学', major: '软件工程', applyJob: 'Java 后端开发', time: '1小时前', status: '已邀约' },
  { id: 3, name: '王同学', university: '浙江大学', major: '交互设计', applyJob: 'UI/UX 设计实习生', time: '2小时前', status: '已拒绝' },
  { id: 4, name: '赵同学', university: '复旦大学', major: '市场营销', applyJob: '管培生 (2026届)', time: '3小时前', status: '初试通过' },
];

export default function CompanyDashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">招聘看板</h1>
          <p className="text-gray-500 mt-1">今天有 156 份新简历等待您处理，辛苦了！</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
          <Plus size={20} />
          发布新职位
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">{stat.label}</p>
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <span className={stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}>
                  <TrendingUp className={`w-4 h-4 inline-block ${stat.change.startsWith('-') ? 'rotate-180' : ''}`} />
                  {stat.change}
                </span>
                <span className="text-gray-400">较昨日</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">最新收到的简历</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">去简历库处理</button>
          </div>
          
          <div className="divide-y divide-gray-100 flex-1">
            {RECENT_RESUMES.map((resume) => (
              <div key={resume.id} className="p-6 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-lg border border-blue-200">
                    {resume.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-gray-900 text-lg">{resume.name}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{resume.university}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{resume.major}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">投递：{resume.applyJob}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {resume.time}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {resume.status === '待筛选' ? (
                    <div className="flex gap-2">
                       <button className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors" title="通过/邀约">
                         <CheckCircle size={20} />
                       </button>
                       <button className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors" title="淘汰">
                         <XCircle size={20} />
                       </button>
                    </div>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-md text-sm font-bold ${
                      resume.status === '已邀约' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      resume.status === '初试通过' ? 'bg-green-50 text-green-600 border border-green-100' :
                      'bg-gray-50 text-gray-500 border border-gray-200'
                    }`}>
                      {resume.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">快捷搜索人才</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜索技能、学校、专业" 
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl font-bold transition-colors border border-blue-200">
                去人才库高级搜索
              </button>
            </div>
            
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h4 className="font-bold text-gray-900 mb-4 text-sm">热门推荐人才</h4>
              <div className="space-y-4">
                {[1, 2, 3].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                       <div className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">985 硕士 - 3年 Java 经验</div>
                       <div className="text-xs text-gray-500 truncate mt-0.5">期望薪资: 25k-30k · 期望地: 北京</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
