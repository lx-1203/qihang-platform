import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, Check, Star, Zap, Users, Shield,
  Loader2, Calendar, CreditCard, ArrowRight
} from 'lucide-react';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';
import ErrorState from '@/components/ui/ErrorState';
import { refreshVipAfterPayment } from '@/lib/vipAccess';

// ====== 企业VIP订阅页面 ======

interface VipStatus {
  isVip: boolean;
  planType: string;
  startDate: string;
  endDate: string;
  daysLeft: number;
}

const VIP_PLANS = [
  {
    id: 'monthly',
    name: '月度VIP',
    price: 299,
    period: '月',
    features: [
      '访问实名认证人才库',
      '查看学生完整联系方式',
      '定向输送优质候选人',
      '简历批量导出',
      '专属客服支持',
      '职位优先推荐',
    ],
    highlight: true,
  },
  {
    id: 'quarterly',
    name: '季度VIP',
    price: 799,
    period: '季',
    originalPrice: 897,
    features: [
      '月度VIP全部权益',
      '节省 98 元',
      '优先审核资质',
      '专属人才顾问',
    ],
    highlight: false,
  },
  {
    id: 'yearly',
    name: '年度VIP',
    price: 2999,
    period: '年',
    originalPrice: 3588,
    features: [
      '季度VIP全部权益',
      '节省 589 元',
      '品牌曝光加权',
      '年度人才报告',
      '线下招聘会优先参展',
    ],
    highlight: false,
  },
];

export default function VipSubscription() {
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

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
      setError('获取VIP状态失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId: string) {
    try {
      setSubscribing(planId);
      const res = await http.post('/vip/subscribe', { plan_type: planId });
      if (res.data?.code === 200 || res.data?.code === 201) {
        const isPending = res.data.data?.status === 'pending';
        showToast({
          type: isPending ? 'info' : 'success',
          title: isPending ? '订单已创建' : '订阅成功',
          message: isPending ? '请完成支付后刷新状态' : '您已成功开通VIP会员',
        });
        // 支付成功后立即刷新 VIP 权限快照，确保人才库访问权限实时生效
        await refreshVipAfterPayment();
        fetchVipStatus();
      } else {
        showToast({ type: 'error', title: '订阅失败', message: res.data?.message || '请稍后重试' });
      }
    } catch {
      showToast({ type: 'error', title: '订阅失败', message: '网络异常，请稍后重试' });
    } finally {
      setSubscribing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchVipStatus} />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Crown className="w-7 h-7 text-amber-500" />
          VIP 会员订阅
        </h1>
        <p className="text-gray-500 mt-1">解锁高级招聘功能，高效触达优质人才</p>
      </div>

      {/* 当前VIP状态 */}
      {vipStatus?.isVip && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200 shadow-sm"
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

      {/* VIP特权说明 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-500" />
          VIP 专属特权
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Users,
              title: '实名认证人才库',
              desc: '访问平台全部实名认证学生信息，查看完整联系方式、简历和求职意向',
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              icon: Shield,
              title: '定向输送候选人',
              desc: '平台根据岗位需求定向推荐优质候选人，提升招聘效率',
              color: 'text-green-600',
              bg: 'bg-green-50',
            },
            {
              icon: Star,
              title: '优先展示与推荐',
              desc: '企业职位获得优先展示权重，吸引更多优质候选人投递',
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all">
              <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 套餐选择 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {VIP_PLANS.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden flex flex-col ${
              plan.highlight
                ? 'border-primary-500 ring-2 ring-primary-100 relative'
                : 'border-gray-100'
            }`}
          >
            {plan.highlight && (
              <div className="bg-primary-600 text-white text-center text-xs font-bold py-1.5">
                推荐方案
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
                className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
                  plan.highlight
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
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

      {/* 常见问题 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">常见问题</h3>
        <div className="space-y-4">
          {[
            {
              q: 'VIP会员可以随时取消吗？',
              a: 'VIP订阅到期后自动失效，无需手动取消。订阅期间可享受全部VIP权益。',
            },
            {
              q: '实名认证人才库和普通人才搜索有什么区别？',
              a: 'VIP企业可查看学生的完整联系方式（手机号、邮箱）、详细简历和求职意向。非VIP企业仅能查看脱敏信息。',
            },
            {
              q: '订阅后多久生效？',
              a: '订阅成功后立即生效，您可马上使用全部VIP功能。',
            },
          ].map((item, i) => (
            <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <h4 className="text-sm font-bold text-gray-900">{item.q}</h4>
              <p className="text-sm text-gray-500 mt-1">{item.a}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
