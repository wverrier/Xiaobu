/* 小步 Xiǎobù – beginner Chinese. Content is plain data: add lessons/dialogues below. */
const LESSONS = [
 {id:1,t:'Greetings',w:[['你好','nǐ hǎo','Hello'],['谢谢','xièxie','Thank you'],['不客气','bú kèqi',"You're welcome"],['再见','zàijiàn','Goodbye'],['对不起','duìbuqǐ','Sorry'],['没关系','méi guānxi',"It's okay"],['请','qǐng','Please'],['早上好','zǎoshang hǎo','Good morning']]},
 {id:2,t:'About me',w:[['我','wǒ','I / me'],['你','nǐ','You'],['是','shì','To be'],['叫','jiào','To be called'],['名字','míngzi','Name'],['学生','xuésheng','Student'],['中国','Zhōngguó','China'],['加拿大','Jiānádà','Canada']]},
 {id:3,t:'Numbers 1–10',w:[['一','yī','One'],['二','èr','Two'],['三','sān','Three'],['四','sì','Four'],['五','wǔ','Five'],['六','liù','Six'],['七','qī','Seven'],['八','bā','Eight'],['九','jiǔ','Nine'],['十','shí','Ten']]},
 {id:4,t:'Food & drink',w:[['水','shuǐ','Water'],['茶','chá','Tea'],['咖啡','kāfēi','Coffee'],['米饭','mǐfàn','Rice'],['我要','wǒ yào','I want'],['好吃','hǎochī','Delicious'],['多少钱','duōshao qián','How much?'],['太贵了','tài guì le','Too expensive']]}
];
const DIALOGS = [
 {t:'Meeting someone',l:[['你好！','nǐ hǎo!','Hello!'],['你好！你叫什么名字？','nǐ hǎo! nǐ jiào shénme míngzi?',"Hello! What's your name?"],['我叫小明。你呢？','wǒ jiào Xiǎomíng. nǐ ne?','My name is Xiaoming. And you?'],['我叫大卫。很高兴认识你。','wǒ jiào Dàwèi. hěn gāoxìng rènshi nǐ.',"I'm David. Nice to meet you."],['我也是。再见！','wǒ yě shì. zàijiàn!','Me too. Goodbye!']]},
 {t:'Ordering coffee',l:[['你好，我要一杯咖啡。','nǐ hǎo, wǒ yào yì bēi kāfēi.','Hello, I want a coffee.'],['好的。还要别的吗？','hǎo de. hái yào bié de ma?','Okay. Anything else?'],['不要了，谢谢。多少钱？','bú yào le, xièxie. duōshao qián?',"No thanks. How much?"],['二十块。','èrshí kuài.','20 yuan.'],['给你。谢谢！','gěi nǐ. xièxie!','Here you go. Thank you!']]}
];
const QUESTS = [
 {k:'listen',n:10,xp:20,t:'Listen to 10 words or sentences'},
 {k:'quiz',n:5,xp:30,t:'Get 5 quiz answers right'},
 {k:'lesson',n:1,xp:40,t:'Finish a lesson'}
];

/* ---------- state ---------- */
const $ = s => document.querySelector(s);
const today = () => new Date().toLocaleDateString('en-CA');
const yest = () => new Date(Date.now() - 864e5).toLocaleDateString('en-CA');
const DEF = {xp:0,streak:0,last:'',done:[],bank:[],day:'',q:{listen:0,quiz:0,lesson:0},paid:[]};
let S = Object.assign({}, DEF);
try { Object.assign(S, JSON.parse(localStorage.getItem('xiaobu') || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem('xiaobu', JSON.stringify(S)); } catch (e) {} };
if (S.day !== today()) { S.day = today(); S.q = {listen:0,quiz:0,lesson:0}; S.paid = []; }

const MAP = {};
LESSONS.forEach(l => l.w.forEach(w => MAP[w[0]] = w));
DIALOGS.forEach(d => d.l.forEach(w => MAP[w[0]] = w));

let tab = 'learn', openLesson = null, quiz = null, run = 0;

/* ---------- helpers ---------- */
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200); }
function touch() { if (S.last !== today()) { S.streak = S.last === yest() ? S.streak + 1 : 1; S.last = today(); } }
function addXP(n) { touch(); S.xp += n; save(); }
function quest(k, n = 1) {
  S.q[k] += n;
  QUESTS.forEach(q => { if (S.q[q.k] >= q.n && !S.paid.includes(q.k)) { S.paid.push(q.k); addXP(q.xp); toast('Quest done: +' + q.xp + ' XP'); } });
  save();
}
const TN = {}; [['āēīōūǖ',1],['áéíóúǘ',2],['ǎěǐǒǔǚ',3],['àèìòùǜ',4]].forEach(([s,n]) => [...s].forEach(c => TN[c] = n));
const cp = p => p.replace(/[āēīōūǖáéíóúǘǎěǐǒǔǚàèìòùǜ]/g, c => `<i class="t${TN[c]}">${c}</i>`);

