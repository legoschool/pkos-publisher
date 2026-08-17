/* 5단계 ③ 재구성 — 갈래마다 게시본 폴더를 만들어 준다
 *
 *   씀:  node _재구성.mjs <이름> [--갈래 "협동학습,스톱모션"] [--최대건수 60]
 *                          [--진짜] [--사진없이] [--만들기]
 *
 *   기본은 **해 보기만** 한다 (무엇이 만들어질지 표로 보여 주고 끝).
 *   실제로 폴더를 만들려면 --진짜 를 붙인다.
 *
 *   하는 일
 *     · 갈래 하나 → 게시본/<갈래이름>/ 폴더 하나
 *     · 자료를 날짜 순으로 001_, 002_ … 번호를 붙여 복사
 *     · 깨진 사진 경로를 고쳐서 사진을 글별 폴더(사진/<글이름>/)로 담는다
 *     · _메모.txt 를 자동으로 쓴다 (디자인·배치·접기는 자료 모양에서 고른 것)
 *     · 공개: 끄기 로 시작한다 (원칙 5)
 *
 *   원본 폴더는 읽기만 한다 (원칙 1). 쓰는 곳은 게시본/ 안뿐.
 */
import { readFile, writeFile, mkdir, copyFile, stat, readdir } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { 전체보기, 추천 } from './공용/탐색.js';
import { 디자인찾기 } from './공용/폴더읽기.mjs';

const 여기 = dirname(fileURLToPath(import.meta.url));
const 줄 = '─'.repeat(70);
const 있는파일 = new Map();          // 사진이 진짜 있는지 물어본 결과를 기억해 둔다 (드라이브가 느리다)
const 인자 = process.argv.slice(2);
const 값 = (열, 기본) => { const i = 인자.indexOf(열); return i >= 0 && 인자[i + 1] ? 인자[i + 1] : 기본; };
const 이름 = 인자.find(a => !a.startsWith('--') && !['--갈래', '--최대건수'].includes(인자[인자.indexOf(a) - 1]));
const 고른갈래 = 값('--갈래', '').split(',').map(s => s.trim()).filter(Boolean);
const 최대건수 = parseInt(값('--최대건수', '0'), 10);
const 진짜 = 인자.includes('--진짜');
const 사진없이 = 인자.includes('--사진없이');

if (!이름) {
  console.log(`씀:  node _재구성.mjs <이름> [--갈래 "협동학습,스톱모션"] [--최대건수 60] [--진짜] [--사진없이]

먼저 node _탐색.mjs → node _분류.mjs 를 돌려 두어야 합니다.
--진짜 를 안 붙이면 무엇이 만들어질지 보여 주기만 합니다.`);
  process.exit(0);
}

const 낼곳 = join(여기, '_탐색결과', 이름);
let 탐색, 분류;
try { 탐색 = JSON.parse(await readFile(join(낼곳, '탐색.json'), 'utf8')); }
catch { console.error(`「${이름}」 탐색 결과가 없습니다. 먼저 node _탐색.mjs 를 돌리세요.`); process.exit(1); }
try { 분류 = JSON.parse(await readFile(join(낼곳, '분류.json'), 'utf8')); }
catch { 분류 = null; }

const 자료찾기 = new Map(탐색.자료들.map(a => [a.번호, a]));
const 있는디자인 = Object.keys(await 디자인찾기(join(여기, '디자인')));

/* 어떤 갈래로 나눌 것인가 — AI 분류가 있으면 그것, 없으면 1층 갈래 */
const 갈래들 = (분류?.갈래 || 탐색.갈래결과.갈래.map(g => ({ ...g, 설명: g.까닭 })))
  .filter(g => !고른갈래.length || 고른갈래.includes(g.이름));

if (!갈래들.length) {
  console.error('만들 갈래가 없습니다. --갈래 이름을 확인하세요. 있는 갈래: ' +
    (분류?.갈래 || 탐색.갈래결과.갈래).map(g => g.이름).join(', '));
  process.exit(1);
}

console.log(줄);
console.log(`재구성: ${이름} · 갈래 ${갈래들.length}개 · ${분류 ? 'AI 분류' : '낱말 분류'} 기준`);
console.log(진짜 ? '실제로 만듭니다.' : '해 보기만 합니다 (실제로 만들려면 --진짜).');
console.log(줄);

/* 사진 뿌리 찾기 — 게시물이 가리키는 경로는 폴더 이름이 바뀌어 깨져 있다.
   지금 진짜로 사진이 있는 곳을 찾아 둔다. */
const 사진뿌리 = await 사진뿌리찾기();
if (!사진없이 && !사진뿌리) console.log('※ 사진 폴더를 못 찾았습니다. 사진 없이 글만 담습니다.\n');
else if (사진뿌리) console.log('사진 뿌리: ' + 사진뿌리 + '\n');

