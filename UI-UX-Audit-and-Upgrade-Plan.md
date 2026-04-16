# 启航平台 UI/UX 全面审计报告 & 升级改造方案

**项目名称**: 启航平台（Qihang Platform）  
**审计范围**: `frontend/src/` 全部页面、组件、布局、样式系统  
**审计日期**: 2026-04-15  
**审计视角**: 极度刁钻的用户体验审计  
**文档版本**: v1.0

---

## 目录

- [第一部分：UI/UX 审计问题清单](#第一部分uiux-审计问题清单)
  - [P0 致命问题](#p0-致命问题必须立即修复)
  - [P1 严重问题](#p1-严重问题严重影响体验)
  - [P2 一般问题](#p2-一般问题影响体验质量)
  - [P3 轻微问题](#p3-轻微问题优化建议)
  - [设计系统性问题](#设计系统层面问题汇总)
  - [可访问性专项](#可访问性a11y专项问题)
- [第二部分：升级改造需求](#第二部分升级改造需求)
- [第三部分：模块化改造方案](#第三部分模块化改造方案)
- [第四部分：实施路线图](#第四部分实施路线图)

---

## 第一部分：UI/UX 审计问题清单

### 审计文件清单

| 文件路径 | 审计内容 |
|---------|---------|
| `pages/Home.tsx` | 首页 - Hero轮播/搜索/数据统计/推荐列表 |
| `pages/Login.tsx` | 登录页 - 表单/第三方登录/密码重置 |
| `components/Navbar.tsx` | 全局导航栏 - 搜索/通知/用户菜单 |
| `components/Footer.tsx` | 页脚 - 导航/语言切换/版权 |
| `layouts/MainLayout.tsx` | 主布局结构 |
| `layouts/AdminLayout.tsx` | 管理后台布局 |
| `pages/Jobs.tsx` | 岗位列表页 |
| `pages/Courses.tsx` | 课程列表页 |
| `pages/StudyAbroad.tsx` | 留学申请页 |
| `pages/Guidance.tsx` | 就业指导页 |
| `pages/Chat.tsx` | 在线咨询页 |
| `components/FloatingService.tsx` | 悬浮客服按钮(启小航) |
| `components/ui/LazyImage.tsx` | 懒加载图片组件 |
| `components/ui/ErrorState.tsx` | 错误状态组件 |
| `components/ui/Skeleton.tsx` | 骨架屏组件 |
| `components/ui/ToastContainer.tsx` | Toast提示组件 |
| `components/ServiceGrid.tsx` | 服务特色卡片网格 |
| `components/StudentStories.tsx` | 学员故事墙 |
| `components/ProcessSteps.tsx` | 求职流程步骤条 |
| `components/CampusTimeline.tsx` | 校招日历时间轴 |
| `index.css` | 全局样式/CSS变量 |
| `tailwind.config.js` | Tailwind配置/设计令牌 |

---

### P0 致命问题（必须立即修复）

#### P0-01. 首页 Hero 区搜索栏在移动端可能被虚拟键盘遮挡
**位置**: `Home.tsx:186-201`
**问题描述**: 
- 搜索栏位于 Hero 区域内部（`mt-8`）
- 移动端输入时虚拟键盘弹出，搜索框可能被遮挡
- 虽然有 `scroll-margin` 设置，但仅针对通用 input:focus，Hero 内的搜索容器没有相应处理
**影响**: 移动端用户无法完成搜索操作，核心功能受阻
**修复方案**:
```css
/* 在 Hero 搜索容器上添加 */
.hero-search-container:focus-within {
  scroll-margin-top: 80px;
}
```

#### P0-02. Chat 页面高度计算可能导致内容不可见
**位置**: `Chat.tsx:390`
**问题描述**:
- 聊天容器使用 `height: calc(100vh - 220px)` 固定高度
- 不同设备、浏览器工具栏开启、或系统任务栏存在时可能导致高度异常
**影响**: 用户可能无法看到消息或输入框被截断
**修复方案**: 使用 flex 布局 + min-height 替代固定 calc() 高度，或使用 CSS dvh 单位。

#### P0-03. 登录页"忘记密码"功能仅显示 Toast 提示
**位置**: `Login.tsx:417`
**问题描述**:
- 点击"忘记密码"只显示 Toast "请联系管理员 admin@qihang.com"
- 无实际密码重置流程入口
- 邮箱地址硬编码在代码中
**影响**: 忘记密码的用户完全无法自助恢复
**修复方案**: 提供发送重置邮件表单或跳转到帮助文档页面

#### P0-04. 第三方登录按钮（微信/GitHub）状态误导
**位置**: `Login.tsx:578-595`
**问题描述**:
- 微信和 GitHub 登录按钮点击后显示"功能开发中"
- 按钮以完整可交互样式展示，给用户虚假期望
**影响**: 用户点击后产生挫败感，降低信任度
**修复方案**: 功能未上线时应隐藏或明确标注"即将上线"；保留预览态应使用禁用样式 + 清晰文案

---

### P1 严重问题（严重影响体验）

#### P1-01. 首页轮播图无障碍支持缺失
**位置**: `Home.tsx:204-210`
**问题描述**:
- 轮播指示器缺少 aria-label 说明当前状态
- 无 aria-live="polite" 区域播报轮播变化
- 键盘用户无法通过 Tab 键操作轮播
- 自动轮播无暂停机制
**影响**: 屏幕阅读器用户和键盘导航用户无法使用轮播功能

#### P1-02. Navbar 导航项在滚动收缩后完全隐藏 (最严重!)
**位置**: `Navbar.tsx:215`
**问题描述**:
- 当 isScrolled=true 时，导航菜单添加了 lg:hidden 类
- 大屏幕滚动后导航项完全消失！只有 Logo 可见
- 用户滚动后无法访问任何主导航
**当前代码（有问题）**:
```tsx
className={`hidden md:flex space-x-1 text-[14px] ${isScrolled ? 'lg:hidden' : ''}`}
```
**修复方案**:
```tsx
// 改为保持可见或紧凑模式
className={`hidden md:flex space-x-1 text-[14px] ${isScrolled ? 'text-[13px]' : ''}`}
```

#### P1-03. Footer 品牌标识与全局品牌不一致
**位置**: `Footer.tsx:114-117`
**问题描述**:
- Footer 使用硬编码蓝色 bg-[#2563eb] 和文字"职"
- 全局品牌色是 Teal #14b8a6（tailwind.config.js 定义）
- Footer 视觉与其他页面完全割裂
**影响**: 品牌一致性严重受损
**修复方案**: 统一使用 primary-600 色值和配置中心的 brandName

#### P1-04. Jobs 页面加载状态缺少骨架屏
**位置**: `Jobs.tsx:383-386`
**问题描述**: 加载状态只显示一个 Loader2 旋转图标，而项目已有完善的 Skeleton 组件和 CardSkeleton 变体
**影响**: 内容加载时页面空白，等待感知时间长
**修复方案**: 使用 `<ListSkeleton count={8} />` 替代单一 Loader 图标

#### P1-05. Courses 页面图片未使用 LazyImage 组件
**位置**: `Courses.tsx:145-149`
**问题描述**: 课程封面直接使用原生 img 标签，而项目已封装了支持懒加载、错误占位、CDN拼接的 LazyImage 组件
**影响**: 所有课程封面同时加载性能差；图片失败无友好占位符
**修复方案**:
```tsx
// 替换前
<img src={course.cover} alt={course.title} className="..." />
// 替换后
<LazyImage src={course.cover} alt={course.title} variant="cover" className="w-full h-full" />
```

#### P1-06. StudyAbroad 页面大量图片无懒加载和错误处理
**位置**: `StudyAbroad.tsx:291, 549, 676`
**问题描述**: 多处使用 img 直接加载（Hero背景、学员故事、服务卡片），均无 loading="lazy"、无 onError 处理、无占位符
**影响**: 页面加载极慢，图片失败出现破损图标

#### P1-07. Guidance 页面文章图片同样未使用 LazyImage
**位置**: `Guidance.tsx:143-147`

#### P1-08. Navbar 搜索框宽度变化突兀
**位置**: `Navbar.tsx:268`
**问题描述**: 搜索框滚动前后宽度从 w-[200px] 突变为 w-[360px]，160px跨度视觉突兀
**影响**: 视觉抖动，用户注意力被打断

#### P1-09. 首页快捷金刚区横向滚动无视觉提示
**位置**: `Home.tsx:275-293`
**问题描述**: overflow-x-auto 但无左右渐变遮罩提示更多内容，移动端用户可能不知道可以滑动
**影响**: 用户可能遗漏部分快捷入口

---

### P2 一般问题（影响体验质量）

#### P2-01. 颜色使用混乱 - 硬编码颜色值过多
**涉及文件**: 几乎所有页面
**问题描述**: 同时存在三种颜色使用方式：
1. Tailwind 语义化类名: text-primary-600, bg-primary-50
2. 硬编码 HEX 值: text-[#14b8a6], bg-[#111827], text-[#2563eb]
3. CSS 变量: 已定义但极少使用
**影响**: 主题切换困难，维护成本高，不一致风险高

#### P2-02. 字号使用不规范 - 大量任意像素值
**涉及文件**: 全部业务页面
**问题描述**: 字号极其碎片化：text-[10px] 到 text-[46px]，Tailwind 默认字号阶梯几乎未被使用
**影响**: 排版节奏混乱，视觉层次不清

#### P2-03. 间距系统不统一
**问题描述**: Tailwind标准 / 任意值 / CSS 变量 三套混用

#### P2-04. 圆角使用不一致
**问题描述**: rounded-xl / rounded-2xl / rounded-[16px] / rounded-[20px] / rounded-[24px] 多种体系混用

#### P2-05. ProcessSteps 步骤条移动端强制最小宽度
**位置**: `ProcessSteps.tsx:35`
**问题描述**: min-w-[800px] 导致小屏强制横向滚动

#### P2-06. StudentStories 引用文本中文斜体+加粗可读性差
**位置**: `StudentStories.tsx:117`

#### P2-07. Chat 时间戳缺少语义化标记
**位置**: `Chat.tsx:33-53`

#### P2-08. FloatingService 展开面板窄屏溢出
**位置**: `FloatingService.tsx:148`

#### P2-09. AdminLayout 侧边栏活跃判断过于宽泛
**位置**: `AdminLayout.tsx:77`

#### P2-10. 首页数据统计数字无动画效果
**位置**: `Home.tsx:263-270`

#### P2-11. ErrorState DEV模式按钮潜在泄露风险
**位置**: `ErrorState.tsx:68`

---

### P3 轻微问题（优化建议）

#### P3-01. Login 页头像使用 Unsplash 外链
**位置**: `Login.tsx:239-251`
**问题**: 国内访问慢，有频率限制，无法控制内容变更

#### P3-02. 首页轮播无暂停按钮
**位置**: `Home.tsx:128-131`

#### P3-03. console.error 分散在各处

#### P3-04. Navbar 路由预加载无 debounce
**位置**: `Navbar.tsx:177-189`

#### P3-05. Footer 语言菜单向上弹出可能超出视口
**位置**: `Footer.tsx:226`

#### P3-06. 首页推荐标题暗示个性化但实际无差异化
**位置**: `Home.tsx:310`

#### P3-07. ServiceGrid 详情文字移动端隐藏
**位置**: `ServiceGrid.tsx:125`

#### P3-08. CampusTimeline 时间轴数据硬编码
**位置**: `CampusTimeline.tsx:18-83`

#### P3-09. 多页面缺少 document.title 设置

#### P3-10. Toast z-index 过高(z-[9999])
**位置**: `ToastContainer.tsx:187`

#### P3-11. LazyImage 缺少 priority/eager 选项
**位置**: `LazyImage.tsx`

#### P3-12. Skeleton 骨架屏颜色与 LazyImage 不统一
**位置**: `Skeleton.tsx:25`

---

### 设计系统层面问题汇总

#### 5.1 设计令牌利用率低
[index.css:5-56] 定义了完整的 CSS 变量体系（颜色/圆角/阴影/间距/过渡），[tailwind.config.js] 正确映射了这些变量，但开发中大量使用硬编码值绕过系统。

#### 5.2 缺少响应式断点统一策略
部分用 Tailwind sm/md/lg，部分用 @media，断点数值关系不清晰。

#### 5.3 缺少暗色模式支持
全部浅色方案，无 dark: 变体。

#### 5.4 动画/过渡缺乏统一规范
framer-motion duration 不统一（0.2s~0.8s），与 CSS animation 未同步。

---

### 可访问性（A11y）专项问题

| 问题 | 严重度 | 位置 |
|------|--------|------|
| 轮播组件缺少 ARIA 角色 | P1 | Home.tsx |
| 图片缺少有意义 alt 文本 | P2 | 多处 |
| 表单 label 与 input 关联不完整 | P2 | Login.tsx |
| 颜色对比度未验证（gray-400等） | P2 | 全局 |
| focus-visible 样式不统一 | P3 | 全局 |
| skip-navigation 链接缺失 | P3 | MainLayout.tsx |

---

## 第二部分：升级改造需求

基于审计结果 + 产品需求，确认以下改造方向：

### 需求1：登录方式重构
- 新增手机号 + 验证码登录
- 新增微信 OAuth2 授权登录
- 新增 QQ 互联授权登录
- **保留**邮箱密码登录
- **移除** GitHub 登录按钮
- 登录方式 Tab 切换（密码/手机号/扫码）

### 需求2：全站微交互增强
- 图片查看器：缩放、旋转、拖拽、双指手势、滚轮缩放
- 卡片 3D 倾斜跟随鼠标（Tilt 效果）
- 数字滚动计数动画（CountUp）
- 全站按钮涟漪效果（Ripple）
- 首页轮播触摸拖拽滑动
- 留学卡片翻转展示详情
- 页面共享元素过渡动画

### 需求3：全能五合一图片插入组件
- 方式1：本地上传（文件选择器）
- 方式2：剪贴板粘贴（Ctrl+V）
- 方式3：URL 地址导入
- 方式4：截图粘贴（自动检测）
- 方式5：拖拽上传到指定区域
- 附带：图片预览、大小校验、格式校验

### 需求4：后台分步引导教程系统
- Driver.js 风格的分步引导
- 高亮目标元素 + 遮罩层
- 每步提供选项（不给填空值）
- 进度指示器（Step 2/5）
- 支持"跳过引导"和"重新学习"
- localStorage 记忆完成状态

### 需求5：FloatingService（启小航）改造
- 位置改为底部居中（bottom-center）
- 文案从"智能助手/AI"改为"人工在线客服"
- 确保所有页面都正确渲染

### 需求6：未上线功能的交互占位页
- ComingSoon 占位模板
- 动画图标 + 预告信息
- 邮件订阅上线通知
- 相关功能快捷入口
- 不能是死页面，必须有基础交互

### 需求7：其他细节优化
- 每个按钮必须有用且有基础交互反馈
- 广告/CTA 元素要有吸引力
- 图片显示问题全面修复
- 设计令牌规范化迁移

---

## 第三部分：模块化改造方案

### 模块一：登录方式重构

#### 目标架构
```
┌─────────────────────────────────────────────────────┐
│                  启航平台 登录                       │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │         选择您的身份                           │   │
│  │  [学生] [企业] [导师]                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ══════════════════════════════════════════════    │
│            登录方式 Tab 切换                        │
│  ══════════════════════════════════════════════    │
│  [ 密码登录 ]  [ 手机号登录 ]  [ 扫码登录 ]        │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  手机号输入框                                  │   │
│  │  验证码输入框 [ 获取验证码 ]                   │   │
│  │                                             │   │
│  │  ── 或者使用以下方式快捷登录 ──              │   │
│  │                                             │   │
│  │  [微信图标]    [QQ图标]                     │   │
│  │   微信登录       QQ登录                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [        登录账号                                 ]   │
└─────────────────────────────────────────────────────┘
```

#### 新增 API 接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/auth/sms/send` | POST | 发送短信验证码 |
| `/auth/sms/verify` | POST | 验证短信验证码 |
| `/auth/login-phone` | POST | 手机号+验证码登录 |
| `/auth/wechat/callback` | GET | 微信OAuth回调 |
| `/auth/qq/callback` | GET | QQ互联回调 |

#### 关键代码结构
```typescript
// LoginTabs.tsx - 登录方式切换
function LoginTabs({ active, onChange }) {
  const tabs = [
    { key: 'password', label: '密码登录', icon: Lock },
    { key: 'phone', label: '手机号登录', icon: Smartphone },
    { key: 'qrcode', label: '扫码登录', icon: QrCode },
  ];
  // 渲染带下划线动画的Tab切换
}

// SocialLoginButtons.tsx - 第三方登录
function SocialLoginButtons() {
  return (
    <div>
      {/* 微信登录 - 绿色 #07C160 */}
      <button onClick={handleWechatLogin}>微信登录</button>
      {/* QQ 登录 - 蓝色 #12B7F5 */}
      <button onClick={handleQQLogin}>QQ登录</button>
    </div>
  );
}
```

---

### 模块二：全站微交互增强

#### 交互增强矩阵
| 场景 | 交互类型 | 技术方案 |
|------|---------|---------|
| 首页轮播图 | 触摸拖拽+惯性滚动 | @use-gesture/react |
| 服务卡片 | 3D倾斜跟随鼠标 | 自定义 useTiltEffect hook |
| 留学国家卡片 | 翻转展示详情 | CSS perspective + transform |
| Offer卡片 | 拖拽排序预览 | @dnd-kit/core |
| 图片查看器 | 缩放/旋转/拖拽/手势 | react-medium-image-zoom + 自定义 |
| 全站按钮 | 涟漪+按压缩放 | Ripple.tsx 全局应用 |
| 数字滚动 | 计数动画 | react-countup / 自定义 AnimatedCounter |
| 页面切换 | 共享元素过渡 | framer-motion layoutId |

#### 核心组件1：ImageViewer（图片查看器）
功能特性：
- 双指捏合缩放
- 滚轮缩放（带滑块控制）
- 拖拽平移
- 顺时针/逆时针旋转90度
- 重置按钮
- 下载按钮
- 键盘快捷键支持（ESC关闭、+/-缩放、R旋转）
- 底部工具栏 + 顶部关闭按钮

#### 核心组件2：TiltCard（3D倾斜卡片）
```typescript
// hooks/useTiltEffect.ts
export function useTiltEffect(maxTilt = 15) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e) => {
    // 计算鼠标相对于卡片中心的位置
    // 应用 perspective + rotateX/Y + scale3d 变换
  }, [maxTilt]);
  // mouseLeave 时重置变换
  return { ref, onMouseMove, onMouseLeave };
}
```

#### 核心组件3：AnimatedCounter（数字滚动）
```typescript
// components/ui/AnimatedCounter.tsx
export function AnimatedCounter({ target, duration, suffix, prefix }) {
  // 使用 requestAnimationFrame + easeOutExpo 缓动
  // 支持 string 解析（如 "10000+" → 10000）
  // useInView 触发，只播放一次
}
// 使用：<AnimatedCounter target="50000" suffix="+" />
```

---

### 模块三：全能五合一图片插入组件

#### 设计理念
精巧绝妙的图片插入体验 -- 五种方式任选：

```
┌──────────────────────────────────────────────────────────┐
│  📷 插入图像                              [× 关闭]     │
├──────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│  │  📁     │ │  🖼️     │ │  🔗     │                    │
│  │ 本地上传 │ │ 粘贴板  │ │ URL导入 │                    │
│  └─────────┘ └─────────┘ └─────────┘                    │
│  ┌─────────┐ ┌─────────┐                                │
│  │  📋     │ │  🖱️     │                                │
│  │ 截图粘贴 │ │ 拖拽区域 │                                │
│  └─────────┘ └─────────┘                                │
│                                                          │
│  预览区: [图片预览] | 名称/尺寸/大小 | [确认插入]         │
└──────────────────────────────────────────────────────────┘
```

#### 五种插入方式实现要点
1. **本地上传**: file input -> FileReader -> 预览 -> 确认
2. **剪贴板粘贴**: 监听 paste 事件 -> items[image/*] -> File
3. **URL导入**: fetch(url) -> blob -> File -> 预览
4. **截图粘贴**: 与方式2共用 paste 监听（截图后 Ctrl+V 自动检测）
5. **拖拽上传**: onDragOver + onDrop -> dataTransfer.files[0]

#### 关键代码
```typescript
// components/ui/ImageUploader.tsx
interface ImageUploaderProps {
  onInsert: (file: File | string, isUrl?: boolean) => void;
  maxSize?: number; // 默认 10MB
}

export function ImageUploader({ onInsert, maxSize }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  // 全局粘贴监听
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);
  
  // 处理文件（统一入口）
  const processFile = (file: File) => {
    if (file.size > maxSize) { /* 错误提示 */ }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };
  
  // 五种方式的处理函数...
}
```

---

### 模块四：后台分步引导教程系统

#### 设计原则
- 不要给可插入的值，要给选项
- 不要让用户猜，要明确告诉每一步做什么
- 高亮目标元素 + 清晰的文字说明
- 允许跳过，允许重新学习

#### 引导流程
```
首次进入后台 → 检测 localStorage → 显示欢迎遮罩层
                                                ↓
                                    Step 1/5: 导航侧边栏
                                        ↓ 下一步
                                    Step 2/5: 数据概览面板
                                        ↓ 下一步
                                    Step 3/5: 用户管理表格
                              （提供选项：浏览/添加/跳过）
                                        ↓ 下一步
                                    Step 4/5: 操作栏
                                        ↓ 下一步
                                    Step 5/5: 帮助入口
                                        ↓ 完成
                               写入 localStorage → 引导结束
```

#### 核心实现
```typescript
// components/admin/AdminGuide.tsx
const ADMIN_GUIDE_STEPS = [
  {
    target: '[data-guide="sidebar"]',
    title: '导航侧边栏',
    content: '这里是你的功能导航中心...',
    position: 'right' as const,
  },
  {
    target: '[data-guide="dashboard-stats"]',
    title: '数据概览',
    content: '这里展示平台的核心运营数据...',
    position: 'bottom' as const,
    options: [
      { label: '我想先看看数据', value: 'browse' },
      { label: '跳过，我自己探索', value: 'skip' },
    ],
  },
  // ... 更多步骤
];

export function AdminGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  // 检查是否已完成引导
  useEffect(() => {
    const done = localStorage.getItem('admin-guide-completed');
    if (!done) setTimeout(() => setIsVisible(true), 1000);
  }, []);
  
  return (
    <>
      {/* 半透明遮罩层 z-[9000] */}
      <div className="fixed inset-0 bg-black/60 z-[9000]" />
      
      {/* 高亮目标元素（带圆角和发光边框） */}
      <HighlightTarget selector={step.target} padding={8} />
      
      {/* 引导卡片（带箭头指向目标） */}
      <GuidePopover step={step} onNext={handleNext} onSkip={completeGuide} />
    </>
  );
}
```

#### 集成方式
在 AdminLayout 和各管理页面添加 `data-guide` 属性：
```tsx
<aside data-guide="sidebar">...</aside>
<div data-guide="dashboard-stats">...</div>
<table data-guide="user-table">...</table>
```

---

### 模块五：FloatingService 改造

#### 修改清单
| 项目 | 修改前 | 修改后 |
|------|--------|--------|
| 定位 | `fixed bottom-6 right-6` | `fixed bottom-6 left-1/2 -translate-x-1/2` |
| 副标题文案 | "在线服务" | "人工在线服务" |
| 问候语文案 | "我是启航平台的智能助手" | "我是启航平台的客服小助手。我们的客服团队在线为您服务。" |
| 图标动画 | 保持呼吸光圈 | 保持 |

#### 关键修改
```typescript
// FloatingService.tsx
<motion.div
  // 修改定位：底部居中
  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]"
>
  {/* 面板头部 */}
  <div className="bg-gradient-to-r from-primary-500 to-teal-600 ...">
    <h4>启小航</h4>
    <p>人工在线服务</p>  {/* 修改 */}
  </div>
  
  {/* 问候语 */}
  <div>
    <p>👋 你好！我是启航平台的客服小助手。</p>
    <p>有什么可以帮你的？我们的客服团队在线为您服务。</p>
  </div>
</motion.div>
```

---

### 模块六：ComingSoon 占位页模板

#### 设计特点
- 动态浮动图标（y轴 + rotate 循环动画）
- 敬请期待标签（amber配色）
- 功能描述文字
- 相关功能快捷入口（可翻转卡片）
- 邮件订阅表单（可选）
- 订阅成功反馈动画

#### 使用方式
```tsx
<ComingSoon
  featureName="AI 智能匹配"
  featureIcon={<Sparkles className="w-12 h-12 text-primary-600" />}
  description="基于你的专业背景、技能树和求职偏好，AI智能匹配最适合你的岗位和导师"
  expectedDate="2026年Q2"
  notifyOption={true}
  relatedLinks={[
    { label: '先看看热门岗位', href: '/jobs' },
    { label: '浏览导师资源', href: '/mentors' },
    { label: '免费职业测评', href: '/guidance' },
    { label: '返回首页', href: '/' },
  ]}
/>
```

---

## 第四部分：实施路线图

### Phase 1：紧急修复（1-3 天）

| 任务 | 工作量 | 优先级 | 文件 |
|------|--------|-------|------|
| 修复 Navbar 滚动后导航消失 (P1-02) | 0.5h | **P0** | Navbar.tsx:215 |
| 修复 Footer 品牌色 (P1-03) | 0.5h | **P0** | Footer.tsx:114 |
| FloatingService 居中 + 文案调整 | 1h | **P1** | FloatingService.tsx |
| Chat 页面高度修复 (P0-02) | 1h | **P0** | Chat.tsx:390 |
| 移除 GitHub 登录按钮 | 0.5h | **P0** | Login.tsx:596-615 |
| Home 搜索栏移动端适配 (P0-01) | 0.5h | **P1** | Home.tsx:186 |

**Phase 1 交付物**: 所有关键阻断性问题修复，平台可用性恢复

### Phase 2：登录改造（3-5 天）

| 任务 | 工作量 | 依赖 |
|------|--------|------|
| LoginTabs 切换组件 | 2h | 无 |
| 手机号 + 验证码 UI | 4h | 后端 SMS 接口 |
| 验证码倒计时逻辑 | 1h | 无 |
| 微信 OAuth2 对接 | 6h | 微信开放平台 AppID |
| QQ 互联对接 | 4h | QQ 互联 AppID |
| 扫码登录（内嵌二维码） | 4h | 微信/QQ 二维码 SDK |
| 表单验证增强 | 2h | 无 |
| 安全加固（防暴力破解） | 2h | 无 |

**Phase 2 交付物**: 完整的多方式登录系统

### Phase 3：交互增强（5-7 天）

| 任务 | 工作量 | 新依赖 |
|------|--------|--------|
| ImageViewer 图片查看器 | 6h | 无（纯实现） |
| TiltCard 3D 倾斜 Hook | 3h | 无 |
| AnimatedCounter 组件 | 2h | 无 |
| 全局 Ripple 涤漪指令 | 4h | 无 |
| 首页轮播拖拽增强 | 3h | @use-gesture/react |
| 留学卡片 Flip 效果 | 3h | 无 |
| 数字统计区动画替换 | 1h | 无 |
| 按钮交互反馈统一 | 3h | 无 |

**Phase 3 交付物**: 全站微交互体验升级

### Phase 4：高级功能（7-10 天）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 全能五合一图片上传器 | 8h | 含五种插入方式 |
| AdminGuide 引导系统 | 10h | 含步骤编辑能力 |
| ComingSoon 占位页模板 | 3h | 可复用组件 |
| LazyImage 全面替换 | 4h | Jobs/Courses/Guidance/StudyAbroad |
| 设计令牌规范化 | 8h | 颜色/字号/间距/圆角 |
| Skeleton 统一配色 | 1h | 与品牌一致 |
| A11y 基础改进 | 4h | ARIA/焦点/对比度 |

**Phase 4 交付物**: 完整的高级功能套件 + 设计系统规范化

---

## 附录A：问题统计总览

| 严重级别 | 数量 | 占比 |
|---------|------|------|
| P0 致命 | 4 | 11% |
| P1 严重 | 9 | 25% |
| P2 一般 | 11 | 31% |
| P3 轻微 | 12 | 33% |
| **合计** | **36** | 100% |

## 附录B：文件修改清单

### 必须修改的文件（按优先级）
1. `components/Navbar.tsx` - P1-02 导航消失
2. `components/Footer.tsx` - P1-03 品牌色
3. `components/FloatingService.tsx` - 居中+文案
4. `pages/Chat.tsx` - P0-02 高度问题
5. `pages/Login.tsx` - P0-04 GitHub移除 + 登录重构
6. `pages/Home.tsx` - P0-01 搜索栏 + 交互增强
7. `pages/Jobs.tsx` - P1-04 骨架屏
8. `pages/Courses.tsx` - P1-05 LazyImage
9. `pages/StudyAbroad.tsx` - P1-06 LazyImage
10. `pages/Guidance.tsx` - P1-07 LazyImage
11. `layouts/AdminLayout.tsx` - 引导系统集成
12. `index.css` - 设计令牌完善
13. `tailwind.config.js` - 字号/间距扩展

### 新增文件
1. `components/ui/ImageViewer.tsx` - 图片查看器
2. `components/ui/ImageUploader.tsx` - 五合一图片上传
3. `components/ui/AnimatedCounter.tsx` - 数字滚动
4. `components/ui/TiltCard.tsx` - 3D倾斜卡片
5. `hooks/useTiltEffect.ts` - 倾斜效果Hook
6. `components/admin/AdminGuide.tsx` - 后台引导
7. `components/admin/GuidePopover.tsx` - 引导弹窗
8. `components/admin/HighlightTarget.tsx` - 高亮目标
9. `pages/ComingSoon.tsx` - 占位页模板
10. `components/LoginTabs.tsx` - 登录方式切换
11. `components/SocialLoginButtons.tsx` - 第三方登录

---

*文档结束*
