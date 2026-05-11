import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Mail, Phone, Calendar,
  MessageCircle, Loader2,
  User, X, Clock, BookOpen, ChevronRight
} from 'lucide-react';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';
import ErrorState from '@/components/ui/ErrorState';
import { DEFAULT_AVATAR } from '@/constants';
import Tag from '@/components/ui/Tag';

// 学生数据结构（匹配后端 /api/mentor/students 返回）
interface StudentItem {
  id: number;
  nickname: string;
  avatar: string;
  email: string;
  phone: string;
  appointment_count: number;
  last_appointment: string;
}

// 学员咨询历史记录
interface AppointmentRecord {
  id: number;
  appointment_time: string;
  service_title: string;
  status: string;
  fee: number;
  note: string;
}

export default function MentorStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [chatLoadingId, setChatLoadingId] = useState<number | null>(null);

  // 学员详情弹窗
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [studentAppointments, setStudentAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // 获取学生列表
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/mentor/students');
      if (res.data?.code === 200 && res.data.data) {
        setStudents(res.data.data.students || []);
      }
    } catch (err) {
      setError('学生列表加载失败，请稍后重试');
      if (import.meta.env.DEV) console.error('[DEV] fetchStudents error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 查看学员咨询历史
  const fetchStudentAppointments = async (studentId: number) => {
    try {
      setAppointmentsLoading(true);
      const res = await http.get('/mentor/appointments');
      if (res.data?.code === 200 && res.data.data) {
        const raw = res.data.data;
        const list: any[] = Array.isArray(raw.list)
          ? raw.list
          : Array.isArray(raw.appointments)
            ? raw.appointments
            : Array.isArray(raw)
              ? raw
              : [];
        // 过滤出该学员的咨询
        const filtered = list.filter((a: any) => a.student_id === studentId);
        const mapped: AppointmentRecord[] = filtered.map((item: any) => ({
          id: item.id,
          appointment_time: item.appointment_time || '',
          service_title: item.service_title || item.service || '',
          status: item.status || 'pending',
          fee: item.fee || 0,
          note: item.note || '',
        }));
        setStudentAppointments(mapped);
      }
    } catch (err) {
      console.error('获取学员咨询历史失败:', err);
      showToast('获取咨询历史失败', 'error');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // 打开学员详情
  const openStudentDetail = (student: StudentItem) => {
    setSelectedStudent(student);
    fetchStudentAppointments(student.id);
  };

  // 本地搜索过滤
  const filteredStudents = students.filter((s) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      s.nickname?.toLowerCase().includes(kw) ||
      s.email?.toLowerCase().includes(kw) ||
      s.phone?.includes(kw)
    );
  });

  // 格式化时间
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '暂无';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '暂无';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // 咨询状态配置
  const appointmentStatusConfig: Record<string, { label: string; variant: 'green' | 'blue' | 'orange' | 'gray' | 'red' }> = {
    completed: { label: '已完成', variant: 'green' },
    confirmed: { label: '已确认', variant: 'blue' },
    pending: { label: '待确认', variant: 'orange' },
    cancelled: { label: '已取消', variant: 'gray' },
    rejected: { label: '已拒绝', variant: 'red' },
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的学生</h1>
          <p className="text-sm text-gray-500 mt-1">查看所有与你有过咨询记录的学生</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users size={16} />
          <span>共 {students.length} 位学生</span>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索学生姓名、邮箱、手机号..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm transition-colors"
          />
        </div>
      </div>

      {/* 学生列表 */}
      {error ? (
        <ErrorState message={error} onRetry={fetchStudents} />
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="ml-3 text-gray-500">加载学生列表中...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {searchKeyword ? '没有找到匹配的学生' : '暂无学生记录'}
          </h3>
          <p className="text-sm text-gray-500">
            {searchKeyword ? '请尝试不同的搜索关键词' : '当学生进入你的咨询服务流程后，将会出现在这里'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all group"
            >
              {/* 学生头部 */}
              <div className="flex items-start gap-4 mb-4">
                {student.avatar ? (
                  <img
                    src={student.avatar || DEFAULT_AVATAR}
                    alt={student.nickname}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
                    {student.nickname?.charAt(0) || <User size={20} />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                    {student.nickname || '未设置昵称'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{student.email}</p>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-primary-600">{student.appointment_count}</div>
                  <div className="text-xs text-gray-500">咨询次数</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-sm font-medium text-gray-900 truncate">{formatDate(student.last_appointment)}</div>
                  <div className="text-xs text-gray-500">最近咨询</div>
                </div>
              </div>

              {/* 联系方式 */}
              <div className="space-y-2 mb-4">
                {student.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={14} className="text-gray-400 flex-shrink-0" />
                    <span>{student.phone}</span>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={async () => {
                    try {
                      setChatLoadingId(student.id);
                      const res = await http.post('/chat/conversations', { target_user_id: student.id });
                      if (res.data?.code === 200 && res.data.data?.id) {
                        navigate(`/chat/${res.data.data.id}`);
                      }
                    } catch (err) {
                      showToast('创建聊天失败，请稍后重试', 'error');
                      if (import.meta.env.DEV) console.error('[DEV] createChat error:', err);
                    } finally {
                      setChatLoadingId(null);
                    }
                  }}
                  disabled={chatLoadingId === student.id}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors disabled:opacity-50"
                >
                  {chatLoadingId === student.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <MessageCircle size={14} />
                  )}
                  联系学生
                </button>
                <button
                  onClick={() => openStudentDetail(student)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  <BookOpen size={14} />
                  查看详情
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 学员详情弹窗 */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[60]"
              onClick={() => setSelectedStudent(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[60] max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* 弹窗头部 */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900">学员详情</h3>
                <button onClick={() => setSelectedStudent(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* 弹窗内容 */}
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                {/* 学员基本信息 */}
                <div className="flex items-center gap-4">
                  {selectedStudent.avatar ? (
                    <img src={selectedStudent.avatar} alt={selectedStudent.nickname} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                      {selectedStudent.nickname?.charAt(0) || <User size={24} />}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{selectedStudent.nickname || '未设置昵称'}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {selectedStudent.email && (
                        <span className="flex items-center gap-1"><Mail size={14} /> {selectedStudent.email}</span>
                      )}
                    </div>
                    {selectedStudent.phone && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                        <Phone size={14} /> {selectedStudent.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* 统计 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-primary-600">{selectedStudent.appointment_count}</div>
                    <div className="text-xs text-gray-500">总咨询次数</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-medium text-green-700">{formatDate(selectedStudent.last_appointment)}</div>
                    <div className="text-xs text-gray-500">最近咨询</div>
                  </div>
                </div>

                {/* 咨询历史 */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1">
                    <Calendar size={14} />
                    咨询历史
                  </h4>
                  {appointmentsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                      <span className="ml-2 text-sm text-gray-500">加载中...</span>
                    </div>
                  ) : studentAppointments.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">暂无咨询记录</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {studentAppointments.map((apt) => {
                        const statusCfg = appointmentStatusConfig[apt.status] || appointmentStatusConfig.pending;
                        return (
                          <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{apt.service_title || '辅导服务'}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatDateTime(apt.appointment_time)}
                                </span>
                                {apt.fee > 0 && (
                                  <span>¥{apt.fee}</span>
                                )}
                              </div>
                              {apt.note && (
                                <p className="text-xs text-gray-400 mt-1 truncate">备注：{apt.note}</p>
                              )}
                            </div>
                            <Tag variant={statusCfg.variant} size="sm" className="ml-2 flex-shrink-0">
                              {statusCfg.label}
                            </Tag>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 弹窗底部操作 */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button
                  onClick={async () => {
                    try {
                      const res = await http.post('/chat/conversations', { target_user_id: selectedStudent.id });
                      if (res.data?.code === 200 && res.data.data?.id) {
                        navigate(`/chat/${res.data.data.id}`);
                      }
                    } catch {
                      showToast('创建聊天失败', 'error');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  <MessageCircle size={14} />
                  联系学生
                </button>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    navigate(`/mentor/appointments?studentId=${selectedStudent.id}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Calendar size={14} />
                  查看全部咨询
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
