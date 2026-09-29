/* Microphone + role-play. Uses the browser's built-in SpeechRecognition (Chrome, Edge, Safari).
   No server needed. Loaded after app.js and shares its helpers (say, row, cp, addXP, quest, render...). */

/* ---------- microphone ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const norm = s => s.replace(/[0-9]/g, d => '零一二三四五六七八九'[d]).replace(/[\s，。！？、,.!?；：“”"'…]/g, '');
function listen() {
  return new Promise((ok, no) => {
    if (!SR) return no('unsupported');
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const r = new SR();
    r.lang = 'zh-CN'; r.maxAlternatives = 5;
    r.onresult = e => ok([...e.results[0]].map(a => a.transcript));
    r.onerror = e => no(e.error);
    r.onend = () => no('no-speech');
    r.start();
  });
}
const MIC_ERR = {
  unsupported: 'This browser cannot recognise speech. Use Chrome, Edge or Safari, or type your answer.',
  'not-allowed': 'Microphone is blocked. Allow the microphone for this site in your browser settings.',
  'no-speech': "I didn't hear anything. Tap 🎤 and try again.",
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection.'
};
const micMsg = e => MIC_ERR[e] || 'Could not listen (' + e + ').';
function lev(a, b) {
  const d = [...Array(a.length + 1)].map((_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const sim = (a, b) => { a = norm(a); b = norm(b); return 1 - lev(a, b) / Math.max(a.length, b.length, 1); };
function diff(heard, target) {
  const left = [...norm(target)];
  return [...norm(heard)].map(c => { const i = left.indexOf(c); if (i >= 0) left.splice(i, 1); return `<b class="${i >= 0 ? 'g' : 'r'}">${c}</b>`; }).join('');
}
const toBottom = () => setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
const noSR = () => SR ? '' : `<p class="fb bad">${MIC_ERR.unsupported}</p>`;

/* ---------- Speak tab: repeat a word or sentence ---------- */
const SP = {item: null, res: null, busy: false};
function spNext() {
  const p = [...LESSONS.filter(l => unlocked(l.id)).flatMap(l => l.w), ...DIALOGS.flatMap(d => d.l)];
  SP.item = p[Math.floor(Math.random() * p.length)]; SP.res = null;
}
function vSpeak() {
  if (!SP.item) spNext();
  const w = SP.item, r = SP.res;
  let out = '';
  if (SP.busy) out = '<p class="fb">🎤 Listening… speak now.</p>';
  else if (r && r.err) out = `<p class="fb bad">${r.err}</p>`;
  else if (r && r.score >= .8) out = `<p class="fb good">✓ Great! I heard: ${diff(r.heard, w[0])} (+5 XP)</p>`;
  else if (r) out = `<p class="fb bad">I heard: ${diff(r.heard, w[0])}<br>Green characters matched, red ones did not. Tap ▶, then repeat slowly, one syllable at a time. Tones change the meaning, so match the pinyin colours.</p>`;
  return `${noSR()}<div class="card big"><span class="hz">${w[0]}</span><br><span class="py">${cp(w[1])}</span><br><span class="en">${w[2]}</span></div>
<div class="row" style="justify-content:center"><button class="btn alt" data-say="${w[0]}">▶ Listen</button><button class="btn" data-act="sp-mic" ${SP.busy ? 'disabled' : ''}>🎤 Speak</button><button class="btn alt" data-act="sp-next">Next</button></div>${out}`;
}
async function spMic() {
  SP.busy = true; SP.res = null; render();
  try {
    const alts = await listen();
    const [score, heard] = alts.map(t => [sim(t, SP.item[0]), t]).sort((a, b) => b[0] - a[0])[0];
    SP.res = {score, heard};
    if (score >= .8) { addXP(5); quest('speak'); }
  } catch (e) { SP.res = {err: micMsg(e)}; }
  SP.busy = false; render();
}

/* ---------- Role-play ---------- */
const FOODS = {'米饭': ['mǐfàn', 'rice'], '面条': ['miàntiáo', 'noodles'], '饺子': ['jiǎozi', 'dumplings'], '鸡肉': ['jīròu', 'chicken'], '汤': ['tāng', 'soup']};
const DRINKS = {'水': ['shuǐ', 'water'], '茶': ['chá', 'tea'], '咖啡': ['kāfēi', 'coffee'], '果汁': ['guǒzhī', 'juice']};
const pick = (o, t) => Object.keys(o).find(k => t.includes(k));

/* A step = what the other person says (npc), a model answer, and check(text, ctx):
   return true (good), a string (why it's wrong + how to fix), or false (doesn't fit). */
