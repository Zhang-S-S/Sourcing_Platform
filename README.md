# 供应商寻源平台：账号与墨西哥贸易线索

基于甲方 `供应商寻源平台_寻源端.html` 的页面设计开发。Vue 3 + Vite 前端、Spring Boot 4.1.2 后端、MySQL 8.4.11 LTS 数据库，Java 21。

## 在 VS Code 打开

打开整个 `sourcing-platform` 文件夹。本项目独立于之前的 `springboot-vue-demo`。

## 本地启动

在 VS Code 新建第一个终端，先确认数据库运行，再启动后端：

```bash
cd "/Users/zhangsusu/Documents/ChatGPT/supply chain/sourcing-platform"
node scripts/mysql.mjs start
cd backend
mvn spring-boot:run
```

第二个终端启动前端：

```bash
cd "/Users/zhangsusu/Documents/ChatGPT/supply chain/sourcing-platform/frontend"
npm install
npm run dev
```

依赖已安装；日常启动可跳过 `npm install`。浏览器打开 <http://127.0.0.1:5173>。后端为 <http://127.0.0.1:8080>，前端通过 `/api` 代理连接后端。停止时在两个终端分别按 Control + C。

如果找不到 `mvn` 或 `npm`，先运行 `source ~/.zshrc`。如果端口被占用，停止之前启动的 demo 或本项目进程后再运行。请始终使用同一前端地址；`localhost` 与 `127.0.0.1` 的浏览器 Cookie 不共享。

也可以在“终端 → 运行任务”中选择“启动寻源平台（前后端）”，会先启动 MySQL，然后启动前后端。MySQL 在后台独立运行，关闭后端不会停止数据库；电脑重启后再次运行上述命令即可。

## 如何测试

1. 首次使用点击“注册”，填写用户名、可选公司、密码、11 位中国大陆手机号和验证码 `123456`。
2. 注册成功返回登录页。用户名密码登录时，用户名不区分大小写；密码至少 8 位。
3. 选择“手机验证码登录”，只需手机号及固定验证码 `123456`。未注册手机号不会自动创建用户。
4. 登录后在“供应商发现”填写产品关键词或 HS，选择墨西哥后搜索。可先只填 HS `8544` 测试；产品与 HS 同时填写取交集。国家首次不默认选择。
5. A 为已接入的本地贸易线索；B 本地名录、C 境外贸易线索保留入口并显示待接入。可切换卡片/表格、每页 20/50 条、上下翻页、查看详情、企业名称过滤及 HS 细筛。
6. 结果为贸易记录，按编号降序，同一供方可能重复。缺失字段显示“暂无信息”。搜索的后端 12 秒和前端 15 秒超时已按用户要求临时关闭，等待查询返回；不影响其他请求的超时设置。
7. 可测试重复用户名/手机号、错误密码、错误验证码和退出后的刷新。“我的收藏”“供应商对比”仍为带提示的静态原型。
8. 页面切换已接入浏览器历史。打开详情后使用浏览器后退，可恢复原搜索条件、分页和卡片/表格；前进可再次进入原详情。A/B/C、收藏、对比、登录/注册也支持后退/前进。首次进入系统且尚无内部访问记录时，后退离开当前网站属于正常浏览器行为。

登录成功会保留登录页历史：从首个业务页后退可回登录界面，前进可回业务页，密码与验证码清空。返回登录界面不自动注销；实际退出请使用“退出登录”。

没有预置业务账号，先自行注册。验收账号只写入独立的 `sourcing_platform_test` 测试库，不进入业务库。

## 已实现范围

- 注册、用户名密码登录、手机号验证码登录、当前用户查询、退出登录。
- 用户名 NFC 规范化及大小写不敏感唯一性、手机号唯一性、字段校验和并发重复注册保护。
- BCrypt 哈希密码存储，接口不返回密码或密码哈希。
- 服务端 Session + HttpOnly/SameSite Cookie；登录轮换 Session ID，退出后旧会话失效。
- CSRF 校验、注册/登录/验证码获取的基本限流、停用账号状态检查。
- 服务端会话在无请求 2 小时后过期；页面刷新/窗口聚焦/每分钟会主动检查会话。服务重启后需重新登录，账号数据仍保留。
- 保留甲方原型双栏登录布局、插图、静态业务页面和演示交互；移除原型评审跳转及管理端入口。
- 墨西哥出口贸易记录的真实分页浏览、卡片/表格切换、按记录编号查看供方及商品详情、异常重试和会话失效处理。
- 恢复产品/HS/国家搜索区和 A/B/C 通道，接入墨西哥出口全表条件搜索；名称模糊过滤和 HS 细筛均在服务端执行，分页保留条件。未知属性、联系、规模和供货量条件置灰，不制造数据。
- 页面使用 `#/suppliers`、`#/suppliers/exports/编号`、`#/favorites`、`#/compare` 等地址，支持后退/前进和刷新。页面结果仅在当前标签页内存中临时保存，退出清除；密码、验证码和贸易结果不写入浏览器历史或本地存储。详见 `docs/页面导航与浏览器历史.md`。

