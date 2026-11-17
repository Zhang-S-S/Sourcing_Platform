# Spring Boot + React 寻源平台


## 本机启动

在 VS Code 中打开整个 `Springboot_React` 文件夹。配置对应的 Java、Maven、Node.js 及前端依赖。

终端一（先启动 MySQL，再启动后端）：

```sh
cd "/Project_path/Springboot_React"
node scripts/mysql.mjs start
cd backend
mvn spring-boot:run
```

终端二（前端）：

```sh
cd "/Project_path/Springboot_React/frontend"
npm run dev
```

浏览器打开 **http://127.0.0.1:5176**。后端为 `127.0.0.1:8082`。

首次使用请注册新账号；开发验证码仍为 **123456**，不发送真实短信。

退出前后端可在对应终端按 `Ctrl+C`。


## 代码位置

完整树形目录、文件职责及阅读顺序见 [项目目录与分层说明](docs/项目目录与分层说明.md)。

| 文件 / 目录 | 作用 |
| --- | --- |
| `backend/src/main/java/com/sourcing/controller/` | 接口层：接收请求与返回响应 |
| `backend/src/main/java/com/sourcing/service/` | 业务层：账号、短信、贸易查询与数据源诊断规则 |
| `backend/src/main/java/com/sourcing/dao/` | DAO 数据访问层：本地账号 SQL 和甲方只读查询 |
| `backend/src/main/java/com/sourcing/entity/` | 账号与贸易记录数据对象 |
| `backend/src/main/java/com/sourcing/dto/request/`、`dto/response/` | 独立的请求、返回对象 |
| `backend/src/main/java/com/sourcing/config/`、`security/`、`exception/` | 框架配置、限流与统一异常处理 |
| `frontend/src/pages/`、`layouts/`、`components/` | React 页面、整体布局与组件 |
| `frontend/src/models/`、`hooks/` | 业务状态、交互处理与 React 生命周期 |
| `frontend/src/api/client.js` | 统一请求、会话 Cookie 与 CSRF 处理 |
| `frontend/src/router/navigation.js` | 地址、浏览器历史和页面快照 |
| `frontend/src/store/createStore.js` | 内存状态，通过 React useSyncExternalStore 订阅 |
| `frontend/src/styles/`、`assets/` | 原版及补充样式、配图 |
| `frontend/src/legacy/workspace.js` | 未完成业务的静态原型交互脚本 |

重新安装前端依赖使用 `npm ci`。生产打包和部署需另行配置前端静态文件服务及 `/api` 反向代理；当前命令用于本地开发。
