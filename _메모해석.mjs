/* 2층 — 메모 아랫단을 AI 가 읽어 윗단 줄로 제안한다 (Node 쪽).
   씀:  set ANTHROPIC_API_KEY=...   (PowerShell: $env:ANTHROPIC_API_KEY="...")
        node _메모해석.mjs <게시본 폴더 이름>          → 제안만 보여 준다
        node _메모해석.mjs <게시본 폴더 이름> --적용   → _메모.txt 윗단에 써 넣는다
   AI 없이도 1층(_전체만들기.mjs)은 그대로 돌아간다. 이건 얹는 기능이다.               */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { 게시본만들기 } from './공용/제작.js';
import { 게시본폴더읽기, 디자인찾기 } from './공용/폴더읽기.mjs';
import { 해석하기, 제안적용 } from './공용/해석.js';

const 이름 = process.argv[2];
const 적용 = process.argv.includes('--적용');
if (!이름) { console.error('씀: node _메모해석.mjs <게시본 폴더 이름> [--적용]'); process.exit(1); }
const 열쇠 = process.env.ANTHROPIC_API_KEY;
if (!열쇠) { console.error('ANTHROPIC_API_KEY 환경변수가 없습니다. 키 없이는 1층(_전체만들기.mjs)만 쓰세요.'); process.exit(1); }

const 대상 = join('게시본', 이름);
const 모음 = await 게시본폴더읽기(대상);
const 디자인들 = await 디자인찾기('디자인');
const 결과 = 게시본만들기({ 파일들:모음.파일, 폴더명:이름, 사진목록:모음.사진, 있는디자인:Object.keys(디자인들) });
if (!결과.메모.노트) { console.log('메모 아랫단(--- 밑)에 적힌 말이 없습니다. 해석할 것이 없습니다.'); process.exit(0); }

console.log('아랫단:\n  ' + 결과.메모.노트.replace(/\n/g, '\n  '));
console.log('\nAI 에게 묻는 중…');
const 제안 = await 해석하기({ 노트:결과.메모.노트, 자료들:결과.자료들, 메모:결과.메모, 열쇠 });

console.log('\n제안 ' + 제안.줄.length + '줄' + (제안.버림 ? ' (어휘 밖 ' + 제안.버림 + '줄은 버림)' : '') + ' · 토큰 ' + 제안.쓴토큰);
for (const r of 제안.줄) console.log('  ' + r.열쇠 + ': ' + r.값 + '   ← ' + r.이유);
if (제안.못한것.length) { console.log('\n못한 것:'); for (const s of 제안.못한것) console.log('  · ' + s); }

if (적용 && 제안.줄.length) {
  const 메모경로 = join(대상, '_메모.txt');
  let 원 = ''; try { 원 = await readFile(메모경로, 'utf8'); } catch {}
  await writeFile(메모경로, 제안적용(원, 제안.줄), 'utf8');
  console.log('\n_메모.txt 윗단에 적었습니다. 이제 node _전체만들기.mjs 로 다시 만드세요.');
} else if (제안.줄.length) console.log('\n적용하려면 --적용 을 붙이세요.');
