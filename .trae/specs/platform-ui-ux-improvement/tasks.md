# 启航平台 UI/UX 全面优化 - 实现计划

## [ ] Task 1: 颜色显示问题排查与修复
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 排查所有页面颜色显示问题
  - 检查CSS样式和透明度设置
  - 修复颜色淡、看起来没加载好的问题
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 首页Hero轮播区域颜色显示正常
  - `human-judgement` TR-1.2: 所有卡片和按钮颜色显示正常
  - `human-judgement` TR-1.3: 后台管理页面颜色显示正常
- **Notes**: 重点检查opacity、backdrop-blur等属性

## [ ] Task 2: 悬浮客服按钮可拖动功能
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 改造FloatingService.tsx组件，添加拖动功能
  - 实现鼠标/触摸事件处理
  - 保存位置到localStorage
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `programmatic` TR-2.1: 鼠标左键拖动按钮，按钮跟随移动
  - `programmatic` TR-2.2: 松开鼠标后，按钮固定在新位置
  - `programmatic` TR-2.3: 刷新页面后，位置保持不变
  - `programmatic` TR-2.4: 按钮不会被拖出屏幕边界
- **Notes**: 使用React的useRef和useState实现拖动逻辑

## [ ] Task 3: 客服聊天页面（用户端）
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 创建新的客服聊天页面组件
  - 实现消息发送和接收界面
  - 支持文字和表情
  - 添加到路由
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `programmatic` TR-3.1: 页面路由 /chat 可正常访问
  - `programmatic` TR-3.2: 输入框可以输入文字
  - `programmatic` TR-3.3: 点击发送按钮，消息显示在聊天区域
  - `programmatic` TR-3.4: 消息区分发送方和接收方
  - `human-judgement` TR-3.5: UI设计美观，符合平台风格
- **Notes**: 参考现有设计风格，使用相同的Tailwind类名

## [ ] Task 4: 聊天后台管理页面（管理员端）
- **Priority**: P0
- **Depends On**: [Task 3]
- **Description**: 
  - 创建管理员聊天列表页面
  - 实现聊天介入功能
  - 添加到后台管理路由
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-4.1: 管理员可以看到所有活跃聊天列表
  - `programmatic` TR-4.2: 点击聊天可以进入聊天详情
  - `programmatic` TR-4.3: 管理员可以在聊天中发送消息
  - `human-judgement` TR-4.4: UI符合后台管理风格
- **Notes**: 放在 /admin/chat 路由下

## [ ] Task 5: AI接口预留与集成
- **Priority**: P1
- **Depends On**: [Task 3]
- **Description**: 
  - 设计AI接口抽象层
  - 预留AI集成位置
  - 编写接口文档
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 代码中有清晰的AI接口预留位置
  - `human-judgement` TR-5.2: 有详细的接口文档说明
  - `programmatic` TR-5.3: 可以模拟AI回复进行测试
- **Notes**: 设计为可插拔的AI服务接口

## [ ] Task 6: 内容编辑图片上传功能
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 增强现有的FileUpload组件
  - 支持图片预览和删除
  - 集成到内容编辑页面
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `programmatic` TR-6.1: 可以选择本地图片文件
  - `programmatic` TR-6.2: 上传前可以预览图片
  - `programmatic` TR-6.3: 可以删除已选择的图片
  - `programmatic` TR-6.4: 支持JPG、PNG、GIF格式
- **Notes**: 检查现有的upload.js后端路由

## [ ] Task 7: 内容编辑实时预览功能
- **Priority**: P1
- **Depends On**: [Task 6]
- **Description**: 
  - 在内容编辑页面添加实时预览区域
  - 编辑与预览分栏显示
  - 支持Markdown或富文本预览
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-7.1: 编辑区和预览区同时显示
  - `programmatic` TR-7.2: 输入内容后预览区立即更新
  - `programmatic` TR-7.3: 图片在预览区正确显示
  - `human-judgement` TR-7.4: 预览效果与发布后一致
