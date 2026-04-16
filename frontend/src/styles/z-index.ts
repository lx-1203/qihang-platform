/**
 * 全局 z-index 分层规范
 * 使用语义化常量避免 z-index 冲突
 */
export const Z_INDEX = {
  /** 下拉菜单、工具提示 */
  dropdown: 10,
  /** 桌面端固定侧边栏 */
  sidebar: 20,
  /** 移动端侧边栏遮罩层 */
  sidebarOverlay: 30,
  /** 移动端侧边栏面板 */
  sidebarPanel: 40,
  /** 顶部导航栏 (sticky) */
  navbar: 50,
  /** 悬浮客服按钮 */
  floating: 55,
  /** 模态框/对话框 */
  modal: 60,
  /** 全局消息提示 (Toast) */
  toast: 70,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
