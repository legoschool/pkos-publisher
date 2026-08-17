/* AI 연결이 진짜 되는지 한 번 확인한다.  씀:  node _시험\솔라시험.mjs
   키가 없으면 "없다"고만 말하고 조용히 끝난다 (1층은 키 없이도 돌아야 하니까). */
import { 물어보기 } from '../공용/솔라.mjs';
import { 열쇠, 키파일 } from '../공용/열쇠.mjs';

const K = 열쇠(false);
console.log('키 파일 :', 키파일);
console.log('키      :', K.보임, '(가려서 찍음)');
console.log('모델    :', K.모델, '· 바탕:', K.바탕);
if (!K.있나) { console.log('\n키가 없습니다. AI 기능만 못 씁니다 — 만들기·미리보기는 그대로 됩니다.'); process.exitCode = 0; }
else await 해보기();

async function 해보기() {

const 스키마 = {
  type: 'object', additionalProperties: false, required: ['묶음'],
  properties: { 묶음: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['이름', '번호들', '까닭'],
    properties: { 이름: { type: 'string' }, 번호들: { type: 'array', items: { type: 'integer' } }, 까닭: { type: 'string' } },
  } } },
};

try {
  const r = await 물어보기({
    체계: '너는 한국어 자료를 주제별로 묶는 도우미다. 반드시 JSON 하나만 답한다.',
    물음: '다음 글 제목을 주제로 묶어라.\n1) 협동학습 연수 1일차\n2) 인공지능 활용 선도교사 연수\n3) 학부모 상담 주간 안내\n4) 협동학습 연구회 10월',
    스키마,
  });
  console.log('\n걸린 시간:', r.걸린초 + '초 · 토큰 들어감', r.쓴토큰.들어감, '나옴', r.쓴토큰.나옴, '· 답한 모델', r.모델);
  console.log(JSON.stringify(r.값, null, 2));
  const 묶음 = r.값?.묶음;
  const 맞나 = Array.isArray(묶음) && 묶음.length >= 2 && 묶음.every(m => m.이름 && Array.isArray(m.번호들) && m.까닭);
  console.log(맞나 ? '\n✓ 연결 됨 — 모양도 맞습니다.' : '\n✗ 답은 왔는데 모양이 이상합니다. 위 JSON 을 보세요.');
  process.exitCode = 맞나 ? 0 : 1;
} catch (e) {
  console.error('\n✗ 실패:', e.message);
  process.exitCode = 1;
}
}
