let subscriptions = [];
let popularSubs = [];
let guiltChart = null;
let currentResults = null;
let currentTab = 'wasters';

async function loadPopular() {
  try {
    const res = await fetch('/api/popular');
    popularSubs = await res.json();
    renderQuickTags();
  } catch(e) {}
}

function renderQuickTags() {
  const container = document.getElementById('quickTags');
  container.innerHTML = popularSubs.slice(0, 12).map(s =>
    `<button class="quick-tag" onclick="quickAdd('${s.name}', ${s.avg_price}, '${s.category}')">${s.name}</button>`
  ).join('');
}

function quickAdd(name, price, category) { addRow(name, price, category); }

let rowId = 0;
function addRow(name='', price='', category='Entertainment') {
  rowId++;
  const id = rowId;
  subscriptions.push(id);
  const div = document.createElement('div');
  div.className = 'sub-row';
  div.id = `row-${id}`;
  div.innerHTML = `
    <div><label>Subscription Name</label><input type="text" id="name-${id}" placeholder="e.g. Netflix" value="${name}"/></div>
    <div><label>Monthly Price ($)</label><input type="number" id="price-${id}" placeholder="9.99" value="${price}" min="0" step="0.01"/></div>
    <div><label>Times Used/Month</label><input type="number" id="usage-${id}" placeholder="0" min="0"/></div>
    <div><label>Category</label>
      <select id="category-${id}">
        <option ${category==='Entertainment'?'selected':''}>Entertainment</option>
        <option ${category==='Music'?'selected':''}>Music</option>
        <option ${category==='Productivity'?'selected':''}>Productivity</option>
        <option ${category==='Storage'?'selected':''}>Storage</option>
        <option ${category==='Education'?'selected':''}>Education</option>
        <option ${category==='Health'?'selected':''}>Health</option>
        <option ${category==='Professional'?'selected':''}>Professional</option>
        <option ${category==='AI/Productivity'?'selected':''}>AI/Productivity</option>
        <option ${category==='Shopping/Entertainment'?'selected':''}>Shopping</option>
        <option ${category==='Other'?'selected':''}>Other</option>
      </select>
    </div>
    <button class="delete-btn" onclick="deleteRow(${id})" title="Remove">✕</button>`;
  document.getElementById('subList').appendChild(div);
}

function deleteRow(id) {
  const el = document.getElementById(`row-${id}`);
  if (el) el.remove();
  subscriptions = subscriptions.filter(s => s !== id);
}

async function calculate() {
  const rows = subscriptions.map(id => {
    const el = document.getElementById(`row-${id}`);
    if (!el) return null;
    return {
      name: document.getElementById(`name-${id}`)?.value || 'Unknown',
      price: parseFloat(document.getElementById(`price-${id}`)?.value) || 0,
      usage: parseInt(document.getElementById(`usage-${id}`)?.value) || 0,
      category: document.getElementById(`category-${id}`)?.value || 'Other',
      billing: 'monthly'
    };
  }).filter(r => r && r.name && r.price > 0);

  if (rows.length === 0) { alert('Add at least one subscription first!'); return; }

  const nickname = document.getElementById('nicknameInput').value.trim() || 'Anonymous';

  try {
    const res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptions: rows, nickname })
    });
    const data = await res.json();
    currentResults = data;
    renderResults(data);
  } catch(e) {
    alert('Something went wrong. Make sure the server is running.');
  }
}