const SCENES = [
 {t: 'At a restaurant', icon: '🍜', xp: 40, end: ['谢谢，再见！', 'xièxie, zàijiàn!', 'Thank you, goodbye!'], steps: [
  {npc: ['欢迎光临！几位？', 'huānyíng guānglín! jǐ wèi?', 'Welcome! How many people?'],
   model: ['两位。', 'liǎng wèi.', 'Two people.'],
   check: t => /二(位|个人)/.test(t) ? 'Say 两 (liǎng), not 二 (èr), before a measure word like 位 or 个: 两位。' : /(一|两|三|四|五|六)(位|个人)/.test(t)},
  {npc: ['好的，请坐。你想吃什么？我们有米饭、面条、饺子、鸡肉和汤。', 'hǎo de, qǐng zuò. nǐ xiǎng chī shénme? wǒmen yǒu mǐfàn, miàntiáo, jiǎozi, jīròu hé tāng.', 'Okay, please sit. What would you like to eat? We have rice, noodles, dumplings, chicken and soup.'],
   model: ['我要面条。', 'wǒ yào miàntiáo.', 'I want noodles.'],
   check: (t, C) => {
     const f = pick(FOODS, t);
     if (!f) return "I didn't catch a dish from the menu. Try: 我要面条 (wǒ yào miàntiáo).";
     if (/我想(?!要|吃)/.test(t)) return `想 (xiǎng) needs a verb after it. Say 我想吃${f} or simply 我要${f}。`;
     if (!/我要|我想要|我想吃|来一|来个|给我/.test(t)) return `Add 我要 (wǒ yào, "I want") before the dish to make a full sentence: 我要${f}。`;
     C.food = f; return true;
   }},
  {npc: C => [`好的，${C.food}。你要喝什么？我们有水、茶、咖啡和果汁。`, `hǎo de, ${FOODS[C.food][0]}. nǐ yào hē shénme? wǒmen yǒu shuǐ, chá, kāfēi hé guǒzhī.`, `Okay, ${FOODS[C.food][1]}. What would you like to drink? We have water, tea, coffee and juice.`],
   model: ['我要茶。', 'wǒ yào chá.', 'I want tea.'],
   check: (t, C) => {
     const d = pick(DRINKS, t);
     if (!d) return "I didn't catch a drink. Try: 我要茶 (wǒ yào chá).";
     if (/吃(水|茶|咖啡|果汁)/.test(t)) return `For drinks use 喝 (hē, "to drink"), not 吃 (chī, "to eat"): 我要喝${d}。`;
     if (/我想(?!要|喝)/.test(t)) return `想 (xiǎng) needs a verb after it. Say 我想喝${d} or simply 我要${d}。`;
     if (!/我要|我想要|我想喝|来一|来杯|给我/.test(t)) return `Add 我要 (wǒ yào, "I want") before the drink: 我要${d}。`;
     C.drink = d; return true;
   }},
  {npc: C => [`好的，${C.drink}。还要别的吗？`, `hǎo de, ${DRINKS[C.drink][0]}. hái yào bié de ma?`, `Okay, ${DRINKS[C.drink][1]}. Anything else?`],
   model: ['不要了，谢谢。多少钱？', 'bú yào le, xièxie. duōshao qián?', 'No more, thanks. How much?'],
   check: t => /多少钱|买单|结账/.test(t) ? true : /不要了|不用了|够了|没有了/.test(t) ? 'A polite "no" — well done! Now also ask for the bill: 多少钱？(duōshao qián?)' : false},
  {npc: ['一共五十块。', 'yígòng wǔshí kuài.', 'Total: 50 yuan.'],
   model: ['给你，谢谢。', 'gěi nǐ, xièxie.', 'Here you go, thank you.'],
   check: t => /给你|谢谢|好的/.test(t)}
 ]},
 {t: 'Meeting a new friend', icon: '👋', xp: 30, end: ['太好了！再见！', 'tài hǎo le! zàijiàn!', 'Great! Goodbye!'], steps: [
  {npc: ['你好！你叫什么名字？', "nǐ hǎo! nǐ jiào shénme míngzi?", "Hello! What's your name?"],
   model: ['我叫小明。', 'wǒ jiào Xiǎomíng.', 'My name is Xiaoming.'],
   check: t => /我是叫/.test(t) ? "Don't put 是 before 叫. Say 我叫小明 (wǒ jiào …) or 我是小明 (wǒ shì …)." : /我(叫|是|的名字是).+/.test(t)},
  {npc: ['很高兴认识你！你是哪国人？', 'hěn gāoxìng rènshi nǐ! nǐ shì nǎ guó rén?', 'Nice to meet you! Where are you from?'],
   model: ['我是加拿大人。', 'wǒ shì Jiānádà rén.', 'I am Canadian.'],
   check: t => /我(来自|从).+/.test(t) ? true : /我是(加拿大|中国|美国|法国|英国|日本)$/.test(t) ? 'Add 人 (rén, "person") after the country: 我是加拿大人 = "I am Canadian".' : /我是.+人/.test(t)},
  {npc: ['你是学生吗？', 'nǐ shì xuésheng ma?', 'Are you a student?'],
   model: ['是，我是学生。', 'shì, wǒ shì xuésheng.', 'Yes, I am a student.'],
   check: t => /^我?学生/.test(t) ? 'Use 是 (shì, "to be") between the subject and the noun: 我是学生。' : /是|不是/.test(t)}
 ]}
];

