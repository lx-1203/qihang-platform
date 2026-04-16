# 启航平台 UI/UX 全面优化 - 深度审计版实现计划 v2.0

## Phase 1: 基础修复（Week 1-2）— 解决致命级问题

## [ ] Task 1: 颜色系统审计与无障碍修复 🔴 P0
- **Depends On**: None
- **Description**:
  - 使用axe-core扫描全项目，生成色彩对比度报告
  - 修复所有WCAG AA违规（目标：0个严重错误）
  - 为所有半透明色（bg-white/XX）提供实色fallback
  - 检测backdrop-blur兼容性，添加@supports降级
  - 增加全局focus-visible样式（键盘导航友好）
  - 测试高对比度模式和色盲模式
- **Acceptance Criteria**: [AC-1 升级版]
- **Test Requirements**:
  - `programmatic` TR-1.1: axe-core扫描结果0个critical violation
  - `programmatic` TR-1.2: Chrome DevTools Lighthouse Accessibility ≥ 95分
  - `human-judgement` TR-1.3: 4个浏览器颜色显示一致
  - `human-judgement` TR-1.4: Windows高对比度模式下可正常使用
- **Files to Modify**:
  - `frontend/src/index.css` (增加focus-visible、降级样式)
  - `frontend/src/pages/Home.tsx` (Hero区域对比度)
  - `frontend/src/components/FloatingService.tsx` (面板阴影)
  - 所有使用bg-white/XX的组件

---

## [ ] Task 2: FloatingService智能增强 🔴 P0
- **Depends On**: None
- **Description**:
  - 实现拖拽结束后自动吸附到最近边缘（左/右16px）
  - 小屏幕（<768px）时不遮挡底部导航栏（限制拖拽区域）
  - 拖拽时降低透明度（opacity: 0.8），松手后恢复
  - 增加触摸反馈优化（touch-action manipulation）
  - 双击快速打开聊天页（可选高级功能）
  - 边界检测增强（防止拖出可视区域）
- **Acceptance Criteria**: [AC-3 升级版]
- **Test Requirements**:
  - `programmatic` TR-2.1: 桌面端拖拽后自动吸附到左或右边缘
  - `programmatic` TR-2.2: 移动端拖拽不遮挡底部导航（距离底部≥80px）
  - `programmatic` TR-2.3: 拖拽过程中透明度降至0.8
  - `human-judgement` TR-2.4: 手感流畅，无明显卡顿
- **Files to Modify**:
  - `frontend/src/components/FloatingService.tsx`

---

## [ ] Task 3: Chat页面重构 — 游客模式+输入增强 🔴 P0
- **Depends On**: None
- **Description**:
  - **游客模式**: 未登录用户可发送3条体验消息
  - **FAQ模块**: 显示常见问题列表（无需登录）
  - **输入框重新设计**:
    - 增加工具栏（表情、附件、图片按钮）
    - 发送按钮尺寸增大至48×48px（移动端友好的触摸目标）
    - 支持Enter发送 / Shift+Enter换行（当前是Ctrl+Enter，需统一）
  - **消息状态指示**:
    - 发送中动画（三点跳动）
    - 已送达/已读状态（单勾/双勾）
    - 失败重试机制（红色感叹号+点击重发）
  - **乐观更新**: 发送消息先显示在列表，失败再回滚
- **Acceptance Criteria**: [AC-4 升级版]
- **Test Requirements**:
  - `programmatic` TR-3.1: 未登录用户可进入游客模式并发送消息
  - `programmatic` TR-3.2: FAQ列表至少包含10个常见问题
  - `programmatic` TR-3.3: 消息状态流转正确（发送中→已送达→已读）
  - `programmatic` TR-3.4: 断网环境下发送失败，恢复网络后可重发
  - `human-judgement` TR-3.5: 输入框操作便捷，移动端无误触困难
- **Files to Modify**:
  - `frontend/src/pages/Chat.tsx`
  - `frontend/src/store/chat.ts` (增加消息状态字段)
  - `frontend/src/components/ChatBubble.tsx` (增加状态图标)
  - 新建 `frontend/src/components/chat/FAQList.tsx`
  - 新建 `frontend/src/components/chat/MessageInput.tsx`

