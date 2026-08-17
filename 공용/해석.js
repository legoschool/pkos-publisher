/* ============================================================
   2층 — 메모 아랫단(사람 말)을 AI 가 읽어 윗단 규격으로 옮겨 적기

   1층은 이 파일 없이도 온전히 돌아갑니다. 이건 '얹는' 기능입니다.
   AI 가 하는 일은 딱 하나 — 사람 말을 1층이 알아듣는 줄(강조: 3, 사진크기: 크게 …)
   로 번역해 '제안'하는 것. 파일에 쓰는 건 사람이 「적용」을 눌렀을 때뿐입니다.

   브라우저(제작기.html)와 Node(_메모해석.mjs)에서 같이 씁니다. DOM 을 안 씁니다.
   Claude API 를 fetch 로 직접 부릅니다 — 이 도구는 npm 도 번들러도 없는 단일 HTML 이라
   SDK 를 넣을 수 없어서입니다.
   ============================================================ */

import { 손질항목, 메모줄쓰기 } from './제작.js';
import { 회사들, 어느회사 } from './회사.js';

export const 기본모델 = 'claude-opus-5';

/* AI 가 써도 되는 윗단 열쇠. 여기 없는 건 버린다. */
export const 허용열쇠 = ['제목', '부제', '순서', '배치', '접기', '강조', '숨기기', '사진크기', '글크기', ...Object.keys(손질항목)];

export const 어휘설명 = `메모 윗단에 쓸 수 있는 줄 (열쇠: 값):
- 제목: 페이지 제목 / 부제: 제목 밑 한 줄
- 순서: 파일명 | 날짜   (자료 배열 순서)
- 배치: 나열 | 바둑판 | 목록 | 슬라이드 | 갤러리 | 잡지 | 타임라인   (자료를 늘어놓는 방식. 사진 위주면 갤러리·바둑판, 발표면 슬라이드, 시간순이면 타임라인)
- 접기: 자동 | 켜기 | 끄기 | 숫자   (자료를 처음부터 접어 둘지. 자동은 8건 넘으면 접음, 숫자는 그 수 넘으면)
- 강조: 3, 5   (뿌리 자료 번호, 또는 제목·파일명 조각. 장 안 자료는 '부록/1' 처럼)
- 숨기기: 2, 초안   (페이지에서 뺄 자료)
- 사진크기: 크게 | 보통 | 작게
- 글크기: 아주 작게 | 작게 | 보통 | 크게 | 아주 크게   (또는 1.1 같은 배율)
- 강조색 / 바탕색 / 종이색 / 글색 / 흐린글색 / 선색 / 강조바탕색: CSS 색 (#b3261e 등)
- 제목글꼴 / 본문글꼴: 글꼴 이름  / 제목굵기: 400~900
- 폭: 760px  / 모서리: 8px / 사진모서리 / 그림자 / 사이 / 줄간`;

/* ---------- 요청 만들기 (순수 함수, 시험하기 쉽게) ---------- */
export function 요청만들기({ 노트, 자료들, 메모, 모델 }){
  const 목록 = (자료들 || []).map(a =>
    `- [${a.장 ? a.장.이름 + '/' : ''}${a.번호 === 9999 ? '번호없음' : a.번호}${a.강조 ? '!' : ''}] ${a.제목}` +
    (a.날짜 ? ` (${a.날짜})` : '') + ` · ${a.유형}` +
    (a.블록 ? ` · 사진 ${a.블록.filter(b => b.종류 === '사진').length}장` : '')).join('\n');
  const 지금윗단 = 메모 ? Object.entries({
    제목: 메모.제목, 부제: 메모.부제, 순서: 메모.순서, 배치: 메모.배치, 강조: 메모.강조.join(', '), 숨기기: 메모.숨기기.join(', '),
    사진크기: 메모.사진크기, 글크기: 메모.글크기, ...Object.fromEntries(Object.entries(메모.손질).map(([k, v]) => [k, v]))
  }).filter(([, v]) => v).map(([k, v]) => k + ': ' + v).join('\n') : '';

  const system =
`당신은 '웹 게시본 제작기'의 메모 해석기입니다.
사람이 _메모.txt 아랫단에 자유롭게 적은 말을, 제작기가 알아듣는 윗단 규격 줄로 옮겨 적습니다.
규칙:
- 아랫단의 뜻을 윗단 어휘로만 표현합니다. 어휘 밖의 것은 만들지 말고 '못한것'에 이유와 함께 적습니다.
- 자료 목록에 실제로 있는 번호·제목만 가리킵니다. 없는 자료를 지어내지 않습니다.
- 본문 문장을 고치라는 요청은 이 도구가 하지 않습니다(원칙: 본문을 손대지 않음). '못한것'에 적습니다.
- 이미 윗단에 같은 값이 있으면 다시 제안하지 않습니다.
- 확신이 없으면 제안하지 말고 '못한것'에 남깁니다. 적게, 정확하게.

${어휘설명}`;

  const user =
`[자료 목록]
${목록 || '(없음)'}

[지금 윗단]
${지금윗단 || '(비어 있음)'}

[사람이 아랫단에 적은 말]
${노트 || '(없음)'}`;

  return {
    model: 모델 || 기본모델,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: {
      effort: 'medium',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            줄: { type: 'array', items: {
              type: 'object',
              properties: { 열쇠: { type: 'string' }, 값: { type: 'string' }, 이유: { type: 'string' } },
              required: ['열쇠', '값', '이유'], additionalProperties: false } },
            못한것: { type: 'array', items: { type: 'string' } }
          },
          required: ['줄', '못한것'], additionalProperties: false
        }
      }
    }
  };
}

