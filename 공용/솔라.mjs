/* 솔라 (Node 쪽) — 알맹이는 공용/솔라핵심.js 에 있고, 여기서는 **키를 넣어 주는 일**만 한다.
 *
 *   Node : 키를 공용/열쇠.mjs 가 드라이브 밖 파일에서 읽어 온다.
 *   브라우저: 제작기.html 이 솔라핵심.js 를 곧바로 부르고, 키는 사람이 그때 넣는다.
 *
 *   이렇게 나눈 이유 — 알맹이 파일에 Node 전용 코드(fs·os)가 없어야 브라우저가 같은 코드를 쓴다 (원칙 9).
 */
import { 열쇠 } from './열쇠.mjs';
import { 회사들 } from './회사.js';
import { 물어보기 as 핵심물어보기, 여럿물어보기 as 핵심여럿, JSON풀기, 가림, 속도 } from './솔라핵심.js';

export { JSON풀기, 가림, 속도 };

/** 지금 쓸 회사가 OpenAI 모양인지 확인한다 — 아니면 조용히 실패하지 않고 말한다 (원칙 6) */
function 확인(K) {
  if (K.방식 !== 'openai')
    throw new Error(
      '「' + K.이름 + '」 는 이 기능(주제 묶기)에 아직 못 씁니다.\n' +
      '  쓸 수 있는 회사: ' + Object.values(회사들).filter(c => c.방식 === 'openai').map(c => c.이름).join(' · ') + '\n' +
      '  키 파일의 AI_곳 을 바꾸거나, 그 회사 키를 넣어 주세요.');
  return K;
}

/** 한 번 물어본다 (키는 알아서 찾아 넣는다) */
export async function 물어보기(옵션) {
  const K = 확인(열쇠(true, 옵션.곳));
  return 핵심물어보기({ ...옵션, 키: K.키, 바탕: 옵션.바탕 || K.바탕, 모델: 옵션.모델 || K.모델 });
}

/** 여러 개를 나눠서 물어본다 */
export async function 여럿물어보기(묶음들, 만들기, 옵션) {
  const K = 확인(열쇠(true));
  return 핵심여럿(묶음들, (묶, i) => {
    const o = 만들기(묶, i);
    return { ...o, 키: K.키, 바탕: o.바탕 || K.바탕, 모델: o.모델 || K.모델 };
  }, 옵션);
}
