// Read-only vendor acceptance, using the separately started local TEST account database.
// First start the test server as documented, then run acceptance.mjs seed once.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.SOURCING_TEST_URL || 'http://127.0.0.1:8083';
let cookie='';
async function api(path,options={}) {
  const response=await fetch(base+'/api'+path,{...options,headers:{Cookie:cookie,'Content-Type':'application/json',...options.headers}});
  for(const value of response.headers.getSetCookie()) if(value.startsWith('SOURCING_REACT_SESSION='))cookie=value.split(';')[0];
  const data=await response.json();
  assert.equal(response.ok,true,`${path}: ${data.message || response.status}`);
  return data;
}
const denied=await fetch(base+'/api/mexico/exports/profiles?recordIds=1');assert.equal(denied.status,401);
const csrf=await api('/auth/csrf');
await api('/auth/login/password',{method:'POST',headers:{[csrf.headerName]:csrf.token},body:JSON.stringify({username:'http_acceptance',password:'Acceptance888'})});
const page=await api('/mexico/exports/search?country=MX&hs=8544&limit=20');
assert.ok(page.items.length>2);
const ids=page.items.map(row=>row.recordId);
const profiles=await api('/mexico/exports/profiles?'+new URLSearchParams({recordIds:ids.join(',')}));
assert.deepEqual(Object.keys(profiles).sort(),ids.sort());
const matched=Object.values(profiles).filter(profile=>profile.status==='MATCHED');
assert.ok(matched.length>2,'Verify general batch enrichment, not two hardcoded companies');
assert.ok(matched.some(profile=>profile.phone));
assert.ok(matched.some(profile=>profile.website));
assert.ok(matched.some(profile=>profile.employees!=null));
await fs.mkdir('test-results',{recursive:true});
await fs.writeFile('test-results/mexico-enrichment.json',JSON.stringify({items:page.items,profiles},null,2));
console.log(JSON.stringify({result:'PASS',rows:ids.length,matched:matched.length,withPhone:matched.filter(p=>p.phone).length,withWebsite:matched.filter(p=>p.website).length,withEmployees:matched.filter(p=>p.employees!=null).length}));
