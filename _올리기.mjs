/* 6단계 — 인터넷에 올리기 (GitHub Pages)
   비공개 게시본을 **실제로 뺀** 배포 사본을 만들고, 거기서 git 으로 올린다.

   씀:  node _올리기.mjs            → 배포 사본만 만든다 (무엇을 넣고 뺐는지 표로 찍음)
        node _올리기.mjs --푸시      → 위 + git add/commit/push (원격이 이미 잡혀 있어야 함)

   배포 사본 위치: C:\Users\<나>\게시본-깃허브   (구글 드라이브 밖. .git 을 드라이브에 두면 동기화가 망가진다)
   빠지는 것: 공개: 끄기 인 게시본 폴더 통째로 · _미리보기/ (비공개 자료가 섞일 수 있음) ·
             제외디자인 (라이선스 불명확한 외부 kit) · 시험장·임시 파일
   원칙: 원본(이 폴더)은 읽기만. 배포 사본은 매번 새로 만든다 (.git 만 남기고).                */
import { readdir, readFile, writeFile, mkdir, rm, cp, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { 메모읽기 } from './공용/제작.js';
import { 키섞였나 } from './공용/열쇠.mjs';

const 원본 = dirname(fileURLToPath(import.meta.url));
const 배포 = process.env.배포폴더 || join(homedir(), '게시본-깃허브');
const 푸시 = process.argv.includes('--푸시');
const 제외디자인 = ['브릭마을'];          // 받은 kit — 라이선스가 분명해지면 여기서 빼면 된다
const 줄 = '─'.repeat(70);

/* 1. 어떤 게시본이 공개인가 */
const 게시본들 = [];
for (const e of await readdir(join(원본, '게시본'), { withFileTypes:true })) {
  if (!e.isDirectory() || /^[_.]/.test(e.name)) continue;
  let 글 = ''; try { 글 = await readFile(join(원본, '게시본', e.name, '_메모.txt'), 'utf8'); } catch {}
  const 메모 = 메모읽기(글);
  게시본들.push({ 이름:e.name, 공개:메모.공개, 디자인:메모.디자인 });
}
const 공개 = 게시본들.filter(g => g.공개), 비공개 = 게시본들.filter(g => !g.공개);

/* 2. 배포 사본 비우기 (.git 은 남긴다) */
await mkdir(배포, { recursive:true });
for (const e of await readdir(배포)) if (e !== '.git') await rm(join(배포, e), { recursive:true, force:true });

/* 3. 복사 */
const 넣은 = [], 뺀 = [];
const 담기 = async (상대, 이유) => {
  const 곳 = join(원본, 상대);
  try { await stat(곳); } catch { return; }
  await cp(곳, join(배포, 상대), { recursive:true, filter: p => !/[\\/]index\.html$/.test(p) || !/_미리보기/.test(p) });
  넣은.push(상대 + (이유 ? '  (' + 이유 + ')' : ''));
};
await 담기('공용');
await mkdir(join(배포, '디자인'), { recursive:true });
for (const e of await readdir(join(원본, '디자인'), { withFileTypes:true })) {
  if (!e.isDirectory()) continue;
  if (제외디자인.includes(e.name)) { 뺀.push('디자인/' + e.name + '  (제외디자인 — 받은 kit, 라이선스 불명확)'); continue; }
  await 담기('디자인/' + e.name);
}
for (const g of 공개) await 담기('게시본/' + g.이름, '공개');
for (const g of 비공개) 뺀.push('게시본/' + g.이름 + '  (공개: 끄기 — 폴더 통째로 뺌)');
await 담기('통합사이트');
for (const f of ['제작기.html', '_전체만들기.mjs', '_미리보기만들기.mjs', '_메모해석.mjs', '_올리기.mjs',
                 '_탐색.mjs', '_분류.mjs', '_재구성.mjs', '_구상안.md', '_인수인계서.md', 'README.md']) await 담기(f);
await 담기('_시험');
뺀.push('_미리보기/  (비교용 — 비공개 자료가 섞일 수 있어 뺌. 필요하면 배포 사본에서 다시 뽑기)');
뺀.push('_탐색결과/  (탐색·분류 결과 — 아직 공개하지 않은 자료의 제목·발췌가 들어 있어 뺌)');

/* 공개 게시본이 빠진 디자인을 쓰면 알려 준다 */
for (const g of 공개) if (제외디자인.includes(g.디자인)) 뺀.push('⚠ 공개 게시본 「' + g.이름 + '」 이 제외된 디자인 「' + g.디자인 + '」 을 씀 — 올라가면 기본 디자인으로 보임');

/* 4. 저장소 파일들 — 첫 화면은 통합사이트로, Pages 는 Actions 로 */
await writeFile(join(배포, 'index.html'),
`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=통합사이트/">
<title>기록</title></head><body><p><a href="통합사이트/">통합사이트로 →</a> · <a href="제작기.html">제작기</a></p></body></html>\n`, 'utf8');
await writeFile(join(배포, '.nojekyll'), '', 'utf8');
await mkdir(join(배포, '.github', 'workflows'), { recursive:true });
await writeFile(join(배포, '.github', 'workflows', 'deploy-pages.yml'),
`name: Deploy to GitHub Pages
# 저장소 Settings → Pages → Source 를 "GitHub Actions" 로 두면 push 마다 배포됩니다.
on:
  push:
    branches: ["main"]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: "."
      - id: deployment
        uses: actions/deploy-pages@v4
`, 'utf8');
await writeFile(join(배포, '.gitignore'), `# 배포 사본은 _올리기.mjs 가 매번 새로 만든다. 여기 직접 고치지 말 것.\n_미리보기/\nThumbs.db\n.DS_Store\n`, 'utf8');
/* README.md 는 원본 폴더의 것을 그대로 쓴다 (위 담기 목록에 있음).
   여기서 덮어쓰지 않는다 — 저장소 첫 화면에 보이는 설명이라 원본 한 곳에서만 고치게 한다. */
try { await stat(join(배포, 'README.md')); }
catch {
  await writeFile(join(배포, 'README.md'),
`# 웹 게시본 제작기

폴더에 자료를 넣으면 주제별로 나눠 웹 페이지로 만들어 주는 도구입니다.

- **게시본 보기** → [통합사이트/](통합사이트/)
- **제작기 열기** → [제작기.html](제작기.html) (크롬·엣지)

이 저장소는 \`_올리기.mjs\` 가 만든 배포 사본입니다. \`공개: 끄기\` 인 게시본은 폴더째 들어 있지 않습니다.
`, 'utf8');
}

/* 4.5 키가 새지 않았나 — 올리기 전에 배포 사본 전체를 훑는다 (원칙: 공개 저장소에 키를 올리지 않는다) */
const 텍스트확장자 = /\.(html?|m?js|css|json|md|txt|ya?ml|env|mjs|cjs)$/i;
const 새는것 = [];
async function 훑기(곳, 상대 = '') {
  for (const e of await readdir(곳, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = join(곳, e.name), 이름 = 상대 ? 상대 + '/' + e.name : e.name;
    if (e.isDirectory()) { await 훑기(p, 이름); continue; }
    if (/^\.?(키|keys?|secret|credentials?)\.(env|json|txt)$/i.test(e.name) || /\.pem$|\.key$/i.test(e.name)) { 새는것.push({ 이름, 무엇: '키 파일처럼 보이는 이름' }); continue; }
    if (!텍스트확장자.test(e.name)) continue;
    let 글; try { 글 = await readFile(p, 'utf8'); } catch { continue; }
    const 걸림 = 키섞였나(글);
    if (걸림) 새는것.push({ 이름, 무엇: 'API 키처럼 보이는 글자 ' + 걸림.slice(0, 6) + '…' });
  }
}
await 훑기(배포);
if (새는것.length) {
  console.error('\n' + 줄);
  console.error('✋ 멈춥니다 — 배포 사본에 키처럼 보이는 것이 있습니다. 공개 저장소로 올리면 안 됩니다.');
  for (const s of 새는것) console.error('   ! ' + s.이름 + '  → ' + s.무엇);
  console.error('   그 파일에서 키를 빼고 (키는 C:\\Users\\<나>\\.pkems\\키.env 에만) 다시 돌리세요.');
  console.error(줄);
  process.exitCode = 1;
  throw new Error('키 유출 위험으로 배포를 멈췄습니다');
}

/* 5. 표 */
console.log(줄); console.log('배포 사본: ' + 배포); console.log(줄);
console.log('넣음:'); for (const s of 넣은) console.log('  + ' + s);
console.log('뺌:');   for (const s of 뺀) console.log('  - ' + s);
console.log(줄);
console.log('게시본 공개 ' + 공개.length + '개 · 비공개 ' + 비공개.length + '개 (비공개는 파일 자체가 올라가지 않습니다)');
console.log('키 검사: 배포 사본에서 API 키처럼 보이는 것을 찾지 못했습니다.');

/* 6. 푸시 */
if (푸시) {
  const git = (...a) => { const r = spawnSync('git', a, { cwd: 배포, stdio: 'inherit' }); if (r.status !== 0) throw new Error('git ' + a.join(' ') + ' 실패'); };
  try { await stat(join(배포, '.git')); } catch { git('init', '-b', 'main'); }
  git('add', '-A');
  const r = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: 배포 });
  if (r.status === 0) console.log('바뀐 것이 없어 커밋하지 않았습니다.');
  else { git('commit', '-m', '게시본 갱신 ' + new Date().toISOString().slice(0, 16).replace('T', ' ')); git('push', '-u', 'origin', 'main'); }
  console.log(줄);
}