---

## [ ] Task 4: ChatManage管理员端效率提升 🟡 P0→P1
- **Depends On**: [Task 3]
- **Description**:
  - **快捷回复模板**: 预设常用语库，一键插入
  - **批量操作**: 支持批量关闭/标记已读会话
  - **右键菜单**: 消息支持复制/撤回/标记
  - **自动分配提示**: 显示会话等待时长，超时高亮
  - **统计增强**: 平均响应时间、解决率等KPI展示
- **Acceptance Criteria**: [AC-5 升级版]
- **Test Requirements**:
  - `programmatic` TR-4.1: 管理员可创建/编辑快捷回复模板（至少10条预设）
  - `programmatic` TR-4.2: 勾选多个会话后可批量关闭
  - `programmatic` TR-4.3: 消息右键菜单功能正常
  - `human-judgement` TR-4.4: 操作流程符合客服工作习惯
- **Files to Modify**:
  - `frontend/src/pages/admin/ChatManage.tsx`
  - 新建 `frontend/src/components/admin/QuickReplies.tsx`

---

## [ ] Task 5: AI接口预留与集成设计 🟢 P1
- **Depends On**: [Task 3]
- **Description**:
  - 设计AI服务抽象层（Adapter Pattern）
  - 预留OpenAI/百度文心/阿里通义接口位置
  - 编写AI接口文档（请求格式、响应格式、错误码）
  - 实现模拟AI回复（用于前端开发测试）
  - 设计AI内容审核中间件（防止敏感内容）
- **Acceptance Criteria**: [AC-6]
- **Test Requirements**:
  - `programmatic` TR-5.1: 代码中有清晰的AI Adapter接口定义
  - `human-judgement` TR-5.2: 接口文档完整，新开发者可在30分钟内接入新AI服务
  - `programmatic` TR-5.3: 模拟AI回复功能正常，可用于演示
- **Files to Create**:
  - `frontend/src/services/ai/adapter.ts` (抽象接口)
  - `frontend/src/services/ai/mock-ai.ts` (模拟实现)
  - `docs/ai-integration.md` (接口文档)

---

## Phase 2: 核心体验提升（Week 3-4）

## [ ] Task 6: 内容编辑图片上传增强 🟡 P1
- **Depends On**: None
- **Description**:
  - 增强FileUpload组件：
    - 支持拖拽上传（Drag & Drop）
    - 支持剪贴板粘贴（Ctrl+V）
    - 上传前客户端压缩（≤5MB自动压缩至合适尺寸）
    - 格式限制（JPG/PNG/GIF/WebP）
    - 批量上传进度条
  - 图片预览增强：
    - 支持裁剪（可选区域）
    - 支持旋转（90°/180°/270°）
    - EXIF信息自动处理（防止旋转问题）
- **Acceptance Criteria**: [AC-7]
- **Test Requirements**:
  - `programmatic` TR-6.1: 拖拽图片到编辑区触发上传
  - `programmatic` TR-6.2: Ctrl+V粘贴图片正常工作
  - `programmatic` TR-6.3: 超过5MB的图片自动压缩
  - `programmatic` TR-6.4: 不支持的格式显示明确错误提示
- **Files to Modify**:
  - `frontend/src/components/ui/FileUpload.tsx` (假设存在)
  - 新建 `frontend/src/utils/imageCompress.ts`
  - 新建 `frontend/src/utils/imageUtils.ts`

---

## [ ] Task 7: 加载体验全面优化 🟡 P1
- **Depends On**: None
- **Description**:
  - **渐进式图片加载**:
    - 实现blur-up策略（先显示模糊小图→高清图）
    - 使用Intersection Observer懒加载
    - 失败时显示主题色占位图（非空白）
  - **骨架屏变体**:
    - 增加卡片骨架屏、表格骨架屏、图表骨架屏
    - 骨架屏动画使用shimmer效果（渐变扫光）
  - **乐观更新（Optimistic UI）**:
    - 点赞/收藏先更新UI，失败回滚
    - 表单提交先显示成功，后台失败Toast提示
  - **缓存策略**:
    - 使用React Query/SWR缓存API数据
    - 显示缓存时效提示