function renderResults(data) {
  const { results, summary } = data;
  document.getElementById('calculator').style.display = 'none';
  document.getElementById('results').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Frank verdict
  document.getElementById('frankIntro').textContent = summary.frank_intro;

  // Score
  const score = summary.overall_guilt;
  animateNumber('overallScore', score, 1500);
  document.getElementById('scoreGrade').textContent = summary.grade;
  document.getElementById('scorePercentile').textContent = `More wasteful than ${summary.percentile}% of users`;
  document.getElementById('scoreDesc').textContent = getScoreDesc(score);

  // Shake on high score
  if (score >= 70) {
    setTimeout(() => {
      document.getElementById('scoreCard').classList.add('shake');
      setTimeout(() => document.getElementById('scoreCard').classList.remove('shake'), 700);
    }, 1600);
  }

  // Confetti on low score, fire emoji rain on high score
  if (score <= 30) {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00C853','#FFE600','#7B2FFF'] });
  } else if (score >= 80) {
    fireEffect();
  }

  // Summary stats
  document.getElementById('monthlyTotal').textContent = `$${summary.total_monthly.toFixed(2)}`;
  document.getElementById('yearlyTotal').textContent = `$${summary.total_yearly.toFixed(2)}`;
  document.getElementById('wasteYearly').textContent = `$${summary.waste_yearly.toFixed(2)}`;
  const vsEl = document.getElementById('vsAverage');
  vsEl.textContent = `${summary.vs_average >= 0 ? '+' : ''}$${Math.abs(summary.vs_average).toFixed(0)}`;
  vsEl.style.color = summary.vs_average >= 0 ? 'var(--red)' : 'var(--green)';

  // Frank's Roasts
  const roastList = document.getElementById('roastList');
  roastList.innerHTML = results.map(r => `
    <div class="roast-item">
      <div class="roast-emoji">${getRoastEmoji(r.guilt_score)}</div>
      <div>
        <div class="roast-name">${r.name}</div>
        <div class="roast-text">${r.roast}</div>
      </div>
    </div>`).join('');

  // Breakdown
  document.getElementById('breakdownList').innerHTML = results.map(r => `
    <div class="breakdown-item">
      <div class="guilt-bar-wrap">
        <div class="guilt-bar-label">
          <span class="guilt-name">${r.name}</span>
          <span class="guilt-price">$${r.monthly_price}/mo · ${r.usage}x/month · $${r.cost_per_use}/use</span>
        </div>
        <div class="guilt-bar-bg"><div class="guilt-bar-fill" style="width:${r.guilt_score}%;background:${getBarColor(r.guilt_score)}"></div></div>
      </div>
      <span class="guilt-badge ${getBadgeClass(r.guilt_label)}">${r.guilt_label}</span>
    </div>`).join('');

  renderChart(results);

  // Cut List
  const cutItems = results.filter(r => r.is_waste);
  document.getElementById('cutList').innerHTML = cutItems.length === 0
    ? `<div style="text-align:center;color:var(--green);padding:32px;font-size:18px">🎉 Frank is shocked. You're actually fine.</div>`
    : cutItems.map(r => `
      <div class="cut-item">
        <div class="cut-info"><div class="cut-name">${r.name}</div><div class="cut-rec">${r.roast}</div></div>
        <div class="cut-savings">+$${(r.monthly_price*12).toFixed(0)}/yr</div>
      </div>`).join('');

  // Frank outro
  document.getElementById('frankOutro').textContent = `"${summary.frank_outro}" — Frank`;

  // Share card
  document.getElementById('shareScoreBig').textContent = score;
  document.getElementById('shareGradeBadge').textContent = summary.grade;
  document.getElementById('shareStats').innerHTML = `
    Wasting $${summary.waste_yearly.toFixed(0)}/year<br/>
    ${summary.num_subscriptions} subscriptions tracked<br/>
    More wasteful than ${summary.percentile}% of users`;

  // Leaderboard
  loadLeaderboard();
}

function fireEffect() {
  const emojis = ['🔥','💸','😭'];
  for (let i = 0; i < 15; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.cssText = `position:fixed;top:-40px;left:${Math.random()*100}vw;font-size:28px;z-index:9999;pointer-events:none;animation:fall ${1.5+Math.random()}s linear forwards`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    }, i * 120);
  }
  if (!document.getElementById('fallStyle')) {
    const s = document.createElement('style');
    s.id = 'fallStyle';
    s.textContent = '@keyframes fall{to{transform:translateY(110vh) rotate(360deg);opacity:0}}';
    document.head.appendChild(s);
  }
}

