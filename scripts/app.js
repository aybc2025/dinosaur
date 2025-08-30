
'use strict';
(function(){
  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const state = { dinos: [], filtered: [], quizIndex: 0, quizScore: 0, quizQ: [] };

  // Theme toggle
  const themeBtn = qs('#toggleTheme');
  const appEl = qs('#app');
  const storedTheme = localStorage.getItem('theme');
  if(storedTheme){ document.documentElement.setAttribute('data-theme', storedTheme); themeBtn.setAttribute('aria-pressed', String(storedTheme!=='light')); }
  themeBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? '' : 'light';
    if(next) document.documentElement.setAttribute('data-theme', next); else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', next);
    themeBtn.setAttribute('aria-pressed', String(next!=='light'));
  });

  // Load data
  fetch('data/dinos.json').then(r=>r.json()).then(d=>{ state.dinos = d; render(); buildQuiz(); }).catch(()=>{
    // Fallback minimal data if fetch fails (e.g., first run without folders)
    state.dinos = [
      {id:'trex', name_he:'טירנוזאורוס רקס', name_en:'Tyrannosaurus rex', period:'קרטיקון', diet:'טורף', length_m:12, weight_t:8.8, continent:['צפון אמריקה'], traits:['שיניים ענקיות','ראייה טובה']},
      {id:'trike', name_he:'טריצרטופס', name_en:'Triceratops', period:'קרטיקון', diet:'צמחוני', length_m:9, weight_t:6, continent:['צפון אמריקה'], traits:['שלוש קרניים','מגן ראש']},
      {id:'velo', name_he:'ולוצירפטור', name_en:'Velociraptor', period:'קרטיקון', diet:'טורף', length_m:2, weight_t:0.015, continent:['אסיה'], traits:['זריז','יתכן נוצות']}
    ];
    render(); buildQuiz();
  });

  // Controls
  qs('#searchInput').addEventListener('input', render);
  qs('#periodSelect').addEventListener('change', render);
  qs('#dietSelect').addEventListener('change', render);

  function render(){
    const term = qs('#searchInput').value.trim().toLowerCase();
    const period = qs('#periodSelect').value;
    const diet = qs('#dietSelect').value;

    state.filtered = state.dinos.filter(d=>{
      const byTerm = !term || d.name_he.toLowerCase().includes(term) || d.name_en.toLowerCase().includes(term);
      const byPeriod = !period || d.period === period;
      const byDiet = !diet || d.diet === diet;
      return byTerm && byPeriod && byDiet;
    });

    qs('#resultsCount').textContent = `${state.filtered.length} תוצאות`;

    const list = qs('#cards');
    list.innerHTML = '';
    const frag = document.createDocumentFragment();

    for(const d of state.filtered){
      const li = document.createElement('li');
      li.className = 'card';

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.setAttribute('aria-hidden','true');
      thumb.textContent = '🦖';

      const body = document.createElement('div');
      body.className = 'body';

      const h3 = document.createElement('h3');
      h3.textContent = `${d.name_he} · ${d.name_en}`;

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<span>תקופה: <b>${d.period}</b></span><span>תזונה: <b>${d.diet}</b></span>`;

      const pills = document.createElement('div');
      pills.className = 'pills';
      const pl = (label)=>{ const s=document.createElement('span'); s.className='pill'; s.textContent=label; return s; };
      if(d.length_m) pills.append(pl(`${d.length_m} מ' אורך (משוער)`));
      if(d.weight_t) pills.append(pl(`${d.weight_t} טון`));
      if(Array.isArray(d.traits)) d.traits.slice(0,3).forEach(t=>pills.append(pl(t)));

      body.append(h3, meta, pills);
      li.append(thumb, body);
      frag.append(li);
    }

    list.append(frag);
  }

  // Basic Quiz (5 random questions)
  const QCOUNT = 5;
  function buildQuiz(){
    const pool = [];
    for(const d of state.dinos){
      // Q1: period
      pool.push({q:`באיזו תקופה חי ${d.name_he}?`, correct:d.period, options:shuffle(unique([d.period,'טריאס','יורה','קרטיקון'])).slice(0,3)});
      // Q2: diet
      pool.push({q:`מה אכל ${d.name_he}?`, correct:d.diet, options:shuffle(unique([d.diet,'צמחוני','טורף','כללי'])).slice(0,3)});
    }
    state.quizQ = shuffle(pool).slice(0,QCOUNT);
  }
  function unique(arr){ return [...new Set(arr)]; }
  function shuffle(arr){ return arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); }

  const quizDlg = qs('#quizDialog');
  const quizBody = qs('#quizBody');
  const quizBtn = qs('#openQuiz');
  const nextBtn = qs('#quizNext');

  quizBtn.addEventListener('click', ()=>{ state.quizIndex=0; state.quizScore=0; buildQuiz(); showQuestion(); quizDlg.showModal(); });
  nextBtn.addEventListener('click', ()=>{ if(state.quizIndex < state.quizQ.length){ showQuestion(); } else { quizDlg.close(); }});

  function showQuestion(){
    const i = state.quizIndex++;
    if(i>=state.quizQ.length){
      quizBody.innerHTML = `<p>סיום! ניקוד: <b>${state.quizScore}/${state.quizQ.length}</b></p>`;
      nextBtn.textContent = 'סגור';
      return;
    }
    nextBtn.textContent = 'הבא';
    const {q, correct, options} = state.quizQ[i];
    const opts = shuffle(unique([correct, ...options]));
    quizBody.innerHTML = `
      <p class="question">${q}</p>
      <div class="answers" role="group" aria-label="תשובות">
        ${opts.map((o,j)=>`<label class="answer"><input type="radio" name="q${i}" value="${o}" ${j===0?'checked':''}> <span>${o}</span></label>`).join('')}
      </div>
    `;
    // attach handlers
    qsa('.answer input').forEach(inp=>{
      inp.addEventListener('change', ()=>{
        const val = inp.value;
        qsa('.answer').forEach(l=>l.classList.remove('correct','wrong'));
        const lab = inp.closest('.answer');
        if(val===correct){ lab.classList.add('correct'); state.quizScore++; }
        else { lab.classList.add('wrong'); }
      }, {once:true});
    });
  }

  // Register SW (optional; ignore errors on GitHub Pages dev)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('pwa/sw.js').catch(()=>{});
  }
})();