- **Notes**: 重点改造HomeConfig.tsx和Articles.tsx等编辑页面

## [ ] Task 8: 页面布局优化 - 内容居中
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 检查所有页面的布局
  - 确保重要内容区域居中显示
  - 优化响应式布局
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `human-judgement` TR-8.1: 首页Hero内容居中显示
  - `human-judgement` TR-8.2: 卡片网格布局居中对齐
  - `human-judgement` TR-8.3: 后台管理页面布局合理
  - `programmatic` TR-8.4: 移动端响应式布局正常
- **Notes**: 使用max-w和mx-auto等Tailwind类

## [ ] Task 9: UI元素重新设计 - 视觉一致性
- **Priority**: P1
- **Depends On**: [Task 1]
- **Description**: 
  - 重新设计割裂的span和标签元素
  - 统一按钮、卡片、标签的视觉风格
  - 优化间距和圆角
- **Acceptance Criteria Addressed**: [AC-10]
- **Test Requirements**:
  - `human-judgement` TR-9.1: 所有按钮风格一致
  - `human-judgement` TR-9.2: 所有标签（span）设计统一
  - `human-judgement` TR-9.3: 卡片间距和圆角一致
  - `human-judgement` TR-9.4: 整体视觉效果和谐
- **Notes**: 参考现有的ThemeConfig.tsx中的设计系统

## [ ] Task 10: 增强卡片可点击性 - 详情页面/模态框
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 确保所有卡片都有正确的点击事件
  - 检查现有详情页面
  - 为缺失详情的创建模态框或详情页
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-10.1: 职位卡片点击跳转到详情页
  - `programmatic` TR-10.2: 导师卡片点击跳转到详情页
  - `programmatic` TR-10.3: 企业卡片点击可查看详情
  - `programmatic` TR-10.4: 公告卡片点击可查看详情
- **Notes**: 检查现有的JobDetail.tsx、MentorDetail.tsx等

## [ ] Task 11: 案例展示功能
- **Priority**: P2
- **Depends On**: None
- **Description**: 
  - 创建案例数据结构
  - 实现案例展示组件
  - 添加案例编辑管理功能
- **Acceptance Criteria Addressed**: [AC-11]
- **Test Requirements**:
  - `programmatic` TR-11.1: 案例列表页面可正常访问
  - `programmatic` TR-11.2: 案例详情可以查看
  - `programmatic` TR-11.3: 后台可以管理案例
  - `human-judgement` TR-11.4: 案例展示美观
- **Notes**: 可以参考StudentStories组件

## [ ] Task 12: 后端聊天API开发
- **Priority**: P0
- **Depends On**: [Task 3]
- **Description**: 
  - 创建聊天相关数据库表
  - 开发聊天消息API
  - 开发聊天会话管理API
  - 开发管理员聊天API
- **Acceptance Criteria Addressed**: [AC-4, AC-5]
- **Test Requirements**:
  - `programmatic` TR-12.1: POST /api/chat/sessions 创建会话
  - `programmatic` TR-12.2: POST /api/chat/messages 发送消息
  - `programmatic` TR-12.3: GET /api/chat/sessions/:id 获取会话消息
  - `programmatic` TR-12.4: GET /api/admin/chat/sessions 获取所有会话
- **Notes**: 参考现有的routes结构和db.js

## [ ] Task 13: 综合测试与bug修复
- **Priority**: P0
- **Depends On**: [Task 1-12]
- **Description**: 
  - 端到端测试所有功能
  - 修复发现的bug
  - 性能优化
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-9, AC-10, AC-11]
- **Test Requirements**:
  - `programmatic` TR-13.1: 所有页面加载无错误
  - `programmatic` TR-13.2: 所有交互功能正常
  - `human-judgement` TR-13.3: 整体用户体验良好
  - `programmatic` TR-13.4: 无控制台错误
- **Notes**: 在不同浏览器和设备上测试