function renderChart(results) {
  const catMap = {};
  results.forEach(r => { catMap[r.category] = (catMap[r.category]||0) + r.monthly_price; });
  const labels = Object.keys(catMap);
  const values = Object.values(catMap);
  const colors = ['#FF2D55','#FF6B00','#FFE600','#7B2FFF','#00C853','#0099FF','#FF69B4','#00CED1'];
  if (guiltChart) guiltChart.destroy();
  const ctx = document.getElementById('guiltChart').getContext('2d');
  guiltChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0,labels.length), borderColor: '#1a1a1a', borderWidth: 3 }] },
    options: { plugins: { legend: { labels: { color: '#fff', font: { family: 'Inter', size: 13 }, padding: 16 } }, tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.toFixed(2)}/mo` } } } }
  });
}

async function loadLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    renderLeaderboard(data);
  } catch(e) {}
}

function renderLeaderboard(data) {
  const list = currentTab === 'wasters' ? data.top_wasters : data.top_savers;
  const isWasters = currentTab === 'wasters';
  const rankColors = ['gold','silver','bronze'];
  document.getElementById('leaderboardList').innerHTML = list.length === 0
    ? `<div style="text-align:center;color:var(--text-muted);padding:32px">No entries yet. You're first!</div>`
    : list.map((e, i) => `
      <div class="lb-item">
        <div class="lb-rank ${rankColors[i]||''}">${i+1}</div>
        <div class="lb-info">
          <div class="lb-name">${e.nickname}</div>
          <div class="lb-detail">$${e.waste_yearly}/yr wasted · ${e.date}</div>
        </div>
        <div class="lb-score ${isWasters?'':'good'}">${e.guilt_score}</div>
      </div>`).join('');
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  loadLeaderboard();
}

async function loadHallOfShame() {
  try {
    const res = await fetch('/api/hall-of-shame');
    const data = await res.json();
    if (data.length > 0) {
      const ticker = data.map(d => `${d.name} ignored by ${d.count} people 💸`).join('   ·   ');
      document.getElementById('tickerTrack').textContent = ticker + '   ·   ' + ticker;
    } else {
      document.getElementById('tickerTrack').textContent = 'Adobe Creative Cloud · Gym Membership · Peloton · LinkedIn Premium · Duolingo Plus';
    }
  } catch(e) {
    document.getElementById('tickerTrack').textContent = 'Adobe Creative Cloud · Gym Membership · Peloton · LinkedIn Premium · Duolingo Plus';
  }
}

function shareTwitter() {
  if (!currentResults) return;
  const s = currentResults.summary;
  const text = `I just got a ${s.overall_guilt}/100 guilt score on SubGuilt 💸\n\nI'm wasting $${s.waste_yearly.toFixed(0)}/year on subscriptions I barely use.\n\nFind out how guilty YOU should feel 👇\nsubguilt.app`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

function copyShareText() {
  if (!currentResults) return;
  const s = currentResults.summary;
  const text = `My SubGuilt score: ${s.overall_guilt}/100 (Grade: ${s.grade})\nI'm wasting $${s.waste_yearly.toFixed(0)}/year on unused subscriptions.\nMore wasteful than ${s.percentile}% of users.\nCheck yours at subguilt.app`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.share-btn.copy');
    btn.textContent = 'Copied! 🎉';
    setTimeout(() => btn.textContent = 'Copy Share Text', 2000);
  });
}

function getRoastEmoji(score) {
  if (score >= 85) return '💀';
  if (score >= 65) return '😬';
  if (score >= 40) return '🤨';
  if (score >= 20) return '😐';
  return '✅';
}

function getBarColor(score) {
  if (score >= 85) return 'var(--red)';
  if (score >= 65) return 'var(--orange)';
  if (score >= 40) return 'var(--yellow)';
  if (score >= 20) return '#a97cff';
  return 'var(--green)';
}

function getBadgeClass(label) {
  return { 'DEAD WEIGHT':'badge-dead','BARELY USED':'badge-barely','QUESTIONABLE':'badge-questionable','DECENT USE':'badge-decent','WORTH IT':'badge-worth' }[label] || 'badge-worth';
}

function getScoreDesc(score) {
  if (score >= 85) return "You are actively hemorrhaging money. Frank is horrified.";
  if (score >= 65) return "You're wasting a solid chunk of cash. Frank sighs deeply.";
  if (score >= 40) return "Could be better. Could be way worse. Frank shrugs.";
  if (score >= 20) return "Not bad. Frank gives you a reluctant nod.";
  return "You actually use what you pay for. Frank is suspicious.";
}

function animateNumber(id, target, duration) {
  const el = document.getElementById(id);
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function scrollToCalc() { document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' }); }

function resetCalc() {
  document.getElementById('results').style.display = 'none';
  document.getElementById('calculator').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('DOMContentLoaded', () => {
  loadPopular();
  loadHallOfShame();
  addRow();
});
