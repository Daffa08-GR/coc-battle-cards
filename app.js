'use strict';

const { simulate } = window.CocSimulator;
const STORAGE = { history: 'cocbc_history_v1', database: 'cocbc_database_v1' };
let lastSimulation = null;
let lastInput = null;
let toastTimer;

const $ = (id) => document.getElementById(id);
const num = (id) => Number($(id).value);
const fmt = (value, digits = 2) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
const safeRead = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
const safeWrite = (key, value) => localStorage.setItem(key, JSON.stringify(value));

function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}


function readForm() {
  const data = {
    troopName: $('troopName').value.trim() || 'Kelompok pasukan', maxHp: num('maxHp'), startHp: num('startHp'), regen: num('regen'), troopDps: num('troopDps'),
    targetName: $('targetName').value.trim() || 'Target', buildingHp: num('buildingHp'), travelTime: num('travelTime'), travelDps: num('travelDps'), attackDefenseDps: num('attackDefenseDps')
  };
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) throw new Error('Semua angka harus berupa nilai nol atau lebih.');
  }
  if (data.maxHp <= 0) throw new Error('HP maksimum harus lebih besar dari nol.');
  return data;
}

function renderResults(r) {
  $('results').classList.remove('hidden');
  const status = $('status-badge');
  const labels = { success: ['TARGET HANCUR', 'success'], 'died-travel': ['GUGUR DI PERJALANAN', 'danger'], 'died-attack': ['GUGUR SAAT MENYERANG', 'danger'], 'no-troop-dps': ['DPS PASUKAN NOL', 'warning'] };
  status.textContent = labels[r.status][0]; status.className = `status-badge ${labels[r.status][1]}`;
  $('out-final-hp').textContent = fmt(r.attack.finalHp);
  $('out-final-hp-note').textContent = `${r.input.troopName} · HP maksimum ${fmt(r.input.maxHp)}`;
  $('out-building-left').textContent = fmt(r.attack.buildingLeft);
  $('out-building-note').textContent = r.attack.destroyed ? 'Target berhasil dihancurkan' : r.status === 'died-travel' ? 'Belum mencapai target' : 'HP target masih tersisa';
  $('out-total-time').textContent = `${fmt(r.totalTime, 3)} dtk`;
  $('out-attack-time').textContent = `${fmt(r.attack.time, 3)} dtk`;
  $('out-attack-note').textContent = r.attack.died ? 'Berhenti saat pasukan gugur' : r.attack.destroyed ? 'Sampai target hancur' : 'Tidak ada damage ke target';
  $('out-start-hp').textContent = fmt(r.input.startHp);
  $('out-travel-damage').textContent = fmt(r.travel.damage);
  $('out-travel-regen').textContent = fmt(r.travel.regen);
  $('out-arrival-hp').textContent = fmt(r.travel.finalHp);
  $('travel-message').textContent = r.travel.died ? `Pasukan gugur setelah ${fmt(r.travel.deathTime, 3)} detik perjalanan.` : `Pasukan ${r.travel.time > 0 ? 'tiba' : 'langsung berada di target'} dengan ${fmt(r.travel.finalHp)} HP.`;
  $('out-attack-damage').textContent = fmt(r.attack.damage);
  $('out-attack-regen').textContent = fmt(r.attack.regen);
  $('out-attack-final-hp').textContent = fmt(r.attack.finalHp);
  $('out-attack-building-left').textContent = fmt(r.attack.buildingLeft);
  $('attack-message').textContent = r.status === 'died-travel' ? 'Fase menyerang tidak dimulai karena pasukan gugur saat perjalanan.' : r.status === 'no-troop-dps' ? 'DPS pasukan nol, sehingga HP bangunan tidak berkurang.' : r.attack.died ? `Pasukan gugur ${fmt(r.attack.time, 3)} detik setelah mulai menyerang. Bangunan masih memiliki ${fmt(r.attack.buildingLeft)} HP.` : r.attack.destroyed ? 'Bangunan hancur sebelum pasukan gugur.' : 'Bangunan belum hancur.';
  renderBreakdown(r);
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderBreakdown(r) {
  const rows = [
    ['Damage perjalanan', `${fmt(r.input.travelDps)} × ${fmt(r.input.travelTime)} = ${fmt(r.travel.damage)} HP`],
    ['Regenerasi kotor perjalanan', `${fmt(r.input.regen)} × ${fmt(r.travel.time)} = ${fmt(r.travel.regen)} HP`],
    ['HP saat tiba', `${fmt(r.input.startHp)} + regenerasi efektif − damage = ${fmt(r.travel.finalHp)} HP`],
    ['Waktu hancurkan target (jika hidup)', r.input.troopDps > 0 ? `${fmt(r.input.buildingHp)} ÷ ${fmt(r.input.troopDps)} = ${fmt(r.input.buildingHp / r.input.troopDps, 4)} detik` : 'Tidak terdefinisi karena DPS pasukan nol'],
    ['Damage pertahanan saat menyerang', `${fmt(r.input.attackDefenseDps)} × ${fmt(r.attack.time)} = ${fmt(r.attack.damage)} HP`],
    ['Regenerasi kotor saat menyerang', `${fmt(r.input.regen)} × ${fmt(r.attack.time)} = ${fmt(r.attack.regen)} HP`],
    ['Regenerasi terbuang saat HP penuh', `${fmt(r.travel.wastedRegen + r.attack.wastedRegen)} HP`],
    ['Total waktu', `${fmt(r.totalTime, 4)} detik`]
  ];
  $('calculation-breakdown').innerHTML = rows.map(([a,b]) => `<div class="calc-row"><b>${escapeHtml(a)}</b><br>${escapeHtml(b)}</div>`).join('');
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function analyze(r) {
  const items = [];
  if (r.status === 'died-travel') {
    items.push(['bad','Pasukan gugur sebelum tiba',`Dengan tekanan ${fmt(r.input.travelDps)} DPS dan regenerasi ${fmt(r.input.regen)} HP/detik, HP mencapai nol pada detik ke-${fmt(r.travel.deathTime,3)}. Periksa ulang durasi jalur atau DPS pertahanan yang benar-benar mengenai pasukan.`]);
  } else {
    items.push(['good','Pasukan berhasil melewati perjalanan',`HP saat tiba ${fmt(r.travel.finalHp)} dari maksimum ${fmt(r.input.maxHp)}.`]);
  }
  if (r.status === 'died-attack') items.push(['bad','Pasukan gugur sebelum target hancur',`Pasukan bertahan ${fmt(r.attack.time,3)} detik saat menyerang. Bangunan masih menyisakan ${fmt(r.attack.buildingLeft)} HP.`]);
  if (r.status === 'success') items.push(['good','Target berhasil dihancurkan',`Kelompok pasukan menyelesaikan serangan dalam ${fmt(r.attack.time,3)} detik setelah tiba.`]);
  if (r.status === 'no-troop-dps') items.push(['warn','Tidak ada damage serangan',`DPS pasukan bernilai nol. Bangunan tetap memiliki ${fmt(r.attack.buildingLeft)} HP; masukkan DPS yang sesuai jika kelompok memang dapat menyerang.`]);
  const net = r.input.attackDefenseDps - r.input.regen;
  if (net > 0) items.push(['warn','Tekanan pertahanan lebih besar dari regenerasi',`HP berkurang bersih ${fmt(net)} HP/detik selama HP belum menyentuh batas nol. Bandingkan DPS pertahanan dengan regenerasi kelompok.`]);
  else if (net < 0) items.push(['good','Regenerasi melebihi DPS pertahanan',`Secara matematis HP pulih ${fmt(-net)} HP/detik sampai mencapai batas maksimum. Saat HP sudah penuh, sebagian regenerasi menjadi terbuang.`]);
  else items.push(['warn','Regenerasi sama dengan DPS pertahanan','HP cenderung tetap pada nilai saat ini selama belum menyentuh batas maksimum atau nol.']);
  if (r.travel.wastedRegen + r.attack.wastedRegen > 0) items.push(['warn','Ada regenerasi yang terbuang',`${fmt(r.travel.wastedRegen + r.attack.wastedRegen)} HP regenerasi tidak menambah HP aktual karena HP mencapai batas maksimum.`]);
  if (r.input.startHp > r.input.maxHp) items.push(['warn','HP awal disesuaikan','HP awal yang dimasukkan lebih besar dari maksimum, sehingga simulasi memulai dari HP maksimum.']);
  if (r.input.troopDps > 0 && r.input.buildingHp > 0) items.push(['warn','Periksa estimasi durasi serangan',`Waktu hancur teoritis adalah ${fmt(r.input.buildingHp / r.input.troopDps,3)} detik jika DPS pasukan tetap konstan. Dalam kondisi game, DPS dapat berubah saat unit gugur atau target berpindah.`]);
  return items;
}
function renderAnalysis(r) {
  const items = analyze(r);
  $('analysis-content').className = 'panel';
  $('analysis-content').innerHTML = `<p class="eyebrow">HASIL BERDASARKAN SIMULASI</p><h2>${escapeHtml(r.input.troopName)} → ${escapeHtml(r.input.targetName)}</h2><p class="muted">${escapeHtml(r.status.replaceAll('-', ' '))} · total ${fmt(r.totalTime,3)} detik</p>` + items.map(([kind,title,body]) => `<article class="analysis-item ${kind}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join('');
}

function goPage(page) {
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  if (page === 'history') renderHistory();
  if (page === 'database') renderDatabase();
  if (page === 'analysis' && lastSimulation) renderAnalysis(lastSimulation);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHistory() {
  const list = safeRead(STORAGE.history);
  $('history-list').innerHTML = list.length ? list.map(item => `<article class="list-card"><div class="list-card-head"><div><h3>${escapeHtml(item.input.troopName)} → ${escapeHtml(item.input.targetName)}</h3><p>${new Date(item.createdAt).toLocaleString('id-ID')} · ${escapeHtml(item.statusLabel)}</p><p>HP akhir ${fmt(item.attack.finalHp)} · Bangunan sisa ${fmt(item.attack.buildingLeft)}</p></div></div><div class="list-actions"><button class="mini-btn" data-open-history="${item.id}">Buka hasil</button><button class="mini-btn delete" data-delete-history="${item.id}">Hapus</button></div></article>`).join('') : '<div class="empty-state">Belum ada simulasi tersimpan.</div>';
}
function saveHistory() {
  if (!lastSimulation) return;
  const list = safeRead(STORAGE.history);
  const statusLabel = lastSimulation.success ? 'Berhasil' : lastSimulation.status === 'died-travel' || lastSimulation.status === 'died-attack' ? 'Pasukan gugur' : 'Tidak berhasil';
  list.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2,7)}`, createdAt: new Date().toISOString(), statusLabel, ...lastSimulation });
  safeWrite(STORAGE.history, list.slice(0,100)); toast('Simulasi disimpan di perangkat.');
}

function renderDatabase() {
  const filter = $('dbFilter').value;
  const list = safeRead(STORAGE.database).filter(item => filter === 'all' || item.type === filter);
  const names = { troop: 'Pasukan', building: 'Bangunan', defense: 'Pertahanan' };
  $('database-list').innerHTML = list.length ? list.map(item => `<article class="list-card"><div class="list-card-head"><div><h3>${escapeHtml(item.name)} <span class="muted">· ${names[item.type]}</span></h3><p>HP: ${item.hp === null ? '—' : fmt(item.hp)} · DPS: ${item.dps === null ? '—' : fmt(item.dps)}</p>${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}</div></div><div class="list-actions"><button class="mini-btn delete" data-delete-db="${item.id}">Hapus</button></div></article>`).join('') : '<div class="empty-state">Database masih kosong. Tambahkan data pertamamu di atas.</div>';
}

$('calculator-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try { lastInput = readForm(); lastSimulation = simulate(lastInput); renderResults(lastSimulation); renderAnalysis(lastSimulation); }
  catch (error) { toast(error.message); }
});
$('reset-btn').addEventListener('click', () => { $('calculator-form').reset(); $('results').classList.add('hidden'); lastSimulation = null; lastInput = null; });
$('save-simulation').addEventListener('click', saveHistory);
$('analyze-now').addEventListener('click', () => goPage('analysis'));
$('go-calc').addEventListener('click', () => goPage('calculator'));
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => goPage(button.dataset.page)));
$('history-list').addEventListener('click', (event) => {
  const open = event.target.closest('[data-open-history]'); const del = event.target.closest('[data-delete-history]');
  if (open) { const item = safeRead(STORAGE.history).find(x => x.id === open.dataset.openHistory); if (item) { lastSimulation = item; lastInput = item.input; goPage('calculator'); renderResults(item); } }
  if (del) { safeWrite(STORAGE.history, safeRead(STORAGE.history).filter(x => x.id !== del.dataset.deleteHistory)); renderHistory(); toast('Riwayat dihapus.'); }
});
$('clear-history').addEventListener('click', () => { if (safeRead(STORAGE.history).length && confirm('Hapus seluruh riwayat simulasi?')) { safeWrite(STORAGE.history, []); renderHistory(); toast('Riwayat dihapus.'); } });
$('export-history').addEventListener('click', () => {
  const payload = { app: 'CoC Battle Calculator', version: 1, exportedAt: new Date().toISOString(), history: safeRead(STORAGE.history), database: safeRead(STORAGE.database) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `coc-battle-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); toast('File cadangan JSON dibuat.');
});
$('database-form').addEventListener('submit', (event) => {
  event.preventDefault(); const name = $('dbName').value.trim(); if (!name) return;
  const list = safeRead(STORAGE.database); list.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2,6)}`, type: $('dbType').value, name, hp: $('dbHp').value === '' ? null : Number($('dbHp').value), dps: $('dbDps').value === '' ? null : Number($('dbDps').value), notes: $('dbNotes').value.trim() });
  safeWrite(STORAGE.database, list); $('database-form').reset(); renderDatabase(); toast('Data disimpan.');
});
$('dbFilter').addEventListener('change', renderDatabase);
$('database-list').addEventListener('click', (event) => { const del = event.target.closest('[data-delete-db]'); if (del) { safeWrite(STORAGE.database, safeRead(STORAGE.database).filter(x => x.id !== del.dataset.deleteDb)); renderDatabase(); toast('Data dihapus.'); } });

// PWA service worker registration; app remains usable as a normal local web page too.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

