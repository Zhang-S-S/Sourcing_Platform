// Project-local MySQL lifecycle. Official binaries only; no administrator privileges needed.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import net from 'node:net'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const local = path.join(project, '.local/mysql')
const server = path.join(local, 'server')
const data = path.join(local, 'data')
const socket = `/private/tmp/sourcing-mysql-${crypto.createHash('sha256').update(project).digest('hex').slice(0, 10)}.sock`
const config = path.join(local, 'my.cnf')
const rootConfig = path.join(local, 'root.cnf')
const appConfig = path.join(local, 'client.cnf')
const complete = path.join(local, 'setup-complete')
const version = '8.4.11'
const archive = path.join(local, `downloads/mysql-${version}-macos15-arm64.tar.gz`)
const officialMd5 = '6e89113f04f2af85d0a164573493db3a'

function savePrivate(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content, { mode: 0o600 })
  fs.chmodSync(file, 0o600)
}
const quoteIni = value => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
function execute(binary, args, input, quiet = false) {
  const result = spawnSync(binary, args, { input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${path.basename(binary)} failed: ${result.stderr || result.stdout}`)
  if (!quiet && result.stdout) process.stdout.write(result.stdout)
  return result.stdout.trim()
}
function client(args, input, root = false, quiet = false) {
  return execute(path.join(server, 'bin/mysql'), [`--defaults-file=${root ? rootConfig : appConfig}`, ...args], input, quiet)
}
function running() {
  if (!fs.existsSync(rootConfig) || !fs.existsSync(path.join(server, 'bin/mysql'))) return false
  try {
    const actual = client(['--batch', '--skip-column-names'], 'SELECT @@datadir;', true, true)
    return path.resolve(actual) === path.resolve(data)
  } catch { return false }
}
function portAvailable() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(3306, '127.0.0.1', () => probe.close(() => resolve()))
  })
}
async function launch(bootstrap = false) {
  const log = fs.openSync(path.join(local, 'launcher.log'), 'a')
  const child = spawn(path.join(server, 'bin/mysqld'), [`--defaults-file=${config}`, ...(bootstrap ? ['--skip-networking'] : [])], {
    detached: true, stdio: ['ignore', log, log],
  })
  child.unref()
  fs.closeSync(log)
  let failure
  for (let attempt = 0; attempt < 100; attempt++) {
    await delay(300)
    if (running()) return
    if (bootstrap) {
      const result = spawnSync(path.join(server, 'bin/mysql'), ['--no-defaults', '--protocol=SOCKET', `--socket=${socket}`, '--user=root', '--batch', '--skip-column-names'], { input: 'SELECT 1;', encoding: 'utf8' })
      if (result.status === 0) return
      failure = result.stderr
    }
  }
  throw new Error(`MySQL did not become ready. See ${path.join(local, 'mysql-error.log')}. ${failure || ''}`)
}
async function stop() {
  if (!running()) { console.log('项目 MySQL 当前未运行。'); return }
  execute(path.join(server, 'bin/mysqladmin'), [`--defaults-file=${rootConfig}`, 'shutdown'], undefined, true)
  for (let i = 0; i < 100 && fs.existsSync(path.join(local, 'mysqld.pid')); i++) await delay(100)
  if (fs.existsSync(path.join(local, 'mysqld.pid'))) throw new Error('MySQL has not finished shutting down; check its log.')
  console.log('项目 MySQL 已安全停止。')
}
async function start() {
  if (!fs.existsSync(complete)) throw new Error('请先运行 node scripts/mysql.mjs install')
  if (running()) { console.log('MySQL 已在 127.0.0.1:3306 运行。'); return }
  await portAvailable()
  await launch()
  console.log('MySQL 已启动：127.0.0.1:3306，数据库 sourcing_platform。')
}
async function install() {
  if (os.platform() !== 'darwin' || os.arch() !== 'arm64') throw new Error('该本地安装器仅适用于 Apple Silicon Mac。')
  if (fs.existsSync(complete)) { await start(); return }
  fs.mkdirSync(local, { recursive: true, mode: 0o700 })
  fs.chmodSync(local, 0o700)
  if (!fs.existsSync(path.join(server, 'bin/mysqld'))) {
    fs.mkdirSync(path.dirname(archive), { recursive: true })
    if (!fs.existsSync(archive)) {
      execute('/usr/bin/curl', ['--fail', '--location', '--retry', '3', '--output', archive, `https://cdn.mysql.com/Downloads/MySQL-8.4/mysql-${version}-macos15-arm64.tar.gz`], undefined, true)
    }
    const sum = crypto.createHash('md5').update(fs.readFileSync(archive)).digest('hex')
    if (sum !== officialMd5) throw new Error('下载包与 MySQL 官方校验值不一致，未执行安装。')
    fs.mkdirSync(server, { recursive: true })
    execute('/usr/bin/tar', ['-xzf', archive, '-C', server, '--strip-components=1'], undefined, true)
  }
  execute(path.join(server, 'bin/mysqld'), ['--no-defaults', '--version'])
  const secretsFile = path.join(local, 'credentials.json')
  let credentials
  if (fs.existsSync(secretsFile)) credentials = JSON.parse(fs.readFileSync(secretsFile, 'utf8'))
  else {
    credentials = { root: crypto.randomBytes(24).toString('base64url'), app: crypto.randomBytes(24).toString('base64url'), test: crypto.randomBytes(24).toString('base64url') }
    savePrivate(secretsFile, JSON.stringify(credentials, null, 2) + '\n')
  }
  savePrivate(config, `[mysqld]\nbasedir=${quoteIni(server)}\ndatadir=${quoteIni(data)}\nsocket=${quoteIni(socket)}\npid-file=${quoteIni(path.join(local, 'mysqld.pid'))}\nlog-error=${quoteIni(path.join(local, 'mysql-error.log'))}\nbind-address=127.0.0.1\nport=3306\nmysqlx=OFF\nskip-name-resolve=ON\ncharacter-set-server=utf8mb4\ncollation-server=utf8mb4_0900_bin\ndefault-time-zone=+00:00\n`)
  savePrivate(rootConfig, `[client]\nuser=root\npassword=${credentials.root}\nprotocol=SOCKET\nsocket=${quoteIni(socket)}\n`)
  savePrivate(appConfig, `[client]\nuser=sourcing_app\npassword=${credentials.app}\nprotocol=TCP\nhost=127.0.0.1\nport=3306\ndatabase=sourcing_platform\ndefault-character-set=utf8mb4\n`)
  if (!fs.existsSync(path.join(data, 'mysql'))) {
    execute(path.join(server, 'bin/mysqld'), ['--no-defaults', '--initialize-insecure', `--basedir=${server}`, `--datadir=${data}`, `--log-error=${path.join(local, 'initialize.log')}`], undefined, true)
  }
  await launch(true)
  if (!running()) {
    execute(path.join(server, 'bin/mysql'), ['--no-defaults', '--protocol=SOCKET', `--socket=${socket}`, '--user=root'], `ALTER USER 'root'@'localhost' IDENTIFIED BY '${credentials.root}';`, true)
  }
  client([], `
    CREATE DATABASE IF NOT EXISTS sourcing_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
    CREATE DATABASE IF NOT EXISTS sourcing_platform_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
    CREATE USER IF NOT EXISTS 'sourcing_app'@'127.0.0.1' IDENTIFIED BY '${credentials.app}';
    CREATE USER IF NOT EXISTS 'sourcing_test'@'127.0.0.1' IDENTIFIED BY '${credentials.test}';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON sourcing_platform.* TO 'sourcing_app'@'127.0.0.1';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON sourcing_platform_test.* TO 'sourcing_test'@'127.0.0.1';
  `, true, true)
  const schema = fs.readFileSync(path.join(project, 'backend/src/main/resources/schema.sql'), 'utf8')
  client([], `USE sourcing_platform;\n${schema}\nUSE sourcing_platform_test;\n${schema}`, true, true)
  const url = database => `jdbc:mysql://127.0.0.1:3306/${database}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true`
  savePrivate(path.join(project, 'backend/data/mysql-local.properties'), `# Local MySQL credentials; generated by scripts/mysql.mjs and excluded from Git.\nspring.datasource.url=\${SOURCING_DB_URL:${url('sourcing_platform')}}\nspring.datasource.username=\${SOURCING_DB_USERNAME:sourcing_app}\nspring.datasource.password=\${SOURCING_DB_PASSWORD:${credentials.app}}\n`)
  savePrivate(path.join(project, 'backend/data/mysql-test.properties'), `spring.datasource.url=\${SOURCING_TEST_DB_URL:${url('sourcing_platform_test')}}\nspring.datasource.username=\${SOURCING_TEST_DB_USERNAME:sourcing_test}\nspring.datasource.password=\${SOURCING_TEST_DB_PASSWORD:${credentials.test}}\n`)
  savePrivate(path.join(project, 'backend/data/MySQL连接信息.txt'), `DBeaver 驱动：MySQL\n主机：127.0.0.1\n端口：3306\n数据库：sourcing_platform\n用户名：sourcing_app\n密码：${credentials.app}\n\n只用于本地开发；不要提交或分享此文件。\n`)
  savePrivate(complete, `${version}\n`)
  await stop()
  await start()
  console.log('安装完成。连接密码见 backend/data/MySQL连接信息.txt（仅当前用户可读）。')
}

try {
  const action = process.argv[2] || 'status'
  if (action === 'install') await install()
  else if (action === 'start') await start()
  else if (action === 'stop') await stop()
  else if (action === 'status') console.log(running() ? 'MySQL 正在运行：127.0.0.1:3306' : '项目 MySQL 当前未运行。')
  else if (action === 'sql') {
    if (!running()) throw new Error('请先启动 MySQL')
    const sql = fs.readFileSync(0, 'utf8')
    if (!sql.trim()) throw new Error('请通过标准输入传入 SQL')
    client(['--table'], sql)
  } else throw new Error('Usage: node scripts/mysql.mjs install|start|stop|status|sql')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
