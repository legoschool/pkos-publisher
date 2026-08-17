/* 5단계 ① 탐색 — 폴더에 뭐가 있는지 스스로 알아본다 (AI 없이)
 *
 *   씀:  node _탐색.mjs <폴더>  [--이름 <붙일이름>] [--최대 5000]
 *   예:  node _탐색.mjs "..\00_웹뷰어\posts"
 *        node _탐색.mjs "..\02_구글 기록장" --이름 기록장
 *
 *   결과: _탐색결과\<이름>\탐색.json    (다음 단계가 읽는 것)
 *         _탐색결과\<이름>\보고서.html  (사람이 보는 것)
 *
 *   원본 폴더는 읽기만 한다. 아무것도 쓰지 않는다. (원칙 1)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { 폴더훑기 } from './공용/훑기.mjs';
import { 전체보기, 갈래뽑기, 추천 } from './공용/탐색.js';
import { 디자인찾기 } from './공용/폴더읽기.mjs';
import { 탐색보고서만들기 } from './공용/탐색보고서.js';

const 여기 = dirname(fileURLToPath(import.meta.url));
const 줄 = '─'.repeat(70);
const 인자 = process.argv.slice(2);
const 값읽기 = (열쇠, 기본) => { const i = 인자.indexOf(열쇠); return i >= 0 && 인자[i + 1] ? 인자[i + 1] : 기본; };
const 대상 = 인자.find(a => !a.startsWith('--') && 인자[인자.indexOf(a) - 1] !== '--이름' && 인자[인자.indexOf(a) - 1] !== '--최대');

if (!대상) {
  console.log(`씀:  node _탐색.mjs <폴더> [--이름 <붙일이름>] [--최대 5000]

예:  node _탐색.mjs "..\\00_웹뷰어\\posts"
     node _탐색.mjs "..\\02_구글 기록장" --이름 기록장

폴더를 훑어 무엇이 있는지 세고, 주제 갈래를 스스로 찾고, 어울리는 디자인·배치를 골라 줍니다.
원본은 읽기만 합니다.`);
  process.exit(0);
}

const 뿌리 = resolve(여기, 대상);
const 이름 = 값읽기('--이름', basename(뿌리).replace(/^[\d_]+/, '') || basename(뿌리));
const 최대 = parseInt(값읽기('--최대', '5000'), 10);
const 낼곳 = join(여기, '_탐색결과', 이름);

console.log(줄);
console.log('탐색: ' + 뿌리);
console.log(줄);

/* 1. 훑기 */
let 마지막알림 = 0;
const { 자료들, 못읽음, 색인썼나, 건너뛴수 } = await 폴더훑기(뿌리, {
  최대,
  알림: (무엇, 센것, 전체) => {
    const 이제 = Date.now();
    if (무엇 === '읽는 중' && 이제 - 마지막알림 < 700) return;
    마지막알림 = 이제;
    process.stdout.write(`\r  ${무엇} ${센것}/${전체}${' '.repeat(20)}`);
  },
});
process.stdout.write('\n');

if (!자료들.length) {
  console.error('읽을 자료를 찾지 못했습니다. 폴더 경로가 맞습니까?');
  if (못읽음.length) for (const m of 못읽음.slice(0, 10)) console.error('  ! ' + m.이름 + ' — ' + m.까닭);
  process.exitCode = 1;
  throw new Error('자료 없음');
}

/* 2. 세기 · 묶기 · 고르기 */
const 모양 = 전체보기(자료들);
const 갈래결과 = 갈래뽑기(자료들);
const 있는디자인 = Object.keys(await 디자인찾기(join(여기, '디자인')));
const 추천값 = 추천(모양, 있는디자인);

/* 3. 내놓기 */
await mkdir(낼곳, { recursive: true });
const 만든때 = new Date().toISOString().slice(0, 16).replace('T', ' ');
await writeFile(join(낼곳, '탐색.json'), JSON.stringify({
  이름, 뿌리, 만든때, 색인썼나, 건너뛴수, 모양, 갈래결과, 추천값, 못읽음, 있는디자인, 자료들,
}, null, 1), 'utf8');
await writeFile(join(낼곳, '보고서.html'),
  탐색보고서만들기({ 이름, 뿌리, 모양, 갈래결과, 추천값, 못읽음, 자료들, 색인썼나, 건너뛴수, 만든때 }), 'utf8');

/* 4. 표 */
console.log(줄);
console.log(`자료 ${모양.자료수}건 · 글 ${모양.글수} · 사진 ${모양.사진합} · ${모양.처음날짜 || '?'} ~ ${모양.끝날짜 || '?'} (${모양.해수}해)`);
console.log(`글 길이 가운데값 ${모양.글자수가운데.toLocaleString()}자 · 짧은 글 ${모양.짧은글수} · 긴 글 ${모양.긴글수}`);
console.log(줄);
console.log('스스로 찾은 주제 갈래 ' + 갈래결과.갈래.length + '개:');
for (const g of 갈래결과.갈래)
  console.log(`  · ${g.이름.padEnd(14, ' ')} ${String(g.건수).padStart(4)}건   ${(g.곁낱말 || []).slice(0, 4).map(k => k.낱말).join(', ')}`);
if (갈래결과.미분류.length) console.log(`  · (어디에도 안 들어감) ${갈래결과.미분류.length}건 — AI 분류를 돌리면 줄어듭니다`);
console.log(줄);
console.log(`추천 — 디자인 ${추천값.디자인} · 배치 ${추천값.배치} · 접기 ${추천값.접기} · 순서 ${추천값.순서} · 사진크기 ${추천값.사진크기}`);
console.log(`  왜 ${추천값.배치}? ${추천값.배치까닭.join(' / ')}`);
console.log(`  왜 ${추천값.디자인}? ${추천값.디자인까닭}`);
if (못읽음.length) console.log(`\n못 읽은 것 ${못읽음.length}건 (보고서에 목록 있음)`);
if (건너뛴수) console.log(`건너뛴 것 ${건너뛴수}건 — 다 보려면 --최대 ${모양.자료수 + 건너뛴수}`);
console.log(줄);
console.log('보고서: ' + join(낼곳, '보고서.html'));
console.log('다음:   node _분류.mjs ' + 이름 + '        (AI 가 제대로 묶고 이름 짓기)');
console.log('        node _재구성.mjs ' + 이름 + '      (게시본 폴더로 만들기)');
