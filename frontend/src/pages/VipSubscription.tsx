import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crown, Check, Star, Zap, BookOpen, Lock,
  Loader2, ArrowRight, Sparkles, Shield, Users
} from 'lucide-react';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import { showToast } from '@/components/ui/ToastContainer';
import ErrorState from '@/components/ui/ErrorState';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { refreshVipAfterPayment } from '@/lib/vipAccess';
import { createPaymentProvider } from '@/services/payment';

// ====== 学生端 VIP 订阅页面 ======

interface VipStatus {
  isVip: boolean;
  planType: string | null;
  startDate: string | null;
  endDate: string | null;
  daysLeft: number;
  autoRenew: boolean;
}

const VIP_PLANS = [
  {
    id: 'monthly',
    name: '月度VIP',
    price: 29,
    period: '月',
    features: [
      '解锁 80% VIP 专属图文资源',
      '面试题库与行业认知图谱',
      '资源更新与案例内容优先查看',
      '简历模板高级版下载',
      '专属学习路径推荐',
    ],
    highlight: true,
  },
  {
    id: 'quarterly',
    name: '季度VIP',
    price: 69,
    period: '季',
    originalPrice: 87,
    features: [
      '月度VIP全部权益',
      '节省 18 元',
      '1次成功案例深度拆解',
      '求职进度追踪工具',
    ],
    highlight: false,
  },
  {
    id: 'yearly',
    name: '年度VIP',
    price: 199,
    period: '年',
    originalPrice: 348,
    features: [
      '季度VIP全部权益',
      '节省 149 元',
      '3组重点资源专题包',
      '内推机会优先匹配',
      '专属求职顾问服务',
    ],
    highlight: false,
  },
];

