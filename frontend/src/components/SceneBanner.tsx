import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Compass } from 'lucide-react';

// ====== 场景描述 Banner（全宽深色） ======

export default function SceneBanner() {
  return (
    <section className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* 装饰光斑 */}
      <div className="absolute top-10 left-[10%] w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-[15%] w-56 h-56 bg-primary-400/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto text-center py-16 md:py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* 小标签 */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
            <Compass className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-primary-300 font-medium">关于启航平台</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-5">
            连接梦想与机遇的桥梁
          </h2>

          <p className="text-base text-gray-300 leading-relaxed mb-8">
            作为连接大学生与企业之间的桥梁，启航平台拥有500+合作企业的优质岗位资源，
            更有来自BAT/TMD等一线互联网公司的行业大咖导师。无论你是想进入大厂锻炼、
            选择考研深造、还是走上创业赛道，这里都将是你最宽阔的职业发展平台。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/mentors"
              className="inline-flex items-center gap-2 bg-white text-gray-900 rounded-full px-7 py-3 font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 text-sm"
            >
              咨询导师
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 border-2 border-white/30 text-white rounded-full px-7 py-3 font-semibold hover:bg-white/10 transition-all duration-300 text-sm"
            >
              开始探索
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
