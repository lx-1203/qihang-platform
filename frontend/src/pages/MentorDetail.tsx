import { useParams, Link } from 'react-router-dom';
import { Star, Clock, BookOpen, Video, Award, ChevronRight, MessageCircle } from 'lucide-react';

const MENTOR_DATA = {
  id: 1,
  name: '陈经理',
  title: '前头部互联网大厂招聘总监',
  company: '某知名互联网公司',
  experience: '10年+ HR经验',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
  rating: 4.9,
  students: 1250,
  about: '作为前某头部大厂校园招聘负责人，我曾面试过超过5000名应届生。我深知大厂招聘的底层逻辑、简历筛选的标准以及面试官的偏好。我致力于帮助初入职场的同学避开求职坑，拿到心仪的Offer。',
  expertise: ['简历精修', '模拟面试', '职业规划', '薪资谈判', '群面技巧'],
  courses: [
    { id: 2, title: '校招简历怎么写才能过海选？', type: '视频课', duration: '45分钟', students: '3.5w', price: '免费' },
    { id: 5, title: '大厂群面(无领导小组)通关秘籍', type: '视频课', duration: '120分钟', students: '1.2w', price: '¥99' },
  ],
  services: [
    { id: 1, title: '1V1 简历精修与深度诊断', duration: '60分钟', price: '¥299', desc: '逐行修改简历，挖掘个人亮点，匹配目标岗位需求。' },
    { id: 2, title: '全真模拟面试与复盘', duration: '90分钟', price: '¥499', desc: '模拟真实大厂单面/群面场景，提供详细打分与改进建议。' },
  ]
};

export default function MentorDetail() {
  const { id } = useParams();
  const mentor = id ? MENTOR_DATA : MENTOR_DATA;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <img src={mentor.avatar} alt={mentor.name} className="w-32 h-32 rounded-full object-cover border-4 border-primary-50 shadow-md" />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{mentor.name}</h1>
                <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                  认证导师
                </span>
              </div>
              <p className="text-xl text-gray-600 mb-4">{mentor.title}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                  <span className="font-medium text-gray-900">{mentor.rating}</span>
                  <span>学员评分</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium text-gray-900">{mentor.students}+</span>
                  <span>辅导人次</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>{mentor.experience}</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-auto mt-6 md:mt-0 flex gap-4">
               <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm">
                 <MessageCircle size={18} />
                 私信咨询
               </button>
               <button className="flex-1 md:flex-none bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm">
                 立即预约
               </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">擅长领域</h2>
            <div className="flex flex-wrap gap-2">
              {mentor.expertise.map((item, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">导师介绍</h2>
            <p className="text-gray-600 leading-relaxed">
              {mentor.about}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">主讲课程</h2>
              <Link to="/courses" className="text-sm text-primary-600 hover:text-primary-700 font-medium">查看全部</Link>
            </div>
            <div className="space-y-4">
              {mentor.courses.map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`} className="group block border border-gray-100 rounded-lg p-4 hover:border-primary-200 hover:bg-primary-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-primary-500 transition-colors">
                        <Video size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{course.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock size={14} /> {course.duration}</span>
                          <span className="flex items-center gap-1"><BookOpen size={14} /> {course.students} 人学过</span>
                        </div>
                      </div>
                    </div>
                    <span className={`font-bold ${course.price === '免费' ? 'text-green-500' : 'text-orange-500'}`}>
                      {course.price}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-6">1v1 辅导服务</h2>
            <div className="space-y-4">
              {mentor.services.map((service) => (
                <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{service.title}</h3>
                    <span className="font-bold text-orange-500">{service.price}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{service.desc}</p>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={14} /> {service.duration}</span>
                    <span className="flex items-center text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
                      预约 <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">平台保障 · 不满意退款 · 隐私保护</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