const RPS = {sc: null, i: 0, log: [], ctx: {}, hint: false, busy: false, over: false};
const rpLine = () => { const n = SCENES[RPS.sc].steps[RPS.i].npc; return typeof n === 'function' ? n(RPS.ctx) : n; };
function rpPush(k, v) { RPS.log.push({k, v}); }

function vRP() {
  if (RPS.sc === null) return `<h2>Role-play</h2><p class="en">Act out a real situation. Answer out loud with 🎤 or type in Chinese. I'll reply, and explain any mistake.</p>` +
    SCENES.map((s, i) => `<button class="card lesson" data-act="rp-start" data-id="${i}"><span><b>${s.icon} ${s.t}</b><small>${s.steps.length} turns</small></span><span class="tag">Start</span></button>`).join('');
  const S_ = SCENES[RPS.sc];
  const msgs = RPS.log.map(m =>
    m.k === 'npc' ? `<div class="bub">${row(m.v)}</div>` :
    m.k === 'me' ? `<div class="bub b"><div class="w me"><div class="wm"><span class="hz">${m.v}</span></div></div></div>` :
    `<div class="fb ${m.ok ? 'good' : 'bad'}">${m.v}${m.model ? row(m.model) : ''}</div>`).join('');
  const bar = RPS.over
    ? `<div class="row"><button class="btn" data-act="rp-start" data-id="${RPS.sc}">Play again</button><button class="btn alt" data-act="rp-end">All scenes</button></div>`
    : `${RPS.hint ? `<div class="fb">Model answer:${row(S_.steps[RPS.i].model)}</div>` : ''}${noSR()}${RPS.busy ? '<p class="fb">🎤 Listening… speak now.</p>' : ''}
<div class="chatbar"><button class="btn" data-act="rp-mic" aria-label="Speak" ${RPS.busy ? 'disabled' : ''}>🎤</button><input id="rpin" type="text" lang="zh" placeholder="Type in Chinese…" autocomplete="off"><button class="btn alt" data-act="rp-send">Send</button><button class="btn alt" data-act="rp-hint">Hint</button></div>`;
  return `<button class="btn alt" data-act="rp-end">← All scenes</button><h2>${S_.icon} ${S_.t}</h2>${msgs}${bar}`;
}

function rpStart(i) {
  Object.assign(RPS, {sc: i, i: 0, log: [], ctx: {}, hint: false, busy: false, over: false});
  const l = rpLine(); rpPush('npc', l); say(l[0], false);
  render(); toBottom();
}
function rpAnswer(alts) {
  const st = SCENES[RPS.sc].steps[RPS.i];
  let pass = alts.find(a => st.check(norm(a), RPS.ctx) === true);
  rpPush('me', pass || alts[0]);
  if (pass) {
    RPS.i++; RPS.hint = false;
    if (RPS.i >= SCENES[RPS.sc].steps.length) {
      const s = SCENES[RPS.sc];
      rpPush('npc', s.end); say(s.end[0], false);
      rpPush('fb', `Conversation complete! +${s.xp} XP`); RPS.log[RPS.log.length - 1].ok = true;
      RPS.over = true; addXP(s.xp);
    } else { const l = rpLine(); rpPush('npc', l); say(l[0], false); }
  } else {
    const r = st.check(norm(alts[0]), RPS.ctx);
    RPS.log.push({k: 'fb', ok: false, model: st.model,
      v: typeof r === 'string' ? r : "That doesn't answer the question. Listen again (▶), then try the model answer:"});
  }
  render(); toBottom();
}
async function rpMic() {
  RPS.busy = true; render(); toBottom();
  try { const alts = await listen(); RPS.busy = false; rpAnswer(alts); }
  catch (e) { RPS.busy = false; RPS.log.push({k: 'fb', ok: false, v: micMsg(e)}); render(); toBottom(); }
}

/* ---------- wiring ---------- */
VIEWS.speak = vSpeak; VIEWS.rp = vRP;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const d = b.dataset, a = d.act;
  if (a === 'sp-mic') spMic();
  else if (a === 'sp-next') { spNext(); render(); }
  else if (a === 'rp-start') rpStart(+d.id);
  else if (a === 'rp-end') { RPS.sc = null; render(); }
  else if (a === 'rp-mic') rpMic();
  else if (a === 'rp-hint') { RPS.hint = !RPS.hint; const v = $('#rpin').value; render(); $('#rpin').value = v; toBottom(); }
  else if (a === 'rp-send') { const v = $('#rpin').value.trim(); if (v) rpAnswer([v]); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'rpin') { const v = e.target.value.trim(); if (v) rpAnswer([v]); }
});