- **Acceptance Criteria**: [新增性能需求]
- **Test Requirements**:
  - `programmatic` TR-7.1: Lighthouse Performance ≥ 90分
  - `programmatic` TR-7.2: 首次加载LCP ≤ 2.5s（4G网络模拟）
  - `programmatic` TR-7.3: 二次访问同一页面 < 1s（命中缓存）
  - `human-judgement` TR-7.4: 加载过程视觉流畅，无白屏闪烁
- **Files to Modify**:
  - `frontend/src/components/ui/LazyImage.tsx` (增强blur-up)
  - `frontend/src/components/ui/Skeleton.tsx` (增加变体)
  - `frontend/src/api/http.ts` (增加缓存层)

---

## [ ] Task 8: 页面布局居中统一 🟡 P1
- **Depends On**: None
- **Description**:
  - 定义全局容器CSS类（container-main/narrow/full）
  - 统一所有页面的max-width和padding
  - Hero区域内容垂直水平居中优化
  - 卡片网格响应式断点调整
  - 平板设备特殊布局适配
- **Acceptance Criteria**: [AC-9]
- **Test Requirements**:
  - `programmatic` TR-8.1: 1920×1080下内容居中，最大宽度1200px
  - `programmatic` TR-8.2: 1366×768下无横向滚动条
  - `programmatic` TR-8.3: 375px移动端左右边距≥16px
  - `human-judgement` TR-8.4: 各分辨率下视觉平衡，不拥挤不稀疏
- **Files to Modify**:
  - `frontend/src/index.css` (增加容器类)
  - `frontend/tailwind.config.js` (扩展容器)
  - `frontend/src/pages/Home.tsx` (应用容器类)
  - 其他所有页面组件

---

## [ ] Task 9: UI元素一致性 — Tag全局推广 + 设计系统 🟡 P1
- **Depends On**: [Task 1]
- **Description**:
  - 全局搜索并替换硬编码的tag span样式为Tag组件
  - 统一按钮风格（圆角、内边距、字重、阴影层级）
  - 统一卡片风格（圆角、边框、悬停效果）
  - 统一表单元素风格（输入框、选择器、开关）
  - 建立Storybook组件文档（可选）
- **Acceptance Criteria**: [AC-10]
- **Test Requirements**:
  - `programmatic` TR-9.1: Grep搜索"px-2 py-0.5 rounded"结果为0（全部替换为Tag）
  - `programmatic` TR-9.2: 全项目button样式统一（<3种变体）
  - `human-judgement` TR-9.3: 视觉走查无明显不一致
  - `human-judgement` TR-9.4: 整体和谐，无割裂感
- **Files to Modify**:
  - `frontend/src/pages/Home.tsx` (替换tag样式)
  - `frontend/src/pages/Mentors.tsx`
  - `frontend/src/pages/Jobs.tsx`
  - 其他包含卡片/标签的页面

---

## [ ] Task 10: 卡片交互增强 — 可点击性+微交互 🔴 P0
- **Depends On**: None
- **Description**:
  - **三态反馈**: Hover/Active/Focus完整样式链
  - **触摸优化**: active:scale-[0.98] + touch-manipulation
  - **无障碍**:
    - focus-visible ring样式
    - role="button" 或语义化Link
    - 键盘Enter/Space触发
  - **视觉暗示**:
    - 右上角箭头图标（→）表示可点击
    - 点击涟漪效果（Ripple Animation）
  - **滚动记忆**: 详情页返回时恢复滚动位置
- **Acceptance Criteria**: [AC-2 升级版]
- **Test Requirements**:
  - `programmatic` TR-10.1: 所有卡片Tab可聚焦
  - `programmatic` TR-10.2: Enter/Space键触发卡片点击
  - `programmatic` TR-10.3: 移动端点击有缩放反馈（<100ms）
  - `programmatic` TR-10.4: 详情页返回后滚动位置正确
  - `human-judgement` TR-10.5: 用户一眼能识别哪些元素可点击
