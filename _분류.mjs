/* 5단계 ② 분류 — AI 가 자료를 읽고 주제를 제대로 묶고 이름을 짓는다 (2층)
 *
 *   씀:  node _분류.mjs <이름> [--묶음 40] [--동시 3] [--맛보기]
 *   예:  node _분류.mjs 블로그기록
 *        node _분류.mjs 블로그기록 --맛보기        ← 앞 60건만. 얼마나 걸리고 어떻게 묶이는지 먼저 본다
 *
 *   먼저 `node _탐색.mjs <폴더>` 를 돌려 두어야 한다.
 *   결과: _탐색결과\<이름>\분류.json  +  보고서.html 다시 씀
 *
 *   AI 에 무엇을 보내나: 자료의 **제목·날짜·앞부분 발췌(200자)** 뿐. 본문 전체는 보내지 않는다.
 *   AI 가 하는 일: 주제 갈래를 짓고, 자료를 그 갈래에 넣고, 왜 그랬는지 말한다.
 *   AI 가 안 하는 일: 본문을 고치지 않는다 (원칙 2). 파일을 건드리지 않는다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { 물어보기, 여럿물어보기 } from './공용/솔라.mjs';
import { 열쇠 } from './공용/열쇠.mjs';
import { 추천, 전체보기 } from './공용/탐색.js';
import { 탐색보고서만들기 } from './공용/탐색보고서.js';

const 여기 = dirname(fileURLToPath(import.meta.url));
const 줄 = '─'.repeat(70);
const 인자 = process.argv.slice(2);
const 값 = (열, 기본) => { const i = 인자.indexOf(열); return i >= 0 && 인자[i + 1] ? 인자[i + 1] : 기본; };
const 이름 = 인자.find(a => !a.startsWith('--') && !['--묶음', '--동시'].includes(인자[인자.indexOf(a) - 1]));
const 묶음크기 = parseInt(값('--묶음', '40'), 10);
const 동시 = parseInt(값('--동시', '2'), 10);
const 맛보기 = 인자.includes('--맛보기');

if (!이름) {
  console.log(`씀:  node _분류.mjs <이름> [--묶음 40] [--동시 2] [--맛보기]

먼저 node _탐색.mjs <폴더> 를 돌려 두어야 합니다.
AI 가 자료의 제목·날짜·발췌 200자를 읽고 주제 갈래를 짓습니다. 본문 전체는 보내지 않습니다.`);
  process.exit(0);
}

const 낼곳 = join(여기, '_탐색결과', 이름);
let 탐색;
try { 탐색 = JSON.parse(await readFile(join(낼곳, '탐색.json'), 'utf8')); }
catch { console.error(`「${이름}」 탐색 결과가 없습니다. 먼저 node _탐색.mjs <폴더> --이름 ${이름} 를 돌리세요.`); process.exit(1); }

const K = 열쇠(false);
if (!K.있나) {
  console.error('API 키가 없어 AI 분류를 못 합니다. 1층 결과(_탐색결과 보고서)는 그대로 쓸 수 있습니다.');
  console.error('키 두는 곳: C:\\Users\\<나>\\.pkems\\키.env');
  process.exit(1);
}

let 자료들 = 탐색.자료들;
// 맛보기는 앞 60건이 아니라 전체에서 고르게 뽑는다 — 앞부분만 보면 갈래가 초기 시절로 쏠린다
if (맛보기) 자료들 = 고르게뽑기(자료들, 60);

console.log(줄);
console.log(`AI 분류: ${이름} · 자료 ${자료들.length}건 · ${K.이름} · 모델 ${K.모델} (키 ${K.보임})`);
console.log(`보내는 것: 제목 · 날짜 · 발췌 200자   (본문 전체·파일은 보내지 않습니다)`);
console.log(줄);

/* ── 1판: 주제 갈래를 무엇으로 할지 정하기 ───────────────────────── */
const 씨앗 = 탐색.갈래결과.갈래.map(g => `${g.이름}(${g.건수}건, 같이 나오는 말: ${(g.곁낱말 || []).slice(0, 5).map(k => k.낱말).join('·')})`).join('\n');
const 표본 = 고르게뽑기(자료들, 90).map(a => `- ${a.날짜 || '날짜모름'} | ${a.제목}`).join('\n');

const 갈래스키마 = {
  type: 'object', additionalProperties: false, required: ['갈래'],
  properties: {
    갈래: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['이름', '설명', '알아보는법'],
        properties: {
          이름: { type: 'string', description: '사람이 읽는 주제 이름. 2~12글자. 명사구.' },
          설명: { type: 'string', description: '이 갈래에 무엇이 들어가는지 한 문장' },
          알아보는법: { type: 'string', description: '어떤 자료가 여기 속하는지 판단 기준 한 문장' },
        },
      },
    },
  },
};

