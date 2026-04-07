import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ChevronRight, Search, CheckCircle2, Clock, X,
  SlidersHorizontal, Filter, GraduationCap, BarChart3, ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ====== Mock 数据（后续全部由后台接口提供） ======

const SEASONS = ['2026 Fall', '2026 Spring', '2025 Fall', '2025 Spring'];

const OFFERS_DATA = [
  { id: 1, school: '帝国理工学院', program: '计算机科学 MSc', country: '英国', result: 'admitted', background: '985', university: '北京大学', gpa: '3.8/4.0', ielts: '7.5', gre: '', internship: '字节跳动 · 后端', research: '2段科研', date: '2026-03-28' },
  { id: 2, school: '香港中文大学', program: '商业分析 MSc', country: '中国香港', result: 'admitted', background: '211', university: '上海财经大学', gpa: '3.5/4.0', ielts: '7.0', gre: '', internship: '四大 · 咨询', research: '无', date: '2026-03-27' },
  { id: 3, school: '爱丁堡大学', program: '人工智能 MSc', country: '英国', result: 'rejected', background: '双非', university: '杭州电子科技大学', gpa: '3.8/4.0', ielts: '6.5', gre: '', internship: '阿里巴巴 · 算法', research: '1段科研', date: '2026-03-26' },
  { id: 4, school: '新加坡国立大学', program: '金融工程 MSc', country: '新加坡', result: 'admitted', background: '985', university: '复旦大学', gpa: '3.6/4.0', ielts: '', gre: '325', internship: '中金 · 投行', research: '1段科研', date: '2026-03-25' },
  { id: 5, school: '悉尼大学', program: '数据科学 MSc', country: '澳大利亚', result: 'waitlisted', background: '211', university: '南京师范大学', gpa: '3.3/4.0', ielts: '6.5', gre: '', internship: '无', research: '无', date: '2026-03-24' },
  { id: 6, school: '多伦多大学', program: '电子与计算机工程 MEng', country: '加拿大', result: 'admitted', background: '985', university: '浙江大学', gpa: '3.7/4.0', ielts: '', gre: '320', internship: '华为 · 研发', research: '2段科研+论文', date: '2026-03-23' },
  { id: 7, school: '伦敦大学学院', program: '教育学 MA', country: '英国', result: 'admitted', background: '211', university: '华东师范大学', gpa: '3.6/4.0', ielts: '7.5', gre: '', internship: '教育机构', research: '1段科研', date: '2026-03-22' },
  { id: 8, school: '香港科技大学', program: '数据科学 MSc', country: '中国香港', result: 'admitted', background: '双非', university: '深圳大学', gpa: '3.7/4.0', ielts: '7.0', gre: '', internship: '腾讯 · 数据分析', research: '无', date: '2026-03-21' },
  { id: 9, school: '墨尔本大学', program: '信息技术 MIT', country: '澳大利亚', result: 'admitted', background: '211', university: '武汉理工大学', gpa: '3.4/4.0', ielts: '6.5', gre: '', internship: '无', research: '无', date: '2026-03-20' },
  { id: 10, school: '帝国理工学院', program: '金融学 MSc', country: '英国', result: 'rejected', background: '211', university: '中南财经政法大学', gpa: '3.5/4.0', ielts: '7.0', gre: '318', internship: '中信证券', research: '无', date: '2026-03-19' },
];

