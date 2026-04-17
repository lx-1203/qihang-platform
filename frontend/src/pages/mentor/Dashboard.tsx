import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Video, Calendar, Users, Star, Clock,
  TrendingUp, CheckCircle2, AlertCircle,
  MessageCircle,
  DollarSign, Award, ArrowRight
} from 'lucide-react';
import http from '@/api/http';
import OnboardingGuide from '@/components/OnboardingGuide';
import { FeatureOverlay } from '@/components/FeatureStatus';
import { showToast } from '@/components/ui/ToastContainer';
import { useAuthStore } from '@/store/auth';
import Tag from '@/components/ui/Tag';

// ====== 导师端仪表盘 ======
// 风格：绿色温暖教学感，今日日程为核心差异
// 与管理员（深色权威）和企业（蓝色招聘）完全不同

export default function MentorDashboardPage() {
  const { user } = useAuthStore();
  const displayName = user?.nickname || user?.email || '导师';
  const displayInitial = displayName.charAt(0);

  const [stats, setStats] = useState({
    totalCourses: 5, totalAppointments: 128, totalStudents: 86, rating: 4.9,
    monthSessions: 18, pendingAppts: 3, monthRevenue: 5370, ratingTrend: 0.2,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await http.get('/mentor/stats');
        if (res.data?.code === 200 && res.data.data) setStats(prev => ({ ...prev, ...res.data.data }));
      } catch { /* mock */ }
    })();
  }, []);

  // 今日日程（导师端独有核心功能）
  const todaySchedule = [
    { time: '09:00', endTime: '10:00', student: '林小明', service: '简历精修1v1', status: '已完成' as const, avatar: '林' },
    { time: '11:00', endTime: '12:00', student: '王思远', service: '模拟面试辅导', status: '进行中' as const, avatar: '王' },
    { time: '14:00', endTime: '15:00', student: '张晓华', service: '职业规划咨询', status: '即将开始' as const, avatar: '张' },
    { time: '16:00', endTime: '17:00', student: '陈美琪', service: '面试技巧辅导', status: '待确认' as const, avatar: '陈' },
  ];
  const scheduleColors = {
    '已完成': 'bg-gray-100 text-gray-500 border-gray-200',
    '进行中': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '即将开始': 'bg-amber-50 text-amber-700 border-amber-200',
    '待确认': 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const dotColors = {
    '已完成': 'bg-gray-400', '进行中': 'bg-emerald-500 animate-pulse',
    '即将开始': 'bg-amber-500', '待确认': 'bg-blue-500',
  };

  // 学生评价
  const reviews = [
    { student: '林小明', rating: 5, comment: '导师非常专业，简历修改建议非常到位，帮我理清了很多思路！', service: '简历精修', time: '2小时前' },
    { student: '赵同学', rating: 5, comment: '模拟面试很真实，反馈很详细，受益匪浅。', service: '模拟面试', time: '昨天' },
    { student: '李雨晨', rating: 4, comment: '职业规划建议很有针对性，帮我明确了方向。', service: '职业规划', time: '2天前' },
  ];

  // 我的课程
  const courses = [
    { title: '简历撰写实战课', students: 234, rating: 4.9, status: 'active' as const },
    { title: '群面技巧与实战', students: 156, rating: 4.8, status: 'active' as const },
    { title: '职业规划方法论', students: 89, rating: 4.7, status: 'active' as const },
    { title: '面试复盘直播课', students: 0, rating: 0, status: 'draft' as const },
  ];

  // 辅导方向热度
  const serviceHot = [
    { name: '简历精修', count: 45 },
    { name: '模拟面试', count: 38 },
    { name: '职业规划', count: 28 },
    { name: '技术面辅导', count: 17 },
  ];
  const serviceMax = serviceHot[0].count;

  return (
    <div className="space-y-6">
      {/* ====== 导师欢迎区 —— 绿色温暖教学风格 ====== */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                <span className="text-2xl font-bold">{displayInitial}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{displayName}，欢迎回到工作台！</h1>
                  <Tag variant="green" size="xs" className="bg-white/20 border-white/30 text-white">
                    <CheckCircle2 className="w-3 h-3 inline mr-0.5" />已认证
                  </Tag>
                </div>
                <p className="text-sm text-emerald-100 mt-1">
                  评分 <b className="text-white">{stats.rating}</b> <Star className="w-3 h-3 inline text-amber-300 fill-amber-300" /> ·
                  辅导 <b className="text-white">{stats.totalStudents}</b> 名学员 ·
                  课程 <b className="text-white">{stats.totalCourses}</b> 门
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Link to="/mentors/10" className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                查看我的主页 →
              </Link>
              <p className="text-xs text-emerald-200 mt-1">本周已有 3 名学员预约了你的辅导</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ====== KPI 卡片 ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '本月辅导', value: stats.monthSessions, unit: '次', change: '+23%', icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: '待确认预约', value: stats.pendingAppts, unit: '个', change: '', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: '本月收入', value: `¥${stats.monthRevenue.toLocaleString()}`, unit: '', change: '+18%', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: '综合评分', value: stats.rating.toFixed(1), unit: '/ 5.0', change: `+${stats.ratingTrend}`, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${card.bg} rounded-xl p-4 border ${card.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              {card.change && (
                <span className="text-[11px] font-medium text-green-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />{card.change}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{card.value}</span>
              {card.unit && <span className="text-xs text-gray-400">{card.unit}</span>}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ====== 今日日程（导师端独有） ====== */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> 今日辅导日程
            </h3>
            <Link to="/mentor/appointments" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              全部预约 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="relative">
            {/* 时间线 */}
            <div className="absolute left-[52px] top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-4">
              {todaySchedule.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className={`relative flex items-start gap-4 p-4 rounded-xl border transition-colors ${scheduleColors[item.status]}`}
                >
                  {/* 时间 */}
                  <div className="w-[40px] shrink-0 text-center">
                    <div className="text-sm font-bold">{item.time}</div>
                    <div className="text-[10px] text-gray-400">{item.endTime}</div>
                  </div>
                  {/* 时间线点 */}
                  <div className="relative z-10 shrink-0 mt-1.5">
                    <span className={`w-3 h-3 rounded-full block ${dotColors[item.status]}`} />
                  </div>
                  {/* 内容 */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sm font-bold text-emerald-700 shadow-sm border border-gray-100">
                      {item.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{item.student}</span>
                        <Tag variant="gray" size="xs" className="bg-white/80">{item.status}</Tag>
                      </div>
                      <p className="text-xs opacity-70 mt-0.5">{item.service}</p>
                    </div>
                    {item.status === '进行中' && (
                      <button onClick={() => showToast({ type: 'info', title: '功能开发中', message: '该功能正在开发中，敬请期待' })} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                        进入辅导
                      </button>
                    )}
                    {item.status === '待确认' && (
                      <button onClick={() => showToast({ type: 'info', title: '功能开发中', message: '该功能正在开发中，敬请期待' })} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        确认预约
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* 学生评价 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-purple-500" /> 最新学生评价
            </h3>
            <p className="text-[11px] text-green-600 mb-4">评分比上月提升 {stats.ratingTrend} 分</p>
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
                  className="bg-gray-50 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center text-[11px] font-bold text-purple-700">
                      {r.student[0]}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{r.student}</span>
                    <div className="flex gap-0.5 ml-auto">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className={`w-3 h-3 ${si < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{r.comment}</p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                    <span>{r.service}</span>
                    <span>{r.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 我的课程 + 辅导热度 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-teal-600" /> 我的课程
            </h3>
            <Link to="/mentor/courses" className="text-xs text-emerald-600 hover:underline">管理课程</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {courses.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                className={`rounded-xl p-4 border ${c.status === 'draft' ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-100 bg-gradient-to-br from-emerald-50 to-teal-50'}`}
              >
                <h4 className="text-sm font-bold text-gray-900 mb-2">{c.title}</h4>
                {c.status === 'active' ? (
                  <>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.students}</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {c.rating}</span>
                    </div>
                    <Tag variant="green" size="xs" className="mt-2">已上线</Tag>
                  </>
                ) : (
                  <Tag variant="gray" size="xs">草稿</Tag>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> 热门辅导方向
          </h3>
          <div className="space-y-3 mb-6">
            {serviceHot.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-20 shrink-0">{s.name}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / serviceMax) * 100}%` }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full flex items-center justify-end pr-2"
                  >
                    <span className="text-[10px] font-bold text-white">{s.count}</span>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>

          {/* 学员画像（即将上线） */}
          <FeatureOverlay status="coming" message="学员画像分析功能即将上线，将展示学员背景分布">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-xs font-bold text-gray-700 mb-3">学员画像分析</h4>
              <div className="flex justify-center gap-6 text-xs text-gray-400">
                <div className="text-center"><div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-1" />985/211</div>
                <div className="text-center"><div className="w-10 h-10 bg-gray-200 rounded-full mx-auto mb-1" />双非</div>
                <div className="text-center"><div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-1" />海本</div>
              </div>
            </div>
          </FeatureOverlay>
        </div>
      </div>

      <OnboardingGuide role="mentor" />
    </div>
  );
}
