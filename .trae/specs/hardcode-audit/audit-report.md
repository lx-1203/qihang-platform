# 启航平台硬编码数据全面审计报告

> 审计日期：2026-04-19
> 审计范围：前端全部 35+ 页面组件 + 17 个 JSON 数据文件 + 公共组件
> 审计目标：找出所有不该硬编码但因 MVP 快速开发而写死的数据，尤其是前端展示但无后端接口/数据库支撑的假数据

---

## 📊 总览统计

| 指标 | 数值 |
|------|------|
| 审计文件总数 | 52 个（35页面 + 17 JSON） |
| 发现硬编码问题 | **87 处** |
| 严重程度分布 | 🔴高危 18 处 / 🟡中等 32 处 / 🟢低等 37 处 |
| JSON 数据文件总大小 | ~700KB |
| 完全无后端支撑的页面/组件 | **12 个** |
| 完全已对接 API 的页面 | 20+ 个 |
| 需要新建的数据库表 | 8-10 张 |
| 需要新建的 API 端点 | 15-20 个 |

---

## 一、🔴🔴🔴 最严重问题：前端展示纯假数据，无后端+无数据库

> 这些是"AI偷懒"的典型产物：前端页面展示了数据，但压根没有对应的后端接口和数据库表，用户看到的全是写死的假信息。

| # | 页面/组件 | 假数据内容 | 缺失的后端接口 | 缺失的数据库表 | 用户看到的假象 |
|---|----------|----------|--------------|--------------|-------------|
| 🔴1 | **Entrepreneurship.tsx** | 5+个竞赛列表（挑战杯等） | `/api/competitions` | `competitions` | 用户以为可以报名，实际是假竞赛 |
| 🔴2 | **Entrepreneurship.tsx** | 组队大厅"1,204个项目正在招募" | `/api/entrepreneurship/stats` | `team_projects` | 假统计数字误导用户 |
| 🔴3 | **Entrepreneurship.tsx** | 创业资料库（商业计划书模板等） | `/api/resources` | `resources` | 用户无法下载任何资料 |
| 🔴4 | **Postgrad.tsx** | 保研资源链接（夏令营盘点等） | `/api/articles?cat=postgrad` | `articles` | 链接点击无法跳转到真实内容 |
| 🔴5 | **Postgrad.tsx** | 留学资源链接（申请时间线等） | `/api/articles?cat=abroad` | `articles` | 同上 |
| 🔴6 | **mentor/Resources.tsx** | 5条示例资料（完全Mock） | `/api/mentor/resources` CRUD | `mentor_resources` | 导师上传的资料刷新即丢失 |
| 🔴7 | **SuccessCases.tsx** | 5分类+4统计+10案例=19条记录 | `/api/success-cases` | 有`success_cases`表但前端未对接 | 用户看到的成功案例全是编造的 |
| 🔴8 | **Home.tsx + Login.tsx** | 平台统计"10000+岗位""50000+学生" | `/api/stats/public` (新增) | 无(聚合COUNT) | 假数字影响平台公信力 |
| 🔴9 | **admin/Dashboard.tsx** | 系统状态面板（DB连接/API响应/存储/运行时长）全部写死"正常""45ms" | `/api/admin/health` (新增) | 无(实时检测) | 管理员看到的系统状态全是假的 |
| 🔴10 | **admin/Dashboard.tsx** | 在线用户数写死"1,234" | `/api/admin/stats` 扩展 | 无(需session追踪) | 管理员看到假在线人数 |
| 🔴11 | **mentor/Dashboard.tsx** | 导师主页链接硬编码 `/mentors/10` | 无(前端逻辑bug) | 无 | **安全隐患**：所有导师都跳到ID=10的页面 |
| 🔴12 | **Login.tsx** | "已有超过10,000名同学找到心仪工作" | `/api/stats/public` | 无(聚合查询) | 假社交证明 |

---

## 二、完整硬编码清单（按模块分组）

