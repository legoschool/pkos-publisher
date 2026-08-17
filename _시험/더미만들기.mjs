/* 더미 데이터 생성기 — 시험장에만 씁니다 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = async (p, s) => { await mkdir(join(p, '..'), { recursive:true }); await writeFile(p, s, 'utf8'); };
const D = p => mkdir(p, { recursive:true });

/* ---- 진짜 PNG 만들기 (색 있는 사각형, 글자 없음) ---- */
function crc32(buf){ let c, crc = 0xffffffff; for (let n=0;n<buf.length;n++){ c=(crc^buf[n])&0xff; for(let k=0;k<8;k++) c=c&1?0xedb88320^(c>>>1):c>>>1; crc=(crc>>>8)^c; } return (crc^0xffffffff)>>>0; }
function chunk(type, data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length); const td=Buffer.concat([Buffer.from(type),data]); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len,td,crc]); }
function png(w,h,[r,g,b],[r2,g2,b2]){
  const raw = Buffer.alloc((w*3+1)*h);
  for (let y=0;y<h;y++){ raw[y*(w*3+1)]=0; for(let x=0;x<w;x++){ const t=x/w; const i=y*(w*3+1)+1+x*3;
    const stripe = ((x>>4)+(y>>4))&1 ? 0.85 : 1;
    raw[i]=Math.round((r+(r2-r)*t)*stripe); raw[i+1]=Math.round((g+(g2-g)*t)*stripe); raw[i+2]=Math.round((b+(b2-b)*t)*stripe); } }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',ihdr), chunk('IDAT',deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]);
}
const 팔레트 = [[[230,120,90],[250,200,150]],[[90,140,200],[180,220,240]],[[120,180,120],[220,240,200]],[[160,110,190],[230,200,240]],[[210,170,60],[250,240,180]]];
async function 사진(p, i, w=640, h=400){ await mkdir(join(p,'..'),{recursive:true}); await writeFile(p, png(w,h,...팔레트[i%5])); }

/* 블로그 변환 글 흉내 (실제 형식과 같게) */
const 블로그 = (제목, 날짜, 문단들, 사진경로들, url='http://blog.naver.com/dummy/1') => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${제목}</title><style>body{}</style></head><body><div class="wrap">
<a class="back" href="../index.html">← 목록으로</a>
<h1>${제목}</h1>
<div class="meta"><span>📅 ${날짜} 10:00</span><span class="tag">더미</span>
<div style="margin-top:6px"><a href="${url}" target="_blank" rel="noopener">원문 보기 ↗</a></div></div>
<h1>${제목}</h1>
<p>*${날짜} 10:00*</p>
<p>원문: <a href="${url}" target="_blank" rel="noopener">${url}</a></p>
${문단들.map(t => t.startsWith('>') ? `<blockquote>${t.slice(1)}</blockquote>` : t.startsWith('##') ? `<h2>${t.slice(2).trim()}</h2>` : `<p>${t}</p>`).join('\n')}
${사진경로들.map(s => `<img src="${s}" alt="">`).join('\n')}
</div></body></html>`;

const 게 = '게시본';

/* ============ 게시본 1: 여행-기록 — 복합 자료 (md·txt·html·사진·pdf·pptx·하위폴더·느낌표·번호없음) ============ */
{
  const p = join(게, '여행-기록');
  await D(p);
  await W(join(p,'_메모.txt'), `제목: 제주 한 달, 걷고 적은 것
