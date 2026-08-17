/* 게시본 전부 + 통합 사이트를 한 번에 만든다.
   씀:  node _전체만들기.mjs                                        */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { 게시본만들기 } from './공용/제작.js';
import { 허브만들기, 요약뽑기 } from './공용/허브.js';
import { 게시본폴더읽기, 디자인찾기 } from './공용/폴더읽기.mjs';

const 디자인들 = await 디자인찾기('디자인');
const 있는디자인 = Object.keys(디자인들);
const 만든때 = new Date().toLocaleString('ko-KR');
const 줄 = '─'.repeat(72);

let 폴더들 = [];
try {
  폴더들 = (await readdir('게시본', { withFileTypes:true }))
    .filter(e => e.isDirectory() && !/^[_.]/.test(e.name)).map(e => e.name);
} catch { console.error('게시본/ 폴더가 없습니다.'); process.exit(1); }

console.log(줄);
console.log('디자인 ' + 있는디자인.length + '가지 (' + 있는디자인.join(', ') + ') · 게시본 ' + 폴더들.length + '개');
console.log(줄);

const 요약들 = [];
for (const 이름 of 폴더들) {
  const 대상 = join('게시본', 이름);
  const 모음 = await 게시본폴더읽기(대상);

  // 어떤 디자인이 골라지는지 먼저 보고, 그 설정으로 다시 만든다
  const 먼저 = 게시본만들기({ 파일들:모음.파일, 폴더명:이름, 사진목록:모음.사진, 있는디자인 });
  const 결과 = 게시본만들기({
    파일들: 모음.파일, 폴더명: 이름, 사진목록: 모음.사진,
    있는디자인, 디자인설정: 디자인들[먼저.메모.디자인] || {}, 만든때
  });

  await writeFile(join(대상, 'index.html'), 결과.html, 'utf8');

  const 요약 = 요약뽑기({ 폴더명:이름, 메모:결과.메모, 자료들:결과.자료들 });
  요약들.push(요약);

  const 사진들 = 결과.자료들.flatMap(a => a.블록.filter(b => b.종류 === '사진'));
  const 못찾음 = 사진들.length - 요약.붙은사진;
  const 손질수 = Object.keys(결과.메모.손질).length + (결과.메모.글크기 ? 1 : 0);
  console.log(
    (요약.공개 ? '🌐' : '🔒') + ' ' + 이름.padEnd(16) +
    '│ ' + (요약.디자인 + (결과.메모.결 ? '·' + 결과.메모.결 : '') + (결과.메모.배치 !== '나열' ? '·' + 결과.메모.배치 : '') + (손질수 ? ' +손질' + 손질수 : '')).padEnd(22) +
    '│ 자료 ' + String(결과.자료들.length).padStart(2) +
    ' · 사진 ' + String(요약.붙은사진).padStart(2) + '/' + 사진들.length +
    (못찾음 ? '  ⚠ ' + 못찾음 + '장 못찾음' : '') +
    (결과.메모.없는디자인 ? '  ⚠ 「' + 결과.메모.없는디자인 + '」 없음' : '') +
    (!결과.자료들.length ? '  ⚠ 빈 폴더' : ''));
  for (const s of 결과.건너뜀) console.log('     · 건너뜀: ' + s.파일명 + ' — ' + s.이유);
  for (const s of 모음.못읽음)  console.log('     · 못 읽음: ' + s);
  if (결과.메모.모르는항목.length) console.log('     · 메모의 모르는 항목: ' + 결과.메모.모르는항목.join(', '));
}

/* 통합 사이트 */
await mkdir('통합사이트', { recursive:true });
let 사이트메모 = '';
try { 사이트메모 = await readFile(join('통합사이트','_메모.txt'), 'utf8'); } catch {}
const 사이트 = 게시본만들기({ 파일들:[{이름:'_메모.txt', 글:사이트메모}], 폴더명:'통합사이트', 사진목록:[], 있는디자인 });

const 허브 = 허브만들기({
  사이트메모: 사이트.메모, 요약들,
  디자인설정: 디자인들[사이트.메모.디자인] || {},
  만든때
});
await writeFile(join('통합사이트','index.html'), 허브, 'utf8');

const 보임 = 요약들.filter(s => s.공개).length;
console.log(줄);
console.log('통합사이트/index.html — 공개 ' + 보임 + '개 실림, 비공개 ' +
            (요약들.length - 보임) + '개 뺌  (디자인: ' + 사이트.메모.디자인 + ')');
console.log(줄);
