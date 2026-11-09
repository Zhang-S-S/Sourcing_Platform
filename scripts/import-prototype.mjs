// Mechanical extraction of the client-provided styles, illustration and static workspace.
// Run only when importing a fresh design revision; reviewed application files live in frontend/src.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/import-prototype.mjs <source.html>')
const html = fs.readFileSync(source, 'utf8')
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
const original = html.match(/<script>\(\(\)=>\{([\s\S]*)\}\)\(\);\s*<\/script>/)[1]
const illustration = html.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)[1]
fs.mkdirSync(path.join(project, 'frontend/src/prototype'), { recursive: true })
fs.mkdirSync(path.join(project, 'frontend/src/assets'), { recursive: true })
fs.writeFileSync(path.join(project, 'frontend/src/assets/auth-illustration.png'), Buffer.from(illustration, 'base64'))
fs.writeFileSync(path.join(project, 'frontend/src/prototype/design.css'), css + '\n')

let script = original.split('\n').filter(line =>
  !/^function (auth|validOtp|loginAllowed|setModule)\(/.test(line) &&
  !line.startsWith("$('#module-jump').innerHTML=") &&
  !line.startsWith("if(f.id==='login-form')") &&
  !line.startsWith("if(f.id==='register-form')") &&
  !line.startsWith("window.addEventListener('message'") &&
  !line.startsWith('new ResizeObserver(') &&
  !line.startsWith('window.prototypePreview=') &&
  !line.startsWith('ensureReports();try{')
).join('\n')

script = script
  .replace(/const accounts=\[.*?\];/, "const accounts=[{...user,status:'approved',enabled:true,roleIds:['buyer'],extraPermissions:[],countries:['MX','ID']}];")
  .replace("const initialPlatform=document.body.dataset.platform||'sourcing';", "const initialPlatform='sourcing';")
  .replace("view:initialPlatform==='admin'?'approvals':'login'", "view:'discover'")
  .replace('loggedIn:false', 'loggedIn:true,currentUser:user.id')
  .replace(/let lastReportedHeight=0;function resize\(\)\{.*\}\n/, 'function resize() {}\n')
  .replace(/function go\(view\)\{.*\}\n/, "function snapshot(){return structuredClone({state,records,demands,previous})}\nfunction go(view){if(view==='discover'&&options.onDiscover){options.onDiscover();return}if(!['discover','home','favorites','compare','detail','report'].includes(view))return;if(options.onNavigate){const next=snapshot();next.state.view=view;options.onNavigate(view,next);return}close();state.view=view;state.platform='sourcing';render()}\n")
  .replace("const b=e.target.closest('button');if(!b)return;", "const b=e.target.closest('button');if(!b||!root.contains(b))return;options.beforeNavigate?.();")
  .replace("if(['login','register'].includes(state.view)){auth();return}", '')
  .replace(/if\(a==='collapse'\).*\n/, "if(a==='collapse'){state.collapsed=!state.collapsed;render()}if(a==='logout')onLogout();\n")
  .replaceAll("user:'buyer_demo'", 'user:user.username')
  .replaceAll("aria-label=\"退出登录\"", "aria-label=\"退出登录\" title=\"${esc(user.username)} · 退出登录\"")
  .replaceAll('页面原型 · 企业与统计均为演示数据', '企业与统计为静态演示数据，尚未接入真实数据集')
  .replaceAll("$('#app')", "root")
  .replace('const $=s=>document.querySelector(s)', 'const $=s=>root.querySelector(s)')
  .replaceAll('#app ', '#workspace-app ')
  .replaceAll("document.addEventListener(", "listen(document,")
  .replaceAll("window.addEventListener(", "listen(window,")

// All legacy listeners are scoped to this Vue component and removed on logout.
script = `export function mountWorkspace(root, user, onLogout, options = {}) {
const events = new AbortController();
const listen = (target, type, handler) => target.addEventListener(type, handler, { signal: events.signal });
${script}
ensureReports();
if (options.snapshot) { Object.assign(state, options.snapshot.state); Object.assign(records, options.snapshot.records); demands.splice(0, demands.length, ...options.snapshot.demands); previous = options.snapshot.previous; }
if (['favorites', 'compare', 'detail', 'report'].includes(options.initialView)) state.view = options.initialView;
if (options.initialCompany && C.some(c => c.id === options.initialCompany)) state.company = options.initialCompany;
try { const locale = localStorage.getItem('sourcing-ui-locale'); if (locale === 'local' || UI_LANGS.some(([id]) => id === locale)) state.localePreference = locale; } catch {}
render();
const cleanup = () => { events.abort(); clearTimeout(nameTimer); root.replaceChildren(); };
cleanup.snapshot = snapshot;
return cleanup;
}
`
if (/password:'demo8888'|function auth\(|function setModule\(|prototypePreview/.test(script)) throw new Error('Prototype auth was not removed')
fs.writeFileSync(path.join(project, 'frontend/src/prototype/workspace.js'), script)
console.log('Imported original styling, illustration and static sourcing workspace; prototype authentication removed.')