부제: 2025년 3월 · 더미 데이터
디자인: 기록-따뜻
공개: 켜기
강조: 1, 마치며
숨기기: 번호없는
사진크기: 크게
글크기: 크게
강조색: #b3261e
폭: 760
엉뚱한항목: 값
---
바다 사진은 크게 넣어 줘. 3주차 글이 제일 중요해.
`);
  /* 조판 시험 — 마크다운 전부 (인라인·목록·표·코드·구분·연속 사진·낀 사진·h3/h4·인용) */
  await W(join(p,'10_조판 시험.md'), [
    '---', '제목: 조판 시험 — 마크다운 전부', '날짜: 2025-03-30', '---',
    '# 본문의 첫 # 는 제목이 아니라 소제목이어야 한다 (앞머리 제목이 있으니까)', '',
    '**굵게**, *기울임*, `코드`, ~~취소~~, [링크](https://example.com), [내부](../다른.html), [나쁜](javascript:alert(1)) 을 섞은 문단.',
    '같은 문단의 둘째 줄. 2 * 3 = 6 은 기울임이 아니어야 한다. snake_case_이름 도 그대로.', '',
    '## 목록', '', '- 하나', '- 둘 **굵게**', '  - 안겹 하나', '  - 안겹 둘', '- 셋', '',
    '1. 첫째', '2. 둘째', '   이어지는 줄', '3. 셋째', '',
    '## 표', '', '| 항목 | 값 | 비고 |', '|---|:---:|---|', '| 사과 | 3 | *빨강* |', '| 배 | 5 | `노랑` |', '',
    '## 코드', '', '```js', 'const x = "<b>안 굵어야</b>";', '', 'console.log(x); // 빈 줄이 있어도 한 블록', '```', '',
    '---', '', '## 사진 여러 장', '', '![첫](사진/1주차/바다.png)', '![둘](사진/1주차/일출.png)', '![셋 없음](사진/없음.png)', '',
    '문장 가운데 ![낀 사진](사진/3주차/오름.png) 이렇게 있어도 사진은 빠져 나오고 글은 이어진다.', '',
    '### 셋째 단계 소제목', '#### 넷째 단계 소제목', '', '> 인용 첫 줄', '> 인용 둘째 줄 **굵게**', '', '마지막 문단.', ''
  ].join('\n'));
  /* 장(章) 폴더 — 번호 붙은 하위 폴더는 그 번호 자리에 통째로 들어간다 */
  await 사진(join(p,'2_현장 사진/01_바닷가.png'), 0);
  await 사진(join(p,'2_현장 사진/02_오름에서.png'), 2, 640, 640);
  await W(join(p,'2_현장 사진/03_사진 설명.txt'), '장 폴더 안의 글. 사진 두 장 뒤에 와야 한다(번호 03).');
  await W(join(p,'00_들어가며.md'), `---
제목: 왜 한 달을 걸었나
날짜: 2025-03-01
---

# 이 제목은 앞머리 제목에 진다

첫 문단. 더미 글이다. **굵게** 도 *기울임* 도 조판되지 않고 문자 그대로 남는지 본다.

## 소제목 하나

> 인용문. 걷는다는 것은 생각을 느리게 만드는 일이다.

![첫날 바다](사진/1주차/바다.png)

두 번째 문단. 링크 [올레](https://example.com) 도 넣어 본다.
`);
  await W(join(p,'01_1주차 올레길.md'), `---
제목: 1주차 — 올레길
날짜: 2025-03-05
---
성산에서 시작했다.

![성산 일출](사진/1주차/일출.png)
![같은 이름 시험](사진/1주차/바다.png)

- 목록 항목 하나
- 목록 항목 둘

1. 번호 목록
2. 두 번째
`);
  await W(join(p,'02_2주차 메모.txt'), `2주차는 비가 많이 왔다.

그래서 카페에 앉아 적었다. txt 파일도 문단으로 나뉘는지 본다.

세 번째 문단.`);
  await W(join(p,'03!_3주차 전환점.md'), `---
제목: 3주차 — 마음이 바뀐 날
날짜: 2025-03-18
---
이 글이 강조(!) 대상이다.

![없는 사진](사진/3주차/없음.png)
![있는 사진](사진/3주차/오름.png)
`);
  await W(join(p,'04_블로그에서 가져온 글.html'), 블로그('제주 4주차 (블로그 제목)', '2025-03-25',
    ['블로그 변환 글이다. 파일 이름이 이겨야 한다.', '## 소제목', '>인용', '마지막 문단. 뒤에 사진 두 장.'],
    ['images/2025-03-25_4주차/img_001.jpeg','images/2025-03-25_4주차/img_002.jpeg']));
  await W(join(p,'05_참고자료.pdf'), '%PDF-1.4 dummy');
  await W(join(p,'06_발표.pptx'), 'PK dummy');
  await W(join(p,'07_한글문서.hwpx'), 'PK dummy');
  await W(join(p,'99_마치며.md'), `마무리 글. 앞머리 없음. 파일 이름이 제목이 된다.`);
  await W(join(p,'번호없는 글.md'), `번호가 없는 파일. 맨 뒤(9999)로 가야 한다.`);
  await W(join(p,'부록/01_부록 첫째.md'), `하위 폴더 안의 글. 번호가 읽히는지 본다.`);
  await W(join(p,'부록/02_부록 둘째.txt'), `하위 폴더 안의 txt.`);
  await W(join(p,'.숨김.md'), `점으로 시작하는 파일은 무시돼야 한다.`);
  await W(join(p,'_초안.md'), `밑줄로 시작하는 파일은 무시돼야 한다.`);
  await 사진(join(p,'사진/1주차/바다.png'), 0);
  await 사진(join(p,'사진/1주차/일출.png'), 1);
  await 사진(join(p,'사진/3주차/오름.png'), 2, 640, 640);
  await 사진(join(p,'사진/2025-03-25_4주차/img_001.jpeg'), 3);
  await 사진(join(p,'사진/2025-03-25_4주차/img_002.jpeg'), 4);
  await 사진(join(p,'08_직접 넣은 사진.png'), 1, 800, 300);   // 사진 파일을 자료로 직접
  await W(join(p,'09_그림.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>');
}