墨西哥线索和记录详情已连接甲方数据库；收藏、评价、对比、反馈和报告仍为浏览器内的静态演示，未持久化或关联真实线索。本期没有实现管理端、注册审批或真实的角色/国家授权配置。未知业务/管理接口默认拒绝。

## MySQL 与 DBeaver

项目已经安装并初始化独立 MySQL 服务，只监听本机 `127.0.0.1:3306`。DBeaver 和 Spring Boot 可以同时连接，不需要先停止后端。

在 DBeaver 中新建连接，选择 **MySQL**：

| 配置 | 内容 |
| --- | --- |
| 主机 | `127.0.0.1` |
| 端口 | `3306` |
| 数据库 | `sourcing_platform` |
| 用户名 | `sourcing_app` |
| 密码 | 查看 `backend/data/MySQL连接信息.txt` |

密码为安装时自动生成的随机密码，后端会自动读取，无需手动填写到代码中。连接成功后展开 `sourcing_platform → 表 → sourcing_user`。首次连接可能需要下载 MySQL JDBC 驱动；若提示 `Public Key Retrieval is not allowed`，在该本地连接的驱动属性中设置 `allowPublicKeyRetrieval=true`。

数据表字段为 `id`、`username`、`username_key`、`company`、`password_hash`、`phone`、`enabled`、`created_at`。密码保存为 BCrypt 哈希，无法查看原始密码。

在项目根目录可以管理数据库：

```bash
node scripts/mysql.mjs status
node scripts/mysql.mjs start
node scripts/mysql.mjs stop
```

`start` 会在后台启动数据库，已运行时不会重复启动。停止数据库前先关闭后端及 DBeaver 连接。没有安装开机启动项，不需要管理员权限。

MySQL 程序与数据保存在 `.local/mysql/`，其中 `.local/mysql/data/` 是实际数据目录；不要直接编辑里面的数据库文件。备份业务数据可以使用 DBeaver 的 MySQL 导出功能。旧的 `backend/data/sourcing.mv.db` 是 H2 历史文件，已保留但应用不再读写；切换前确认其账号表为空，因此没有旧账号需要迁移。

连接密码及本地配置文件仅当前用户可读，`backend/data/`、`.local/` 已从 Git 中排除。

数据库配置文件：

- `backend/src/main/resources/application.properties`：默认 MySQL 地址与通用设置。
- `backend/data/mysql-local.properties`：本机业务库连接配置，后端自动导入。
- `backend/data/mysql-test.properties`：独立测试库连接配置。
- `backend/data/MySQL连接信息.txt`：供 DBeaver 填写的业务库账号信息。

## 甲方 SQL Server 数据源

已接入第二个只读数据源 `10.51.247.201:1433 / XpressfeedDB`，连接凭据保存在 `backend/data/vendor-local.properties`，不会提交 Git。账号注册登录继续使用本地 MySQL，甲方数据库不执行建表或写入操作。

登录后可通过 `GET /api/data-source/status` 检查外部连接。启动后端不会强制等待甲方数据库连通，短暂断网不影响本地登录；需要处于可访问甲方内网的网络环境。

启动前后端并登录后，可在同一浏览器打开 <http://127.0.0.1:5173/api/data-source/status>。返回 `configured: true`、`connected: true` 表示连接正常；未登录返回 401。

“供应商发现”已接入 `panjivaMXExport` 的真实数据，只执行参数化 SELECT。搜索范围是整张出口表，不是当前页或本地样本；查询按商品原文、HS 前缀、墨西哥供方国家和企业名称取交集，再按记录编号游标分页。默认每页 20 条、最大 50 条，多取一条判断下一页。没有全表 COUNT、OFFSET、聚合或数据库修改操作。

全表搜索已接入，但缺少 HS/商品索引时可能很慢。此前 `cable` 与 HS `8544` 组合触发 12 秒超时；现已临时关闭搜索执行和浏览器等待上限。数据源自身的超时或连接故障仍会明确报错，不当作空结果。搜索每用户每分钟 12 次、单实例单个并发搜索等设置保持原样。企业归一、去重统计、综合/贸易量排序、跨语审核词典和 B/C 数据仍待接入。详见 `docs/供应商搜索与ABC通道.md`。

当前内网服务器证书未被本机 Java 信任。经用户确认，仅此本地联调连接启用服务器证书信任，并保留传输加密。生产环境应使用可信证书校验。

迁移到另一台 Apple Silicon Mac 后，先在项目根目录执行 `node scripts/mysql.mjs install`，安装器会从 MySQL 官方下载并核对校验值，初始化新的数据库及随机密码。已有本机安装时，该命令只检查并启动服务。

