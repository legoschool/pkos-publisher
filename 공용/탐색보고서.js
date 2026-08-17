/* 탐색보고서 — 「이 폴더에 뭐가 있나」 를 사람이 보는 한 장으로 (DOM 안 씀)
   디자인은 기록장 톤을 그대로 빌려 쓴다. 보고서는 결과물이 아니라 도구의 화면이므로
   게시본 부품.css 를 쓰지 않고 여기서 스스로 최소한만 그린다.                       */
import { 막기 } from './제작.js';

const 막대 = (값, 최대, 폭 = 100) => Math.max(1, Math.round((값 / (최대 || 1)) * 폭));

export function 탐색보고서만들기({ 이름, 뿌리, 모양, 갈래결과, 추천값, 못읽음, 자료들, 색인썼나, 건너뛴수, 만든때, AI }) {
  const 해최대 = Math.max(1, ...Object.values(모양.해별 || {}));
  const 해줄 = Object.entries(모양.해별 || {}).sort()
    .map(([해, n]) => `<div class="해"><b>${해}</b><i style="width:${막대(n, 해최대, 240)}px"></i><span>${n}</span></div>`).join('');

  const 갈래 = (AI?.갈래 || 갈래결과.갈래);
  const 갈래칸 = 갈래.map((g, i) => {
    const 보기 = (g.자료번호 || []).slice(0, 5).map(n => 자료들[n]?.제목).filter(Boolean);
    const 곁 = (g.곁낱말 || []).map(k => `<code>${막기(k.낱말)}</code>`).join(' ');
    return `<details class="갈래"${i < 3 ? ' open' : ''}>
  <summary><b>${막기(g.이름)}</b> <span class="수">${g.건수 ?? g.자료번호.length}건</span></summary>
  <p class="까닭">${막기(g.까닭 || '')}</p>
  ${곁 ? `<p class="곁">같이 나오는 말: ${곁}</p>` : ''}
  <ul>${보기.map(t => `<li>${막기(t)}</li>`).join('')}
  ${(g.자료번호 || []).length > 5 ? `<li class="더">… 그리고 ${g.자료번호.length - 5}건 더</li>` : ''}</ul>
</details>`;
  }).join('');

  const 추천줄 = (이름값, 값, 까닭) =>
    `<tr><th>${막기(이름값)}</th><td><b>${막기(값)}</b></td><td class="까닭">${Array.isArray(까닭) ? 까닭.map(막기).join('<br>') : 막기(까닭 || '')}</td></tr>`;

  const 미분류수 = (AI?.미분류 ?? 갈래결과.미분류).length;

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>탐색 보고서 — ${막기(이름)}</title>
<style>
:root{--바탕:#f5f7fb;--종이:#fff;--글:#1b2130;--흐린:#667085;--선:#e3e8f2;--강조:#2f5fd6;--강조바탕:#eaf0ff;
      --그림자:0 1px 3px rgba(20,30,60,.06),0 8px 24px rgba(20,30,60,.06)}
@media (prefers-color-scheme:dark){:root{--바탕:#12161f;--종이:#1b202b;--글:#e8ecf4;--흐린:#98a2b3;--선:#2b3242;--강조:#7d9dff;--강조바탕:#232c44;--그림자:0 1px 3px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.25)}}
*{box-sizing:border-box}
body{margin:0;padding:32px 20px 80px;background:var(--바탕);color:var(--글);
     font:16px/1.7 "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif}
.판{max-width:940px;margin:0 auto}
h1{font-size:1.7rem;margin:0 0 4px;font-weight:800}
h2{font-size:1.1rem;margin:34px 0 12px;font-weight:700;display:flex;align-items:center;gap:8px}
h2::before{content:"";width:4px;height:18px;background:var(--강조);border-radius:2px}
.밑{color:var(--흐린);font-size:.9rem;margin:0 0 8px;word-break:break-all}
.칸{background:var(--종이);border:1px solid var(--선);border-radius:14px;padding:18px 20px;box-shadow:var(--그림자)}
.숫자들{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
.숫자{background:var(--종이);border:1px solid var(--선);border-radius:14px;padding:14px;text-align:center;box-shadow:var(--그림자)}
.숫자 b{display:block;font-size:1.6rem;font-weight:800;color:var(--강조);line-height:1.2}
.숫자 span{font-size:.82rem;color:var(--흐린)}
.해{display:flex;align-items:center;gap:10px;margin:3px 0;font-size:.9rem}
.해 b{width:48px;color:var(--흐린);font-weight:600}
.해 i{height:12px;background:var(--강조);border-radius:6px;display:block;opacity:.85}
.해 span{color:var(--흐린);font-size:.85rem}
table{width:100%;border-collapse:collapse;font-size:.94rem}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--선);vertical-align:top}
th{color:var(--흐린);font-weight:600;width:92px;white-space:nowrap}
td.까닭{color:var(--흐린);font-size:.88rem}
.갈래{background:var(--종이);border:1px solid var(--선);border-radius:12px;padding:12px 16px;margin:8px 0;box-shadow:var(--그림자)}
.갈래 summary{cursor:pointer;font-size:1rem}
.갈래 .수{color:var(--강조);background:var(--강조바탕);border-radius:20px;padding:1px 10px;font-size:.8rem;margin-left:6px}
.갈래 .까닭{color:var(--흐린);font-size:.88rem;margin:8px 0 4px}
.갈래 .곁{font-size:.85rem;color:var(--흐린);margin:4px 0}
.갈래 code{background:var(--강조바탕);color:var(--강조);border-radius:5px;padding:1px 6px;font-size:.82rem}
.갈래 ul{margin:6px 0 0;padding-left:20px;font-size:.9rem}
.갈래 li{margin:2px 0}
.갈래 .더{color:var(--흐린);list-style:none;margin-left:-14px}
.알림{background:var(--강조바탕);border-left:3px solid var(--강조);border-radius:0 8px 8px 0;padding:10px 14px;font-size:.9rem;margin:10px 0}
.경고{background:#fff4e5;border-left-color:#c77700;color:#7a4a00}
@media (prefers-color-scheme:dark){.경고{background:#332510;color:#f0c98a}}
code{font-family:"D2Coding",ui-monospace,Consolas,monospace}
footer{margin-top:40px;color:var(--흐린);font-size:.85rem;text-align:center}
</style></head><body><div class="판">

<h1>${막기(이름)}</h1>
<p class="밑">${막기(뿌리)} · ${막기(만든때)}${색인썼나 ? ' · 웹뷰어 색인을 빠른 길로 씀' : ''}</p>

<h2>무엇이 있나</h2>
<div class="숫자들">
  <div class="숫자"><b>${모양.자료수}</b><span>자료</span></div>
  <div class="숫자"><b>${모양.글수}</b><span>글</span></div>
  <div class="숫자"><b>${모양.사진합}</b><span>사진</span></div>
  <div class="숫자"><b>${모양.해수}</b><span>해에 걸쳐</span></div>
  <div class="숫자"><b>${모양.글자수가운데.toLocaleString()}</b><span>글자 (가운데값)</span></div>
</div>
<div class="칸" style="margin-top:12px">
<table>
<tr><th>기간</th><td colspan="2">${막기(모양.처음날짜 || '(모름)')} ~ ${막기(모양.끝날짜 || '(모름)')} · 날짜가 있는 자료 ${모양.날짜있는수}건 (${Math.round(모양.날짜있는수 / (모양.자료수 || 1) * 100)}%)</td></tr>
<tr><th>종류</th><td colspan="2">${Object.entries(모양.종류별).map(([k, v]) => `${막기(k)} ${v}`).join(' · ')}</td></tr>
<tr><th>확장자</th><td colspan="2">${Object.entries(모양.확장별).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${막기(k || '(없음)')} ${v}`).join(' · ')}</td></tr>
<tr><th>글 길이</th><td colspan="2">짧은 글(400자 미만) ${모양.짧은글수}건 · 긴 글(2500자 초과) ${모양.긴글수}건 · 평균 ${모양.글자수평균.toLocaleString()}자</td></tr>
</table>
</div>

<h2>해마다 얼마나</h2>
<div class="칸">${해줄 || '<p class="밑">날짜를 찾은 자료가 없습니다.</p>'}</div>

<h2>주제 갈래 ${AI ? '(AI 가 읽고 묶음)' : '(낱말 빈도로 묶음 — AI 없이)'}</h2>
${AI ? '' : '<div class="알림">사전을 손으로 적어 넣지 않고, 자료에 실제로 나온 낱말로만 묶었습니다. 이름이 어색한 것은 <code>node _분류.mjs</code> 로 AI 가 다시 묶고 이름을 짓습니다.</div>'}
${갈래칸 || '<p class="밑">묶을 만한 것이 없습니다.</p>'}
${미분류수 ? `<div class="알림 경고">어느 갈래에도 안 들어간 자료 <b>${미분류수}건</b> — 제목·낱말만으로는 판단이 안 되는 것들입니다. ${AI ? '' : 'AI 분류를 돌리면 줄어듭니다.'}</div>` : ''}

<h2>이 자료엔 이런 옷이 맞습니다</h2>
<div class="칸"><table>
${추천줄('디자인', 추천값.디자인, 추천값.디자인까닭)}
${추천값.디자인다른것.length ? `<tr><th></th><td colspan="2" class="까닭">다른 후보: ${추천값.디자인다른것.map(d => `<b>${막기(d.이름)}</b> — ${막기(d.까닭)}`).join(' · ')}</td></tr>` : ''}
${추천줄('배치', 추천값.배치, 추천값.배치까닭)}
${추천값.배치다른것.length ? `<tr><th></th><td colspan="2" class="까닭">다른 후보: ${추천값.배치다른것.map(b => `<b>${막기(b.이름)}</b> — ${막기(b.까닭[0] || '')}`).join(' · ')}</td></tr>` : ''}
${추천줄('접기', 추천값.접기, 추천값.접기까닭)}
${추천줄('순서', 추천값.순서, 추천값.순서까닭)}
${추천줄('사진크기', 추천값.사진크기, 추천값.사진크기 === '크게' ? '사진이 많아 큼직하게' : '보통으로')}
</table></div>

<h2>못 읽은 것 · 건너뛴 것</h2>
<div class="칸">
${못읽음.length || 건너뛴수
      ? `${건너뛴수 ? `<p>자료가 너무 많아 <b>${건너뛴수}건</b>을 건너뛰었습니다 (<code>--최대</code> 로 늘릴 수 있음).</p>` : ''}
   ${못읽음.length ? `<p>못 읽은 것 <b>${못읽음.length}건</b>:</p><ul style="font-size:.9rem;color:var(--흐린)">${못읽음.slice(0, 30).map(m => `<li>${막기(m.이름)} — ${막기(m.까닭)}</li>`).join('')}${못읽음.length > 30 ? `<li>… 그리고 ${못읽음.length - 30}건 더</li>` : ''}</ul>` : ''}`
      : '<p class="밑">전부 읽었습니다. 건너뛴 것도 없습니다.</p>'}
</div>

<footer>웹 게시본 제작기 · 탐색 보고서<br>다음: <code>node _분류.mjs ${막기(이름)}</code> (AI 로 다시 묶기) → <code>node _재구성.mjs ${막기(이름)}</code> (게시본 만들기)</footer>
</div></body></html>
`;
}
