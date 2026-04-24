import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle, XCircle,
  CalendarCheck, CalendarX, Search,
  DollarSign, Timer, AlertCircle, Video
} from 'lucide-react';
import http from '@/api/http';
import { ListSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Tag from '@/components/ui/Tag';

// ====== 导师预约管理页 ======
// 预约列表、筛选标签、确认/拒绝/完成操作

type AppointmentStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface Appointment {
  id: number;
  studentName: string;
  studentAvatar: string;
  studentSchool: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  fee: number;
  note: string;
  meeting_link?: string;
}

const statusConfig = {
  pending: { label: '待确认', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertCircle, dotColor: 'bg-orange-500', tagVariant: 'orange' as const },
  confirmed: { label: '已确认', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CalendarCheck, dotColor: 'bg-blue-500', tagVariant: 'blue' as const },
  completed: { label: '已完成', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle, dotColor: 'bg-green-500', tagVariant: 'green' as const },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: CalendarX, dotColor: 'bg-gray-400', tagVariant: 'gray' as const },
};

const filterTabs: { key: AppointmentStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

export default function MentorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppointmentStatus>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [meetingLinks, setMeetingLinks] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const res = await http.get('/mentor/appointments');
      if (res.data?.code === 200 && res.data.data) {
        const raw = res.data.data;
        // 后端可能返回 {appointments: [...]} 或 {list: [...]} 或直接是数组
        const list = Array.isArray(raw.list)
          ? raw.list
          : Array.isArray(raw.appointments)
            ? raw.appointments
            : Array.isArray(raw)
              ? raw
              : [];
        setAppointments(list);
      }
    } catch (err) {
      setError('数据加载失败，请刷新重试');
      if (import.meta.env.DEV) console.error('[DEV] API error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 筛选预约
  const filteredAppointments = appointments.filter(apt => {
    const matchTab = activeTab === 'all' || apt.status === activeTab;
    const matchSearch = !searchKeyword
      || apt.studentName.includes(searchKeyword)
      || apt.service.includes(searchKeyword)
      || apt.studentSchool.includes(searchKeyword);
    return matchTab && matchSearch;
  });

  // 各状态计数
  const statusCounts = {
    all: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  // 确认预约
  async function confirmAppointment(id: number) {
    setAppointments(prev =>
      prev.map(apt => apt.id === id ? { ...apt, status: 'confirmed' as const } : apt)
    );
    try {
      await http.put(`/mentor/appointments/${id}/confirm`);
    } catch {
      // 忽略错误
    }
  }

  // 拒绝预约
  async function rejectAppointment(id: number) {
    setAppointments(prev =>
      prev.map(apt => apt.id === id ? { ...apt, status: 'cancelled' as const } : apt)
    );
    try {
      await http.put(`/mentor/appointments/${id}/reject`);
    } catch {
      // 忽略错误
    }
  }

  // 完成预约
  async function completeAppointment(id: number) {
    setAppointments(prev =>
      prev.map(apt => apt.id === id ? { ...apt, status: 'completed' as const } : apt)
    );
    try {
      await http.put(`/mentor/appointments/${id}/complete`);
    } catch {
      // 忽略错误
    }
  }

  // 保存会议链接
  async function saveMeetingLink(id: number) {
    const link = meetingLinks[id] || '';
    setAppointments(prev =>
      prev.map(apt => apt.id === id ? { ...apt, meeting_link: link } : apt)
    );
    try {
      await http.put(`/mentor/appointments/${id}/meeting-link`, { meeting_link: link });
    } catch {
      // 忽略错误
    }
  }

  // 解析日期用于日历指示器
  function parseDateParts(dateStr: string) {
    const d = new Date(dateStr);
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return {
      month: months[d.getMonth()],
      day: d.getDate(),
      weekday: weekdays[d.getDay()],
    };
  }

  // 判断是否为今天
  function isToday(dateStr: string) {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  if (loading) return <div className="space-y-6"><ListSkeleton count={6} /></div>;
  if (error) return (
    <div className="space-y-6">
      <ErrorState
        message={error}
        onRetry={() => { setError(null); fetchAppointments(); }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">预约管理</h1>
        <p className="text-gray-500 mt-1">管理学生辅导预约，确认或调整预约安排</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '待确认', value: statusCounts.pending, icon: AlertCircle, bg: 'bg-orange-50', color: 'text-orange-600', accent: 'border-l-orange-500' },
          { label: '已确认', value: statusCounts.confirmed, icon: CalendarCheck, bg: 'bg-blue-50', color: 'text-blue-600', accent: 'border-l-blue-500' },
          { label: '已完成', value: statusCounts.completed, icon: CheckCircle, bg: 'bg-green-50', color: 'text-green-600', accent: 'border-l-green-500' },
          { label: '总收入(¥)', value: appointments.filter(a => a.status === 'completed').reduce((s, a) => s + (Number(a.fee) || 0), 0).toLocaleString(), icon: DollarSign, bg: 'bg-primary-50', color: 'text-primary-600', accent: 'border-l-primary-500' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 ${item.accent}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
              <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 筛选标签 + 搜索 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* 标签栏 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {statusCounts[tab.key] > 0 && (
                  <Tag variant={activeTab === tab.key ? 'primary' : 'gray'} size="xs" className="ml-1.5">
                    {statusCounts[tab.key]}
                  </Tag>
                )}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="搜索学生/服务..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* 预约列表 */}
      <div className="space-y-4">
        {filteredAppointments.map((apt, i) => {
          const dateParts = parseDateParts(apt.date);
          const today = isToday(apt.date);
          const cfg = statusConfig[apt.status];

          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex">
                {/* 日历日期指示器 */}
                <div className={`w-20 shrink-0 flex flex-col items-center justify-center border-r border-gray-100 py-4 ${
                  today ? 'bg-primary-50' : 'bg-gray-50'
                }`}>
                  <span className={`text-xs font-medium ${today ? 'text-primary-600' : 'text-gray-500'}`}>
                    {dateParts.month}
                  </span>
                  <span className={`text-2xl font-bold ${today ? 'text-primary-700' : 'text-gray-900'}`}>
                    {dateParts.day}
                  </span>
                  <span className={`text-xs ${today ? 'text-primary-500' : 'text-gray-400'}`}>
                    {today ? '今天' : dateParts.weekday}
                  </span>
                </div>

                {/* 预约详情 */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* 学生头像 */}
                      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-lg shrink-0">
                        {apt.studentAvatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900">{apt.studentName}</h4>
                          <span className="text-xs text-gray-500">({apt.studentSchool})</span>
                          <Tag variant={cfg.tagVariant} size="sm">
                            {cfg.label}
                          </Tag>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">{apt.service}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {apt.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5" />
                            {apt.duration}分钟
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            ¥{apt.fee}
                          </span>
                        </div>
                        {apt.note && (
                          <p className="text-xs text-gray-400 mt-2 bg-gray-50 px-3 py-1.5 rounded-md">
                            备注：{apt.note}
                          </p>
                        )}
                        {apt.status === 'confirmed' && (
                          <div className="mt-3 flex items-center gap-2">
                            <Video className="w-4 h-4 text-primary-500" />
                            <input
                              type="text"
                              value={meetingLinks[apt.id] !== undefined ? meetingLinks[apt.id] : (apt.meeting_link || '')}
                              onChange={e => setMeetingLinks({ ...meetingLinks, [apt.id]: e.target.value })}
                              placeholder="输入线上会议链接 (如腾讯会议/Zoom/钉钉)"
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary-500"
                            />
                            <button
                              onClick={() => saveMeetingLink(apt.id)}
                              className="px-3 py-1.5 bg-primary-50 text-primary-600 rounded text-xs font-medium hover:bg-primary-100"
                            >
                              保存链接
                            </button>
                          </div>
                        )}
                        {(apt.status === 'completed' || apt.status === 'pending') && apt.meeting_link && (
                          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <Video className="w-3.5 h-3.5 text-gray-400" />
                            会议链接：
                            <a href={apt.meeting_link} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">
                              {apt.meeting_link}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {apt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => confirmAppointment(apt.id)}
                            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            确认
                          </button>
                          <button
                            onClick={() => { setRejectingId(apt.id); setRejectDialogOpen(true); }}
                            className="flex items-center gap-1 px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            拒绝
                          </button>
                        </>
                      )}
                      {apt.status === 'confirmed' && (
                        <button
                          onClick={() => completeAppointment(apt.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          标记完成
                        </button>
                      )}
                      {(apt.status === 'completed' || apt.status === 'cancelled') && (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <cfg.icon className="w-4 h-4" />
                          {cfg.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* 空状态 */}
        {filteredAppointments.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl p-16 shadow-sm border border-gray-100 text-center"
          >
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-500 mb-1">暂无预约</h3>
            <p className="text-sm text-gray-400">
              {activeTab === 'all' ? '还没有任何学生预约' : `没有${filterTabs.find(t => t.key === activeTab)?.label}的预约`}
            </p>
          </motion.div>
        )}
      </div>

      {/* 拒绝预约确认弹窗 */}
      <ConfirmDialog
        open={rejectDialogOpen}
        title="确定拒绝该预约？"
        description="拒绝后学生将收到通知。"
        variant="warning"
        confirmText="确认拒绝"
        loading={rejectLoading}
        onConfirm={async () => {
          if (rejectingId === null) return;
          setRejectLoading(true);
          await rejectAppointment(rejectingId);
          setRejectLoading(false);
          setRejectDialogOpen(false);
          setRejectingId(null);
        }}
        onCancel={() => { setRejectDialogOpen(false); setRejectingId(null); }}
      />
    </div>
  );
}