/* ============ 게시본 2: 블로그-모음 — 같은 사진 이름 여러 글 (오매칭 시험) ============ */
{
  const p = join(게, '블로그-모음');
  await D(p);
  await W(join(p,'_메모.txt'), `제목: 블로그 글 세 편
디자인: 브릭마을
결: 밤의 조립판
공개: 켜기
순서: 날짜
---
`);
  await W(join(p,'03_셋째 글.html'), 블로그('셋째 글', '2020-01-03', ['셋째. 순서: 날짜 이면 날짜순이 되어야 한다.'], ['images/글C/img_001.jpeg']));
  await W(join(p,'01_첫째 글.html'), 블로그('첫째 글', '2020-01-01', ['첫째.'], ['images/글A/img_001.jpeg','images/글A/img_002.jpeg']));
  await W(join(p,'02_둘째 글.html'), 블로그('둘째 글', '2020-01-02', ['둘째. 이 글 사진은 폴더에 없다 → 이름만 같은 다른 글 사진이 붙으면 안 된다.'], ['images/글B/img_001.jpeg']));
  await 사진(join(p,'사진/글A/img_001.jpeg'), 0);
  await 사진(join(p,'사진/글A/img_002.jpeg'), 1);
  await 사진(join(p,'사진/글C/img_001.jpeg'), 2);
}

/* ============ 게시본 3: 디자인없음 — 없는 디자인 이름 ============ */
{
  const p = join(게, '디자인없음');
  await D(p);
  await W(join(p,'_메모.txt'), `제목: 없는 디자인을 적으면
디자인: 유니콘-무지개
공개: 켜기
---
`);
  await W(join(p,'01_글.md'), `없는 디자인 이름을 적었을 때 조용히 바꾸지 않고 알려 주는지 본다.`);
}

/* ============ 게시본 4: 메모없음 — _메모.txt 없음 ============ */
{
  const p = join(게, '메모없음');
  await D(p);
  await W(join(p,'01_글.md'), `메모가 없으면 폴더 이름이 제목, 학술-절제, 비공개여야 한다.`);
  await W(join(p,'02_글.md'), `두 번째.`);
}

/* ============ 게시본 5: 빈폴더 ============ */
await D(join(게, '빈폴더'));

/* ============ 디자인 5개 추가 → 10개 ============ */
const 디 = '디자인';
const 연결 = (v) => `:root{\n${Object.entries(v).map(([k,x])=>`  --게시-${k}:${x};`).join('\n')}\n}\n`;
await W(join(디,'미니멀-흑백/연결.css'), 연결({ 바탕:'#fff', 종이:'#f4f4f4', 글:'#000', 흐린글:'#777', 강조:'#000', 강조바탕:'#eee', 선:'#000',
  제목글꼴:'"Helvetica Neue",Arial,sans-serif', 본문글꼴:'Arial,sans-serif', 제목굵기:900, 폭:'680px', 모서리:'0', 테두리:'2px solid #000', 그림자:'none', 카드바탕:'transparent', 카드안쪽:'0', 사진모서리:'0' }));