const 표 = [];
for (const g of 갈래들) {
  let 것들 = g.자료번호.map(n => 자료찾기.get(n)).filter(Boolean);
  것들.sort((a, b) => (a.날짜 || '9999').localeCompare(b.날짜 || '9999'));
  const 원래수 = 것들.length;
  if (최대건수 && 것들.length > 최대건수) 것들 = 것들.slice(-최대건수);   // 최근 것부터

  const 모양 = 전체보기(것들);
  const 추천값 = 추천(모양, 있는디자인);
  const 폴더명 = 폴더이름으로(g.이름);
  const 곳 = join(여기, '게시본', 폴더명);

  const 한줄 = {
    갈래: g.이름, 폴더: 폴더명, 건수: 것들.length, 원래수,
    디자인: 추천값.디자인, 배치: 추천값.배치, 접기: 추천값.접기,
    사진: 0, 못찾은사진: 0, 이미있음: false,
  };

  try { await stat(곳); 한줄.이미있음 = true; } catch { }

  if (진짜) {
    if (한줄.이미있음) { 한줄.건너뜀 = '이미 있는 폴더라 건너뜀 (지우고 다시 돌리세요)'; 표.push(한줄); continue; }
    await mkdir(곳, { recursive: true });
    let 번 = 0;
    for (const 자 of 것들) {
      번++;
      const 원본곳 = join(탐색.뿌리, 자.파일);
      let 글; try { 글 = await readFile(원본곳, 'utf8'); }
      catch (e) { 한줄.못읽음 = (한줄.못읽음 || 0) + 1; continue; }

      const 글이름 = basename(자.파일).replace(/\.[^.]+$/, '');
      const { 새글, 붙인사진, 못찾음 } = 사진없이 || !사진뿌리
        ? { 새글: 사진태그지우기(글), 붙인사진: [], 못찾음: 0 }
        : await 사진고치기(글, 글이름, 사진뿌리);
      한줄.사진 += 붙인사진.length;
      한줄.못찾은사진 += 못찾음;

      // 사진 실제로 담기
      for (const s of 붙인사진) {
        const 담을곳 = join(곳, '사진', 글이름, s.이름);
        await mkdir(dirname(담을곳), { recursive: true });
        try { await copyFile(s.원본, 담을곳); } catch { 한줄.못찾은사진++; }
      }

      const 파일명 = String(번).padStart(3, '0') + '_' + 파일이름으로(자.제목) + '.html';
      await writeFile(join(곳, 파일명), 새글, 'utf8');
      if (번 % 20 === 0) process.stdout.write(`\r  ${g.이름}: ${번}/${것들.length}${' '.repeat(20)}`);
    }
    process.stdout.write(`\r${' '.repeat(60)}\r`);

    await writeFile(join(곳, '_메모.txt'), 메모쓰기(g, 것들, 추천값, 모양, 이름), 'utf8');
  }
  표.push(한줄);
}

/* ── 표 ── */
console.log('갈래'.padEnd(16) + '건수'.padStart(6) + '  ' + '디자인'.padEnd(12) + '배치'.padEnd(10) + '접기'.padEnd(6) + '사진');
console.log('─'.repeat(70));
for (const r of 표) {
  console.log(
    r.갈래.padEnd(16) + String(r.건수).padStart(6) + (r.원래수 !== r.건수 ? `(/${r.원래수})` : '    ') +
    '  ' + r.디자인.padEnd(12) + r.배치.padEnd(10) + r.접기.padEnd(6) + (진짜 ? r.사진 : '—'));
  if (r.건너뜀) console.log('    ! ' + r.건너뜀);
  if (r.못읽음) console.log(`    ! 못 읽은 글 ${r.못읽음}건`);
  if (r.못찾은사진) console.log(`    ! 못 찾은 사진 ${r.못찾은사진}장`);
  if (!진짜 && r.이미있음) console.log('    ※ 같은 이름 폴더가 이미 있습니다');
}
console.log('─'.repeat(70));
console.log(`자료 ${표.reduce((s, r) => s + r.건수, 0)}건 · 게시본 ${표.length}개` + (진짜 ? ` · 사진 ${표.reduce((s, r) => s + r.사진, 0)}장` : ''));
if (!진짜) {
  console.log('\n실제로 만들려면:  node _재구성.mjs ' + 이름 + ' --진짜');
  console.log('사진 없이 빨리:   node _재구성.mjs ' + 이름 + ' --진짜 --사진없이');
  console.log('몇 개만 시험:     node _재구성.mjs ' + 이름 + ' --갈래 "' + 갈래들[0].이름 + '" --최대건수 20 --진짜');
} else {
  console.log('\n모두 「공개: 끄기」 로 시작합니다. 내용을 보고 공개할 것만 켜세요.');
  console.log('다음:  node _전체만들기.mjs        (게시본 + 통합사이트 만들기)');
}

/* ── 도우미 ───────────────────────────────────────────────────── */

/** 게시물이 가리키는 사진 폴더가 지금 어디 있는지 찾는다 (폴더 이름이 바뀌었을 수 있다) */
async function 사진뿌리찾기() {
  const 뿌리 = resolve(여기, '..');
  let 목록; try { 목록 = await readdir(뿌리, { withFileTypes: true }); } catch { return null; }
  for (const e of 목록) {
    if (!e.isDirectory()) continue;
    const 후보 = join(뿌리, e.name, 'md', 'images');
    try { const s = await stat(후보); if (s.isDirectory()) return 후보; } catch { }
  }
  return null;
}