export default function StudyAbroadOffers() {
  const [selectedSeason, setSelectedSeason] = useState('2026 Fall');
  const [resultFilter, setResultFilter] = useState<'all' | 'admitted' | 'rejected' | 'waitlisted'>('all');
  const [bgFilter, setBgFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const filtered = OFFERS_DATA.filter((o) => {
    if (resultFilter !== 'all' && o.result !== resultFilter) return false;
    if (bgFilter !== 'all' && o.background !== bgFilter) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!o.school.toLowerCase().includes(kw) && !o.program.toLowerCase().includes(kw)) return false;
    }
    return true;
  });

  const stats = {
    total: OFFERS_DATA.length,
    admitted: OFFERS_DATA.filter(o => o.result === 'admitted').length,
    rejected: OFFERS_DATA.filter(o => o.result === 'rejected').length,
    waitlisted: OFFERS_DATA.filter(o => o.result === 'waitlisted').length,
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] pt-6 pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-4">
          <Link to="/study-abroad" className="hover:text-[#14b8a6] transition-colors">留学</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#4b5563]">Offer 榜</span>
        </div>

        <h1 className="text-[30px] font-bold text-[#111827] flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-[#14b8a6]" /> Offer 榜
        </h1>
        <p className="text-[15px] text-[#6b7280] mb-8">来自平台用户的真实录取数据，助你精准定位</p>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '总数据量', value: stats.total, icon: BarChart3, color: 'text-[#14b8a6]', bg: 'bg-[#f0fdfa]', border: 'border-[#ccfbf1]' },
            { label: 'Offer', value: stats.admitted, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
            { label: 'Rejected', value: stats.rejected, icon: X, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
            { label: 'Waitlisted', value: stats.waitlisted, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
          ].map((s, idx) => (
            <div key={idx} className={`${s.bg} rounded-2xl p-5 border ${s.border}`}>
              <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
              <div className={`text-[28px] font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[13px] text-[#6b7280]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 筛选栏 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 申请季 */}
            <div className="flex gap-2">
              {SEASONS.map((s) => (
                <button key={s} onClick={() => setSelectedSeason(s)} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${selectedSeason === s ? 'bg-[#14b8a6] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            {/* 搜索 */}
            <div className="flex-grow relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input type="text" placeholder="搜索院校/项目..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f9fafb] border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] placeholder-[#9ca3af]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {/* 结果筛选 */}
            {[
              { key: 'all' as const, label: '全部' },
              { key: 'admitted' as const, label: 'Offer' },
              { key: 'rejected' as const, label: 'Rejected' },
              { key: 'waitlisted' as const, label: 'Waitlisted' },
            ].map((f) => (
              <button key={f.key} onClick={() => setResultFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${resultFilter === f.key ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'}`}>
                {f.label}
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
              <button key={f.key} onClick={() => setBgFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${bgFilter === f.key ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Offer 列表 */}
        <div className="space-y-3">
          {filtered.map((offer, idx) => (
            <motion.div key={offer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* 结果标识 */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  offer.result === 'admitted' ? 'bg-green-50' : offer.result === 'rejected' ? 'bg-red-50' : 'bg-yellow-50'
                }`}>
                  {offer.result === 'admitted' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                  {offer.result === 'rejected' && <span className="text-red-500 font-bold text-[18px]">✕</span>}
                  {offer.result === 'waitlisted' && <Clock className="w-6 h-6 text-yellow-500" />}
                </div>

                {/* 院校信息 */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-[16px] font-bold text-[#111827]">{offer.school}</h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      offer.result === 'admitted' ? 'bg-green-100 text-green-700' : offer.result === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {offer.result === 'admitted' ? 'Offer' : offer.result === 'rejected' ? 'Rej' : 'WL'}
                    </span>
                    <span className="text-[11px] text-[#9ca3af] bg-gray-50 px-2 py-0.5 rounded">{offer.country}</span>
                  </div>
                  <p className="text-[14px] text-[#6b7280]">{offer.program}</p>
                </div>

                {/* 申请人背景 */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 text-[12px] text-[#6b7280] shrink-0">
                  <span className="bg-[#f0fdfa] text-[#14b8a6] px-2 py-1 rounded font-medium">{offer.background}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded">{offer.university}</span>
                  <span>GPA {offer.gpa}</span>
                  {offer.ielts && <span>IELTS {offer.ielts}</span>}
                  {offer.gre && <span>GRE {offer.gre}</span>}
                  {offer.internship && offer.internship !== '无' && <span className="text-blue-500">🏢 {offer.internship}</span>}
                  {offer.research && offer.research !== '无' && <span className="text-purple-500">🔬 {offer.research}</span>}
                </div>

                <span className="text-[12px] text-[#d1d5db] shrink-0">{offer.date}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-[18px] font-bold text-[#6b7280] mb-2">暂无匹配的录取数据</h3>
            <p className="text-[14px] text-[#9ca3af]">尝试切换申请季或调整筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
}