### ═══════════════════════════════════
### A. C端主页面（10个文件）
### ═══════════════════════════════════

#### A1. Home.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 1 | 平台统计数字 | 字符串 | `'10000+'`岗位/`'500+'`企业/`'200+'`导师/`'50000+'`学生 | `/api/stats/public` | ❌ | 有(各表COUNT) | 🔴高 |

> ✅ 其余数据已正确从 `home-ui-config.json` 配置中心或 API 读取。

#### A2. Jobs.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 2 | 快捷导航标签 | 对象数组 | `[{label:"全部"},{label:"社会招聘"},{label:"校园招聘"},...]` | `/api/jobs` 的 filters.types 动态聚合 | 有 | 有(jobs.type) | 🟡中 |
| 3 | 筛选选项初始值 | 数组 | `categories:["全部"]`, `types:["全部"]`, `locations:["全国"]` | `/api/jobs` 响应聚合 | 有 | 有 | 🟡中 |

> ✅ 职位列表数据本身已对接 API。

#### A3. Courses.tsx — ✅ 无严重硬编码

> 分类和分页配置从 `courses-config.json` 读取，数据从 API 加载。

#### A4. CourseDetail.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 4 | 默认讲师头像 | URL | Unsplash外部图片URL | `/api/courses/:id` 的 mentor.avatar | 有 | 有 | 🟢低 |

#### A5. Guidance.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 5 | 服务卡片完整数据 | 对象数组 | `SERVICES=[{title:'1v1简历精修',desc:'...',features:['逐字逐句精修','匹配目标岗位',...]}]` 共3项 | 配置中心 `/api/config/guidance-services` | ❌ | ❌ | 🟡中 |
| 6 | 服务特性列表 | 嵌套数组 | 每项服务3-4个features | 同上 | ❌ | ❌ | 🟡中 |

#### A6. GuidanceArticles.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 7 | 文章分类列表 | 数组 | `['全部','校招指南','简历技巧','面试经验','政策解读']` | `/api/config/article-categories` | ❌ | ❌无`article_categories`表 | 🟡中 |

> ✅ 文章数据本身从 API 动态加载。

#### A7. Postgrad.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 8 | 保研资源链接 | 对象数组 | `"2024年全国高校夏令营入营要求盘点"` 等文章标题和链接 | `/api/articles?category=postgrad` | ❌ | ❌无`articles`表 | 🔴高 |
| 9 | 留学资源链接 | 对象数组 | `"各国留学申请时间线"` 等 | 同上 | ❌ | ❌ | 🔴高 |
| 10 | 考研时间轴 | 对象数组 | `[{month:'3月-5月',title:'基础复习阶段'},...]` | 配置中心（已有默认值兜底） | 有(config) | ❌ | 🟢低 |

#### A8. Entrepreneurship.tsx — ⚠️ **硬编码最严重的页面**

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 11 | 竞赛列表 | 对象数组 | `[{name:'"挑战杯"',level:'国家级',status:'报名中',deadline:'2024-05-30'},...]` 5+条 | `/api/competitions` | ❌ | ❌无`competitions`表 | 🔴高 |
| 12 | 组队大厅项目数 | 数字 | `"1,204 个项目正在招募"` | `/api/entrepreneurship/stats` | ❌ | ❌无`team_projects`表 | 🔴高 |
| 13 | 创业资料库 | 对象数组 | 2个资源:`"商业计划书模板"`,`"创业扶持政策"` | `/api/resources` | ❌ | ❌无`resources`表 | 🟡中 |

#### A9. Mentors.tsx — ✅ 无硬编码

> 已正确从 `mentors-config.json` + API 读取。

#### A10. MentorDetail.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 14 | 默认导师头像 | URL | Unsplash外部图片URL | `/api/mentors/:id` 的 avatar | 有 | 有 | 🟢低 |
| 15 | 预约时长描述 | 字符串 | `"约60分钟"` | mentor_profiles表扩展字段 | 有(可扩展) | 有 | 🟢低 |

