# 启航平台

启航平台是一个前后端分离的本地开发项目，当前第一阶段重点是稳定开发启动链路，以及完成注册后实名引导和分阶段访问控制。

## 本地开发

### 端口约定

- 前端 Vite: `http://localhost:5173`
- 后端 API: `http://localhost:3001`
- 后端健康检查: `http://localhost:3001/api/health`

### 推荐启动方式

Windows:

```bat
start.bat
```

macOS / Linux:

```bash
./start.sh
```

启动脚本会做三件事：

1. 安装前后端依赖
2. 启动后端和前端开发服务
3. 轮询检查 `http://localhost:3001/api/health` 和 `http://localhost:5173`

只有两个地址都成功响应后，脚本才会输出“Startup complete”。

### 手动启动

后端：

```bash
cd backend
npm install
npm run dev
```

前端：

```bash
cd frontend
npm install
npm run dev
```

## WebSocket 连接失败排查

如果浏览器报错：

```text
WebSocket connection to 'ws://localhost:5173/' failed: net::ERR_CONNECTION_REFUSED
```

结论优先看这个：

- 这通常不是业务代码里的 WebSocket 逻辑出错
- 这通常表示前端 Vite dev server 根本没有成功监听 `5173`

排查顺序：

1. 打开 `http://localhost:5173`
2. 打开 `http://localhost:3001/api/health`
3. 如果 `5173` 不通，先解决前端 dev server 启动问题

### `5173` 被占用时怎么处理

项目的 Vite 配置已启用 `strictPort: true`，因此端口被占用时不会自动跳到别的端口。

这意味着：

- 你必须释放 `5173`
- 否则本项目不会正常建立 `ws://localhost:5173/` 的 HMR 连接

Windows 可用：

```bat
netstat -ano | findstr 5173
```

macOS / Linux 可用：

```bash
lsof -i tcp:5173
```

## 第一阶段当前规则

- 学生注册后进入首页，并弹出“视频 + 实名引导”弹窗
- 学生实名认证不是强制步骤，可以稍后处理
- 学生未实名时只允许浏览首页和四大板块概览，不能进入详情、聊天、投递、收藏、通知和学生中心
- 学生实名通过后恢复完整学生能力
- 企业和导师未完成实名/资质前，可进入各自概览页，但关键工作台动作受限
- 管理员不受实名和职业规划限制
