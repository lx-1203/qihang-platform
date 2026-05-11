# 开发模式说明

## 本地启动建议

优先使用根目录启动脚本：

Windows:

```bat
start.bat
```

macOS / Linux:

```bash
./start.sh
```

脚本会等待以下两个地址都可访问后再判定启动完成：

- `http://localhost:3001/api/health`
- `http://localhost:5173`

如果前端没有成功监听 `5173`，脚本会直接报错退出。

## `ws://localhost:5173` 连接失败是什么意思

如果控制台出现：

```text
WebSocket connection to 'ws://localhost:5173/' failed: net::ERR_CONNECTION_REFUSED
```

优先结论：

- 前端 Vite dev server 没有成功启动
- 不是先看业务页面逻辑
- 不是先看浏览器缓存

先检查：

```text
http://localhost:5173
http://localhost:3001/api/health
```

## 开发模式绕过

后端 `.env` 中开启：

```env
DEV_MODE=true
```

前端浏览器控制台执行：

```javascript
localStorage.setItem('DEV_MODE', 'true');
location.reload();
```

关闭前端开发绕过：

```javascript
localStorage.removeItem('DEV_MODE');
location.reload();
```

## 5173 端口占用

项目已启用 `strictPort: true`。

含义：

- `5173` 被占用时，Vite 不会自动切到 `5174`
- 这能避免页面打开了，但 HMR WebSocket 指向错误端口

排查命令：

Windows:

```bat
netstat -ano | findstr 5173
```

macOS / Linux:

```bash
lsof -i tcp:5173
```