console.log('1판 — 어떤 주제로 나눌지 정하는 중…');
const 갈래판 = await 물어보기({
  체계: `너는 한 사람이 십여 년 모아 온 기록을 주제별로 정리해 주는 사서다.
분류 체계를 만들 때 지킬 것:
- 이름은 그 사람의 말로 짓는다. 자료에 실제로 나오는 말을 쓴다.
- 6~10개로 나눈다. 너무 잘게 쪼개지 않는다.
- 서로 겹치지 않게 한다.
- "기타"는 만들지 않는다. 대신 넓은 갈래를 둔다.
- 없는 내용을 지어내지 않는다.
반드시 JSON 하나만 답한다.`,
  물음: `아래는 어떤 교사가 2014년부터 2026년까지 쓴 기록 ${탐색.모양.자료수}건이다.

[낱말 빈도로 거칠게 묶어 본 결과 — 참고만 할 것. 이름이 어색한 것이 섞여 있다]
${씨앗}

[실제 제목 표본 ${표본.split('\n').length}개 — 고르게 뽑음]
${표본}

이 사람의 기록을 어떤 주제로 나누면 좋을지 갈래를 정하라.`,
  스키마: 갈래스키마, 최대토큰: 2000,
});

const 갈래정의 = 갈래판.값.갈래;
console.log(`   갈래 ${갈래정의.length}개: ${갈래정의.map(g => g.이름).join(' · ')}`);
console.log(`   (토큰 들어감 ${갈래판.쓴토큰.들어감} 나옴 ${갈래판.쓴토큰.나옴} · ${갈래판.걸린초}초)`);

/* ── 2판: 자료를 하나씩 갈래에 넣기 ──────────────────────────────── */
const 갈래이름들 = 갈래정의.map(g => g.이름);
const 배정스키마 = {
  type: 'object', additionalProperties: false, required: ['배정'],
  properties: {
    배정: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['번호', '갈래', '확신', '까닭'],
        properties: {
          번호: { type: 'integer' },
          갈래: { type: 'string', enum: [...갈래이름들, '모르겠음'] },
          확신: { type: 'string', enum: ['높음', '보통', '낮음'] },
          까닭: { type: 'string', description: '왜 이 갈래인지 15자 안팎' },
        },
      },
    },
  },
};
const 갈래설명 = 갈래정의.map(g => `- ${g.이름}: ${g.설명} (${g.알아보는법})`).join('\n');

const 묶음들 = [];
for (let i = 0; i < 자료들.length; i += 묶음크기) 묶음들.push(자료들.slice(i, i + 묶음크기));
console.log(`\n2판 — 자료 ${자료들.length}건을 ${묶음들.length}묶음으로 나눠 넣는 중 (동시 ${동시})…`);

const { 결과, 못한것 } = await 여럿물어보기(묶음들, (묶) => ({
  체계: `너는 자료를 정해진 갈래에 넣는 사서다. 주어진 갈래 이름만 쓴다.
정말 어느 쪽도 아니면 "모르겠음"을 쓴다 — 억지로 넣지 마라.
받은 번호를 하나도 빠뜨리지 않는다. 반드시 JSON 하나만 답한다.`,
  물음: `[갈래]
${갈래설명}

[자료 ${묶.length}건]
${묶.map(a => `${a.번호}. [${a.날짜 || '날짜모름'}] ${a.제목}\n   ${(a.발췌 || '').slice(0, 200).replace(/\n/g, ' ')}`).join('\n')}

각 자료를 갈래에 넣어라. 받은 번호 ${묶.length}개 전부에 답하라.`,
  스키마: 배정스키마,
  최대토큰: Math.min(8000, 묶.length * 90 + 500),
}), {
  동시,
  알림: (센것, 전체, 실패수, 무엇) =>
    process.stdout.write(`\r   ${센것}/${전체} 묶음${실패수 ? ' · 실패 ' + 실패수 : ''}${무엇 ? ' · ' + 무엇 : ''}${' '.repeat(20)}`),
});
process.stdout.write('\n');

/* ── 결과 모으기 ─────────────────────────────────────────────────── */
const 배정 = new Map();
let 토큰들어감 = 갈래판.쓴토큰.들어감, 토큰나옴 = 갈래판.쓴토큰.나옴;
for (const r of 결과) {
  if (!r) continue;
  토큰들어감 += r.쓴토큰.들어감; 토큰나옴 += r.쓴토큰.나옴;
  for (const b of (r.값?.배정 || [])) if (Number.isInteger(b.번호)) 배정.set(b.번호, b);
}

