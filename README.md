# Spring Boot + React 寻源平台

从同级 `sourcing-platform` 项目迁移，保留 Spring Boot 后端、现有功能和甲方页面样式，前端使用 React。原 Vue 项目独立保留。

## 本机启动

在 VS Code 中打开整个 `Springboot_React` 文件夹。本机 Java、Maven、Node.js 及前端依赖已配置。

终端一（先启动 MySQL，再启动后端）：

```sh
cd "/Users/zhangsusu/Documents/ChatGPT/supply chain/Springboot_React"
node scripts/mysql.mjs start
cd backend
mvn spring-boot:run
```

终端二（前端）：

```sh
cd "/Users/zhangsusu/Documents/ChatGPT/supply chain/Springboot_React/frontend"
npm run dev
```

浏览器打开 **http://127.0.0.1:5176**。后端为 `127.0.0.1:8082`。原 Vue 项目的 `5173/8080` 可以同时运行。

也可以通过 VS Code 的“终端 → 运行任务 → 启动 React 寻源平台（前后端）”启动。

首次使用请注册新账号；开发验证码仍为 **123456**，不发送真实短信。新项目使用独立账号库，没有复制旧项目的个人账号。退出前后端可在对应终端按 `Ctrl+C`。

## 数据库

| 用途 | 数据库 | 连接 |
| --- | --- | --- |
| React 版账号 | `sourcing_platform_react` | 本机 MySQL，127.0.0.1:3306 |
| 自动测试 | `sourcing_platform_react_test` | 本机 MySQL，127.0.0.1:3306 |
| 墨西哥贸易数据 | 甲方 SQL Server 的 `XpressfeedDB` | 沿用原项目的只读连接配置 |

两套项目共用已安装在原项目 `.local/mysql` 中的 MySQL 服务，账号库和测试库分开。`scripts/mysql.mjs` 依赖同级原项目的 MySQL 安装；不要移动或删除该安装目录。停止 MySQL 服务会同时影响两套项目，通常只需停止各自前后端。

本地连接信息见 `backend/data/MySQL连接信息.txt`；连接配置在 `backend/data/mysql-local.properties`。甲方连接信息在 `backend/data/vendor-local.properties`。这些文件仅在本机保存，已排除 Git；请勿转发或提交。

甲方数据库仅用于读取。保留原有 SELECT 查询、参数绑定和只读连接设置；注册、登录等写操作只进入本地 MySQL。原项目的内网证书联调配置也已保留。本次迁移测试未查询或修改甲方数据库。

## 功能范围

- 注册、账号密码登录、手机验证码登录、会话恢复与退出；密码散列、CSRF 防护、接口校验和限流沿用后端。
- 墨西哥 A 通道产品词 / HS 搜索、企业名称模糊筛选、HS 细筛、游标翻页、卡片和表格切换、贸易记录详情。
- 每页结果通用批量关联企业名录，动态展示电话、网站、员工数/规模、行业、成立年和名录状态；参见 [墨西哥企业资料动态接入](docs/墨西哥企业资料动态接入.md)。
- 浏览器前进、后退和搜索状态恢复；详情四个页签保留。
- B 本地名录、C 境外贸易线索、高级筛选全部控件、排序、收藏、对比等原版入口继续保留。未接入的业务仍按原项目提示待接入，不代表已经完成。
- 搜索请求继续不设此前的 12 秒 / 15 秒超时；其他请求的超时沿用原项目。

真实搜索使用甲方数据，需要 Mac 能访问其内网。列表仍为贸易记录粒度，不能当作去重企业总数；未完成的统计不填假数据。

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

登录、注册和真实搜索页面均为 React JSX，不依赖 Vue。收藏、对比等尚未完成的静态页面暂通过 React 容器复用原型脚本，保留原有展示与演示交互，不把演示数据当作真实结果。

本次目录整理将 Repository 改名为 Dao，并独立拆出实体与 DTO。接口、JSON、页面和数据库配置保持原值。若后端已在运行，请在自己的终端停止后重新启动以加载新包结构。

## 验证

```sh
cd frontend
npm test
npm run build
cd ../backend
mvn test
```

后端测试仅使用独立测试库，并关闭甲方数据源。HTTP 检查脚本也只应对隔离测试环境运行，详见 [迁移与验证记录](docs/迁移与验证记录.md)。

重新安装前端依赖使用 `npm ci`。生产打包和部署需另行配置前端静态文件服务及 `/api` 反向代理；当前命令用于本地开发。
