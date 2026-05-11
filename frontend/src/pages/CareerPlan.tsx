import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import { buildAccessStatus } from '@/lib/accessControl';

// ====== 未来发展方向选项 ======
const directionOptions = ['求职就业', '考研', '保研', '留学', '创业', '考公考编'] as const;

// ====== 表单字段类型 ======
interface CareerPlanForm {
  fullName: string;
  school: string;
  major: string;
  graduationYear: string;
  developmentDirections: string[];
  targetCity: string;
  targetIndustry: string;
  targetRole: string;
  selfSummary: string;
}

// ====== 表单验证错误类型 ======
interface FormErrors {
  fullName?: string;
  school?: string;
  major?: string;
  graduationYear?: string;
  developmentDirections?: string;
}

// ====== 必填字段验证规则 ======
const REQUIRED_FIELDS: { key: keyof Pick<CareerPlanForm, 'fullName' | 'school' | 'major' | 'graduationYear'>; label: string }[] = [
  { key: 'fullName', label: '姓名' },
  { key: 'school', label: '学校' },
  { key: 'major', label: '专业' },
  { key: 'graduationYear', label: '毕业年份' },
];

export default function CareerPlan() {
  const navigate = useNavigate();
  const { setAccessStatus } = useAuthStore();

  const [form, setForm] = useState<CareerPlanForm>({
    fullName: '',
    school: '',
    major: '',
    graduationYear: '',
    developmentDirections: [],
    targetCity: '',
    targetIndustry: '',
    targetRole: '',
    selfSummary: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ====== 加载已有数据 ======
  useEffect(() => {
    http.get('/career-plan')
      .then((response) => {
        if (!response.data?.data) {
          return;
        }

        const data = response.data.data;
        const directions = Array.isArray(data.development_directions)
          ? data.development_directions
          : typeof data.development_directions === 'string'
            ? JSON.parse(data.development_directions || '[]')
            : [];

        setForm({
          fullName: data.full_name || '',
          school: data.school || '',
          major: data.major || '',
          graduationYear: data.graduation_year || '',
          developmentDirections: directions,
          targetCity: data.target_city || '',
          targetIndustry: data.target_industry || '',
          targetRole: data.target_role || '',
          selfSummary: data.self_summary || '',
        });
      })
      .catch(() => undefined);
  }, []);

  // ====== 切换发展方向多选 ======
  const toggleDirection = useCallback((direction: string) => {
    setForm((prev) => {
      const newDirections = prev.developmentDirections.includes(direction)
        ? prev.developmentDirections.filter((item) => item !== direction)
        : [...prev.developmentDirections, direction];
      // 清除发展方向错误提示
      if (newDirections.length > 0) {
        setErrors((prevErrors) => ({ ...prevErrors, developmentDirections: undefined }));
      }
      return { ...prev, developmentDirections: newDirections };
    });
  }, []);

  // ====== 更新表单字段并清除对应错误 ======
  const updateField = useCallback((field: keyof CareerPlanForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误提示
    if (REQUIRED_FIELDS.some((f) => f.key === field) && value.trim()) {
      setErrors((prevErrors) => ({ ...prevErrors, [field]: undefined }));
    }
  }, []);

  // ====== 验证所有必填字段 ======
  function validateForm(): FormErrors {
    const newErrors: FormErrors = {};

    for (const { key, label } of REQUIRED_FIELDS) {
      if (!form[key].trim()) {
        newErrors[key] = `请填写${label}`;
      }
    }

    if (form.developmentDirections.length === 0) {
      newErrors.developmentDirections = '请至少选择一个未来发展方向';
    }

    return newErrors;
  }

  // ====== 提交表单 ======
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');

    // 前端验证
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // 滚动到第一个错误字段
      const firstErrorKey = Object.keys(validationErrors)[0];
      const errorElement = document.querySelector(`[data-field="${firstErrorKey}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    try {
      const response = await http.post('/career-plan', form);

      setAccessStatus(buildAccessStatus({
        role: 'student',
        identityStatus: 'approved',
        qualificationStatus: 'not_applicable',
        onboardingStatus: 'completed',
        routeAccessLevel: 'full',
        ...(response.data?.data?.accessStatus || {}),
      }));

      // 提交成功后跳转到首页
      navigate('/', { replace: true });
    } catch (err: unknown) {
      // 处理后端验证错误（422）
      const errorData = err as { code?: number; message?: string; errors?: Record<string, string> };
      if (errorData?.code === 422 && errorData?.errors) {
        // 将后端返回的字段错误映射到前端
        const backendErrors: FormErrors = {};
        const fieldMapping: Record<string, keyof FormErrors> = {
          name: 'fullName',
          school: 'school',
          major: 'major',
          graduation_year: 'graduationYear',
          directions: 'developmentDirections',
        };
        for (const [field, message] of Object.entries(errorData.errors)) {
          const mappedField = fieldMapping[field];
          if (mappedField) {
            backendErrors[mappedField] = message;
          }
        }
        setErrors(backendErrors);
      } else {
        setSubmitError(errorData?.message || '提交失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  }

  // ====== 渲染带验证状态的输入框 ======
  function renderInput(
    field: keyof Pick<CareerPlanForm, 'fullName' | 'school' | 'major' | 'graduationYear' | 'targetCity' | 'targetIndustry' | 'targetRole'>,
    placeholder: string,
    options?: { colSpan2?: boolean; required?: boolean }
  ) {
    const hasError = Boolean(errors[field as keyof FormErrors]);
    const isRequired = options?.required ?? REQUIRED_FIELDS.some((f) => f.key === field);

    return (
      <div data-field={field} className={options?.colSpan2 ? 'md:col-span-2' : ''}>
        <input
          value={form[field]}
          onChange={(event) => updateField(field, event.target.value)}
          className={`w-full rounded-2xl border px-4 py-3 outline-none transition-colors ${
            hasError
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-neutral-200 bg-white focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100'
          }`}
          placeholder={isRequired ? `${placeholder} *` : placeholder}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${field}-error` : undefined}
        />
        {hasError && (
          <p id={`${field}-error`} className="mt-1.5 text-xs text-red-500">
            {errors[field as keyof FormErrors]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">必填步骤 2</p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-900">生涯规划引导</h1>
        <p className="mt-2 text-sm text-neutral-500">
          学生实名认证通过后，必须先完整填写个人资料并选择未来发展方向，才能继续进入平台。
        </p>
        <p className="mt-1 text-xs text-neutral-400">带 * 的为必填项</p>

        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
          {/* 姓名 */}
          {renderInput('fullName', '姓名', { required: true })}

          {/* 学校 */}
          {renderInput('school', '学校', { required: true })}

          {/* 专业 */}
          {renderInput('major', '专业', { required: true })}

          {/* 毕业年份 */}
          {renderInput('graduationYear', '毕业年份', { required: true })}

          {/* 目标城市（非必填） */}
          {renderInput('targetCity', '目标城市')}

          {/* 目标行业（非必填） */}
          {renderInput('targetIndustry', '目标行业')}

          {/* 目标岗位（非必填） */}
          {renderInput('targetRole', '目标岗位/目标方向', { colSpan2: true })}

          {/* 未来发展方向 - 多选标签 */}
          <div data-field="developmentDirections" className="md:col-span-2">
            <p className="mb-3 text-sm font-medium text-neutral-700">
              未来发展方向（可多选，至少一项）<span className="text-red-500"> *</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {directionOptions.map((direction) => {
                const isSelected = form.developmentDirections.includes(direction);
                return (
                  <button
                    key={direction}
                    type="button"
                    onClick={() => toggleDirection(direction)}
                    className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm scale-105'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <span className="mr-1 inline-block" aria-hidden="true">&#10003;</span>
                    )}
                    {direction}
                  </button>
                );
              })}
            </div>
            {errors.developmentDirections && (
              <p id="developmentDirections-error" className="mt-1.5 text-xs text-red-500">
                {errors.developmentDirections}
              </p>
            )}
            {/* 已选方向数量提示 */}
            <p className="mt-2 text-xs text-neutral-400">
              已选择 {form.developmentDirections.length} 个方向
            </p>
          </div>

          {/* 补充说明（非必填） */}
          <div className="md:col-span-2">
            <textarea
              value={form.selfSummary}
              onChange={(event) => updateField('selfSummary', event.target.value)}
              className="min-h-32 w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition-colors focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
              placeholder="补充说明你的当前背景、准备进度或核心诉求"
            />
          </div>

          {/* 提交错误提示 */}
          {submitError && (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {submitError}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
            disabled={loading}
          >
            {loading ? '保存中...' : '完成生涯规划并进入平台'}
          </button>
        </form>
      </div>
    </div>
  );
}
