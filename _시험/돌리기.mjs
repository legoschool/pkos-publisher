/* 시험 한 번에 돌리기 — 원본은 건드리지 않는다.
   임시 폴더에 공용/·디자인/ 을 복제하고, 더미 게시본 5개를 만들어 전부 빌드한 뒤 숫자를 확인한다.

   씀:  node _시험/돌리기.mjs            → 시험장 만들고 빌드하고 검사
        node _시험/돌리기.mjs --서버      → 위 + 시험장 서버 띄움 (http://localhost:8790/제작기.html)
   (프로젝트 폴더에서 실행)                                                          */
import { mkdir, cp, rm, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const 여기 = dirname(fileURLToPath(import.meta.url));
const 뿌리 = join(여기, '..');
const 시험장 = join(tmpdir(), '게시본제작기-시험장');

console.log('시험장: ' + 시험장);
await rm(시험장, { recursive:true, force:true });
await mkdir(시험장, { recursive:true });
for (const d of ['공용', '디자인']) await cp(join(뿌리, d), join(시험장, d), { recursive:true });
for (const f of ['_전체만들기.mjs', '_미리보기만들기.mjs', '_메모해석.mjs', '제작기.html'])
  await cp(join(뿌리, f), join(시험장, f));
await cp(여기, join(시험장, '_시험'), { recursive:true });
await mkdir(join(시험장, '게시본'), { recursive:true });

const 돌리기 = (파일, ...인자) => new Promise((res, rej) => {
  const p = spawn(process.execPath, [파일, ...인자], { cwd: 시험장, stdio: 'inherit' });
  p.on('exit', c => c === 0 ? res() : rej(new Error(파일 + ' 실패 (' + c + ')')));
});

console.log('\n── 더미 데이터 ──');
await 돌리기(join(시험장, '_시험', '더미만들기.mjs'));
console.log('\n── 전체 만들기 ──');
await 돌리기(join(시험장, '_전체만들기.mjs'));

/* 숫자 검사 — 여기가 틀리면 조판이 깨진 것 */
const { 게시본만들기, 메모줄쓰기 } = await import(pathToFileURL(join(시험장, '공용', '제작.js')).href);
const { 게시본폴더읽기, 디자인찾기 } = await import(pathToFileURL(join(시험장, '공용', '폴더읽기.mjs')).href);
process.chdir(시험장);
const 디자인들 = await 디자인찾기('디자인');
const 모음 = await 게시본폴더읽기('게시본/여행-기록');
const r = 게시본만들기({ 파일들:모음.파일, 폴더명:'여행-기록', 사진목록:모음.사진, 있는디자인:Object.keys(디자인들) });
const 사진 = r.자료들.flatMap(a => a.블록.filter(b => b.종류 === '사진'));
const 종류 = r.자료들.flatMap(a => a.블록.map(b => b.종류)).reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
/* 배치 7가지 — 같은 자료를 배치만 바꿔 만들어 표식이 들어갔는지 센다 */
const 배치표식 = { 나열:'class="접기줄"', 바둑판:'<details class="자료', 목록:'<details class="자료', 슬라이드:'class="슬라이드길"',
                  갤러리:'class="사진판"', 잡지:'배치-잡지', 타임라인:'배치-타임라인' };
const 배치됨 = {};
for (const 배치 of Object.keys(배치표식)) {
  const 파일들 = 모음.파일.map(f => f.이름 === '_메모.txt' ? { ...f, 글: 메모줄쓰기(f.글, [{ 열쇠:'배치', 값:배치 }]) } : f);
  const rr = 게시본만들기({ 파일들, 폴더명:'여행-기록', 사진목록:모음.사진, 있는디자인:Object.keys(디자인들) });
  배치됨[배치] = rr.메모.배치 === 배치 && rr.html.includes(배치표식[배치]) && rr.html.includes('배치-' + 배치);
}
/* 접기 — 17건이라 자동으로 접혀야 하고, '접기: 끄기' 면 다 펼쳐져야 한다 */
const 접힘수 = (r.html.match(/<details class="자료[^>]*>/g) || []).filter(t => !/ open>/.test(t)).length;
const 펼친 = 게시본만들기({ 파일들: 모음.파일.map(f => f.이름 === '_메모.txt' ? { ...f, 글: 메모줄쓰기(f.글, [{ 열쇠:'접기', 값:'끄기' }]) } : f),
                          폴더명:'여행-기록', 사진목록:모음.사진, 있는디자인:Object.keys(디자인들) });
const 펼침수 = (펼친.html.match(/<details class="자료[^>]*>/g) || []).filter(t => / open>/.test(t)).length;
const 접기됨 = 접힘수 === 17 && 펼침수 === 17 && r.html.includes('data-모두펼치기') && r.html.includes('<details class="장') && r.html.includes('<details class="목차');
const 기대 = { 디자인수: 12, 자료수: 17, 사진: 15, 붙음: 13, 장수: 2, 표: 1, 코드: 1, 목록: 4, 건너뜀: 1, 배치7종: 7, 접기: true };
const 실제 = { 디자인수: Object.keys(디자인들).length, 자료수: r.자료들.length, 사진: 사진.length, 붙음: 사진.filter(b => b.경로).length,
              장수: new Set(r.자료들.filter(a => a.장).map(a => a.장.키)).size, 표: 종류.표 || 0, 코드: 종류.코드 || 0, 목록: 종류.목록 || 0, 건너뜀: r.건너뜀.length,
              배치7종: Object.values(배치됨).filter(Boolean).length, 접기: 접기됨 };
if (!접기됨) console.log('  접기 상세: 접힘 ' + 접힘수 + '/17, 끄기일 때 펼침 ' + 펼침수 + '/17');
if (실제.배치7종 !== 7) console.log('  배치 실패:', Object.entries(배치됨).filter(([, v]) => !v).map(([k]) => k).join(', '));
console.log('\n── 검사 (여행-기록) ──');
let 틀림 = 0;
for (const k of Object.keys(기대)) {
  const 같음 = 기대[k] === 실제[k]; if (!같음) 틀림++;
  console.log((같음 ? '  ✓ ' : '  ✗ ') + k + ': ' + 실제[k] + (같음 ? '' : '  (기대 ' + 기대[k] + ')'));
}
console.log(틀림 ? '\n✗ ' + 틀림 + '건 어긋남' : '\n✓ 전부 맞음');

if (process.argv.includes('--서버')) {
  console.log('\n서버: http://localhost:8790/제작기.html   (Ctrl+C 로 끝)');
  await 돌리기(join(시험장, '_시험', '서버.mjs'), '.', '8790');
}