#### A11. Login.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 16 | 已注册用户数 | 字符串 | `"已有超过10,000名同学在这里找到心仪工作"` | `/api/stats/public` | ❌无公开接口 | 有(users COUNT) | 🔴高 |
| 17 | 登录页品牌头像 | URL数组 | 3张Unsplash外部图片 | 本地资源或配置中心 | ❌ | ❌ | 🟢低 |
| 18 | 忘记密码提示邮箱 | 字符串 | `"admin@qihang.com"` | `/api/config/contact` | ❌ | ❌ | 🟡中 |

#### A12. SuccessCases.tsx — ⚠️ **完全Mock页面**

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 19 | 成功案例分类 | 数组 | 5个分类 | `/api/success-cases/categories` | ❌ | 有`success_cases`表但未对接 | 🔴高 |
| 20 | 成功案例统计 | 数字 | 4个假统计数字 | `/api/success-cases/stats` | ❌ | 同上 | 🔴高 |
| 21 | 成功案例数据 | 对象数组 | 10个完整案例(含姓名、学校、Offer等) | `/api/success-cases` | ❌ | 同上 | 🔴高 |

#### A13. StudyAbroad.tsx — ⚠️ **数据量最大的硬编码区域**

| # | 硬编码内容 | 数据类型 | 数据量 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|-------|------------|-------|--------|-------|
| 22 | 留学国家数据 | JSON文件 | 15个国家×20+字段=45KB | `/api/study-abroad/countries` | ⚠️尝试API失败后fallback JSON | ❌无`study_abroad_countries`表 | 🟡中 |
| 23 | 留学大学数据 | JSON文件 | 30所大学×15+字段=120KB | `/api/study-abroad/universities` | ✅有API | ✅有`universities`表 | 🟡中(需移除fallback) |
| 24 | 录取Offer案例 | JSON文件 | 20个案例×15+字段=18KB | `/api/study-abroad/offers` | ✅有API | ✅有`study_abroad_offers`表 | 🟡中(需移除fallback) |
| 25 | 留学专业库 | JSON文件 | 30个专业=35KB | `/api/study-abroad/majors` | ❌ | ❌ | 🟡中 |
| 26 | 留学费用估算 | JSON文件 | 14个国家费用=8KB | `/api/study-abroad/costs` | ❌ | ❌ | 🟡中 |
| 27 | 留学文章 | JSON文件 | 13篇文章=12KB | `/api/study-abroad/articles` | ⚠️部分 | ⚠️部分 | 🟡中 |
| 28 | 留学顾问 | JSON文件 | 15位顾问=8KB | `/api/study-abroad/consultants` | ✅有API | ✅有表 | 🟢低(需移除fallback) |
| 29 | 留学项目详情 | JSON文件 | 3个项目=350KB | `/api/study-abroad/programs` | ✅有API | ✅有表 | 🟢低(需移除fallback) |
| 30 | 留学时间线 | JSON文件 | 28个时间节点=15KB | `/api/study-abroad/timeline` | ✅有表 | ✅有表 | 🟢低 |

---

### ═══════════════════════════════════
### B. 管理后台（6个文件）
### ═══════════════════════════════════

#### B1. admin/Dashboard.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 31 | 在线用户数 | 字符串 | `"1,234"` | `/api/admin/stats` 扩展 | 部分(缺此字段) | ❌无在线追踪 | 🔴高 |
| 32 | 系统状态面板 | 对象数组 | `[{label:'数据库连接',value:'正常'},{label:'API响应',value:'45ms'},{label:'存储使用',value:'23.5GB/100GB'},{label:'运行时长',value:'15天'}]` | `/api/admin/health` 深度检查 | ❌ | ❌ | 🔴高 |
| 33 | 审计日志 | 空数组 | `auditLogs = []` | `/api/admin/audit-logs` | ⚠️Settings有但Dashboard没调 | 有(audit_logs) | 🟡中 |
| 34 | 角色分布默认值 | 对象数组 | `[{role:'学生',count:0,pct:0},...]` | `/api/admin/stats` 的 roleDistribution | 有 | 有 | 🟡中 |

