/* 열쇠 — API 키를 안전하게 읽어 오는 곳 (Node 전용)
 *
 * 규칙 (지킬 것):
 *  1. 키는 **구글 드라이브 밖**에만 둔다.  기본 자리: C:\Users\<나>\.pkems\키.env
 *  2. 이 폴더(08_웹 게시본 제작) 안에서는 키 파일을 찾지도, 읽지도 않는다.
 *     — 이 폴더는 드라이브로 동기화되고 GitHub Pages 로 공개 배포된다.
 *  3. 브라우저(제작기.html)는 이 파일을 안 쓴다. 대신 사람이 고른 **키 폴더**에서
 *     같은 모양의 키.env 를 읽는다 (공용/회사.js 의 키글읽기/키글쓰기).
 *  4. 화면·기록에 키를 그대로 찍지 않는다. 확인이 필요하면 키가림() 을 쓴다.
 *
 * 어느 회사를 쓸 수 있는지는 공용/회사.js 한 곳에만 적혀 있다.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { 회사들, 키글읽기, 키들뽑기, 키가림, 어느회사, 키파일이름 } from './회사.js';

export const 키파일 = process.env.PKEMS_키파일 || join(homedir(), '.pkems', 키파일이름);
export { 키가림 as 가림, 회사들, 어느회사 };

/** 이 파일이 드라이브(G:) 나 이 도구 폴더 안에 있으면 거부 — 키가 공개 배포로 새는 걸 막는다 */
function 밖인지확인(경로) {
  const p = resolve(경로);
  const 드라이브안 = /^[Gg]:/.test(p) || p.includes(sep + '내 드라이브' + sep) || p.includes(sep + 'My Drive' + sep);
  if (드라이브안) {
    throw new Error(
      '키 파일이 구글 드라이브 안에 있습니다 → ' + p + '\n' +
      '  드라이브는 동기화·공개 배포 대상이라 키를 두면 안 됩니다.\n' +
      '  C:\\Users\\<나>\\.pkems\\키.env 로 옮기세요.');
  }
}

let 읽은것 = null;
function 읽기() {
  if (읽은것) return 읽은것;
  let 값 = {};
  if (existsSync(키파일)) {
    밖인지확인(키파일);
    const st = statSync(키파일);
    if (st.size > 8192) throw new Error('키 파일이 너무 큽니다(' + st.size + '바이트). 진짜 키 파일이 맞습니까? → ' + 키파일);
    값 = 키글읽기(readFileSync(키파일, 'utf8'));
  }
  // 환경변수가 파일보다 세다 (한 번만 다르게 돌려 보고 싶을 때)
  for (const c of Object.values(회사들)) if (process.env[c.키칸]) 값[c.키칸] = process.env[c.키칸];
  for (const k of ['AI_곳', 'UPSTAGE_BASE_URL', 'UPSTAGE_MODEL']) if (process.env[k]) 값[k] = process.env[k];
  return (읽은것 = 값);
}

/**
 * 쓸 수 있는 열쇠꾸러미를 돌려준다.
 * @param {boolean|string} 꼭  true 면 키가 없을 때 안내와 함께 멈춘다. 문자열이면 그 회사를 꼭 집어 쓴다.
 */
export function 열쇠(꼭 = true, 고를곳 = '') {
  const v = 읽기();
  const 키들 = 키들뽑기(v);
  const 있는곳 = Object.keys(키들);

  // 어느 회사를 쓸까 — 시킨 것 > 파일의 AI_곳 > 키가 있는 것 중 첫째
  const 곳 = (typeof 꼭 === 'string' ? 꼭 : 고를곳) || (키들[v.AI_곳] ? v.AI_곳 : '') || 있는곳[0] || '';
  const c = 회사들[곳];
  const 키 = 곳 ? (키들[곳] || '') : '';

  if ((꼭 === true || typeof 꼭 === 'string') && !키) {
    throw new Error(
      'API 키를 찾지 못했습니다' + (곳 ? ' (' + 곳 + ')' : '') + '.\n' +
      '  이렇게 만드세요 →  ' + 키파일 + '\n' +
      Object.values(회사들).map(x => '    ' + x.키칸 + '=' + x.앞머리 + '…      # ' + x.이름 + ' · ' + x.키받는곳).join('\n') + '\n' +
      '    AI_곳=업스테이지        # 기본으로 쓸 회사 (안 적으면 있는 것 중 첫째)\n' +
      '  (이 파일을 구글 드라이브 안에 두지 마세요. AI 없이 도는 기능은 키 없이도 그대로 됩니다.)');
  }

  return {
    곳, 키,
    이름: c?.이름 || '',
    방식: c?.방식 || '',
    바탕: (곳 === '업스테이지' && v.UPSTAGE_BASE_URL) || c?.바탕 || '',
    모델: (곳 === '업스테이지' && v.UPSTAGE_MODEL) || c?.모델 || '',
    있나: !!키,
    있는곳,
    보임: 키가림(키),
  };
}

/** 어떤 글에 키처럼 생긴 것이 섞였는지 — 배포 전 검사용 */
export const 키모양 = [
  /\bup_[A-Za-z0-9]{20,}\b/,          // Upstage
  /\bsk-ant-[A-Za-z0-9_\-]{20,}\b/,   // Anthropic
  /\bsk-[A-Za-z0-9]{32,}\b/,          // OpenAI 계열
  /\bAIza[A-Za-z0-9_\-]{30,}\b/,      // Google
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,   // GitHub
];
export function 키섞였나(글) {
  for (const re of 키모양) { const m = String(글).match(re); if (m) return m[0]; }
  return null;
}