/** 깨진 사진 경로를 지금 자리로 고치고, 담아야 할 사진 목록을 돌려준다.
 *  옛 경로: ../../01_네이버 블로그 내려받기/md/images/<글이름>/images/<글이름>/img_001.jpeg
 *  진짜 자리: <사진뿌리>/<글이름>/img_001.jpeg
 *  새 경로: 사진/<글이름>/img_001.jpeg   (게시본 안에서 글별 폴더로 — 인수인계서 §8) */
async function 사진고치기(글, 글이름, 뿌리) {
  const 붙인사진 = [];
  const 본것 = new Set();
  let 못찾음 = 0;
  const 새글 = 글.replace(/(<img[^>]+src=)(["'])([^"']+)\2/gi, (전체, 앞, 따옴, 주소) => {
    if (/^(https?:|data:)/i.test(주소)) return 전체;                 // 바깥 주소는 그대로
    const 파일 = decodeURIComponent(주소.split('/').pop());
    // 주소 안에 들어 있는 글 이름(마지막 폴더)을 쓰되, 없으면 이 글의 이름으로
    const 조각 = 주소.split('/').filter(Boolean);
    const 안쪽이름 = 조각.length >= 2 ? decodeURIComponent(조각[조각.length - 2]) : 글이름;
    const 후보들 = [join(뿌리, 안쪽이름, 파일), join(뿌리, 글이름, 파일)];
    const 찾은 = 후보들.find(p => 있나(p));
    if (!찾은) { 못찾음++; return 전체; }
    if (!본것.has(파일)) { 본것.add(파일); 붙인사진.push({ 이름: 파일, 원본: 찾은 }); }
    return 앞 + 따옴 + '사진/' + 글이름 + '/' + 파일 + 따옴;
  });
  return { 새글, 붙인사진, 못찾음 };
}

function 있나(p) {
  if (있는파일.has(p)) return 있는파일.get(p);
  let 답 = false;
  try { 답 = statSync(p).isFile(); } catch { 답 = false; }
  있는파일.set(p, 답);
  return 답;
}

function 사진태그지우기(글) {
  return 글.replace(/<img[^>]*>/gi, '');
}

function 폴더이름으로(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').slice(0, 40) || '갈래';
}
function 파일이름으로(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60) || '글';
}

/** _메모.txt 를 사람이 읽고 고칠 수 있는 모양으로 쓴다 (원칙 4: 사람이 쓰는 건 이 파일 하나) */
function 메모쓰기(갈래, 것들, 추천값, 모양, 탐색이름) {
  const 처음 = 것들[0]?.날짜 || '', 끝 = 것들[것들.length - 1]?.날짜 || '';
  const 기간 = 처음 && 끝 ? `${처음.slice(0, 7)} ~ ${끝.slice(0, 7)}` : '';
  // 설명은 `#` 주석으로 넣는다 — 아랫단(---)에 넣으면 만들어진 페이지에 「제작 노트」 로 새어 나간다.
  // 아랫단은 사람이 도구에게 할 말을 적는 자리로 비워 둔다.
  return `제목: ${갈래.이름}
부제: ${(갈래.설명 || '').replace(/\n/g, ' ')}${기간 ? ` · ${기간}` : ''}

디자인: ${추천값.디자인}
배치: ${추천값.배치}
접기: ${추천값.접기}
순서: ${추천값.순서}
사진크기: ${추천값.사진크기}
공개: 끄기

# ─────────────────────────────────────────────────────────────
# 이 폴더는 도구가 자동으로 만들었습니다. (탐색 「${탐색이름}」 → 분류 → 재구성)
# '#' 로 시작하는 줄은 도구가 읽지 않고, 만들어진 페이지에도 나오지 않습니다.
#
# 왜 이 옷을 골랐나
# - 디자인 ${추천값.디자인}: ${추천값.디자인까닭}
# - 배치 ${추천값.배치}: ${추천값.배치까닭.join(' / ')}
# - 접기 ${추천값.접기}: ${추천값.접기까닭}
# - 순서 ${추천값.순서}: ${추천값.순서까닭}
#
# 이 갈래에 무엇이 들어 있나
# - 자료 ${모양.자료수}건 · 사진 ${모양.사진합}장 · ${기간 || '날짜 모름'}
# - 짧은 글 ${모양.짧은글수}건 · 긴 글 ${모양.긴글수}건 · 글 길이 가운데값 ${모양.글자수가운데}자
${갈래.알아보는법 ? `# - 묶은 기준: ${갈래.알아보는법}\n` : ''}#
# 고치고 싶으면 윗단의 줄을 고치고 다시 만들면 됩니다.
# 공개하려면 「공개: 켜기」 로 바꾸세요. 지금은 아무에게도 보이지 않습니다.
# ─────────────────────────────────────────────────────────────

---
`;
}