const 빠진것 = 자료들.filter(a => !배정.has(a.번호));
const 갈래별 = new Map(갈래이름들.map(n => [n, []]));
갈래별.set('모르겠음', []);
for (const a of 자료들) {
  const b = 배정.get(a.번호);
  const 갈 = b && 갈래별.has(b.갈래) ? b.갈래 : '모르겠음';
  갈래별.get(갈).push({ 번호: a.번호, 확신: b?.확신 || '', 까닭: b?.까닭 || '' });
}

const AI갈래 = 갈래정의.map(g => {
  const 것들 = 갈래별.get(g.이름) || [];
  return {
    이름: g.이름, 설명: g.설명, 알아보는법: g.알아보는법,
    자료번호: 것들.map(x => x.번호),
    건수: 것들.length,
    까닭: g.설명 + ` — AI 가 ${것들.length}건을 여기 넣음` +
      (것들.filter(x => x.확신 === '낮음').length ? ` (확신 낮음 ${것들.filter(x => x.확신 === '낮음').length}건)` : ''),
    확신낮음: 것들.filter(x => x.확신 === '낮음').map(x => x.번호),
    곁낱말: [],
  };
}).filter(g => g.건수 > 0).sort((a, b) => b.건수 - a.건수);

const 모르겠음 = (갈래별.get('모르겠음') || []).map(x => x.번호);

/* 갈래가 잡혔으니 갈래마다 따로 추천한다 — 사진 갈래는 갤러리, 긴 글 갈래는 잡지 하는 식으로 */
const 자료찾기 = new Map(자료들.map(a => [a.번호, a]));
const 갈래별추천 = AI갈래.map(g => {
  const 것들 = g.자료번호.map(n => 자료찾기.get(n)).filter(Boolean);
  const 모양 = 전체보기(것들);
  return { 갈래: g.이름, 건수: g.건수, 추천: 추천(모양, 탐색.있는디자인 || []), 모양 };
});

/* ── 저장 ────────────────────────────────────────────────────────── */
const 분류 = {
  이름, 만든때: new Date().toISOString().slice(0, 16).replace('T', ' '),
  모델: K.모델, 맛보기, 자료수: 자료들.length,
  갈래: AI갈래, 미분류: 모르겠음,
  갈래별추천,
  토큰: { 들어감: 토큰들어감, 나옴: 토큰나옴 },
  못한묶음: 못한것, 빠진자료: 빠진것.map(a => a.번호),
};
await writeFile(join(낼곳, '분류.json'), JSON.stringify(분류, null, 1), 'utf8');
await writeFile(join(낼곳, '보고서.html'), 탐색보고서만들기({
  이름: 탐색.이름, 뿌리: 탐색.뿌리, 모양: 탐색.모양, 갈래결과: 탐색.갈래결과,
  추천값: 탐색.추천값, 못읽음: 탐색.못읽음, 자료들: 탐색.자료들,
  색인썼나: 탐색.색인썼나, 건너뛴수: 탐색.건너뛴수, 만든때: 분류.만든때,
  AI: { 갈래: AI갈래, 미분류: 모르겠음 },
}), 'utf8');

/* ── 표 ──────────────────────────────────────────────────────────── */
console.log(줄);
for (const g of AI갈래) {
  const 추 = 갈래별추천.find(x => x.갈래 === g.이름)?.추천;
  console.log(`  · ${g.이름.padEnd(16, ' ')} ${String(g.건수).padStart(4)}건   → ${추?.배치 || ''} / ${추?.디자인 || ''}`);
  console.log(`      ${g.설명}`);
}
if (모르겠음.length) console.log(`  · (모르겠음) ${모르겠음.length}건 — AI 도 판단 못 한 것들`);
if (빠진것.length) console.log(`  ! 답에서 빠진 자료 ${빠진것.length}건 (모르겠음으로 넣음)`);
if (못한것.length) { console.log(`  ! 실패한 묶음 ${못한것.length}개:`); for (const m of 못한것.slice(0, 5)) console.log(`      묶음 ${m.번호}: ${m.까닭.slice(0, 120)}`); }
console.log(줄);
console.log(`토큰 — 들어감 ${토큰들어감.toLocaleString()} · 나옴 ${토큰나옴.toLocaleString()}`);
console.log('보고서: ' + join(낼곳, '보고서.html'));
console.log('다음:   node _재구성.mjs ' + 이름 + '   (갈래마다 게시본 폴더로 만들기)');

/* ── 도우미 ──────────────────────────────────────────────────────── */
function 고르게뽑기(것들, 몇개) {
  if (것들.length <= 몇개) return 것들;
  const 걸음 = 것들.length / 몇개;
  return Array.from({ length: 몇개 }, (_, i) => 것들[Math.floor(i * 걸음)]);
}