- **Files to Modify**:
  - `frontend/src/pages/Home.tsx` (职位/导师/课程卡片)
  - `frontend/src/components/ui/Card.tsx` (如存在则增强)
  - 新建 `frontend/src/hooks/useScrollMemory.ts`
  - 新建 `frontend/src/components/ui/Ripple.tsx`

---

## Phase 3: 功能完善（Week 5-6）

## [ ] Task 11: 案例展示功能 — 社会证明强化 🟢 P2
- **Depends On**: None
- **Description**:
  - **案例数据结构设计**:
    ```typescript
    interface SuccessCase {
      id: number;
      student_name: string;        // 脱敏（张同学）
      university: string;          // XX大学
      major: string;               // 计算机专业
      avatar: string;              // 头像（默认占位图）
      quote: string;               // 学员原话（1-2句）
      timeline: TimelineItem[];    // 求职时间线
      company: string;             // 入职公司
      position: string;            // 岗位
      salary: string;              // 薪资（25K）
      screenshots?: string[];      // 截图证据（授权）
    }
    ```
  - **案例卡片组件**: 照片+基本信息+引用语+关键数据
  - **案例详情页**: 完整故事时间线+数据展示
  - **后台管理**: CRUD + 审核 + 排序
- **Acceptance Cases**: [AC-11 升级版]
- **Test Requirements**:
  - `programmatic` TR-11.1: 案例列表页可正常访问
  - `programmatic` TR-11.2: 案例详情页展示完整信息
  - `programmatic` TR-11.3: 后台可管理案例（增删改查+审核）
  - `human-judgement` TR-11.4: 案例真实可信，有情感共鸣
- **Files to Create**:
  - `frontend/src/pages/SuccessCases.tsx` (列表)
  - `frontend/src/pages/SuccessCaseDetail.tsx` (详情)
  - `frontend/src/components/CaseCard.tsx` (卡片)
  - `frontend/src/components/Timeline.tsx` (时间线)
  - `frontend/src/pages/admin/CasesManage.tsx` (后台管理)

---

## [ ] Task 12: 首屏价值主张重构 — 核心卖点可视化 🔴 P0
- **Depends On**: [Task 1, Task 10]
- **Description**:
  - **Hero区域增强**:
    - 增加价值锚点横幅（3个核心优势图标+文案）
    - 动态数字滚动效果（CountUp动画）
    - 社会证明头像墙（已就业学员头像轮播）
  - **CTA优化**:
    - 主CTA按钮更突出（尺寸、阴影、动画）
    - 次要CTA（了解更多、观看视频）
    - 信任标识（已服务XX万学生、合作企业LOGO墙）
  - **A/B测试准备**: 准备两套Hero文案供测试
- **Acceptance Criteria**: [新增首屏价值需求]
- **Test Requirements**:
  - `human-judgement` TR-12.1: 用户3秒内理解平台3个核心价值
  - `programmatic` TR-12.2: 数字滚动动画流畅（使用requestAnimationFrame）
  - `programmatic` TR-12.3: CTA按钮CTR可通过埋点统计
  - `human-judgement` TR-12.4: 视觉冲击力强，对比新东方页面不逊色
- **Files to Modify**:
  - `frontend/src/pages/Home.tsx` (Hero区域重构)
  - 新建 `frontend/src/components/HeroValueProps.tsx`
  - 新建 `frontend/src/components/CountUpAnimation.tsx`
  - 新建 `frontend/src/components/SocialProofWall.tsx`
  - `frontend/src/data/home-ui-config.json` (增加配置项)

---

## [ ] Task 13: 微交互动画系统 🟢 P2
- **Depends On**: [Task 1, Task 10]
- **Description**:
  - **数字递增动画**: 统计数据从0滚动到目标值
  - **滚动触发动画**: Intersection Observer + Framer Motion
  - **悬浮效果增强**: 卡片hover时轻微上浮+阴影加深
  - **页面切换过渡**: 路由切换时淡入淡出
  - **Loading动画库**: 多种Loader变体（点、圈、条、自定义品牌Logo）
