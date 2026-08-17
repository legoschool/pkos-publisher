/* 씀: 시험장(임시 폴더)에서  node _시험/진단.mjs <게시본이름>  — 자료·블록을 하나하나 찍어 본다 */
import { 게시본만들기 } from '../공용/제작.js';
import { 게시본폴더읽기, 디자인찾기 } from '../공용/폴더읽기.mjs';
const 이름 = process.argv[2] || '여행-기록';
const 디자인들 = await 디자인찾기('디자인');
const 모음 = await 게시본폴더읽기('게시본/' + 이름);
console.log('파일:', 모음.파일.map(f => f.이름).join(' | '));
console.log('사진목록:', 모음.사진.join(' | '));
const r = 게시본만들기({ 파일들:모음.파일, 폴더명:이름, 사진목록:모음.사진, 있는디자인:Object.keys(디자인들), 디자인설정:{} });
console.log('메모:', JSON.stringify(r.메모));
for (const a of r.자료들) {
  console.log(`\n[${a.번호}${a.강조?'!':''}] ${a.제목}  (${a.유형}, ${a.날짜||'-'}) 파일=${a.파일명}` + (a.원제목 ? `  원제목=「${a.원제목}」` : ''));
  for (const b of a.블록) console.log('   ·', b.종류, b.종류==='사진' ? (b.경로 || '❌못찾음') + '  ←' + (b.원래||'') : (b.글||b.이름||'').slice(0,70));
}