export default function VipSubscription() {
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const { isAuthenticated, user, setUser } = useAuthStore();

  useEffect(() => {
    fetchVipStatus();
  }, []);

  async function fetchVipStatus() {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/vip/status');
      if (res.data?.code === 200 && res.data.data) {
        setVipStatus(res.data.data);
      }
    } catch {
      // 未登录用户不报错，仅标记非VIP
      setVipStatus({
        isVip: false,
        planType: null,
        startDate: null,
        endDate: null,
        daysLeft: 0,
        autoRenew: false,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId: string) {
    if (!isAuthenticated) {
      showToast({ type: 'info', title: '请先登录', message: '登录后即可订阅VIP' });
      return;
    }

    const plan = VIP_PLANS.find((p) => p.id === planId);
    const planName = plan?.name || planId;
    const planPrice = plan?.price || 0;

    try {
      setSubscribing(planId);
      const res = await http.post('/vip/subscribe', {
        plan_type: planId,
        payment_method: 'online',
      });
      if (res.data?.code === 200 || res.data?.code === 201) {
        const orderId = res.data.data?.orderId || `ORDER_${Date.now()}`;

        const paymentProvider = createPaymentProvider();
        const paymentResult = await paymentProvider.pay(orderId, planPrice, `VIP订阅 - ${planName}`);

        if (paymentResult.success) {
          showToast({
            type: 'success',
            title: '订阅成功',
            message: '您已成功开通VIP会员',
          });
          await refreshVipAfterPayment();
          if (user) {
            setUser({ ...user, is_vip: true } as any);
          }
          fetchVipStatus();
        } else {
          showToast({
            type: 'error',
            title: '支付失败',
            message: paymentResult.message || '支付未完成，请重试',
          });
        }
      } else {
        showToast({ type: 'error', title: '订阅失败', message: res.data?.message || '请稍后重试' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '网络异常，请稍后重试';
      showToast({ type: 'error', title: '支付异常', message: msg });
    } finally {
      setSubscribing(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb items={[{ label: '首页', path: '/' }, { label: 'VIP 会员' }]} />
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb items={[{ label: '首页', path: '/' }, { label: 'VIP 会员' }]} />
        </div>
        <ErrorState message={error} onRetry={fetchVipStatus} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 面包屑导航 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumb items={[{ label: '首页', path: '/' }, { label: 'VIP 会员' }]} />
      </div>

      {/* ====== 顶部 Hero 区域 ====== */}
      <section className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
              <Crown className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              VIP 会员
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
              解锁全部优质资源，加速你的职业成长之路
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 当前VIP状态 */}
        {vipStatus?.isVip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Crown className="w-7 h-7 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-800">
                    VIP 会员生效中
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    套餐：{vipStatus.planType === 'monthly' ? '月度VIP' : vipStatus.planType === 'quarterly' ? '季度VIP' : '年度VIP'}
                    <span className="mx-2">|</span>
                    到期时间：{vipStatus.endDate}
                    <span className="mx-2">|</span>
                    剩余 {vipStatus.daysLeft} 天
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold border border-amber-300">
                <Star className="w-4 h-4" />
                VIP
              </span>
            </div>
          </motion.div>
        )}

        {/* VIP 特权说明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10 bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            VIP 专属特权
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: 'VIP 专属资源库',
                desc: '解锁 80% 深度图文资料，包括面试题库、行业认知图谱、系统设计指南等优质内容',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                icon: Users,
                title: '案例与资源优先更新',
                desc: '优先查看新增成功案例、专题资料包与重点内容更新，缩短信息获取路径',
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
              {
                icon: Shield,
                title: '求职加速工具',
                desc: '专属学习路径推荐、求职进度追踪、内推机会匹配等加速求职效率的工具',
                color: 'text-amber-600',
                bg: 'bg-amber-50',
              },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-xl border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all">
                <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h4 className="text-base font-bold text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 套餐选择 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {VIP_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden flex flex-col ${
                plan.highlight
                  ? 'border-amber-500 ring-2 ring-amber-100 relative'
                  : 'border-gray-100'
              }`}
            >
              {plan.highlight && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center text-xs font-bold py-2">
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  最受欢迎
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-xs text-gray-500">¥</span>
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500">/{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <p className="text-xs text-gray-400 mt-1 line-through">
                    原价 ¥{plan.originalPrice}/{plan.period}
                  </p>
                )}

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribing === plan.id || (vipStatus?.isVip && vipStatus.planType === plan.id)}
                  className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50 ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {subscribing === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : vipStatus?.isVip && vipStatus.planType === plan.id ? (
                    '当前套餐'
                  ) : (
                    <>
                      立即订阅
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 免费 vs VIP 对比 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-10 bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">免费 vs VIP 对比</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">功能</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">免费用户</th>
                  <th className="text-center py-3 px-4 font-medium text-amber-600">
                    <Crown className="w-4 h-4 inline mr-1" />
                    VIP
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: '基础图文资源', free: true, vip: true },
                  { feature: 'VIP 专属深度资料', free: false, vip: true },
                  { feature: '面试题库', free: false, vip: true },
                  { feature: '行业认知图谱', free: false, vip: true },
                  { feature: '导师公开课', free: true, vip: true },
                  { feature: '成功案例专题包', free: false, vip: true },
                  { feature: '简历模板下载', free: '基础版', vip: '高级版' },
                  { feature: '内推机会', free: false, vip: true },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 px-4 text-gray-700">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-gray-500">{row.free}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.vip === 'boolean' ? (
                        row.vip ? (
                          <Check className="w-4 h-4 text-amber-500 mx-auto" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-amber-600 font-medium">{row.vip}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* 常见问题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">常见问题</h3>
          <div className="space-y-5">
            {[
              {
                q: 'VIP会员可以随时取消吗？',
                a: 'VIP订阅到期后自动失效，无需手动取消。订阅期间可享受全部VIP权益，已支付费用不予退还。',
              },
              {
                q: '免费资源和VIP资源有什么区别？',
                a: '免费资源约占总内容的20%，包括基础简历技巧和校招时间线等。VIP专属资源占80%，涵盖面试题库、行业图谱、系统设计指南等深度内容。',
              },
              {
                q: '订阅后多久生效？',
                a: '订阅成功后立即生效，您可马上使用全部VIP功能，包括查看VIP专属资源和升级权益内容。',
              },
              {
                q: '学生有优惠吗？',
                a: '我们提供季度和年度套餐的折扣优惠，年度套餐最高可省149元。后续还将推出学生认证专属优惠。',
              },
            ].map((item, i) => (
              <div key={i} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                <h4 className="text-sm font-bold text-gray-900">{item.q}</h4>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