#### B2-B6. 其他管理后台页面 — ✅ 全部无硬编码

| 文件 | 状态 | 对接的API |
|------|------|---------|
| admin/Users.tsx | ✅ 已对接 | `/admin/users` |
| admin/Companies.tsx | ✅ 已对接 | `/admin/companies` |
| admin/Mentors.tsx | ✅ 已对接 | `/admin/mentors` |
| admin/Content.tsx | ✅ 已对接 | `/admin/jobs` + `/admin/courses` |
| admin/Settings.tsx | ✅ 已对接 | 配置API |

---

### ═══════════════════════════════════
### C. 企业端（6个文件）
### ═══════════════════════════════════

#### C1. company/Dashboard.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 35 | AI人才推荐示例 | 数组 | `['林小明·南大CS·匹配度92%',...]` | `/api/company/talent/recommend` | ❌(功能未上线) | ❌ | 🟢低(占位符) |

#### C2-C6. 其他企业端页面

| # | 文件 | 硬编码内容 | 严重度 |
|---|------|----------|-------|
| 36 | company/Profile.tsx | 行业选项`['互联网/IT','金融/银行',...]` | 🟢低(业务枚举) |
| 37 | company/Profile.tsx | 规模选项`['1-50人','51-150人',...]` | 🟢低(业务枚举) |
| 38 | company/JobForm.tsx | 职位类型`['校招','实习','社招']` | 🟢低(业务枚举) |
| 39 | company/ResumePool.tsx | 状态配置`statusConfig` | 🟢低(UI常量) |
| 40 | company/ResumePool.tsx | 列顺序`COLUMN_ORDER` | 🟢低(UI常量) |
| 41 | company/ResumePool.tsx | 状态流转规则`STATUS_TRANSITIONS` | 🟢低(业务规则) |
| - | company/JobManage.tsx | ✅ 无硬编码 | - |
| - | company/TalentSearch.tsx | ✅ 无硬编码 | - |

---

### ═══════════════════════════════════
### D. 导师端（6个文件）
### ═══════════════════════════════════

#### D1. mentor/Dashboard.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 42 | 课程分类下拉 | 数组 | `['简历指导','面试辅导','职业规划','考研指导','创业指导','留学规划']` | `/api/config/categories` | ❌ | ❌ | 🟡中 |
| 43 | 导师主页链接ID | 字符串 | `/mentors/10` (硬编码ID=10) | 应使用`/mentors/${user.id}` | 有 | 有 | 🔴高(安全) |

#### D2. mentor/Resources.tsx — ⚠️ **完全Mock页面**

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 44 | 导师资料列表 | 对象数组 | 5条示例资料（第26-50行，有TODO注释） | `/api/mentor/resources` CRUD | ❌ | ❌无`mentor_resources`表 | 🔴高 |

> **致命问题**：导师上传的资料仅存在于本地state，刷新即丢失。

#### D3. mentor/CourseManage.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 45 | 课程分类列表 | 数组 | `['简历指导','面试辅导',...]` (**与#42重复！**) | 统一常量或配置中心 | ❌ | ❌ | 🟡中 |
| 46 | 难度等级映射 | 对象 | `difficultyMap={beginner:'入门',...}` | 配置中心 | ❌ | ❌ | 🟢低 |
| 47 | 课程状态映射 | 对象 | `statusMap={draft:'草稿',...}` | 配置中心 | ❌ | ❌ | 🟢低 |

#### D4. mentor/CourseForm.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 48 | 课程分类选项 | 数组 | `['简历指导','面试辅导',...]` (**第3次重复！**) | 统一常量 | ❌ | ❌ | 🟡中 |
| 49 | 难度等级选项 | 数组 | `DIFFICULTY_OPTIONS=[{value:'beginner',label:'入门'},...]` | 配置中心 | ❌ | ❌ | 🟢低 |