/* ---------- speech ---------- */
let voices = [];
const loadV = () => { voices = speechSynthesis.getVoices().filter(v => /^zh/i.test(v.lang)); $('#novoice').hidden = voices.length > 0 || !speechSynthesis.getVoices().length; };
if ('speechSynthesis' in window) { loadV(); speechSynthesis.onvoiceschanged = loadV; }
function say(text, count = true) {
  return new Promise(res => {
    if (!('speechSynthesis' in window)) { toast('Speech is not supported in this browser'); return res(); }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    const v = voices.find(v => /zh[-_]CN/i.test(v.lang)) || voices[0];
    if (v) u.voice = v;
    u.rate = +$('#rate').value;
    u.onend = u.onerror = () => res();
    speechSynthesis.speak(u);
    if (count) quest('listen');
  });
}

/* ---------- views ---------- */
const row = w => `<div class="w"><button class="pl" data-say="${w[0]}" aria-label="Play ${w[0]}">▶</button>
<div class="wm"><span class="hz">${w[0]}</span><span class="py">${cp(w[1])}</span><span class="en">${w[2]}</span></div>
<button class="st ${S.bank.includes(w[0]) ? 'on' : ''}" data-star="${w[0]}" aria-label="Save to my words">★</button></div>`;
const unlocked = id => id === 1 || S.done.includes(id - 1);

function vLearn() {
  if (openLesson) {
    const L = LESSONS.find(l => l.id === openLesson), done = S.done.includes(L.id);
    return `<button class="btn alt" data-act="back">← Lessons</button><h2>${L.id}. ${L.t}</h2>
${L.w.map(row).join('')}
<div class="row"><button class="btn" data-act="finish">${done ? 'Lesson complete ✓' : 'Finish lesson (+50 XP)'}</button></div>
<p class="en">Tap ▶ to listen. Tap ★ to keep a word in My words. Pinyin tone colours: <span class="py"><i class="t1">ā</i> <i class="t2">á</i> <i class="t3">ǎ</i> <i class="t4">à</i></span> (1st, 2nd, 3rd, 4th tone).</p>`;
  }
  return `<h2>Today's quests</h2>` + QUESTS.map(q => {
    const v = Math.min(S.q[q.k], q.n);
    return `<div class="card quest ${S.paid.includes(q.k) ? 'ok' : ''}"><div class="m">${q.t}<div class="bar"><i style="width:${v / q.n * 100}%"></i></div></div><span class="tag">${S.paid.includes(q.k) ? '✓' : '+' + q.xp + ' XP'}</span></div>`;
  }).join('') + `<h2>Lessons</h2>` + LESSONS.map(l => `<button class="card lesson" data-act="open" data-id="${l.id}" ${unlocked(l.id) ? '' : 'disabled'}>
<span><b>${l.id}. ${l.t}</b><small>${l.w.length} words${unlocked(l.id) ? '' : ' · finish the previous lesson to unlock'}</small></span>
<span class="tag">${S.done.includes(l.id) ? '✓' : unlocked(l.id) ? 'Start' : '🔒'}</span></button>`).join('');
}

function vTalk() {
  return DIALOGS.map((d, i) => `<h2>${d.t}</h2><div class="row"><button class="btn" data-act="playall" data-id="${i}">▶ Play whole conversation</button></div>` +
    d.l.map((w, j) => `<div class="bub ${j % 2 ? 'b' : ''}">${row(w)}</div>`).join('')).join('');
}

function vWords() {
  const list = S.bank.map(h => MAP[h]).filter(Boolean);
  if (!list.length) return `<div class="empty">Nothing here yet.<br>Finish a lesson or tap ★ on a word to save it.</div>`;
  return `<h2>${list.length} saved</h2>${list.map(row).join('')}`;
}

