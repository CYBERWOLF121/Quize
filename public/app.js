(() => {
  const api = (path, opts={}) => fetch('/api'+path, opts).then(r=>r.json());

  // Index page logic
  if (document.getElementById('registerForm')){
    const statusEl = document.getElementById('status');
    const showStatus = (m, err)=>{ if (!statusEl) return; statusEl.style.display = m? 'block':'none'; statusEl.innerText = m||''; statusEl.style.color = err? '#ffb3b3':'#ffdca3'; };

    fetch('/api/winners').then(r=>r.json()).then(d=>{ document.getElementById('liveWinners').innerText = 'Live Winners: '+(d.winnersCount||0); }).catch(()=>{});
    fetch('/api/config').then(r=>r.json()).then(cfg=>{ if (cfg && cfg.entryKey) document.getElementById('r_key').value = cfg.entryKey; }).catch(()=>{});

    const requestBtn = document.getElementById('requestKeyBtn');
    if (requestBtn) requestBtn.addEventListener('click', ()=>{ window.location.href = 'mailto:admin@example.com?subject=Request%20entry%20key&body=Please%20send%20the%20entry%20key%20for%20the%20quiz.%0AUID:%20%0AUsername:%20'; });

    const register = document.getElementById('registerForm');
    register.addEventListener('submit', async e=>{
      e.preventDefault(); showStatus('');
      const username = document.getElementById('r_username').value.trim();
      const uid = document.getElementById('r_uid').value.trim();
      const password = document.getElementById('r_password').value;
      let key = document.getElementById('r_key').value.trim();
      if (!key){ try{ const cfg = await api('/config'); key = cfg.entryKey || ''; if (key) document.getElementById('r_key').value = key; }catch(e){} }
      if (!username||!uid||!password||!key) return showStatus('Fill all fields including entry key', true);
      showStatus('Registering...');
      const res = await api('/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,uid,password,entryKey:key})});
      if (res.error) return showStatus('Error: '+res.error, true);
      localStorage.setItem('ff_token', res.token);
      location.href = '/quiz.html';
    });

    const login = document.getElementById('loginForm');
    login.addEventListener('submit', async e=>{
      e.preventDefault(); showStatus('');
      const uid = document.getElementById('l_uid').value.trim();
      const password = document.getElementById('l_password').value;
      if (!uid||!password) return showStatus('Enter UID and password', true);
      showStatus('Logging in...');
      const res = await api('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({uid,password})});
      if (res.error) return showStatus('Error: '+res.error, true);
      localStorage.setItem('ff_token', res.token);
      location.href = '/quiz.html';
    });
  }

  // Quiz page
  if (document.getElementById('questionSlide')){
    let uid = localStorage.getItem('ff_token');
    const overlay = document.getElementById('loginOverlay');
    if (!uid){
      if (overlay) overlay.classList.remove('hidden');
      // wire overlay login
      const overlayLogin = document.getElementById('overlay_login');
      if (overlayLogin){
        overlayLogin.onclick = async ()=>{
          const ou = document.getElementById('overlay_uid').value.trim();
          const op = document.getElementById('overlay_password').value;
          if (!ou || !op) return alert('Enter UID and password');
          const res = await api('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({uid:ou,password:op})});
          if (res.error) return alert('Login error: '+res.error);
          localStorage.setItem('ff_token', res.token);
          uid = res.token;
          if (overlay) overlay.classList.add('hidden');
          start();
        };
      }
      // don't auto-redirect; wait for overlay login
    }
    let questions = [];
    let index = 0;
    let answers = [];
    let timer = 120;
    let timerInterval;
    let score = 0;

    const liveCount = document.getElementById('liveCount');

    const start = async ()=>{
      const cfg = await api('/config'); timer = cfg.timerSeconds||120; updateTimer();
      const qres = await api('/questions?uid='+encodeURIComponent(uid));
      console.log('questions response', qres);
      if (qres.error) { alert(qres.error); localStorage.removeItem('ff_token'); return location.href = '/'; }
      questions = qres.questions || [];
      if (!questions.length){
        const slide = document.getElementById('questionSlide');
        slide.innerHTML = '<div class="card"><h3>No questions available</h3><p>Please contact admin.</p></div>';
        return;
      }
      renderQuestion();
      timerInterval = setInterval(()=>{ timer--; updateTimer(); if (timer<=0){ clearInterval(timerInterval); fetch('/api/ban',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({uid})}).then(()=>{ alert('Time ended — you are banned'); localStorage.removeItem('ff_token'); location.href='/'; }); } },1000);
      setInterval(async ()=>{ try{ const w = await api('/winners'); liveCount.innerText = w.winnersCount; }catch(e){} },5000);
    };

    function updateTimer(){ const m = Math.floor(timer/60).toString().padStart(2,'0'); const s = (timer%60).toString().padStart(2,'0'); document.getElementById('timer').innerText = `${m}:${s}`; }

    function renderQuestion(){
      const q = questions[index];
      const slideCard = document.getElementById('questionSlide');
      // animate in
      slideCard.classList.remove('anim-out');
      slideCard.classList.add('anim-in');
      setTimeout(()=> slideCard.classList.remove('anim-in'), 350);

      document.getElementById('qnum').innerText = `Question ${index+1} / ${questions.length}`;
      document.getElementById('question').innerText = q.q;
      const choices = document.getElementById('choices'); choices.innerHTML = '';
      q.choices.forEach((c,i)=>{
        const d = document.createElement('div'); d.className='choice'; d.innerText = c;
        d.onclick = ()=> selectChoice(i);
        choices.appendChild(d);
      });
      document.getElementById('scoreDisplay').innerText = `Score: ${score}`;
    }

    function selectChoice(i){
      const q = questions[index];
      const els = Array.from(document.querySelectorAll('#choices .choice'));
      if (els.some(el=>el.classList.contains('disabled'))) return;
      els.forEach(el=>el.classList.add('disabled'));
      answers[index] = i;
      const correct = (typeof q.a!=='undefined')? q.a : null;
      if (correct!==null && i===correct){ els[i].classList.add('correct'); score = score + 1; }
      else { els[i].classList.add('wrong'); if (correct!==null && els[correct]) els[correct].classList.add('correct'); score = Math.max(0, score-1); }
      document.getElementById('scoreDisplay').innerText = `Score: ${score}`;
      // animate out then advance
      const slideCard = document.getElementById('questionSlide');
      slideCard.classList.add('anim-out');
      setTimeout(()=>{
        slideCard.classList.remove('anim-out');
        if (index < questions.length-1){ index++; renderQuestion(); }
        else finishQuiz();
      }, 320);
    }

    async function finishQuiz(){ clearInterval(timerInterval); const res = await api('/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({uid,answers})}); const rd = document.getElementById('result'); rd.classList.remove('hidden'); if (res.score===res.total){ rd.innerHTML = `<h2>You had won!</h2><p>Score: ${res.score}/${res.total}</p>`; if (res.awarded){ rd.innerHTML += `<p>Redeem Code: <strong>${res.awarded}</strong></p><button id="copyBtn">Copy</button>`; setTimeout(()=>{ document.getElementById('copyBtn').onclick = ()=>{ navigator.clipboard.writeText(res.awarded); alert('Copied'); }; },50); } else rd.innerHTML += `<p>Perfect but codes exhausted.</p>`; } else { rd.innerHTML = `<h2>Finished</h2><p>Score: ${res.score}/${res.total}</p>`; } }

    document.addEventListener('visibilitychange', ()=>{ if (document.hidden){ fetch('/api/report-blur',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({uid})}).then(()=>{ alert('You were banned for leaving the quiz'); localStorage.removeItem('ff_token'); location.href='/'; }); } });

    document.getElementById('nextBtn').addEventListener('click', ()=>{ if (index < questions.length-1){ index++; renderQuestion(); } else finishQuiz(); });

    start();
  }

})();