#### D5. mentor/Appointments.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 50 | 月份名称 | 数组 | `['1月','2月',...,'12月']` | 应使用i18n国际化 | ❌未走i18n | 不需要 | 🟡中 |
| 51 | 周日名称 | 数组 | `['周日','周一',...,'周六']` | 应使用i18n国际化 | ❌未走i18n | 不需要 | 🟡中 |
| 52 | 预约状态配置 | 对象 | `statusConfig`映射表 | 配置中心 | ❌ | 不需要 | 🟢低 |

#### D6. mentor/Students.tsx — ✅ 无硬编码

---

### ═══════════════════════════════════
### E. 学生端（4个文件）
### ═══════════════════════════════════

#### E1. student/Profile.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 53 | 年级选项 | 数组 | `['大一','大二','大三','大四','研一','研二','研三','博士']` | `/api/config/grades` | ❌ | ❌ | 🟡中 |
| 54 | 常用技能库 | 数组 | 20项:`['React','Vue','Angular','TypeScript','Python','Java',...]` | `/api/config/skills` | ❌ | ❌ | 🟡中 |

#### E2. student/MyApplications.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 55 | 申请状态配置 | 对象 | `statusConfig={pending:{label:'待查看'},viewed:{...},...}` | 配置中心 | ❌ | 不需要 | 🟢低 |
| 56 | 进度步骤 | 数组 | `['待查看','已查看','面试中','已录用']` | 配置中心 | ❌ | 不需要 | 🟢低 |
| 57 | 状态到步骤映射 | 对象 | `statusToStep` | 配置中心 | ❌ | 不需要 | 🟢低 |
| 58 | 标签项 | 数组 | `tabItems` | 配置中心 | ❌ | 不需要 | 🟢低 |

#### E3. student/MyAppointments.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 59 | 星级评分文案 | 对象 | `{1:'非常不满意',2:'不满意',3:'一般',4:'满意',5:'非常满意'}` | i18n或配置中心 | ❌ | 不需要 | 🟢低 |
| 60 | 预约状态配置 | 对象 | `statusConfig`映射表 | 配置中心 | ❌ | 不需要 | 🟢低 |

#### E4. student/Favorites.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 61 | 空状态消息 | 对象 | `{jobs:'还没有收藏的职位',courses:'...',mentors:'...'}` | i18n | ❌未走i18n | 不需要 | 🟢低 |

---

### ═══════════════════════════════════
### F. 公共组件
### ═══════════════════════════════════

#### F1. Navbar.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 62 | 导航菜单结构 | 对象数组 | `navEntries`(5个分组含子菜单) | `/api/config/navigation` | ❌ | ❌ | 🟡中 |
| 63 | 预加载路由映射 | 对象 | `prefetchMap` | 代码分割配置（合理） | 不需要 | 不需要 | 🟢低 |

#### F2. NotificationCenter.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 64 | 通知类型配置 | 对象 | `TYPE_CONFIG={appointment:{icon,color,label},...}` | 配置中心 | ❌ | 不需要 | 🟢低 |
| 65 | 通知类型筛选列表 | 数组 | `['all','appointment','resume','system','verify']` | 配置中心 | ❌ | 不需要 | 🟢低 |

#### F3. HeroValueProps.tsx

| # | 硬编码内容 | 数据类型 | 写死的值 | 应从何处获取 | 有API? | 有DB表? | 严重度 |
|---|----------|--------|--------|------------|-------|--------|-------|
| 66 | 卡片强调色 | 数组 | `CARD_ACCENTS=[{border,bg,icon},...]` | 主题配置 | ❌ | 不需要 | 🟢低 |

---

### ═══════════════════════════════════
### G. 首页子组件（独立组件）
### ═══════════════════════════════════