/* ---------- quiz ---------- */
const shuffle = a => a.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
function pool() { return LESSONS.filter(l => unlocked(l.id)).flatMap(l => l.w); }
function newQ() {
  const p = pool(), t = p[Math.floor(Math.random() * p.length)];
  const opts = shuffle([t, ...shuffle(p.filter(w => w !== t)).slice(0, 3)]);
  quiz.cur = {t, opts, type: Math.random() < .5 ? 'listen' : 'read', picked: null};
  if (quiz.cur.type === 'listen') say(t[0], false);
}
function vQuiz() {
  if (!quiz) return `<div class="empty"><p>10 questions. Listen and pick the word, or read and pick the meaning. +5 XP per correct answer.</p><button class="btn" data-act="qstart">Start quiz</button></div>`;
  if (quiz.n >= 10) return `<div class="empty"><h2>Score: ${quiz.score} / 10</h2><p>+${quiz.score * 5} XP earned</p><button class="btn" data-act="qstart">Play again</button></div>`;
  const c = quiz.cur, listen = c.type === 'listen';
  return `<p class="en">Question ${quiz.n + 1} of 10</p>
<div class="big">${listen ? `<button class="pl" data-say="${c.t[0]}" aria-label="Play again">▶</button><p>What did you hear?</p>` : `<span class="hz">${c.t[0]}</span><br><span class="py">${cp(c.t[1])}</span><br><button class="pl" data-say="${c.t[0]}" aria-label="Play">▶</button>`}</div>
<div class="opts">${c.opts.map((o, i) => {
    const cls = c.picked === null ? '' : o === c.t ? 'right' : i === c.picked ? 'bad' : '';
    return `<button class="opt ${cls}" data-act="ans" data-i="${i}" ${c.picked !== null ? 'disabled' : ''}>${listen ? `<span class="hz">${o[0]}</span><span class="py">${cp(o[1])}</span>` : o[2]}</button>`;
  }).join('')}</div>
${c.picked !== null ? `<div class="row"><button class="btn" data-act="next">${quiz.n >= 9 ? 'See score' : 'Next'}</button></div>` : ''}`;
}

/* ---------- render ---------- */
function render() {
  const lv = Math.floor(S.xp / 100) + 1, alive = S.last === today() || S.last === yest();
  $('#lv').textContent = 'Level ' + lv;
  $('#xpbar').style.width = S.xp % 100 + '%';
  $('#xptxt').textContent = S.xp % 100 + '/100 XP';
  $('#streak').textContent = '🔥 ' + (alive ? S.streak : 0);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#main').innerHTML = {learn: vLearn, talk: vTalk, quiz: vQuiz, words: vWords}[tab]();
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-say],[data-star],[data-tab],[data-act]');
  if (!b) return;
  const d = b.dataset;
  if (d.say) { run++; say(d.say); render(); return; }
  if (d.star) {
    const i = S.bank.indexOf(d.star);
    i >= 0 ? S.bank.splice(i, 1) : S.bank.push(d.star);
    save(); render(); return;
  }
  if (d.tab) { run++; tab = d.tab; openLesson = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); render(); window.scrollTo(0, 0); return; }
  switch (d.act) {
    case 'open': openLesson = +d.id; break;
    case 'back': openLesson = null; break;
    case 'finish': {
      if (!S.done.includes(openLesson)) {
        S.done.push(openLesson);
        LESSONS.find(l => l.id === openLesson).w.forEach(w => { if (!S.bank.includes(w[0])) S.bank.push(w[0]); });
        addXP(50); quest('lesson'); toast('Lesson complete! Words added to My words.');
      }
      openLesson = null; break;
    }
    case 'playall': {
      const my = ++run;
      for (const w of DIALOGS[+d.id].l) { if (my !== run) break; await say(w[0]); await new Promise(r => setTimeout(r, 500)); }
      return;
    }
    case 'qstart': quiz = {n: 0, score: 0}; newQ(); break;
    case 'ans': {
      const c = quiz.cur; if (c.picked !== null) return;
      c.picked = +d.i;
      if (c.opts[c.picked] === c.t) { quiz.score++; addXP(5); quest('quiz'); }
      break;
    }
    case 'next': quiz.n++; if (quiz.n < 10) newQ(); break;
  }
  save(); render();
});
render();
