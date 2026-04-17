import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Mail, Phone, Calendar,
  MessageCircle, Loader2,
  User
} from 'lucide-react';
import http from '@/api/http';

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

export default function MentorStudents() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 获取学生列表
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await http.get('/mentor/students');
      if (res.data?.code === 200 && res.data.data) {
        setStudents(res.data.data.students || []);
      }
    } catch (err) {
      console.error('获取学生列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 本地搜索过滤
  const filteredStudents = students.filter((s) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      s.nickname?.toLowerCase().includes(kw) ||
      s.email?.toLowerCase().includes(kw)
    );
  });

  // 格式化时间
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '暂无';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的学生</h1>
          <p className="text-sm text-gray-500 mt-1">查看所有与你有过预约的学生</p>
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
            placeholder="搜索学生姓名、邮箱..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm transition-colors"
          />
        </div>
      </div>

      {/* 学生列表 */}
      {loading ? (
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
            {searchKeyword ? '请尝试不同的搜索关键词' : '当学生预约你的辅导服务后，将会出现在这里'}
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
                    src={student.avatar}
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
                  <div className="text-xs text-gray-500">预约次数</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-sm font-medium text-gray-900 truncate">{formatDate(student.last_appointment)}</div>
                  <div className="text-xs text-gray-500">最近预约</div>
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
                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors">
                  <MessageCircle size={14} />
                  发消息
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  <Calendar size={14} />
                  预约记录
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