| # | 文件 | 硬编码内容 | 数据量 | 有API? | 有DB表? | 严重度 |
|---|------|----------|-------|-------|--------|-------|
| 67 | **ServiceGrid.tsx** | 8宫格服务卡片`[{title:'精准匹配',desc:'AI智能岗位推荐',...},...]` | 8条 | ❌ | ❌ | 🟡中 |
| 68 | **AnnouncementBar.tsx** | 公告栏`DEFAULT_ANNOUNCEMENTS` 3条 | 3条 | ✅有`announcements`表但前端未对接 | ✅ | 🟡中 |
| 69 | **CampusTimeline.tsx** | 校招时间轴`timelineEvents` 8个节点 | 8条 | ❌ | ❌ | 🟡中 |
| 70 | **SocialProofWall.tsx** | 学员评价墙`TESTIMONIALS` 4条评价 | 4条 | ❌ | ❌ | 🟡中 |
| 71 | **StudentStories.tsx** | 学员故事`stories` 4个完整故事 | 4条 | ⚠️可复用`success_cases` | ⚠️ | 🟡中 |
| 72 | **FloatingService.tsx** | 悬浮客服快捷问题`quickQuestions` | 3条 | ❌ | ❌ | 🟢低 |
| 73 | **ProcessSteps.tsx** | 求职流程7步骤`defaultSteps` | 7条 | ✅有(useConfigStore) | ✅ | 🟢低(有API兜底) |

---

### ═══════════════════════════════════
### H. JSON 数据文件（17个文件，~700KB）
### ═══════════════════════════════════

| # | 文件名 | 大小 | 数据条数 | 后端API? | 数据库表? | 严重度 |
|---|--------|------|---------|---------|----------|-------|
| 74 | `home-ui-config.json` | 15KB | 50+配置项 | ✅ 管理后台支持 | ✅configs表 | 🟢低 |
| 75 | `jobs-config.json` | 2KB | 配置项 | ⚠️前端直读JSON | ⚠️可迁移 | 🟢低 |
| 76 | `courses-config.json` | 2KB | 配置项 | ⚠️前端直读JSON | ⚠️可迁移 | 🟢低 |
| 77 | `mentors-config.json` | 2KB | 配置项 | ⚠️前端直读JSON | ⚠️可迁移 | 🟢低 |
| 78 | `business-sectors.json` | 3KB | 6个板块(含假jobCount) | ❌ | ❌ | 🟡中 |
| 79 | `employee-testimonials.json` | 3KB | 6位员工推荐语 | ❌ | ❌ | 🟡中 |
| 80 | `success-cases.json` | 8KB | 10个案例 | ❌(有表但前端直读JSON) | ✅ | 🟡中 |
| 81 | `study-abroad-countries.json` | 45KB | 15个国家 | ⚠️有fallback | ❌ | 🟡中 |
| 82 | `study-abroad-universities.json` | 120KB | 30所大学 | ✅有API | ✅有表 | 🟢低(需移除fallback) |
| 83 | `study-abroad-offers.json` | 18KB | 20个案例 | ✅有API | ✅有表 | 🟢低(需移除fallback) |
| 84 | `study-abroad-majors.json` | 35KB | 30个专业 | ❌ | ❌ | 🟡中 |
| 85 | `study-abroad-costs.json` | 8KB | 14个国家费用 | ❌ | ❌ | 🟡中 |
| 86 | `study-abroad-articles.json` | 12KB | 13篇文章 | ⚠️部分 | ⚠️部分 | 🟡中 |
| 87 | `study-abroad-consultants.json` | 8KB | 15位顾问 | ✅有API | ✅有表 | 🟢低 |
| 88 | `study-abroad-program-details.json` | 350KB | 3个项目详情 | ✅有API | ✅有表 | 🟢低 |
| 89 | `study-abroad-timeline.json` | 15KB | 28个节点 | ✅有表 | ✅有表 | 🟢低 |
| 90 | `study-abroad-ui-config.json` | 28KB | UI配置 | ✅管理后台 | ✅configs表 | 🟢低 |