await W(join(디,'신문-격자/연결.css'), 연결({ 바탕:'#f3efe4', 종이:'#fbf8f0', 글:'#222', 흐린글:'#6a6a6a', 강조:'#8b1a1a', 강조바탕:'#f1e4e0', 선:'#c9c2b0',
  제목글꼴:'Georgia,"Times New Roman",serif', 본문글꼴:'Georgia,serif', 제목굵기:700, 폭:'900px', 모서리:'0', 테두리:'1px solid #c9c2b0', 그림자:'none' }) + `.자료 .몸{columns:2; column-gap:32px}\n`);
await W(join(디,'노트-손글씨/연결.css'), 연결({ 바탕:'#fffdf5', 종이:'#fff9e6', 글:'#3a3226', 흐린글:'#8a7f6a', 강조:'#c2571a', 강조바탕:'#fdeedd', 선:'#e8dcc0',
  제목글꼴:'"Nanum Pen Script","Comic Sans MS",cursive', 본문글꼴:'"Nanum Gothic",sans-serif', 제목굵기:400, 배율:'1.08', 모서리:'14px', 그림자:'0 2px 8px rgba(0,0,0,.08)', 카드바탕:'var(--게시-종이)', 카드안쪽:'22px 24px' }));
await W(join(디,'다크-코드/연결.css'), 연결({ 바탕:'#0d1117', 종이:'#161b22', 글:'#e6edf3', 흐린글:'#8b949e', 강조:'#58a6ff', 강조바탕:'#1c2a3a', 선:'#30363d',
  제목글꼴:'"JetBrains Mono",Consolas,monospace', 본문글꼴:'"Pretendard",system-ui,sans-serif', 제목굵기:700, 모서리:'6px', 카드바탕:'var(--게시-종이)', 카드안쪽:'20px 22px', 카드테두리:'1px solid #30363d' }));
/* 갈래(결)를 가진 디자인 — 브릭마을 말고도 되는지 */
await W(join(디,'파스텔-부드러움/연결.css'), `:root{--게시-바탕:#fbf7fb;--게시-종이:#fff;--게시-글:#3b3340;--게시-흐린글:#8a7f92;--게시-선:#eadfee;
--게시-강조:#a06cd5;--게시-강조바탕:#f1e8f8;--게시-모서리:18px;--게시-그림자:0 6px 20px rgba(120,80,160,.10);--게시-카드바탕:#fff;--게시-카드안쪽:24px 26px;--게시-제목글꼴:"Pretendard",sans-serif;--게시-본문글꼴:"Pretendard",sans-serif}
.pastel-mint{--게시-바탕:#f3faf7;--게시-강조:#3aa07a;--게시-강조바탕:#e2f4ec;--게시-선:#d6ebe2}
.pastel-peach{--게시-바탕:#fff6f1;--게시-강조:#e07a4f;--게시-강조바탕:#fde9df;--게시-선:#f3dccf}
`);
await W(join(디,'파스텔-부드러움/연결.json'), JSON.stringify({ 이름:'파스텔-부드러움', 설명:'둥근 모서리, 옅은 그림자. 더미.', 겉class:'', 고를수있는겉:{ '라벤더':'', '민트':'pastel-mint', '복숭아':'pastel-peach' } }, null, 2));
/* 함정: 연결.css 없는 폴더 → 디자인으로 잡히면 안 됨 */
await W(join(디,'미완성-디자인/메모.txt'), '연결.css 가 없으니 목록에 뜨면 안 된다');
/* 사용자 커스텀: 기존 디자인을 복사해 값 몇 개만 바꾼 것 */
await W(join(디,'내맘대로-학술/연결.css'), `@import url("../학술-절제/연결.css");\n:root{--게시-강조:#b3261e;--게시-폭:640px;--게시-제목글꼴:"Nanum Myeongjo",serif;--게시-배율:1.1}\n`);

/* 통합사이트 메모 */
await W(join('통합사이트','_메모.txt'), `제목: 더미 통합 사이트\n부제: 시험용\n디자인: 파스텔-부드러움\n결: 민트\n---\n`);
console.log('더미 데이터 만듦');