/* ---------- 어느 회사 키인지 알아본다 ----------
   사람에게 "어디 키인가요?" 를 묻지 않는다. 키 모양만 보면 안다.
   회사 목록은 공용/회사.js 한 곳에만 적혀 있다. */
export function 어디키(키){
  const 곳 = 어느회사(키);
  const c = 회사들[곳];
  return { 곳, 모델: c?.모델 || '', 바탕: c?.바탕 || '', 방식: c?.방식 || '' };
}

/* ---------- 제안 줄 거르기 (어느 회사 답이든 여기를 지난다) ----------
   어휘 밖 열쇠는 버린다. 몇 개를 버렸는지도 같이 돌려준다 (원칙 6). */
export function 줄거르기(값){
  const 줄 = (값.줄 || []).filter(r => r && 허용열쇠.includes(String(r.열쇠).trim()) && String(r.값 || '').trim())
    .map(r => ({ 열쇠: String(r.열쇠).trim(), 값: String(r.값).trim(), 이유: String(r.이유 || '').trim() }));
  return { 줄, 못한것: (값.못한것 || []).map(String), 버림: (값.줄 || []).length - 줄.length };
}

/* ---------- 응답 다듬기 (앤트로픽) ---------- */
export function 응답읽기(응답){
  if (!응답 || 응답.type === 'error') {
    const m = 응답 && 응답.error ? 응답.error.message : '알 수 없는 오류';
    throw new Error('API 오류 — ' + m);
  }
  if (응답.stop_reason === 'refusal')
    throw new Error('모델이 이 요청을 거절했습니다' + (응답.stop_details && 응답.stop_details.category ? ' (' + 응답.stop_details.category + ')' : ''));
  const 글 = (응답.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let 값;
  try { 값 = JSON.parse(글); } catch { throw new Error('응답을 JSON 으로 읽지 못했습니다: ' + 글.slice(0, 200)); }
  return { ...줄거르기(값),
           쓴토큰: 응답.usage ? (응답.usage.input_tokens || 0) + (응답.usage.output_tokens || 0) : 0 };
}

/* ---------- 실제 호출 ---------- */
export async function 해석하기({ 노트, 자료들, 메모, 열쇠, 모델, fetch: f, 브라우저 }){
  const 부르기 = f || globalThis.fetch;
  if (!부르기) throw new Error('fetch 를 쓸 수 없는 환경입니다');
  if (!열쇠) throw new Error('API 키가 없습니다');
  const 몸 = 요청만들기({ 노트, 자료들, 메모, 모델 });
  const 머리 = {
    'content-type': 'application/json',
    'x-api-key': 열쇠,
    'anthropic-version': '2023-06-01',
  };
  if (브라우저) 머리['anthropic-dangerous-direct-browser-access'] = 'true';
  const r = await 부르기('https://api.anthropic.com/v1/messages', { method: 'POST', headers: 머리, body: JSON.stringify(몸) });
  let 응답;
  try { 응답 = await r.json(); } catch { throw new Error('응답을 읽지 못했습니다 (HTTP ' + r.status + ')'); }
  if (!r.ok && !(응답 && 응답.type === 'error')) throw new Error('HTTP ' + r.status);
  return 응답읽기(응답);
}

/* ---------- 실제 호출 (업스테이지 솔라) ----------
   같은 물음(요청만들기)을 OpenAI 모양 API 로 보낸다. 알맹이는 공용/솔라핵심.js.
   솔라핵심은 브라우저·Node 어디서나 돌고 키를 스스로 찾지 않는다.              */
export async function 해석하기솔라({ 노트, 자료들, 메모, 열쇠, 모델, 바탕 }){
  if (!열쇠) throw new Error('API 키가 없습니다');
  const { 물어보기 } = await import('./솔라핵심.js');
  const 어디 = 어디키(열쇠);
  const 몸 = 요청만들기({ 노트, 자료들, 메모 });
  const r = await 물어보기({
    키: 열쇠, 바탕: 바탕 || 어디.바탕, 모델: 모델 || 어디.모델 || 'solar-pro3',
    체계: 몸.system,
    물음: 몸.messages[0].content,
    스키마: {
      type: 'object', additionalProperties: false, required: ['줄', '못한것'],
      properties: {
        줄: { type: 'array', items: {
          type: 'object', additionalProperties: false, required: ['열쇠', '값', '이유'],
          properties: { 열쇠: { type:'string' }, 값: { type:'string' }, 이유: { type:'string' } } } },
        못한것: { type: 'array', items: { type: 'string' } },
      },
    },
    최대토큰: 4096, 조용히: true,
  });
  return { ...줄거르기(r.값 || {}), 쓴토큰: (r.쓴토큰?.들어감 || 0) + (r.쓴토큰?.나옴 || 0) };
}

/* ---------- 어느 회사든 알아서 ----------
   키 모양을 보고 맞는 곳으로 보낸다. 사람은 키만 넣으면 된다. */
export async function 해석하기알아서(옵션){
  const { 곳, 방식 } = 어디키(옵션.열쇠);
  if (방식 === 'openai')   return 해석하기솔라(옵션);        // 업스테이지 · 제미나이
  if (방식 === '앤트로픽') return 해석하기({ ...옵션, 브라우저: 옵션.브라우저 ?? true });
  throw new Error('어느 회사 키인지 모르겠습니다. 쓸 수 있는 키: ' +
    Object.values(회사들).map(c => c.이름 + '(' + c.예 + ')').join(' · '));
}

/* ---------- 제안을 _메모.txt 에 적용 (윗단만 고치고 아랫단은 그대로) ---------- */
export const 제안적용 = 메모줄쓰기;
