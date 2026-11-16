// Reuse the installed local MySQL SERVICE, with separate React business/test databases.
// No vendor connection and no copying live MySQL data files.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const installedProject = path.resolve(project, '../sourcing-platform')
const data = path.join(project, 'backend/data')
const oldMysql = path.join(installedProject, '.local/mysql')
const mysql = path.join(oldMysql, 'server/bin/mysql')
const rootConfig = path.join(oldMysql, 'root.cnf')
const settings = path.join(data, 'react-db-local.json')
const databases = ['sourcing_platform_react', 'sourcing_platform_react_test']
const accounts = ['sourcing_react_app', 'sourcing_react_test']

function lifecycle(action) {
  const result = spawnSync(process.execPath, [path.join(installedProject, 'scripts/mysql.mjs'), action], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error('本地 MySQL 服务操作未完成，请查看上方提示。')
}
function privateFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  fs.writeFileSync(file, content, { mode: 0o600 }); fs.chmodSync(file, 0o600)
}
function provision() {
  if (!fs.existsSync(mysql) || !fs.existsSync(rootConfig)) throw new Error('请先使用原项目安装本机 MySQL，或配置自己的 MySQL 数据源。')
  const secrets = fs.existsSync(settings) ? JSON.parse(fs.readFileSync(settings, 'utf8'))
    : accounts.map(() => crypto.randomBytes(24).toString('base64url'))
  privateFile(settings, JSON.stringify(secrets) + '\n')
  const schema = fs.readFileSync(path.join(project, 'backend/src/main/resources/schema.sql'), 'utf8')
  const sql = databases.map((database, index) => `
    CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
    CREATE USER IF NOT EXISTS '${accounts[index]}'@'127.0.0.1' IDENTIFIED BY '${secrets[index]}';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON ${database}.* TO '${accounts[index]}'@'127.0.0.1';
    USE ${database}; ${schema}
  `).join('\n')
  const result = spawnSync(mysql, [`--defaults-file=${rootConfig}`, '--batch'], { input: sql, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('React 本地数据库初始化失败；未输出含连接凭据的 SQL。请检查本机 MySQL 服务与管理配置。')
  for (const [index, file] of ['mysql-local.properties', 'mysql-test.properties'].entries()) {
    const prefix = index ? 'SOURCING_TEST_DB' : 'SOURCING_DB'
    const url = `jdbc:mysql://127.0.0.1:3306/${databases[index]}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true`
    privateFile(path.join(data, file), `# Local-only credentials; excluded from Git.\nspring.datasource.url=\${${prefix}_URL:${url}}\nspring.datasource.username=\${${prefix}_USERNAME:${accounts[index]}}\nspring.datasource.password=\${${prefix}_PASSWORD:${secrets[index]}}\n`)
  }
  privateFile(path.join(data, 'MySQL连接信息.txt'), `仅用于本地开发，请勿提交或转发。\n主机：127.0.0.1\n端口：3306\n数据库：${databases[0]}\n用户名：${accounts[0]}\n密码：${secrets[0]}\n`)
  console.log('React 账号库与测试库已就绪，连接配置已安全保存。原 Vue 项目的账号表未修改。')
}

try {
  const action = process.argv[2] || 'status'
  if (action === 'start' || action === 'install') { lifecycle('start'); provision() }
  else if (action === 'status') {
    lifecycle('status')
    console.log(`React 账号库：${databases[0]}；本地配置：${fs.existsSync(settings) ? '已生成' : '尚未初始化，请运行 start'}`)
  } else if (action === 'stop') {
    console.log('即将停止共用的本机 MySQL 服务，Vue 和 React 项目都会失去数据库连接。')
    lifecycle('stop')
  } else throw new Error('Usage: node scripts/mysql.mjs start|install|status|stop')
} catch (error) { console.error(error.message); process.exitCode = 1 }
