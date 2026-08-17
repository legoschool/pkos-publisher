/* 솔라핵심 — Upstage Solar 에 물어보는 알맹이 (브라우저·Node 공용, DOM 안 씀, Node API 안 씀)
 *
 *  키를 **여기서 찾지 않는다.** 부르는 쪽이 넣어 준다 —
 *    · Node  : 공용/솔라.mjs 가 공용/열쇠.mjs 에서 읽어 넣는다 (드라이브 밖 파일)
 *    · 브라우저: 제작기 화면에서 사람이 그때 넣는다 (파일에 적히지 않는다)
 *  그래서 이 파일에는 키가 없고, 공개 저장소에 올라가도 된다.
 *
 *  Upstage 는 브라우저에서 직접 부르는 것을 허용한다 (CORS `access-control-allow-origin: *`).
 *  SDK 대신 fetch 인 이유: 이 도구는 npm·번들러 없이 도는 것이 원칙.
 */

const 잠깐 = ms => new Promise(r => setTimeout(r, ms));

/* 속도 조절 — 서버가 429(요청 한도)를 내지 않도록 스스로 늦춘다.
   한 번 429 를 맞으면 간격을 늘리고, 한동안 잠잠하면 천천히 되돌린다. */
const 조절 = { 최소간격: 900, 마지막: 0, 늘린때: 0 };
async function 차례기다리기() {
  const 이제 = Date.now();
  if (조절.늘린때 && 이제 - 조절.늘린때 > 60_000 && 조절.최소간격 > 900) {
    조절.최소간격 = Math.max(900, Math.round(조절.최소간격 * 0.7));
    조절.늘린때 = 이제;
  }
  const 기다릴 = 조절.마지막 + 조절.최소간격 - 이제;
  조절.마지막 = Math.max(이제, 조절.마지막 + 조절.최소간격);
  if (기다릴 > 0) await 잠깐(기다릴);
}
function 느리게() {
  조절.최소간격 = Math.min(8000, Math.round(조절.최소간격 * 1.8));
  조절.늘린때 = Date.now();
  return 조절.최소간격;
}
export const 속도 = () => ({ 최소간격: 조절.최소간격 });

/** 키를 로그에 남겨야 할 때: 앞 6글자와 뒤 3글자만 (예: up_abc…xyz) */
export function 가림(값) {
  if (!값) return '(없음)';
  const s = String(값);
  return s.length <= 12 ? s.slice(0, 3) + '…' : s.slice(0, 6) + '…' + s.slice(-3);
}

/**
 * 한 번 물어본다.
 * @param {{키:string, 바탕?:string, 모델?:string, 체계?:string, 물음:string,
 *          스키마?:object, 온도?:number, 최대토큰?:number, 재시도?:number, 조용히?:boolean,
 *          말하기?:function}} 옵션
 * @returns {Promise<{글:string, 값:any, 쓴토큰:{들어감:number,나옴:number}, 모델:string, 걸린초:number}>}
 */