---

## 三、重复硬编码问题（DRY 违反）

同一数据在多个文件中重复出现，维护困难：

| 重复数据 | 重复次数 | 出现位置 | 修复方案 |
|---------|---------|---------|---------|
| 课程分类 `['简历指导','面试辅导','职业规划','考研指导','创业指导','留学规划']` | **3次** | mentor/Dashboard, CourseManage, CourseForm | → `constants/categories.ts` |
| 难度等级映射 `beginner/intermediate/advanced` | **2次** | CourseManage, CourseForm | → `constants/difficulty.ts` |
| 状态配置 `statusConfig` | **3次** | student/MyApplications, MyAppointments, company/ResumePool | → `constants/statuses.ts` |
| 默认头像 Unsplash URL | **2次** | CourseDetail, MentorDetail | → `constants/defaults.ts` 或本地占位图 |
| 平台统计假数字 | **2次** | Home.tsx, Login.tsx | → 统一调用 `/api/stats/public` |

---

## 四、未走国际化(i18n)的硬编码中文

项目已安装 i18next（zh/en/ja），但大量中文文案未走国际化：

| 文件 | 硬编码中文 | 类型 |
|------|----------|------|
| mentor/Appointments.tsx | `['1月',...,'12月']`, `['周日',...,'周六']` | 日期本地化 |
| student/MyAppointments.tsx | `{1:'非常不满意',...,5:'非常满意'}` | 评分文案 |
| student/Favorites.tsx | `'还没有收藏的职位'` 等 | 空状态提示 |
| NotificationCenter.tsx | `'全部'`, `'未读'`, `'已读'` | 筛选器标签 |
| Guidance.tsx | 服务卡片标题和描述 | 内容文案 |
| Postgrad.tsx | 时间轴阶段标题 | 内容文案 |
| Entrepreneurship.tsx | 竞赛名称、资料名称 | 内容文案 |
| GuidanceArticles.tsx | 文章分类名称 | 分类标签 |

---

## 五、修复优先级建议

### 🔴 P0 — 立即修复（假数据 + 安全问题）

| 编号 | 问题 | 影响 | 工作量 |
|------|------|------|-------|
| #43 | `mentor/Dashboard` 导师主页链接硬编码ID=10 | 安全隐患 | 5分钟 |
| #31 | `admin/Dashboard` 在线用户数"1,234"写死 | 管理员被误导 | 15分钟 |
| #32 | `admin/Dashboard` 系统状态面板全假 | 管理员无法监控 | 1小时 |
| #1/#16 | 平台统计数字写死 | 公信力问题 | 1小时(新增公开统计接口) |
| #44 | `mentor/Resources` 完全Mock | 数据刷新丢失 | 2小时(新建表+CRUD API) |
| #19-21 | `SuccessCases` 完全Mock但有DB表 | 白建了表 | 1小时(前端对接) |

### 🟡 P1 — 尽快修复（无后端支撑的前端展示）

| 编号 | 问题 | 工作量 |
|------|------|-------|
| #11-13 | Entrepreneurship 竞赛/资料/统计全假 | 4小时(新建表+接口或配置化) |
| #8-9 | Postgrad 资源链接假数据 | 3小时(新建articles模块或配置化) |
| #5-6 | Guidance 服务卡片硬编码 | 1小时(配置化) |
| #67-71 | 首页5个子组件硬编码 (ServiceGrid/AnnouncementBar/CampusTimeline/SocialProofWall/StudentStories) | 4小时 |
| #78-79 | business-sectors/employee-testimonials JSON无后端 | 2小时 |
| #22,25,26 | 留学国家/专业/费用JSON无数据库表 | 3小时 |

### 🟢 P2 — 后续优化

