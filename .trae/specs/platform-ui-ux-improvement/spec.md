# 启航平台 UI/UX 全面优化 - 产品需求文档

## Overview
- **Summary**: 对启航平台进行全面的UI/UX优化，包括修复颜色显示问题、增强交互功能、实现完整的客服聊天系统、内容可视化编辑功能等。
- **Purpose**: 解决现有UI问题，提升用户体验，增强平台功能完整性。
- **Target Users**: 在校大学生、应届毕业生、企业招聘方、职业导师、平台管理员

## Goals
- 修复颜色显示问题，确保视觉效果清晰美观
- 增强卡片和内容的可点击性，提供详细信息查看
- 实现可拖动的悬浮客服按钮
- 构建完整的客服聊天系统，支持AI介入
- 实现内容可视化编辑，支持图片插入和实时预览
- 优化页面布局，使内容居中显示
- 重新设计割裂的UI元素，提升整体视觉一致性

## Non-Goals (Out of Scope)
- 不涉及后端核心业务逻辑重构
- 不改变现有数据库架构
- 不涉及支付功能
- 不涉及第三方登录集成

## Background & Context
- 项目使用 React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand
- 后端使用 Express + MySQL 8.0
- 现有前端UI骨架已搭建完成，需要优化和增强
- 需要确保所有修改与现有技术栈保持一致

## Functional Requirements
- **FR-1**: 修复颜色显示问题，确保所有元素颜色正确显示，不会出现"没加载好"的视觉效果
- **FR-2**: 所有卡片、企业、导师、公告等元素支持点击查看详细信息
- **FR-3**: 悬浮客服按钮支持自由拖动
- **FR-4**: 独立的客服聊天页面，支持用户与客服/AI聊天
- **FR-5**: 后台管理员可查看和介入所有聊天对话
- **FR-6**: 聊天系统支持AI介入，预留AI接口
- **FR-7**: 内容编辑支持图片插入功能
- **FR-8**: 后台编辑时实时预览发布效果
- **FR-9**: 优化页面布局，确保重要内容居中显示
- **FR-10**: 重新设计割裂的span元素，提升视觉一致性
- **FR-11**: 提供案例展示功能，用于研究和测试

## Non-Functional Requirements
- **NFR-1**: 所有交互响应时间 < 200ms
- **NFR-2**: 客服聊天消息延迟 < 1s
- **NFR-3**: 支持同时在线用户数 ≥ 1000+
- **NFR-4**: 移动端响应式设计，支持各种屏幕尺寸
- **NFR-5**: 图片上传支持常见格式（JPG、PNG、GIF，≤5MB）
- **NFR-6**: 聊天记录安全加密，保护用户隐私

## Constraints
- **Technical**: 必须使用现有技术栈（React、Express、MySQL），不引入新的大型框架
- **Business**: 需要与现有功能兼容，不破坏现有业务流程
- **Dependencies**: 依赖现有认证系统、现有路由结构

## Assumptions
- 后端API接口可以快速开发聊天相关API
- AI接口可以后续接入
- 图片存储有可用的文件上传服务
- 用户可以接受新的UI设计风格

## Acceptance Criteria

### AC-1: 颜色显示优化
- **Given**: 用户访问任何页面
- **When**: 页面加载完成
- **Then**: 所有元素颜色正确显示，无淡色或"没加载好"的视觉效果
- **Verification**: `human-judgment`
- **Notes**: 需要在不同浏览器和设备上测试

### AC-2: 卡片可点击查看详情
- **Given**: 用户在首页或列表页
- **When**: 用户点击任何卡片（企业、导师、职位、课程、公告等）
- **Then**: 跳转到详情页面或弹出详情模态框
- **Verification**: `programmatic`

### AC-3: 悬浮客服按钮可拖动
- **Given**: 用户在任何页面
- **When**: 用户拖动悬浮客服按钮
- **Then**: 按钮跟随鼠标移动，松手后固定在新位置
- **Verification**: `programmatic`

### AC-4: 客服聊天页面功能完整
- **Given**: 用户打开客服聊天页面
- **When**: 用户发送消息
- **Then**: 消息即时显示，支持发送文字和表情
- **Verification**: `programmatic`

### AC-5: 管理员可查看和介入聊天
- **Given**: 管理员登录后台
- **When**: 管理员查看聊天列表
- **Then**: 可以看到所有活跃聊天，并可介入任何对话
- **Verification**: `programmatic`

### AC-6: AI接口预留完整
- **Given**: 开发人员需要接入AI
- **When**: 查看代码
- **Then**: 有清晰的AI接口文档和预留位置
- **Verification**: `human-judgment`

### AC-7: 内容编辑支持图片插入
- **Given**: 用户在编辑内容
- **When**: 用户点击插入图片
- **Then**: 可以上传并插入图片到内容中
- **Verification**: `programmatic`

### AC-8: 编辑时实时预览
- **Given**: 用户在后台编辑内容
- **When**: 用户修改内容
- **Then**: 实时预览区域同步更新，看到发布后的效果
- **Verification**: `programmatic`

### AC-9: 内容居中显示
- **Given**: 用户访问任何页面
- **When**: 查看重要内容区域
- **Then**: 内容在页面中居中显示，视觉效果良好
- **Verification**: `human-judgment`

### AC-10: UI元素设计一致
- **Given**: 用户访问任何页面
- **When**: 查看各种元素
- **Then**: 所有元素视觉风格一致，无割裂感
- **Verification**: `human-judgment`

### AC-11: 案例展示功能
- **Given**: 用户访问案例展示区域
- **When**: 查看案例
- **Then**: 可以看到完整的案例内容，用于研究和测试
- **Verification**: `programmatic`

## Open Questions
- [ ] AI接口具体使用哪个AI服务？（OpenAI、百度文心、阿里通义等）
- [ ] 图片上传是存储在本地还是云存储？
- [ ] 聊天消息是否需要历史记录永久保存？
- [ ] 管理员介入聊天时是否需要通知用户？