部署到其他 MySQL 服务时，用 `SOURCING_DB_URL`、`SOURCING_DB_USERNAME`、`SOURCING_DB_PASSWORD` 覆盖本地配置；测试连接使用 `SOURCING_TEST_DB_URL`、`SOURCING_TEST_DB_USERNAME`、`SOURCING_TEST_DB_PASSWORD`。

## 固定验证码与后续短信接入

这是按本期要求提供的本地替代实现：注册和手机登录均由**服务端**校验固定码 `123456`，可以直接输入；获取验证码按钮只返回本地提示，不请求云服务、不产生短信费用。

固定码没有真实短信的手机号归属验证、每次生成、有效期或单次消费能力。它仅在默认 `local` profile 中提供，用于本地开发。正式上线必须接入真实短信提供方。

替换入口为 `backend/src/main/java/com/sourcing/auth/SmsCodeVerifier.java`，当前实现是 `FixedSmsCodeVerifier.java`。后续实现 `send(phone, purpose)` 和 `verify(phone, purpose, code)`，加入手机号/用途绑定、有效期、次数与单次消费后，再切换运行 profile；未提供新验证器时其他 profile 会拒绝启动。

## 接口

认证地址以 `/api/auth` 开头；写请求先获取 `/csrf`，带上返回的 `headerName` 与 `token`，并保留会话 Cookie。Vue 已封装好这些操作。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/config` | 当前短信模式 |
| GET | `/csrf` | 获取 CSRF 令牌 |
| POST | `/register` | 注册，成功后不自动登录 |
| POST | `/login/password` | 用户名密码登录 |
| POST | `/login/phone` | 手机验证码登录 |
| POST | `/sms-code` | 本地验证码提示 |
| GET | `/me` | 当前登录用户；未登录返回 401 |
| POST | `/logout` | 退出，返回 204 |

登录后的 `/csrf` 需重新获取，前端已自动处理。限流为单实例内存实现，未来多实例部署应换共享存储。

业务只读接口（需登录且账号有效）：

| 方法 | 地址 | 作用 |
| --- | --- | --- |
| GET | `/api/data-source/status` | 检查甲方数据库连接 |
| GET | `/api/mexico/exports?limit=20` | 读取第一页墨西哥出口记录 |
| GET | `/api/mexico/exports/search?country=MX&hs=8544&keyword=&limit=20` | 按产品/HS/国家及可选名称、HS 细筛执行全表条件查询 |
| GET | `/api/mexico/exports?limit=20&before=记录编号` | 读取该编号之前的下一页 |
| GET | `/api/mexico/exports/记录编号` | 读取一条记录及供方线索详情 |

墨西哥接口按用户每分钟最多 60 次请求；不提供写入接口。

## 目录

```text
backend/src/main/java/com/sourcing/auth/  认证、密码、会话、数据库访问
backend/src/main/resources/schema.sql    数据表定义
frontend/src/App.vue                     注册/登录及会话恢复
frontend/src/api.js                      API 请求、Cookie 与 CSRF
backend/src/main/java/com/sourcing/suppliers/ 甲方只读连接及墨西哥贸易查询
frontend/src/Workspace.vue               登录后主界面及导航
frontend/src/MexicoLeads.vue              真实墨西哥列表、分页和详情
frontend/src/LegacyWorkspace.vue          其他静态原型页面入口
frontend/src/prototype/                  甲方原型样式和静态交互
frontend/src/assets/                     甲方原型配图
docs/screenshots/                        实际联调截图
scripts/                                原型导入与验收脚本
.local/mysql/                           本机 MySQL 程序、数据和配置（不提交 Git）
```

原型导入脚本仅用于将来导入新的设计版本，会覆盖 `design.css`、`workspace.js`、配图；日常开发直接编辑 Vue 文件与后端代码。

## 自动化验证

```bash
cd backend
mvn test
cd ../frontend
npm run build
```

运行测试前先启动 MySQL。后端集成测试使用独立的 MySQL 数据库 `sourcing_platform_test`，测试用户没有业务库权限；清理测试数据前也会检查当前数据库名。

需要真实 HTTP 验收时，在 `backend` 目录启动独立测试后端：

```bash
java -jar target/sourcing-platform-0.1.0.jar --spring.config.import=file:./data/mysql-test.properties --server.port=8081
```

再在项目根目录执行：

```bash
SOURCING_TEST_URL=http://127.0.0.1:8081 node scripts/acceptance.mjs seed
```

重启独立测试后端后，将 `seed` 换成 `verify`，即可验证账号持久化。不要对业务库对应的后端执行验收脚本。

墨西哥真实数据 HTTP 验收：测试后端启动时需同时导入 `mysql-test.properties` 与 `vendor-local.properties`，然后在项目根目录运行：

```bash
SOURCING_TEST_URL=http://127.0.0.1:8081 SOURCING_ACCEPTANCE_TEST_DB=1 node scripts/acceptance-mexico.mjs
```

脚本只在本地测试库注册验收账号，对甲方仅执行少量固定 SELECT。自动化单元/集成测试通过替身检查查询和权限，不连接甲方数据库。