export async function 물어보기({
  키, 바탕 = 'https://api.upstage.ai/v1', 모델 = 'solar-pro3',
  체계, 물음, 스키마, 온도 = 0, 최대토큰 = 4096, 재시도 = 6, 조용히 = false, 말하기,
}) {
  if (!키) throw new Error('API 키가 없습니다.');
  const 알리기 = 글 => { if (!조용히) (말하기 || (s => console.log(s)))(글); };

  const 메시지 = [];
  if (체계) 메시지.push({ role: 'system', content: 체계 });
  메시지.push({ role: 'user', content: 물음 });

  const 몸 = { model: 모델, messages: 메시지, temperature: 온도, max_tokens: 최대토큰, stream: false };
  if (스키마) 몸.response_format = { type: 'json_schema', json_schema: { name: '답', strict: true, schema: 스키마 } };

  const 시작 = Date.now();
  let 마지막오류 = null, 다음쉼 = 0;

  for (let 번 = 0; 번 <= 재시도; 번++) {
    if (다음쉼) { 알리기(`   … ${Math.round(다음쉼 / 1000)}초 쉬고 다시 (${번}/${재시도})`); await 잠깐(다음쉼); 다음쉼 = 0; }
    await 차례기다리기();

    let 답;
    try {
      답 = await fetch(바탕.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + 키, 'Content-Type': 'application/json' },
        body: JSON.stringify(몸),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (e) { 마지막오류 = new Error('연결 실패: ' + e.message); 다음쉼 = Math.min(2 ** 번, 16) * 1000; continue; }

    if (답.status === 429) {
      const 알려준 = parseInt(답.headers.get('retry-after') || '', 10);
      const 새간격 = 느리게();
      다음쉼 = Number.isFinite(알려준) ? 알려준 * 1000 : Math.min(60_000, 8000 * (번 + 1));
      마지막오류 = new Error('요청 한도(429). ' + Math.round(다음쉼 / 1000) + '초 쉬고 다시 걸며, 간격을 ' + 새간격 + 'ms 로 늘림');
      알리기('   … 요청 한도에 걸려 천천히 갑니다 (간격 ' + 새간격 + 'ms)');
      await 답.text().catch(() => { });
      continue;
    }
    if (답.status >= 500) {
      마지막오류 = new Error('서버가 ' + 답.status + ' 로 답함 (' + (await 답.text().catch(() => '')).slice(0, 200) + ')');
      다음쉼 = Math.min(2 ** 번, 16) * 1000; continue;
    }

    const 본 = await 답.text();
    if (!답.ok) {
      const 요약 = 본.slice(0, 300);
      if (답.status === 401 || 답.status === 403)
        throw new Error('키가 거부당했습니다 (' + 답.status + '). 쓴 키: ' + 가림(키) + '\n  ' + 요약);
      if (스키마 && /json_schema|response_format|schema/i.test(본)) {
        알리기('   … 이 모델은 json_schema 를 안 받아, JSON 형식 지시로 바꿔 다시 겁니다');
        몸.response_format = { type: 'json_object' };
        메시지[메시지.length - 1].content = 물음 + '\n\n반드시 이 모양의 JSON 하나만 답하세요(설명·코드울타리 없이):\n' + JSON.stringify(스키마);
        번--; continue;
      }
      throw new Error('요청이 거부됐습니다 (' + 답.status + ')\n  ' + 요약);
    }

    let j; try { j = JSON.parse(본); } catch { 마지막오류 = new Error('JSON 이 아닌 답: ' + 본.slice(0, 200)); 다음쉼 = 2000; continue; }
    const 고름 = j.choices?.[0];
    const 글 = 고름?.message?.content ?? '';
    if (고름?.finish_reason === 'length') 알리기('   ⚠ 답이 길이 제한에서 잘렸습니다 (최대토큰을 늘리세요)');
    if (!글) { 마지막오류 = new Error('빈 답이 왔습니다: ' + 본.slice(0, 200)); 다음쉼 = 2000; continue; }

    let 값 = null;
    if (스키마) {
      값 = JSON풀기(글);
      if (값 === null) { 마지막오류 = new Error('JSON 으로 못 읽음: ' + 글.slice(0, 200)); 다음쉼 = 2000; continue; }
    }
    return {
      글, 값,
      쓴토큰: { 들어감: j.usage?.prompt_tokens ?? 0, 나옴: j.usage?.completion_tokens ?? 0 },
      모델: j.model || 모델,
      걸린초: Math.round((Date.now() - 시작) / 100) / 10,
    };
  }
  throw new Error('여러 번 걸어도 실패했습니다.\n  마지막: ' + (마지막오류?.message || '알 수 없음'));
}

/** ```json 울타리·앞뒤 잡소리를 걷어내고 JSON 으로 읽는다 */
export function JSON풀기(글) {
  let s = String(글).trim();
  const 울타리 = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (울타리) s = 울타리[1].trim();
  try { return JSON.parse(s); } catch { }
  const 처음 = s.search(/[{[]/);
  const 끝 = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (처음 >= 0 && 끝 > 처음) { try { return JSON.parse(s.slice(처음, 끝 + 1)); } catch { } }
  return null;
}

/** 여러 개를 나눠서 물어본다 — 하나가 엎어져도 나머지는 간다 (원칙 6: 조용히 넘어가지 않는다)
 *  실패한 것은 마지막에 혼자서(동시 1) 한 번 더. 요청 한도로 밀린 것이 대부분이라 대개 그때 된다. */
export async function 여럿물어보기(묶음들, 만들기, { 동시 = 2, 알림 } = {}) {
  const 결과 = new Array(묶음들.length).fill(null);
  const 실패 = new Map();
  let 다음 = 0, 끝난수 = 0;

  const 일꾼 = async () => {
    while (true) {
      const i = 다음++;
      if (i >= 묶음들.length) return;
      try { 결과[i] = await 물어보기({ ...만들기(묶음들[i], i), 조용히: true }); 실패.delete(i); }
      catch (e) { 실패.set(i, e.message); }
      알림?.(++끝난수, 묶음들.length, 실패.size);
    }
  };
  await Promise.all(Array.from({ length: Math.min(동시, 묶음들.length) }, 일꾼));

  if (실패.size) {
    알림?.(끝난수, 묶음들.length, 실패.size, '다시 하는 중');
    for (const i of [...실패.keys()]) {
      try { 결과[i] = await 물어보기({ ...만들기(묶음들[i], i), 조용히: true }); 실패.delete(i); }
      catch (e) { 실패.set(i, e.message); }
      알림?.(끝난수, 묶음들.length, 실패.size, '다시 하는 중');
    }
  }
  return { 결과, 못한것: [...실패.entries()].map(([번호, 까닭]) => ({ 번호, 까닭 })) };
}
