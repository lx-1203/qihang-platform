import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, CalendarCheck, Users, Star,
  TrendingUp, Clock, ArrowUpRight,
  MessageSquare, Calendar
} from 'lucide-react';
import http from '@/api/http';

// ====== 导师数据概览仪表盘 ======
// 展示课程、预约、学生、评分等核心指标

interface MentorStats {
  totalCourses: number;
  totalAppointments: number;
  totalStudents: number;
  averageRating: number;
  completedAppointments: number;
  pendingAppointments: number;
  thisWeekAppointments: number;
  totalRevenue: number;
}

interface Appointment {
  id: number;
  studentName: string;
  studentAvatar: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  status: string;
}

interface Review {
  id: number;
  studentName: string;
  rating: number;
  content: string;
  courseName: string;
  createdAt: string;
}

// 模拟数据
const mockStats: MentorStats = {
  totalCourses: 8,
  totalAppointments: 156,
  totalStudents: 1250,
  averageRating: 4.8,
  completedAppointments: 132,
  pendingAppointments: 6,
  thisWeekAppointments: 12,
  totalRevenue: 48600,
};

const mockAppointments: Appointment[] = [
  { id: 1, studentName: '李明轩', studentAvatar: '李', service: '简历精修与诊断', date: '2026-04-08', time: '14:00', duration: 60, status: 'confirmed' },
  { id: 2, studentName: '张思颖', studentAvatar: '张', service: '模拟面试辅导', date: '2026-04-08', time: '16:00', duration: 90, status: 'confirmed' },
  { id: 3, studentName: '王子豪', studentAvatar: '王', service: '职业规划咨询', date: '2026-04-09', time: '10:00', duration: 60, status: 'pending' },
  { id: 4, studentName: '赵雨萱', studentAvatar: '赵', service: '考研复试指导', date: '2026-04-09', time: '15:00', duration: 90, status: 'pending' },
  { id: 5, studentName: '刘浩然', studentAvatar: '刘', service: '简历精修与诊断', date: '2026-04-10', time: '09:00', duration: 60, status: 'confirmed' },
];

const mockReviews: Review[] = [
  { id: 1, studentName: '陈晨', rating: 5, content: '老师非常专业，简历修改后投递成功率提升了很多！', courseName: '校招简历怎么写才能过海选？', createdAt: '2小时前' },
  { id: 2, studentName: '周小雅', rating: 5, content: '模拟面试的反馈很有针对性，面试时自信了很多。', courseName: '大厂群面通关秘籍', createdAt: '5小时前' },
  { id: 3, studentName: '孙博文', rating: 4, content: '课程内容很实用，就是希望能有更多案例分析。', courseName: '职业规划必修课', createdAt: '1天前' },
  { id: 4, studentName: '吴嘉琪', rating: 5, content: '一对一辅导效果非常好，导师耐心解答每个问题。', courseName: '简历精修与诊断', createdAt: '2天前' },
];

export default function MentorDashboard() {
  const [stats, setStats] = useState<MentorStats>(mockStats);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [statsRes, appointmentsRes, reviewsRes] = await Promise.all([
        http.get('/mentor/stats'),
        http.get('/mentor/appointments', { params: { limit: 5, status: 'upcoming' } }),
        http.get('/mentor/reviews', { params: { limit: 4 } }),
      ]);
      if (statsRes.data?.code === 200 && statsRes.data.data) {
        setStats(statsRes.data.data);
      }
      if (appointmentsRes.data?.code === 200 && appointmentsRes.data.data) {
        setAppointments(appointmentsRes.data.data.list || appointmentsRes.data.data);
      }
      if (reviewsRes.data?.code === 200 && reviewsRes.data.data) {
        setReviews(reviewsRes.data.data.list || reviewsRes.data.data);
      }
    } catch {
      // 使用默认 Mock 数据
    } finally {
      setLoading(false);
    }
  }

  // 核心指标卡片
  const statCards = [
    { label: '课程总数', value: stats.totalCourses, icon: BookOpen, color: 'bg-primary-500', change: '+2', trend: 'up' as const },
    { label: '预约总数', value: stats.totalAppointments, icon: CalendarCheck, color: 'bg-blue-500', change: '+18%', trend: 'up' as const },
    { label: '累计学员', value: stats.totalStudents, icon: Users, color: 'bg-purple-500', change: '+5.4%', trend: 'up' as const },
    { label: '综合评分', value: stats.averageRating, icon: Star, color: 'bg-amber-500', change: '+0.1', trend: 'up' as const },
  ];

  // 模拟每周预约趋势
  const weeklyData = [
    { day: '周一', value: 5 },
    { day: '周二', value: 8 },
    { day: '周三', value: 3 },
    { day: '周四', value: 7 },
    { day: '周五', value: 10 },
    { day: '周六', value: 4 },
    { day: '周日', value: 2 },
  ];
  const maxWeekly = Math.max(...weeklyData.map(d => d.value));

  // 渲染星星评分
  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    confirmed: { label: '已确认', color: 'bg-green-50 text-green-700' },
    pending: { label: '待确认', color: 'bg-orange-50 text-orange-700' },
    completed: { label: '已完成', color: 'bg-blue-50 text-blue-700' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600' },
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">导师工作台</h1>
        <p className="text-gray-500 mt-1">查看您的课程、预约和学生数据概览</p>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <TrendingUp className="w-4 h-4" />
                {card.change}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {typeof card.value === 'number' && card.value >= 100
                ? card.value.toLocaleString()
                : card.value}
            </p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* 即将到来的预约 + 每周预约趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 即将到来的预约 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">即将到来的预约</h3>
            <a href="/mentor/appointments" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              查看全部
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
          <div className="divide-y divide-gray-100">
            {appointments.map((apt, i) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm">
                    {apt.studentAvatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{apt.studentName}</h4>
                    <p className="text-xs text-gray-500">{apt.service}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{apt.date}</p>
                    <p className="text-xs text-gray-500">{apt.time}  ·  {apt.duration}分钟</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusMap[apt.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {statusMap[apt.status]?.label || apt.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 每周预约趋势 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">本周预约</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>共 {weeklyData.reduce((a, b) => a + b.value, 0)} 次</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-48">
            {weeklyData.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">{d.value}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.value / maxWeekly) * 100}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-md min-h-[4px]"
                />
                <span className="text-xs text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 快速统计 + 最近学生评价 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 快速统计 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">数据摘要</h3>
          <div className="space-y-4">
            {[
              { label: '已完成预约', value: stats.completedAppointments, icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-50' },
              { label: '待确认预约', value: stats.pendingAppointments, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: '本周预约', value: stats.thisWeekAppointments, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: '累计收入(¥)', value: stats.totalRevenue.toLocaleString(), icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 最近学生评价 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">最近学生评价</h3>
            <MessageSquare className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-4 rounded-lg bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{review.studentName}</span>
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-xs text-gray-400">{review.createdAt}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{review.content}</p>
                <p className="text-xs text-primary-600">课程：{review.courseName}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
