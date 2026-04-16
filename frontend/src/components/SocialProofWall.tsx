import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

// ====== 社会证明墙组件 ======
// 展示已成功就业的学员评价，建立信任感
// 使用 Mock 数据，后续可对接 API

const TESTIMONIALS = [
  {
    name: '张同学',
    avatar: '张',
    school: '南京大学',
    company: '腾讯',
    position: '产品经理',
    quote: '通过启航平台的模拟面试，我找到了自己的不足并快速改进，最终拿到了心仪的 Offer！',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: '李同学',
    avatar: '李',
    school: '浙江大学',
    company: '阿里巴巴',
    position: '前端工程师',
    quote: '平台上的导师非常专业，一对一辅导让我对技术面试信心倍增。',
    color: 'from-amber-500 to-orange-500',
  },
  {
    name: '王同学',
    avatar: '王',
    school: '华中科技大学',
    company: '字节跳动',
    position: '后端开发',
    quote: '从简历打磨到面试准备，启航平台提供了一站式的求职支持，省时省心。',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    name: '赵同学',
    avatar: '赵',
    school: '上海交通大学',
    company: '美团',
    position: '数据分析师',
    quote: '平台推荐的岗位非常精准，帮我节省了大量筛选时间。',
    color: 'from-green-500 to-emerald-500',
  },
];

export default function SocialProofWall() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.15 });

  return (
    <section className="py-12">
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
      >
        {/* 标题 */}
        <motion.div
          className="text-center mb-8"
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
          }}
        >
          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-yellow-100">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            学员真实评价
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            他们在启航平台找到了方向
          </h2>
        </motion.div>

        {/* 评价卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm
                hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
            >
              {/* 头像 + 信息 */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.school}</p>
                </div>
              </div>

              {/* 引用 */}
              <div className="relative mb-4">
                <Quote className="w-4 h-4 text-gray-200 absolute -top-1 -left-1" />
                <p className="text-sm text-gray-600 leading-relaxed pl-4 italic">
                  {t.quote}
                </p>
              </div>

              {/* 去向 */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">入职</span>
                <span className="text-xs font-semibold text-gray-800">{t.company}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-600">{t.position}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