- **注意**: 所有时长控制在150-300ms，尊重prefers-reduced-motion
- **Test Requirements**:
  - `programmatic` TR-13.1: 数字动画从0到目标值持续时间800-1200ms
  - `programmatic` TR-13.2: 滚动到卡片时触发淡入上滑动画
  - `programmatic` TR-13.3: prefers-reduced-motion开启时禁用所有动画
  - `human-judgement` TR-13.4: 动画流畅不卡顿，不过度装饰
- **Files to Create**:
  - `frontend/src/components/CountUp.tsx`
  - `frontend/src/hooks/useInViewAnimation.ts`
  - `frontend/src/components/animations/PageTransition.tsx`

---

## Phase 4: 测试与收尾（Week 7-8）

## [ ] Task 14: 移动端真机适配测试 🟡 P1
- **Depends On**: [Task 1-13]
- **Description**:
  - 在4种标准设备上测试：
    - iPhone SE (375×667)
    - iPhone 14 Pro Max (430×932)
    - iPad (1024×1366)
    - Android 小屏 (360×640)
  - 触摸目标尺寸检查（≥44×44px）
  - 安全区域适配检查（刘海屏/底部指示条）
  - 横竖屏切换测试
  - 键盘弹出遮挡测试
- **Test Requirements**:
  - `programmatic` TR-14.1: Chrome DevTools Device Mode无水平滚动
  - `human-judgement` TR-14.2: 4种设备截图人工审核通过
  - `programmatic` TR-14.3: 所有触摸目标≥44px
- **Deliverables**:
  - 移动端测试报告（截图+问题清单）
  - 修复所有发现的移动端问题

---

## [ ] Task 15: 综合测试与Bug修复 🔴 P0
- **Depends On**: [Task 1-14]
- **Description**:
  - **功能回归测试**: 确保所有原有功能未受影响
  - **性能基准测试**: Lighthouse评分（Performance/Accessibility/Best Practices/SEO）
  - **跨浏览器测试**: Chrome/Firefox/Safari/Edge最新版
  - **无障碍审计**: axe-core最终扫描
  - **用户验收测试（UAT）**: 邀请5名目标用户完成核心任务
  - **Bug Bash**: 团队内部集中找Bug
- **Test Requirements**:
  - `programmatic` TR-15.1: Lighthouse四项评分均≥90
  - `programmatic' TR-15.2: axe-core 0个critical/severe违规
  - `programmatic` TR-15.3: UAT任务成功率≥90%
  - `human-judgement` TR-15.4: 甲方评审通过（无重大修改意见）
- **Deliverables**:
  - 测试报告（含截图和数据）
  - Bug清单（已修复/延后/已知限制）
  - 上线Checklist

---

# Task Dependencies Graph

```
Phase 1 (并行):
Task 1 (颜色) ──────────────┐
Task 2 (悬浮按钮) ──────────┤
Task 3 (Chat重构) ──────────┤──→ Phase 2
Task 10 (卡片交互) ─────────┘

Phase 2 (部分并行):
Task 4 (ChatManage) ──→ depends on Task 3
Task 5 (AI预留) ──────→ depends on Task 3
Task 6 (图片上传) ──────→ independent
Task 7 (加载优化) ──────→ independent
Task 8 (布局统一) ──────→ independent
Task 9 (UI一致性) ──────→ depends on Task 1

Phase 3 (并行):
Task 11 (案例展示) ─────→ independent
Task 12 (首屏价值) ────→ depends on Task 1, 10
Task 13 (微动画) ───────→ depends on Task 1, 10

Phase 4 (顺序):
Task 14 (移动端测试) ──→ depends on ALL previous
Task 15 (综合测试) ────→ depends on Task 14
```

---

# Priority Summary

| Priority | Tasks | Estimated Effort |
|----------|-------|------------------|
| **P0 (Must Have)** | 1, 2, 3, 10, 12, 15 | 60% of total |
| **P1 (Should Have)** | 4, 6, 7, 8, 9, 14 | 30% of total |
| **P2 (Nice to Have)** | 5, 11, 13 | 10% of total |

**建议MVP范围**: P0全部 + P1中的Task 8(布局) + Task 9(UI一致性)
**MVP预估工期**: 4-5周（并行开发）
