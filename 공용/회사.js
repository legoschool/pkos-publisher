/* 회사 — 어떤 AI 를 쓸 수 있나, 한 곳에만 적는다 (브라우저·Node 공용, DOM 안 씀)
 *
 *  여기에 한 줄 더 적으면 제작기 드롭다운·CLI·키 파일이 한꺼번에 그 회사를 안다.
 *  회사 이름을 코드 여기저기에 적지 않는다 — 늘리고 줄이기 쉬우라고.
 *
 *  방식
 *   · 'openai'    — OpenAI 모양 API (/chat/completions, Authorization: Bearer).
 *                   공용/솔라핵심.js 가 그대로 부른다. 브라우저에서도 바로 된다.
 *   · '앤트로픽'   — 자기 모양 API. 공용/해석.js 가 따로 부른다.
 *                   OpenAI 호환 주소는 브라우저에서 CORS 가 막혀 못 쓴다 (확인함 8-17).
 */

export const 회사들 = {
  업스테이지: {
    이름: '업스테이지 Solar',
    앞머리: 'up_',
    예: 'up_…',
    방식: 'openai',
    바탕: 'https://api.upstage.ai/v1',
    모델: 'solar-pro3',
    받는곳: 'api.upstage.ai',
    키칸: 'UPSTAGE_API_KEY',
    키받는곳: 'https://console.upstage.ai',
    주제묶기: true,
  },
  제미나이: {
    이름: '구글 제미나이',
    앞머리: 'AIza',
    예: 'AIza…',
    방식: 'openai',
    바탕: 'https://generativelanguage.googleapis.com/v1beta/openai',
    모델: 'gemini-2.5-flash',
    받는곳: 'generativelanguage.googleapis.com',
    키칸: 'GEMINI_API_KEY',
    키받는곳: 'https://aistudio.google.com/apikey',
    주제묶기: true,
  },
  앤트로픽: {
    이름: '앤트로픽 Claude',
    앞머리: 'sk-ant-',
    예: 'sk-ant-…',
    방식: '앤트로픽',
    바탕: 'https://api.anthropic.com',
    모델: 'claude-opus-5',
    받는곳: 'api.anthropic.com',
    키칸: 'ANTHROPIC_API_KEY',
    키받는곳: 'https://console.anthropic.com',
    주제묶기: false,      // 아직 안 붙임 — 「말로 방향 정하기」 에서는 쓸 수 있다
  },
};

export const 회사이름들 = Object.keys(회사들);

/** 키 모양만 보고 어느 회사 것인지 알아본다 (사람에게 묻지 않는다) */
export function 어느회사(키) {
  const k = String(키 || '').trim();
  for (const [곳, c] of Object.entries(회사들)) if (k.startsWith(c.앞머리)) return 곳;
  return '';
}

/** 키가 그 회사 것처럼 생겼나 */
export function 키맞나(곳, 키) {
  const c = 회사들[곳];
  if (!c) return false;
  return String(키 || '').trim().startsWith(c.앞머리);
}

/** 로그·화면에 키를 남길 때: 앞 6글자와 뒤 3글자만 */
export function 키가림(값) {
  const s = String(값 || '');
  if (!s) return '(없음)';
  return s.length <= 12 ? s.slice(0, 3) + '…' : s.slice(0, 6) + '…' + s.slice(-3);
}

/* ── 키 파일(키.env) 읽고 쓰기 ──────────────────────────────────────
   같은 파일을 CLI(공용/열쇠.mjs)와 제작기(브라우저)가 같이 쓴다.
   그래서 한 번 적어 두면 어느 쪽에서 열든 키가 있다.                 */

/** 키.env 글 → { UPSTAGE_API_KEY: '...', ... } */
export function 키글읽기(글) {
  const 값 = {};
  for (const 줄 of String(글 || '').split(/\r?\n/)) {
    const t = 줄.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    값[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return 값;
}

/** { 곳: 키 } → 키.env 글 (사람이 메모장으로 열어 고칠 수 있는 모양) */
export function 키글쓰기(키들, 고른곳 = '') {
  const 줄 = [
    '# P-KEMS 웹 게시본 제작기 — API 키',
    '#',
    '# 이 파일은 **구글 드라이브 밖**, 남이 못 보는 곳에 두세요.',
    '# 권하는 자리: C:\\Users\\<나>\\.pkems\\키.env',
    '# 메모장으로 열어 고쳐도 됩니다. 줄 모양: 이름=값',
    '#',
    '# 키 받는 곳',
  ];
  for (const c of Object.values(회사들)) 줄.push('#   ' + c.이름 + ' : ' + c.키받는곳);
  줄.push('');
  if (고른곳) 줄.push('AI_곳=' + 고른곳);
  for (const [곳, c] of Object.entries(회사들)) {
    const k = 키들[곳];
    줄.push((k ? '' : '# ') + c.키칸 + '=' + (k || ''));
  }
  줄.push('');
  return 줄.join('\n');
}

/** 키.env 값 → { 곳: 키 } */
export function 키들뽑기(값) {
  const 키들 = {};
  for (const [곳, c] of Object.entries(회사들)) if (값[c.키칸]) 키들[곳] = 값[c.키칸];
  return 키들;
}

export const 키파일이름 = '키.env';
