import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ChevronRight, Search, CheckCircle2, Clock, X,
  SlidersHorizontal, GraduationCap, BarChart3, ArrowUpDown,
  Award, MapPin, Briefcase, FlaskConical, Sparkles, Filter,
  ChevronDown, ThumbsUp, AlertCircle, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ====== Mock 数据（后续全部由后台接口提供，禁止前端写死） ======

const SEASONS = ['2026 Fall', '2026 Spring', '2025 Fall', '2025 Spring'];

const COUNTRY_FILTERS = ['全部地区', '英国', '美国', '中国香港', '新加坡', '澳大利亚', '加拿大', '日本', '欧洲'];

const OFFERS_DATA = [
  { id: 1, school: '帝国理工学院', program: '计算机科学 MSc', country: '英国', ranking: 2, result: 'admitted', background: '985', university: '北京大学 · 计算机科学与技术', gpa: '3.8/4.0', ielts: '7.5', gre: '328', toefl: '', internship: '字节跳动 · 后端开发 (6个月)', research: '2段科研 · 发表1篇SCI', date: '2026-03-28', scholarship: '无' },
  { id: 2, school: '斯坦福大学', program: '计算机科学 MSCS', country: '美国', ranking: 3, result: 'admitted', background: '985', university: '清华大学 · 计算机科学', gpa: '3.92/4.0', ielts: '', gre: '335', toefl: '112', internship: 'Google · SDE Intern (3个月)', research: '3段科研 · 顶会AAAI一作', date: '2026-03-25', scholarship: 'Knight-Hennessy Fellow' },
  { id: 3, school: '香港中文大学', program: '商业分析 MSc', country: '中国香港', ranking: 36, result: 'admitted', background: '211', university: '上海财经大学 · 金融学', gpa: '3.5/4.0', ielts: '7.0', gre: '', toefl: '', internship: '德勤 · 咨询助理 (4个月)', research: '无', date: '2026-03-27', scholarship: '入学奖学金 HK$50,000' },
  { id: 4, school: '爱丁堡大学', program: '人工智能 MSc', country: '英国', ranking: 22, result: 'rejected', background: '双非', university: '杭州电子科技大学 · 计算机', gpa: '3.8/4.0', ielts: '6.5', gre: '', toefl: '', internship: '阿里巴巴 · 算法实习 (3个月)', research: '1段科研', date: '2026-03-26', scholarship: '' },
  { id: 5, school: '新加坡国立大学', program: '金融工程 MFE', country: '新加坡', ranking: 8, result: 'admitted', background: '985', university: '复旦大学 · 数学与应用数学', gpa: '3.6/4.0', ielts: '', gre: '325', toefl: '108', internship: '中金公司 · 投行部 (6个月)', research: '1段科研 · 量化金融方向', date: '2026-03-25', scholarship: '无' },
  { id: 6, school: '悉尼大学', program: '数据科学 MSc', country: '澳大利亚', ranking: 18, result: 'waitlisted', background: '211', university: '南京师范大学 · 统计学', gpa: '3.3/4.0', ielts: '6.5', gre: '', toefl: '', internship: '无', research: '无', date: '2026-03-24', scholarship: '' },
  { id: 7, school: '多伦多大学', program: '电子与计算机工程 MEng', country: '加拿大', ranking: 21, result: 'admitted', background: '985', university: '浙江大学 · 信息与电子工程', gpa: '3.7/4.0', ielts: '', gre: '320', toefl: '105', internship: '华为 · 研发工程师 (6个月)', research: '2段科研 · IEEE会议论文', date: '2026-03-23', scholarship: '无' },
  { id: 8, school: '伦敦大学学院', program: '教育学 MA', country: '英国', ranking: 9, result: 'admitted', background: '211', university: '华东师范大学 · 英语教育', gpa: '3.6/4.0', ielts: '7.5', gre: '', toefl: '', internship: '新东方 · 英语教师 (1年)', research: '1段科研 · 教育学方向', date: '2026-03-22', scholarship: 'Dean\'s Award £5,000' },
  { id: 9, school: '香港科技大学', program: '数据科学 MSc', country: '中国香港', ranking: 47, result: 'admitted', background: '双非', university: '深圳大学 · 计算机科学', gpa: '3.7/4.0', ielts: '7.0', gre: '', toefl: '', internship: '腾讯 · 数据分析实习 (4个月)', research: '无', date: '2026-03-21', scholarship: '无' },
  { id: 10, school: '墨尔本大学', program: '信息技术 MIT', country: '澳大利亚', ranking: 14, result: 'admitted', background: '211', university: '武汉理工大学 · 软件工程', gpa: '3.4/4.0', ielts: '6.5', gre: '', toefl: '', internship: '无', research: '无', date: '2026-03-20', scholarship: '无' },
  { id: 11, school: '哥伦比亚大学', program: '商业分析 MSBA', country: '美国', ranking: 12, result: 'admitted', background: '985', university: '中国人民大学 · 统计学', gpa: '3.75/4.0', ielts: '', gre: '330', toefl: '110', internship: 'McKinsey · 暑期实习 (2个月)', research: '1段科研', date: '2026-03-19', scholarship: '无' },
  { id: 12, school: '帝国理工学院', program: '金融学 MSc Finance', country: '英国', ranking: 2, result: 'rejected', background: '211', university: '中南财经政法大学 · 金融学', gpa: '3.5/4.0', ielts: '7.0', gre: '318', toefl: '', internship: '中信证券 · 投行实习 (3个月)', research: '无', date: '2026-03-18', scholarship: '' },
  { id: 13, school: 'ETH Zurich', program: '计算机科学 MSc', country: '欧洲', ranking: 7, result: 'admitted', background: '985', university: '上海交通大学 · 计算机科学', gpa: '3.85/4.0', ielts: '', gre: '332', toefl: '108', internship: 'Microsoft Research · 研究实习', research: '3段科研 · 顶会NeurIPS', date: '2026-03-17', scholarship: 'Excellence Scholarship' },
  { id: 14, school: '东京大学', program: '情报理工学 修士', country: '日本', ranking: 28, result: 'admitted', background: '211', university: '大连理工大学 · 软件工程', gpa: '3.5/4.0', ielts: '', gre: '', toefl: '95', internship: '索尼 · 软件开发 (3个月)', research: '1段科研', date: '2026-03-16', scholarship: 'MEXT奖学金' },
  { id: 15, school: '香港大学', program: '金融学 MFin', country: '中国香港', ranking: 17, result: 'admitted', background: '985', university: '南京大学 · 金融工程', gpa: '3.65/4.0', ielts: '7.5', gre: '', toefl: '', internship: '高盛 · 投行暑期实习', research: '无', date: '2026-03-15', scholarship: '无' },
  { id: 16, school: '伦敦政治经济学院', program: '金融数学 MSc', country: '英国', ranking: 45, result: 'waitlisted', background: '985', university: '中国科学技术大学 · 数学', gpa: '3.7/4.0', ielts: '7.0', gre: '', toefl: '', internship: '摩根士丹利 · 量化实习', research: '1段科研', date: '2026-03-14', scholarship: '' },
];

