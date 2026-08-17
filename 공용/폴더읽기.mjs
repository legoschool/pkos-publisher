/* Node 쪽에서 폴더를 훑는 부분. 브라우저 제작기는 이 자리에
   File System Access API 를 넣게 됩니다. 읽어 들이는 모양은 똑같습니다.
   확장자 규칙은 제작.js 한 곳에서만 정합니다.                              */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { 사진확장정규식, 글확장정규식 } from './제작.js';

export const 사진확장 = 사진확장정규식;
export const 글확장   = 글확장정규식;

export async function 게시본폴더읽기(뿌리, 지금 = '', 모음 = { 파일:[], 사진:[], 못읽음:[] }){
  let 목록;
  try { 목록 = await readdir(join(뿌리, 지금), { withFileTypes:true }); }
  catch (e) { 모음.못읽음.push((지금 || '.') + ' — ' + e.code); return 모음; }

  for (const e of 목록) {
    const 상대 = 지금 ? 지금 + '/' + e.name : e.name;
    if (e.isDirectory()) { await 게시본폴더읽기(뿌리, 상대, 모음); continue; }
    if (사진확장.test(e.name)) { 모음.사진.push(상대); continue; }
    if (글확장.test(e.name)) {
      try { 모음.파일.push({ 이름: 상대, 글: await readFile(join(뿌리, 상대), 'utf8') }); }
      catch (err) { 모음.못읽음.push(상대 + ' — ' + err.code); }
    } else
      모음.파일.push({ 이름: 상대, 이진: true });
  }
  return 모음;
}

/* 디자인/ 아래에서 연결.css 를 가진 폴더를 찾는다.
   목록을 코드에 적어 두지 않는다 — 폴더를 넣으면 늘고 빼면 준다. */
export async function 디자인찾기(디자인뿌리 = '디자인'){
  const 찾음 = {};
  let 목록;
  try { 목록 = await readdir(디자인뿌리, { withFileTypes:true }); }
  catch { return 찾음; }

  for (const e of 목록) {
    if (!e.isDirectory()) continue;
    try { await readFile(join(디자인뿌리, e.name, '연결.css'), 'utf8'); }
    catch { continue; }                                   // 연결.css 없으면 디자인이 아니다
    let 설정 = {};
    try { 설정 = JSON.parse(await readFile(join(디자인뿌리, e.name, '연결.json'), 'utf8')); }
    catch { /* 없어도 된다 */ }
    찾음[e.name] = 설정;
  }
  return 찾음;
}
