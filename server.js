const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const DATA = path.join(__dirname, 'data.json');

function load(){
  if (!fs.existsSync(DATA)) return null;
  return JSON.parse(fs.readFileSync(DATA,'utf8'));
}
function save(d){ fs.writeFileSync(DATA, JSON.stringify(d,null,2)); }

function makeDefault(){
  const key = 'FFg' + Math.floor(1000 + Math.random()*2001);
  const d = {
    entryKey: key,
    users: [],
    banned: [],
    winners: [],
    sessions: {},
    questions: generateQuestions()
  };
  save(d);
  return d;
}

function generateQuestions(){
  const easy = [
    {q:'What does HP stand for in Free Fire?', choices:['High Power','Health Points','Hero Points','Hit Points'], a:1, diff:'easy'},
    {q:'Which mode is classic battle royale?', choices:['Clash Squad','Ranked','Battle Royale','Deathmatch'], a:2, diff:'easy'},
    {q:'What item restores HP?', choices:['Grenade','Medkit','Armor','Helmet'], a:1, diff:'easy'},
    {q:'Which is a melee weapon?', choices:['M4A1','Pan','AWM','MP5'], a:1, diff:'easy'},
    {q:'How many players in a normal BR squad?', choices:['2','3','4','5'], a:2, diff:'easy'},
    {q:'Which company publishes Free Fire?', choices:['Activision','Garena','EA','Ubisoft'], a:1, diff:'easy'},
    {q:'Which item provides temporary cover?', choices:['Gloo Wall','Medkit','Helmet','Backpack'], a:0, diff:'easy'},
    {q:'Which zone is safe on map (example)?', choices:['Red','Blue','Green','Yellow'], a:1, diff:'easy'},
    {q:'What helps revive faster?', choices:['Bandage','Gloo Wall','Medkit','Revive Kit'], a:3, diff:'easy'},
    {q:'Which is an SMG?', choices:['AWM','MP40','M4A1','Kar98'], a:1, diff:'easy'}
  ];
  const hard = [
    {q:'Which character ability reduces fall damage?', choices:['Chrono','K','Jota','Dasha'], a:0, diff:'hard'},
    {q:'Which attachment reduces recoil most?', choices:['Extended Mag','Muzzle','Compensator','Laser'], a:2, diff:'hard'},
    {q:'Which gun is preferred for long-range headshots?', choices:['M4A1','SCAR','AWM','M1014'], a:2, diff:'hard'},
    {q:'What is Clash Squad max team size?', choices:['2','3','4','5'], a:2, diff:'hard'},
    {q:'Which item blocks bullets temporarily?', choices:['Helmet','Armor','Gloo Wall','Medkit'], a:2, diff:'hard'}
  ];
  return easy.concat(hard);
}

function shuffle(arr){
  for (let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'public')));

let data = load() || makeDefault();
// Ensure questions exist even if data.json was created without them
if (!data.questions || !data.questions.length){
  data.questions = generateQuestions();
  save(data);
}

app.get('/api/config',(req,res)=>{
  data = load() || data;
  res.json({ entryKey: data.entryKey, timerSeconds: 120 });
});

app.post('/api/register',(req,res)=>{
  const { username, uid, password, entryKey } = req.body||{};
  data = load() || data;
  if (!username||!uid||!password||!entryKey) return res.status(400).json({ error:'Missing fields' });
  if (data.banned.includes(uid)) return res.status(403).json({ error:'UID banned' });
  // accept server key or pattern FFg#### between 1000-3000
  const match = /^FFg(\d{4})$/.exec(entryKey);
  const ok = entryKey===data.entryKey || (match && Number(match[1])>=1000 && Number(match[1])<=3000);
  if (!ok) return res.status(403).json({ error:'Invalid entry key' });
  if (data.users.find(u=>u.uid===uid)) return res.status(400).json({ error:'UID already registered' });
  data.users.push({ username, uid, password });
  save(data);
  res.json({ ok:true, token:uid });
});

app.post('/api/login',(req,res)=>{
  const { uid, password } = req.body||{};
  data = load() || data;
  if (!uid||!password) return res.status(400).json({ error:'Missing fields' });
  if (data.banned.includes(uid)) return res.status(403).json({ error:'UID banned' });
  const u = data.users.find(x=>x.uid===uid && x.password===password);
  if (!u) return res.status(401).json({ error:'Invalid credentials' });
  res.json({ ok:true, token:uid });
});

app.get('/api/questions',(req,res)=>{
  const uid = req.query.uid;
  data = load() || data;
  if (!uid) return res.status(400).json({ error:'Missing uid' });
  if (data.banned.includes(uid)) return res.status(403).json({ error:'UID banned' });
  const qs = data.questions.slice();
  const easy = qs.filter(q=>q.diff==='easy');
  const hard = qs.filter(q=>q.diff==='hard');
  shuffle(easy); shuffle(hard);
  const pick = easy.slice(0,10).concat(hard.slice(0,5));
  shuffle(pick);
  data.sessions = data.sessions || {};
  data.sessions[uid] = pick.map((q,i)=>({ id:i+1, q:q.q, choices:q.choices, a:q.a }));
  save(data);
  res.json({ questions: data.sessions[uid] });
});

app.post('/api/report-blur',(req,res)=>{
  const { uid } = req.body||{};
  data = load() || data;
  if (!uid) return res.status(400).json({ error:'Missing uid' });
  if (!data.banned.includes(uid)) data.banned.push(uid);
  save(data);
  res.json({ ok:true, banned:true });
});

app.post('/api/submit',(req,res)=>{
  const { uid, answers } = req.body||{};
  data = load() || data;
  if (!uid || !answers) return res.status(400).json({ error:'Missing fields' });
  if (data.banned.includes(uid)) return res.status(403).json({ error:'UID banned' });
  if (!data.sessions || !data.sessions[uid]) return res.status(400).json({ error:'No active session' });
  const pick = data.sessions[uid];
  let correct = 0;
  for (let i=0;i<pick.length;i++){ if (answers[i] === pick[i].a) correct++; }
  const total = pick.length;
  let awarded = null;
  if (correct===total){
    if (data.winners.length < 4){
      const code = 'FF-REDEEM' + String(Math.floor(1000 + Math.random()*2001)).padStart(4,'0');
      data.winners.push({ uid, username:(data.users.find(u=>u.uid===uid)||{}).username||uid, code });
      awarded = code;
      save(data);
    }
  }
  res.json({ score: correct, total, awarded, winnersCount: data.winners.length });
});

app.get('/api/winners',(req,res)=>{
  data = load() || data;
  res.json({ winners: data.winners, winnersCount: data.winners.length });
});

app.post('/api/ban',(req,res)=>{
  const { uid } = req.body||{};
  data = load() || data;
  if (!uid) return res.status(400).json({ error:'Missing uid' });
  if (!data.banned.includes(uid)) data.banned.push(uid);
  save(data);
  res.json({ ok:true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  data = load() || data;
  console.log('Server running on http://localhost:'+PORT);
  console.log('Entry key:', data.entryKey);
});
