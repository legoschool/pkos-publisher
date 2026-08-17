/* 씀: 시험장(임시 폴더)에서  node _시험/해석시험.mjs  — 해석.js 를 가짜 fetch 로 시험 (실제 API 호출 없음) */
/* 해석.js 를 가짜 fetch 로 시험한다 (실제 API 호출 없음) */
import { 요청만들기, 응답읽기, 해석하기, 제안적용, 허용열쇠 } from '../공용/해석.js';
import { 게시본만들기, 메모읽기 } from '../공용/제작.js';
import { 게시본폴더읽기 } from '../공용/폴더읽기.mjs';

const 모음 = await 게시본폴더읽기('게시본/여행-기록');
const r = 게시본만들기({ 파일들:모음.파일, 폴더명:'여행-기록', 사진목록:모음.사진 });

// 1. 요청 모양
const 몸 = 요청만들기({ 노트:r.메모.노트, 자료들:r.자료들, 메모:r.메모 });
console.log('model:', 몸.model, '| max_tokens:', 몸.max_tokens, '| format:', 몸.output_config.format.type, '| effort:', 몸.output_config.effort);
console.log('temperature 없음:', !('temperature' in 몸), '| thinking 없음:', !('thinking' in 몸));
console.log('user 앞부분:\n' + 몸.messages[0].content.slice(0, 420) + '\n…');

// 2. 가짜 응답 읽기 — 어휘 밖 열쇠(레이아웃)와 빈 값은 걸러야 한다
const 가짜 = { type:'message', stop_reason:'end_turn', usage:{ input_tokens:900, output_tokens:120 },
  content:[{ type:'text', text: JSON.stringify({ 줄:[
    { 열쇠:'사진크기', 값:'크게', 이유:'바다 사진은 크게' },
    { 열쇠:'강조', 값:'3', 이유:'3주차 글이 제일 중요' },
    { 열쇠:'레이아웃', 값:'2단', 이유:'어휘 밖' },
    { 열쇠:'강조색', 값:'', 이유:'빈 값' } ],
    못한것:['"바다 사진"만 골라 크게 하는 건 어휘에 없어 전체 사진크기로 제안'] }) }] };
const 읽음 = 응답읽기(가짜);
console.log('\n제안:', JSON.stringify(읽음.줄), '| 버림:', 읽음.버림, '| 못한것:', 읽음.못한것.length, '| 토큰:', 읽음.쓴토큰);

// 3. 거절·오류
try { 응답읽기({ type:'message', stop_reason:'refusal', stop_details:{ category:'x' }, content:[] }); } catch (e) { console.log('거절 처리:', e.message); }
try { 응답읽기({ type:'error', error:{ message:'invalid x-api-key' } }); } catch (e) { console.log('오류 처리:', e.message); }

// 4. 가짜 fetch 로 해석하기 끝까지 — 헤더 확인
let 잡은;
const fetch가짜 = async (url, opt) => { 잡은 = { url, headers: opt.headers, body: JSON.parse(opt.body) }; return { ok:true, status:200, json: async () => 가짜 }; };
const 결과 = await 해석하기({ 노트:r.메모.노트, 자료들:r.자료들, 메모:r.메모, 열쇠:'sk-test', fetch:fetch가짜, 브라우저:true });
console.log('\nfetch url:', 잡은.url, '| 키 헤더:', !!잡은.headers['x-api-key'], '| 브라우저 헤더:', 잡은.headers['anthropic-dangerous-direct-browser-access'], '| version:', 잡은.headers['anthropic-version']);
console.log('제안 수:', 결과.줄.length);

// 5. 적용 — 윗단은 고쳐지고 아랫단은 그대로, 기존 열쇠는 덮어씀
const 원 = '제목: 제주\n디자인: 기록-따뜻\n사진크기: 작게\n공개: 켜기\n---\n바다 사진은 크게 넣어 줘.\n';
const 새 = 제안적용(원, 결과.줄);
console.log('\n적용 결과:\n' + 새);
const 다시 = 메모읽기(새);
console.log('다시 읽음 → 사진크기:', 다시.사진크기, '| 강조:', 다시.강조, '| 노트 보존:', 다시.노트 === '바다 사진은 크게 넣어 줘.');
console.log('--- 없는 메모에도 적용:', 제안적용('제목: x\n', [{ 열쇠:'강조', 값:'1' }]).replace(/\n/g, '⏎'));
console.log('허용열쇠 수:', 허용열쇠.length);
