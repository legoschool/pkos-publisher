/* 훑기 — 아무 폴더나 통째로 읽어 「자료 목록」 으로 만드는 부분 (Node 전용)
 *
 *  · 원본은 읽기만 한다. 절대 쓰지 않는다 (원칙 1)
 *  · 폴더 하나가 안 읽혀도 나머지는 계속 간다. 못 읽은 것은 세어서 돌려준다 (원칙 6)
 *  · 구글 드라이브가 느리므로 진행률을 알려 준다
 *  · 곁에 search-index.json (웹뷰어가 만든 색인) 이 있으면 그것을 빠른 길로 쓴다
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { 자료정리 } from './탐색.js';

const 건너뛸폴더 = /^([_.]|node_modules$|사진$|images$|그림$|img$|assets$)/i;
const 읽을확장 = /\.(md|txt|html?|json)$/i;
const 셀확장 = /\.(md|txt|html?|jpg|jpeg|png|gif|webp|bmp|avif|svg|pdf|pptx?|docx?|xlsx?|hwpx?|zip)$/i;
const 최대글크기 = 2 * 1024 * 1024;      // 2MB 넘는 글은 앞부분만

/** 폴더를 재귀로 훑어 파일 목록을 만든다 (아직 내용은 안 읽음) */
async function 파일찾기(뿌리, 지금 = '', 모음 = { 파일: [], 못읽음: [] }, 깊이 = 0) {
  if (깊이 > 6) return 모음;
  let 목록;
  try { 목록 = await readdir(join(뿌리, 지금), { withFileTypes: true }); }
  catch (e) { 모음.못읽음.push({ 이름: 지금 || '.', 까닭: '폴더를 못 읽음 (' + e.code + ')' }); return 모음; }

  for (const e of 목록) {
    const 상대 = 지금 ? 지금 + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (건너뛸폴더.test(e.name)) continue;
      await 파일찾기(뿌리, 상대, 모음, 깊이 + 1);
      continue;
    }
    if (!셀확장.test(e.name)) continue;
    if (/^[_.]/.test(e.name)) continue;
    모음.파일.push(상대);
  }
  return 모음;
}

/**
 * 폴더 하나를 훑어 자료 목록을 돌려준다.
 * @param {string} 뿌리 대상 폴더 (읽기만 함)
 * @param {{알림?:function, 최대?:number}} 옵션
 * @returns {Promise<{자료들:Array, 못읽음:Array, 뿌리:string, 색인썼나:boolean, 건너뛴수:number}>}
 */
export async function 폴더훑기(뿌리, { 알림, 최대 = 5000, 색인쓰기 = false } = {}) {
  const { 파일: 파일들, 못읽음 } = await 파일찾기(뿌리);

  // 빠른 길(색인)은 시켰을 때만. 색인 본문은 잘려 있어 글 길이·사진 수가 실제와 다르다.
  if (색인쓰기 || !파일들.length) {
    const 색인 = await 색인찾기(뿌리);
    if (색인) {
      알림?.('색인', 색인.자료들.length, 색인.자료들.length);
      return { ...색인, 못읽음: [...못읽음, ...색인.못읽음], 뿌리, 색인썼나: true, 건너뛴수: 0 };
    }
  }
  const 건너뛴수 = Math.max(0, 파일들.length - 최대);
  const 볼것 = 파일들.slice(0, 최대);

  const 자료들 = [];
  let 센것 = 0;
  for (const 상대 of 볼것) {
    const 곳 = join(뿌리, 상대);
    let 크기 = 0;
    try { 크기 = (await stat(곳)).size; } catch { }
    let 글 = '';
    if (읽을확장.test(상대)) {
      try { 글 = await readFile(곳, 'utf8'); if (글.length > 최대글크기) 글 = 글.slice(0, 최대글크기); }
      catch (e) { 못읽음.push({ 이름: 상대, 까닭: '파일을 못 읽음 (' + e.code + ')' }); continue; }
    }
    자료들.push(자료정리({ 이름: 상대, 글, 크기 }, 자료들.length));
    if (++센것 % 25 === 0) 알림?.('읽는 중', 센것, 볼것.length);
  }
  알림?.('다 읽음', 센것, 볼것.length);
  return { 자료들, 못읽음, 뿌리, 색인썼나: false, 건너뛴수 };
}

/** 웹뷰어가 만들어 둔 search-index.json 을 찾아 자료 목록으로 바꾼다 */
async function 색인찾기(뿌리) {
  for (const 곳 of [join(뿌리, 'search-index.json'), join(뿌리, '..', 'search-index.json')]) {
    let 글;
    try { 글 = await readFile(곳, 'utf8'); } catch { continue; }
    let j; try { j = JSON.parse(글); } catch { continue; }
    if (!Array.isArray(j) || !j.length || !j[0].t) continue;
    const { 글벗기기 } = await import('./탐색.js');
    const 자료들 = j.map((p, i) => {
      const 자 = 자료정리({ 이름: p.f || (p.t + '.html'), 글: '', 크기: (p.b || '').length }, i);
      자.제목 = p.t || 자.제목;
      자.날짜 = (p.d || '').slice(0, 10) || 자.날짜;
      자.종류 = '글';
      자.글자수 = (p.b || '').length;
      자.발췌 = (p.s || p.b || '').slice(0, 400);
      자.낱말 = [];
      return 자;
    });
    const { 낱말뽑기 } = await import('./탐색.js');
    자료들.forEach((자, i) => { 자.낱말 = 낱말뽑기(자.제목 + ' ' + 자.제목 + ' ' + 글벗기기((j[i].b || '').slice(0, 4000))); });
    return {
      자료들, 색인경로: 곳,
      못읽음: [{ 이름: '(색인을 씀)', 까닭: '색인 본문은 1200자에서 잘려 있고 사진 정보가 없어, 글 길이·사진 수는 실제와 다릅니다' }],
    };
  }
  return null;
}

/** 원본 파일 하나를 읽어 온다 (재구성 단계에서 게시본으로 옮길 때) */
export async function 원본읽기(뿌리, 상대) {
  return readFile(join(뿌리, 상대));
}

export { basename };