export default function StudyAbroadOffers() {
  const [selectedSeason, setSelectedSeason] = useState('2026 Fall');
  const [resultFilter, setResultFilter] = useState<'all' | 'admitted' | 'rejected' | 'waitlisted'>('all');
  const [bgFilter, setBgFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState('全部地区');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'ranking'>('date');

  const filtered = OFFERS_DATA.filter((o) => {
    if (resultFilter !== 'all' && o.result !== resultFilter) return false;
    if (bgFilter !== 'all' && o.background !== bgFilter) return false;
    if (countryFilter !== '全部地区' && o.country !== countryFilter) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!o.school.toLowerCase().includes(kw) && !o.program.toLowerCase().includes(kw) && !o.university.toLowerCase().includes(kw)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'ranking') return a.ranking - b.ranking;
    return 0;
  });

  const stats = {
    total: OFFERS_DATA.length,
    admitted: OFFERS_DATA.filter(o => o.result === 'admitted').length,
    rejected: OFFERS_DATA.filter(o => o.result === 'rejected').length,
    waitlisted: OFFERS_DATA.filter(o => o.result === 'waitlisted').length,
  };

  const admitRate = Math.round(stats.admitted / stats.total * 100);

  return (
    <div className="min-h-screen bg-[#f9fafb] pt-6 pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-4">
          <Link to="/study-abroad" className="hover:text-[#14b8a6] transition-colors">留学</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#4b5563]">Offer 榜</span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-[30px] font-bold text-[#111827] flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-[#14b8a6]" /> Offer 榜
            </h1>
            <p className="text-[15px] text-[#6b7280]">来自平台 <span className="font-bold text-[#111827]">{stats.total}+</span> 位用户的真实录取数据，助你精准定位</p>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#9ca3af]" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-[13px] text-[#4b5563] bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#14b8a6] cursor-pointer">
              <option value="date">按时间排序</option>
              <option value="ranking">按院校排名</option>
            </select>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: '总数据量', value: stats.total, icon: BarChart3, color: 'text-[#14b8a6]', bg: 'bg-[#f0fdfa]', border: 'border-[#ccfbf1]' },
            { label: 'Offer', value: stats.admitted, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
            { label: 'Rejected', value: stats.rejected, icon: X, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
            { label: 'Waitlisted', value: stats.waitlisted, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
            { label: '录取率', value: `${admitRate}%`, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
          ].map((s, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`${s.bg} rounded-2xl p-5 border ${s.border}`}
            >
              <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
              <div className={`text-[28px] font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[13px] text-[#6b7280]">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* 筛选栏 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* 申请季 */}
            <div className="flex gap-2 shrink-0">
              {SEASONS.map((s) => (
                <button key={s} onClick={() => setSelectedSeason(s)} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${selectedSeason === s ? 'bg-[#14b8a6] text-white shadow-sm' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            {/* 搜索 */}
            <div className="flex-grow relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input type="text" placeholder="搜索院校、项目、本科学校..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f9fafb] border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] placeholder-[#9ca3af] transition-all" />
            </div>
          </div>

          {/* 筛选按钮组 */}
          <div className="flex flex-wrap gap-2">
            {/* 结果筛选 */}
            {[
              { key: 'all' as const, label: '全部结果' },
              { key: 'admitted' as const, label: 'Offer' },
              { key: 'rejected' as const, label: 'Rejected' },
              { key: 'waitlisted' as const, label: 'Waitlisted' },
            ].map((f) => (
              <button key={f.key} onClick={() => setResultFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${resultFilter === f.key ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'}`}>
                {f.label}
                {f.key !== 'all' && <span className="ml-1 opacity-60">({f.key === 'admitted' ? stats.admitted : f.key === 'rejected' ? stats.rejected : stats.waitlisted})</span>}
              </button>
            ))}
            <span className="w-px h-6 bg-gray-200 self-center mx-1" />
            {/* 背景筛选 */}
            {[
              { key: 'all', label: '全部背景' },
              { key: '985', label: '985' },
              { key: '211', label: '211' },
              { key: '双非', label: '双非' },
              { key: '海本', label: '海本' },
            ].map((f) => (
              <button key={f.key} onClick={() => setBgFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${bgFilter === f.key ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* 高级筛选 */}
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="mt-3 text-[12px] text-[#9ca3af] hover:text-[#14b8a6] flex items-center gap-1 transition-colors">
            <Filter className="w-3 h-3" /> 更多筛选 <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-3 flex flex-wrap gap-2">
                  {COUNTRY_FILTERS.map((c) => (
                    <button key={c} onClick={() => setCountryFilter(c)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${countryFilter === c ? 'bg-[#14b8a6] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 结果计数 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] text-[#6b7280]">
            共 <span className="font-bold text-[#111827]">{filtered.length}</span> 条数据
          </span>
        </div>

        {/* Offer 列表 */}
        <div className="space-y-3">
          {filtered.map((offer, idx) => (
            <motion.div key={offer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* 结果标识 */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  offer.result === 'admitted' ? 'bg-green-50 ring-1 ring-green-200' : offer.result === 'rejected' ? 'bg-red-50 ring-1 ring-red-200' : 'bg-yellow-50 ring-1 ring-yellow-200'
                }`}>
                  {offer.result === 'admitted' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                  {offer.result === 'rejected' && <X className="w-6 h-6 text-red-500" />}
                  {offer.result === 'waitlisted' && <Clock className="w-6 h-6 text-yellow-500" />}
                </div>

                {/* 院校信息 */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-[16px] font-bold text-[#111827]">{offer.school}</h3>
                    <span className="bg-[#f0fdfa] text-[#14b8a6] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#ccfbf1]">QS #{offer.ranking}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      offer.result === 'admitted' ? 'bg-green-100 text-green-700' : offer.result === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {offer.result === 'admitted' ? 'Offer' : offer.result === 'rejected' ? 'Rej' : 'WL'}
                    </span>
                    <span className="text-[11px] text-[#9ca3af] bg-gray-50 px-2 py-0.5 rounded">{offer.country}</span>
                    {offer.scholarship && offer.scholarship !== '无' && (
                      <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-0.5">
                        <Award className="w-3 h-3" /> {offer.scholarship}
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] text-[#6b7280] mb-2">{offer.program}</p>

                  {/* 申请人背景 */}
                  <div className="flex items-start gap-2 text-[12px]">
                    <span className="text-[#9ca3af] shrink-0 mt-0.5">背景:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-[#f0fdfa] text-[#14b8a6] px-2 py-0.5 rounded font-medium">{offer.background}</span>
                      <span className="bg-gray-50 text-[#4b5563] px-2 py-0.5 rounded">{offer.university}</span>
                    </div>
                  </div>
                </div>

                {/* 右侧：成绩与标签 */}
                <div className="flex flex-col gap-2 shrink-0 md:min-w-[280px]">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#6b7280]">
                    <span className="bg-white px-2 py-1 rounded border border-gray-100 font-medium">GPA {offer.gpa}</span>
                    {offer.ielts && <span className="bg-white px-2 py-1 rounded border border-gray-100">IELTS {offer.ielts}</span>}
                    {offer.toefl && <span className="bg-white px-2 py-1 rounded border border-gray-100">TOEFL {offer.toefl}</span>}
                    {offer.gre && <span className="bg-white px-2 py-1 rounded border border-gray-100">GRE {offer.gre}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    {offer.internship && offer.internship !== '无' && (
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {offer.internship}
                      </span>
                    )}
                    {offer.research && offer.research !== '无' && (
                      <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <FlaskConical className="w-3 h-3" /> {offer.research}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-[#d1d5db] self-end">{offer.date}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-[18px] font-bold text-[#6b7280] mb-2">暂无匹配的录取数据</h3>
            <p className="text-[14px] text-[#9ca3af] mb-4">尝试切换申请季或调整筛选条件</p>
            <button onClick={() => { setResultFilter('all'); setBgFilter('all'); setCountryFilter('全部地区'); setSearchKeyword(''); }} className="text-[14px] text-[#14b8a6] font-medium hover:underline">
              清除所有筛选条件
            </button>
          </div>
        )}

        {/* 分页 */}
        {filtered.length > 0 && (
          <div className="flex justify-center mt-10">
            <div className="flex items-center gap-2">
              <button className="px-4 h-10 rounded-xl bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6] text-[14px] font-medium transition-colors">
                上一页
              </button>
              {[1, 2, 3].map((page) => (
                <button key={page} className={`w-10 h-10 rounded-xl text-[14px] font-medium transition-colors ${page === 1 ? 'bg-[#14b8a6] text-white shadow-sm' : 'bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6]'}`}>
                  {page}
                </button>
              ))}
              <span className="text-[#9ca3af] px-2">...</span>
              <button className="w-10 h-10 rounded-xl bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6] text-[14px] font-medium transition-colors">8</button>
              <button className="px-4 h-10 rounded-xl bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6] text-[14px] font-medium transition-colors">
                下一页
              </button>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#111827] to-[#1e293b] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-[20px] font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#14b8a6]" /> 分享你的 Offer，帮助更多同学
            </h3>
            <p className="text-[14px] text-gray-400">提交你的录取数据，我们将保护你的隐私并帮助更多申请者了解录取趋势</p>
          </div>
          <button className="bg-[#14b8a6] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#0f766e] transition-colors shadow-lg shadow-[#14b8a6]/20 flex items-center gap-2 shrink-0">
            <ThumbsUp className="w-4 h-4" /> 提交我的 Offer
          </button>
        </div>
      </div>
    </div>
  );
}