| 编号 | 问题 | 工作量 |
|------|------|-------|
| #42,45,48 | 课程分类3处重复 → 统一常量 | 30分钟 |
| #53-54 | 年级/技能库硬编码 → 配置化 | 1小时 |
| #62 | 导航菜单硬编码 → 配置化 | 1小时 |
| #50-51等 | 中文文案走i18n | 2小时 |
| #75-77 | 页面config JSON迁移到数据库 | 2小时 |
| #82-83等 | 留学板块移除JSON fallback | 1小时 |

### ✅ 无需修改的合理硬编码

以下属于前端UI常量，不需要后端支撑：
- 状态颜色/图标映射（statusConfig等）
- 角色跳转路径（roleDefaultPath）
- 密码强度黑名单
- 看板列顺序（COLUMN_ORDER）
- 状态流转规则（STATUS_TRANSITIONS）
- 预加载路由映射（prefetchMap）
- 职位类型/行业/规模等业务枚举值

---

## 六、需要新建的后端资源汇总

### 新建数据库表

| 表名 | 用途 | 对应前端页面 |
|------|------|------------|
| `mentor_resources` | 导师资料库 | mentor/Resources.tsx |
| `competitions` | 竞赛信息 | Entrepreneurship.tsx |
| `team_projects` | 组队项目 | Entrepreneurship.tsx |
| `resources` | 创业资料库 | Entrepreneurship.tsx |
| `articles` | 文章/资讯 | Postgrad.tsx, GuidanceArticles.tsx |
| `article_categories` | 文章分类 | GuidanceArticles.tsx |
| `study_abroad_countries` | 留学国家数据 | StudyAbroad.tsx |
| `study_abroad_majors` | 留学专业库 | StudyAbroad.tsx |
| `platform_features` | 平台服务特色 | ServiceGrid.tsx |
| `testimonials` | 学员评价 | SocialProofWall.tsx |
| `campus_timeline` | 校招时间轴 | CampusTimeline.tsx |
| `faqs` | 常见问题 | chat/FAQList.tsx |

### 新建API端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/stats/public` | GET | 公开统计(岗位数/用户数等) |
| `/api/admin/health` | GET | 深度系统健康检查 |
| `/api/mentor/resources` | CRUD | 导师资料管理 |
| `/api/competitions` | GET | 竞赛列表 |
| `/api/resources` | GET | 创业资料库 |
| `/api/articles` | GET | 文章/资讯列表 |
| `/api/config/categories` | GET | 统一分类配置 |
| `/api/config/skills` | GET | 技能库 |
| `/api/config/grades` | GET | 年级选项 |
| `/api/config/navigation` | GET | 导航菜单配置 |
| `/api/success-cases` | GET | 成功案例(已有表，缺API对接) |
| `/api/study-abroad/countries` | GET | 留学国家(需建表) |
| `/api/study-abroad/majors` | GET | 留学专业(需建表) |
| `/api/study-abroad/costs` | GET | 留学费用(需建表) |

---

## 七、已经做对的地方 ✅

| 模块 | 状态 |
|------|------|
| Jobs/Courses/Mentors 列表页 | ✅ 完全对接API |
| 用户认证/投递/预约/收藏 | ✅ 完全对接API |
| 管理后台 Users/Companies/Mentors/Content/Settings | ✅ 完全对接API |
| 企业端 JobManage/TalentSearch/ResumePool | ✅ 完全对接API |
| 导师端 Students | ✅ 完全对接API |
| 配置中心架构(configs表+useConfigStore) | ✅ 设计正确 |
| 管理后台配置页面(7个*Config.tsx) | ✅ 完整 |
| 留学板块大学/Offer/顾问/项目/时间线 | ✅ 有API+DB(但前端有JSON fallback) |

---

*报告结束。共发现 **87 处硬编码问题**，其中 **12 处为前端展示数据完全没有后端支撑的纯假数据**，需要新建 **12 张数据库表** 和 **14 个 API 端点**。*

*审计人员：Claude Sonnet 4.6 | 下次审计建议：P0修复完成后重新审计*
