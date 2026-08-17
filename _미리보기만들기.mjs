/* 같은 자료를 '있는 디자인 전부'로 뽑아 비교 페이지를 만든다.
   디자인 폴더를 새로 넣으면 여기에도 저절로 늘어난다.
   씀:  node _미리보기만들기.mjs                                    */
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { 게시본만들기, 막기, 배치들, 기본디자인 } from './공용/제작.js';
import { 게시본폴더읽기, 디자인찾기 } from './공용/폴더읽기.mjs';

/* 어느 게시본으로 비교할지 — 인자로 주거나, 없으면 게시본/ 의 첫 폴더 */
let 게시본이름 = process.argv[2];
if (!게시본이름) {
  const 후보 = (await readdir('게시본', { withFileTypes:true })).filter(e => e.isDirectory() && !/^[_.]/.test(e.name)).map(e => e.name);
  if (!후보.length) { console.error('게시본/ 아래에 폴더가 없습니다.'); process.exit(1); }
  게시본이름 = 후보.includes('협동학습-10년') ? '협동학습-10년' : 후보[0];
}
const 원본 = '게시본/' + 게시본이름;
const 나갈곳 = '_미리보기';
console.log('비교 대상: ' + 원본 + '   (다른 폴더로 하려면  node _미리보기만들기.mjs <폴더이름>)');

const 디자인들 = await 디자인찾기('디자인');
const 있는디자인 = Object.keys(디자인들);
if (!있는디자인.length) { console.error('디자인/ 아래에 연결.css 가 있는 폴더가 없습니다.'); process.exit(1); }

await mkdir(나갈곳, { recursive:true });
const 모음 = await 게시본폴더읽기(원본);
const 메모원본 = 모음.파일.find(f => f.이름 === '_메모.txt') || { 이름:'_메모.txt', 글:'제목: ' + 게시본이름 + '\n' };

/* 뽑을 목록 = 디자인마다 하나. 갈래(결)가 있는 디자인은 갈래마다 하나. */
const 뽑을것 = [];
for (const 이름 of 있는디자인) {
  const 갈래 = 디자인들[이름].고를수있는겉;
  if (갈래 && Object.keys(갈래).length)
    for (const 결 of Object.keys(갈래)) 뽑을것.push({ 디자인:이름, 결 });
  else 뽑을것.push({ 디자인:이름, 결:'' });
}
/* 배치 비교 — 기본 디자인 하나로 배치만 바꿔서 */
const 배치디자인 = 있는디자인.includes(기본디자인) ? 기본디자인 : 있는디자인[0];
for (const 배치 of Object.keys(배치들)) 뽑을것.push({ 디자인:배치디자인, 결:'', 배치 });

const 표 = [];
for (const 것 of 뽑을것) {
  const 글 = 메모원본.글
    .replace(/^(디자인|테마)\s*[:：].*$/m, '디자인: ' + 것.디자인)
    + (것.결 ? '' : '');
  let 메모글 = 것.결 ? 글.replace(/^디자인\s*[:：].*$/m, '디자인: ' + 것.디자인 + '\n결: ' + 것.결) : 글;
  if (것.배치) 메모글 = 메모글.replace(/^배치\s*[:：].*$\n?/m, '').replace(/^디자인\s*[:：].*$/m, m => m + '\n배치: ' + 것.배치);
  const 파일들 = 모음.파일.map(f => f.이름 === '_메모.txt' ? { ...f, 글: 메모글 } : f);

  const 결과 = 게시본만들기({
    파일들, 폴더명:게시본이름, 사진목록: 모음.사진,
    있는디자인, 디자인설정: 디자인들[것.디자인],
    뿌리: '..',                                     // _미리보기/ 에서 한 칸 위
    만든때: '디자인 비교용'
  });

  // 자료·사진은 원래 폴더에 있으므로 그쪽을 보게 한다
  const html = 결과.html.replace(
    /(href|src)="(?!https?:|\.\.|#|data:)([^"]+)"/g,
    '$1="../게시본/' + encodeURI(게시본이름) + '/$2"');

  const 이름 = (것.배치 ? '배치 - ' + 것.배치 : 것.디자인 + (것.결 ? ' - ' + 것.결 : '')) + '.html';
  await writeFile(join(나갈곳, 이름), html, 'utf8');
  표.push({ ...것, 파일:이름, 설명: 것.배치 ? 배치들[것.배치] : (디자인들[것.디자인].설명 || '') });
  console.log('만듦: ' + 나갈곳 + '/' + 이름);
}

const 목록 = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>디자인 비교</title><style>
body{font:16px/1.7 "맑은 고딕",system-ui,sans-serif;margin:0;padding:40px 20px;background:#f6f5f2;color:#1c1b19}
.판{max-width:660px;margin:0 auto}
h1{font-size:22px;margin:0 0 6px}
p.곁{color:#6b6862;margin:0 0 26px;font-size:15px}
h2{font-size:14px;color:#6b6862;letter-spacing:.05em;margin:26px 0 8px;font-weight:700}
a.칸{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #e3e0da;
     border-radius:10px;padding:15px 20px;margin:8px 0}
a.칸:hover{border-color:#2f5d7c}
.이름{font-weight:700;font-size:16px}
.설명{font-size:13.5px;color:#6b6862;margin-top:3px}
</style></head><body><div class="판">
<h1>디자인 비교</h1>
<p class="곁">같은 자료(${막기(게시본이름)})를 디자인·배치만 바꿔 뽑았습니다.
디자인 폴더를 새로 넣으면 이 목록에 저절로 늘어납니다.</p>
<h2>배치 (늘어놓는 방식 · 디자인 「${막기(배치디자인)}」 으로)</h2>
${표.filter(r => r.배치).map(r => `<a class="칸" href="${막기(r.파일)}">
<div class="이름">${막기(r.배치)}</div>
<div class="설명">${막기(r.설명)}</div></a>`).join('\n')}
${있는디자인.map(이름 => {
  const 것들 = 표.filter(r => r.디자인 === 이름 && !r.배치);
  return `<h2>${막기(이름)}</h2>` + 것들.map(r => `<a class="칸" href="${막기(r.파일)}">
<div class="이름">${막기(r.결 || 이름)}</div>
<div class="설명">${막기(r.설명)}</div></a>`).join('\n');
}).join('\n')}
</div></body></html>`;
await writeFile(join(나갈곳, 'index.html'), 목록, 'utf8');
console.log('만듦: ' + 나갈곳 + '/index.html  ← 여기부터 여세요');
