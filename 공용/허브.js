/* ============================================================
   통합 사이트 (허브) 만들기
   게시본 폴더들을 모아 목록 한 장을 만듭니다.
   '공개: 켜기' 인 것만 올라옵니다.
   제작.js 와 마찬가지로 DOM 을 쓰지 않아 브라우저·Node 공용입니다.
   ============================================================ */

import { 막기, 메모읽기, 기본디자인 } from './제작.js';

/* 게시본 하나의 요약을 뽑는다.
   { 폴더명, 메모, 자료들 }  ← 제작.js 의 게시본만들기() 결과를 그대로 넣으면 된다 */
export function 요약뽑기({ 폴더명, 메모, 자료들 }){
  const 사진들 = 자료들.flatMap(a => a.블록.filter(b => b.종류 === '사진' && b.경로));
  const 날짜들 = 자료들.map(a => a.날짜).filter(Boolean).sort();
  return {
    폴더명,
    제목: 메모.제목 || 폴더명,
    부제: 메모.부제 || '',
    공개: !!메모.공개,
    디자인: 메모.디자인,
    글수: 자료들.filter(a => a.유형 === '글' || a.유형 === '블로그').length,
    사진수: 자료들.reduce((n, a) => n + a.블록.filter(b => b.종류 === '사진').length, 0),
    붙은사진: 사진들.length,
    대표사진: 사진들.length ? 사진들[0].경로 : '',
    처음: 날짜들[0] || '',
    마지막: 날짜들[날짜들.length - 1] || ''
  };
}

export function 허브만들기({ 사이트메모, 요약들, 디자인설정, 만든때, 뿌리 }){
  const 메모 = typeof 사이트메모 === 'string' ? 메모읽기(사이트메모) : (사이트메모 || {});
  const 제목 = 메모.제목 || '내 기록';
  const 위 = 뿌리 || '..';
  const 설정 = 디자인설정 || {};
  const 배치 = 메모.배치 === '목록' ? '목록' : '바둑판';       // 허브는 바둑판(기본) 또는 목록
  const 겉 = [(설정.고를수있는겉 && 메모.결 && 설정.고를수있는겉[메모.결]) || 설정.겉class || '', '배치-' + 배치]
             .filter(Boolean).join(' ');
  const 디자인 = 메모.디자인 || 기본디자인;

  const 보일것 = 요약들.filter(s => s.공개);
  const 숨은수 = 요약들.length - 보일것.length;

  const 기간 = (s) => {
    if (!s.처음) return '';
    const a = s.처음.slice(0, 4), b = s.마지막.slice(0, 4);
    return a === b ? a : a + '–' + b;
  };

  const H = [];
  H.push('<!doctype html>');
  H.push('<html lang="ko"' + (겉 ? ' class="' + 막기(겉) + '"' : '') +
         ' data-디자인="' + 막기(디자인) + '">');
  H.push('<head><meta charset="utf-8">');
  H.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  H.push('<title>' + 막기(제목) + '</title>');
  H.push('<link rel="stylesheet" href="' + 위 + '/공용/부품.css">');
  H.push('<link rel="stylesheet" href="' + 위 + '/디자인/' + encodeURI(디자인) + '/연결.css">');
  H.push('</head><body><div class="판">');

  H.push('<header class="표지">');
  H.push('<h1>' + 막기(제목) + '</h1>');
  if (메모.부제) H.push('<p class="부제">' + 막기(메모.부제) + '</p>');
  H.push('<div class="집계"><span>📚 게시본 ' + 보일것.length + '개</span>' +
         '<span>📄 글 ' + 보일것.reduce((n, s) => n + s.글수, 0) + '건</span>' +
         '<span>🖼 사진 ' + 보일것.reduce((n, s) => n + s.붙은사진, 0) + '장</span></div>');
  H.push('</header>');

  if (!보일것.length) {
    H.push('<div class="빈안내">아직 공개된 게시본이 없습니다.<br>' +
           '게시본 폴더의 <b>_메모.txt</b> 에 <b>공개: 켜기</b> 라고 적으면 여기에 올라옵니다.</div>');
  } else {
    H.push('<div class="허브격자">');
    for (const s of 보일것) {
      const 곳 = 위 + '/게시본/' + encodeURI(s.폴더명) + '/index.html';
      H.push('<a class="게시본칸" href="' + 곳 + '">');
      H.push('<div class="그림">' + (s.대표사진
        ? '<img loading="lazy" alt="" src="' + 위 + '/게시본/' + encodeURI(s.폴더명) + '/' +
          s.대표사진.split('/').map(encodeURIComponent).join('/') + '">'
        : '<span class="없음">사진 없음</span>') + '</div>');
      H.push('<div class="속">');
      H.push('<h3>' + 막기(s.제목) + '</h3>');
      if (s.부제) H.push('<p class="곁">' + 막기(s.부제) + '</p>');
      const 셈 = [];
      if (기간(s)) 셈.push('<span>' + 막기(기간(s)) + '</span>');
      if (s.글수) 셈.push('<span>글 ' + s.글수 + '</span>');
      if (s.붙은사진) 셈.push('<span>사진 ' + s.붙은사진 + '</span>');
      H.push('<div class="셈">' + 셈.join('') + '</div>');
      H.push('</div></a>');
    }
    H.push('</div>');
  }

  H.push('<footer class="출처">');
  if (숨은수)
    H.push('<p>🔒 비공개 게시본 ' + 숨은수 + '개는 이 목록에 넣지 않았습니다. ' +
           '다만 <b>파일은 폴더에 그대로 있습니다</b> — 인터넷에 올릴 때 그 폴더를 빼야 ' +
           '진짜로 감춰집니다.</p>');
  H.push('<p class="만든표시">게시본 폴더의 자료로 자동 구성됐습니다. ' +
         '원본 파일은 고쳐지지 않았습니다. · 만든 때 ' + 막기(만든때 || '') + '</p>');
  H.push('</footer>');

  H.push('</div></body></html>');
  return H.join('\n');
}
