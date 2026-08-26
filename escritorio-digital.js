// ── ESCRITORIO DA LOJA ──
// Este arquivo concentra tudo do Escritorio Digital (calendario de conteudo,
// planejamento mensal, rotina comercial, atividades e funis). E carregado
// via <script src="escritorio-digital.js"> pelo index.html, depois do script
// principal — por isso pode usar livremente _sb, CU, toast, uid(), getTodayStr()
// e os demais helpers globais definidos la.
//
// Os dados aqui NAO ficam mais so no navegador: cada leitura/gravacao fala
// direto com o Supabase (tabelas eo_eventos, eo_rotinas, eo_atividades,
// eo_metas, eo_funis, eo_planejamento_mensal), a mesma logica ja usada pelo
// resto do sistema (RLS por store_id = auth.uid()).

// ── Persistencia generica ──
async function eoBulkUpsert(table, rows) {
  if (!CU || !rows || !rows.length) return;
  var payload = rows.map(function(r){ var row = Object.assign({}, r); row.store_id = CU.id; return row; });
  var { error } = await _sb.from(table).upsert(payload);
  if (error) { console.error(table, error); toast('Erro ao salvar. Verifique sua conexao.', 'e'); }
}
async function eoDelete(table, id) {
  if (!CU) return;
  var { error } = await _sb.from(table).delete().eq('id', id).eq('store_id', CU.id);
  if (error) { console.error(table, error); toast('Erro ao excluir. Verifique sua conexao.', 'e'); }
}

// ── Mapeamento JS <-> colunas do banco (nomes diferem em alguns campos) ──
function eventoToRow(e){ return {id:e.id, titulo:e.titulo, tipo:e.tipo, status:e.status, data:e.data||null, resp:e.resp, objetivo:e.objetivo, campanha:e.campanha, obs:e.obs}; }
function rowToEvento(row){ return {id:row.id, titulo:row.titulo, tipo:row.tipo, status:row.status, data:row.data, resp:row.resp, objetivo:row.objetivo, campanha:row.campanha, obs:row.obs}; }

function rotinaToRow(r){ return {id:r.id, nome:r.nome, dia:r.dia, hora:r.hora, resp:r.resp, descricao:r.desc, checklist:r.checklist||[], check_done:r.checkDone||{}}; }
function rowToRotina(row){ return {id:row.id, nome:row.nome, dia:row.dia, hora:row.hora, resp:row.resp, desc:row.descricao, checklist:row.checklist||[], checkDone:row.check_done||{}}; }

function atividadeToRow(a){ return {id:a.id, titulo:a.titulo, data:a.data||null, prio:a.prio, resp:a.resp, status:a.status, obs:a.obs, checklist:a.checklist||[]}; }
function rowToAtividade(row){ return {id:row.id, titulo:row.titulo, data:row.data, prio:row.prio, resp:row.resp, status:row.status, obs:row.obs, checklist:row.checklist||[]}; }

function metaToRow(m){ return {id:m.id, titulo:m.titulo, cat:m.cat, no_dashboard:!!m.no_dashboard, unidade:m.unidade, inicio:m.inicio||null, fim:m.fim||null, alvo:m.alvo, atual:m.atual, descricao:m.desc, funil_id:m.funil_id||null, criada_em:m.criadaEm||null}; }
function rowToMeta(row){ return {id:row.id, titulo:row.titulo, cat:row.cat, no_dashboard:row.no_dashboard, unidade:row.unidade, inicio:row.inicio, fim:row.fim, alvo:row.alvo, atual:row.atual, desc:row.descricao, funil_id:row.funil_id, criadaEm:row.criada_em}; }

function funilToRow(f){ return {id:f.id, tipo:f.tipo, nome:f.nome, objetivo:f.objetivo, inicio:f.inicio||null, fim:f.fim||null, responsavel:f.responsavel, canal:f.canal, descricao:f.descricao, publico:f.publico, obs:f.obs, status:f.status, checklist:f.checklist||[], resultados:f.resultados||{}, meta_id:f.meta_id||null, aberto: f._open!==false}; }
function rowToFunil(row){ return {id:row.id, tipo:row.tipo, nome:row.nome, objetivo:row.objetivo, inicio:row.inicio, fim:row.fim, responsavel:row.responsavel, canal:row.canal, descricao:row.descricao, publico:row.publico, obs:row.obs, status:row.status, checklist:row.checklist||[], resultados:row.resultados||{}, meta_id:row.meta_id, _open: row.aberto!==false}; }

// ── Funcoes de salvamento chamadas pelas telas (substituem os antigos slpSet) ──
function saveEventos(){ eoBulkUpsert('eo_eventos', _eventos.map(eventoToRow)); }
function saveRotinas(){ eoBulkUpsert('eo_rotinas', _rotinas.map(rotinaToRow)); }
function saveAtividades(){ eoBulkUpsert('eo_atividades', _atividades.map(atividadeToRow)); }
function saveMetas(){ eoBulkUpsert('eo_metas', _metas.map(metaToRow)); }
async function savePlanMes(key){
  if (!CU) return;
  var p = _planMes[key] || {};
  var row = {store_id:CU.id, mes:key, tema:p.tema||'', objetivo:p.objetivo||'', campanhas:p.campanhas||'', datas:p.datas||'', narrativa:p.narrativa||'', obs:p.obs||''};
  var { error } = await _sb.from('eo_planejamento_mensal').upsert(row, {onConflict:'store_id,mes'});
  if (error) { console.error('eo_planejamento_mensal', error); toast('Erro ao salvar planejamento. Verifique sua conexao.', 'e'); }
}

// ── Carga inicial (chamada no login, no lugar do antigo slpGet) ──
async function carregarEscritorioDigital(){
  if (!CU) { _eventos=[]; _rotinas=[]; _atividades=[]; _metas=[]; _funis=[]; _planMes={}; return; }
  var [ev, rot, ativ, met, fun, plan] = await Promise.all([
    _sb.from('eo_eventos').select('*').eq('store_id', CU.id),
    _sb.from('eo_rotinas').select('*').eq('store_id', CU.id),
    _sb.from('eo_atividades').select('*').eq('store_id', CU.id),
    _sb.from('eo_metas').select('*').eq('store_id', CU.id),
    _sb.from('eo_funis').select('*').eq('store_id', CU.id),
    _sb.from('eo_planejamento_mensal').select('*').eq('store_id', CU.id)
  ]);
  var erro = ev.error || rot.error || ativ.error || met.error || fun.error || plan.error;
  if (erro) { console.error('Erro ao carregar Escritorio Digital', erro); toast('Erro ao carregar o Escritorio Digital. Puxe para atualizar.', 'e'); }
  _eventos = (ev.data||[]).map(rowToEvento);
  _rotinas = (rot.data||[]).map(rowToRotina);
  _atividades = (ativ.data||[]).map(rowToAtividade);
  _metas = (met.data||[]).map(rowToMeta);
  _funis = (fun.data||[]).map(rowToFunil);
  _planMes = {};
  (plan.data||[]).forEach(function(row){
    _planMes[row.mes] = {tema:row.tema, objetivo:row.objetivo, campanhas:row.campanhas, datas:row.datas, narrativa:row.narrativa, obs:row.obs};
  });
}

var _calAno = new Date().getFullYear();
var _calMes = new Date().getMonth();
var _eventos = [];
var _metas = [];
var _tarefas = [];
// HELPER vendedoras
function spSelectHtml(valorAtual) {
  return '<option value="">— Selecionar —</option>' +
    (_sp||[]).map(function(s){
      return '<option value="' + s.name + '"' + (valorAtual===s.name?' selected':'') + '>' + s.name + '</option>';
    }).join('') +
    '<option value="__manual__"' + (valorAtual&&!(_sp||[]).find(function(s){return s.name===valorAtual;})?'  selected':'') + '>Outro (digitar)</option>';
}
function getResponsavelValue(selectId, inputId) {
  var sel = document.getElementById(selectId);
  var inp = document.getElementById(inputId);
  if (!sel) return '';
  return sel.value === '__manual__' ? (inp ? inp.value.trim() : '') : sel.value;
}
function onRespChange(selEl, manualId) {
  var m = document.getElementById(manualId);
  if (m) m.style.display = selEl.value === '__manual__' ? 'block' : 'none';
}

var _funis = [];

function switchEscrit(section, btn) {
  document.querySelectorAll('.escrit-section').forEach(function(el){ el.classList.remove('active'); });
  document.querySelectorAll('.escrit-tab').forEach(function(el){ el.classList.remove('active'); });
  var el = document.getElementById('escrit-' + section);
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
  if (section === 'calendario') renderPlanMes();
  if (section === 'funis') renderFunis();
}

function renderEscritorio() {
  renderMetas();
  renderPlanMes();
  renderRotinas();
  renderAtividades();
  filtrarAtividades('todas');
}

// ── PLANEJAMENTO MENSAL ──
var MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var TIPOS_COR = {stories:'stories', reels:'reels', feed:'reels', live:'reels', campanha:'campanha', data:'data', outro:'outro'};
var TIPO_COR_HEX = {stories:'#e07020', reels:'#7d3c98', feed:'#2471a3', live:'#b83232', campanha:'#1f5c3a', data:'#a07830', outro:'#8a9e90'};
var TIPO_LABEL = {stories:'Stories', reels:'Reels', feed:'Feed', live:'Live', campanha:'Campanha', data:'Data Especial', outro:'Outro'};

var KAN_COLS = [
  {id:'ideias',    label:'Ideias',       cor:'#8a9e90', bg:'var(--bg4)'},
  {id:'planejamento', label:'Planejamento', cor:'#2471a3', bg:'var(--blue-l)'},
  {id:'producao',  label:'Em Producao',  cor:'#a07830', bg:'var(--gold-l)'},
  {id:'agendado',  label:'Agendado',     cor:'#7d3c98', bg:'var(--purple-l)'},
  {id:'publicado', label:'Publicado',    cor:'#1f5c3a', bg:'var(--green-l)'}
];

var _calView = 'resumo';
var _planMes = {};

function calNav(delta) {
  _calMes += delta;
  if (_calMes < 0) { _calMes = 11; _calAno--; }
  if (_calMes > 11) { _calMes = 0; _calAno++; }
  renderPlanMes();
}
function calHoje() {
  _calAno = new Date().getFullYear();
  _calMes = new Date().getMonth();
  renderPlanMes();
}

function getMesKey() { return _calAno + '-' + String(_calMes+1).padStart(2,'0'); }

function getEventosMes() {
  var key = getMesKey();
  return _eventos.filter(function(e){ return e.data && e.data.startsWith(key); });
}

function setCalView(v) {
  _calView = v;
  ['resumo','lista','kanban','cal'].forEach(function(id){
    var btn = document.getElementById('view-btn-' + id);
    var el = document.getElementById('plan-view-' + id);
    if (btn) { btn.classList.toggle('btn-p', id===v); btn.classList.toggle('btn-g', id!==v); }
    if (el) el.style.display = id===v ? 'block' : 'none';
  });
  if (v==='kanban') renderKanban();
  else if (v==='lista') renderLista();
  else if (v==='cal') renderCalGrid();
  else renderResumoMes();
}

function renderPlanMes() {
  var label = document.getElementById('cal-month-label');
  if (label) label.textContent = MESES[_calMes] + ' ' + _calAno;
  setCalView(_calView);
}

// ── RESUMO ──
function renderResumoMes() {
  var key = getMesKey();
  var plan = _planMes[key] || {};
  var evs = getEventosMes();

  // Campos do planejamento
  var displayEl = document.getElementById('plan-display');
  if (displayEl) {
    var campos = [
      {id:'tema', label:'Tema do Mes', val:plan.tema},
      {id:'objetivo', label:'Objetivo Principal', val:plan.objetivo},
      {id:'campanhas', label:'Campanhas Planejadas', val:plan.campanhas},
      {id:'datas', label:'Datas Importantes', val:plan.datas},
      {id:'narrativa', label:'Narrativa da Comunicacao', val:plan.narrativa},
      {id:'obs', label:'Observacoes', val:plan.obs}
    ];
    displayEl.innerHTML = campos.map(function(f) {
      return '<div class="plan-field">' +
        '<div class="plan-field-label">' + f.label + '</div>' +
        (f.val ? '<div class="plan-field-value">' + f.val + '</div>' :
          '<div class="plan-field-empty">Nao preenchido</div>') +
      '</div>';
    }).join('');
  }

  // Mini kanban
  var miniEl = document.getElementById('plan-kanban-mini');
  if (miniEl) {
    miniEl.innerHTML = KAN_COLS.map(function(col) {
      var n = evs.filter(function(e){ return (e.status||'ideias')===col.id; }).length;
      return '<div class="kan-mini-col">' +
        '<div class="kan-mini-num" style="color:' + col.cor + '">' + n + '</div>' +
        '<div class="kan-mini-label">' + col.label + '</div>' +
      '</div>';
    }).join('');
  }
}

function togglePlanEdit() {
  var key = getMesKey();
  var plan = _planMes[key] || {};
  var viewEl = document.getElementById('plan-view-mode');
  var editEl = document.getElementById('plan-edit-mode');
  var isEdit = editEl.style.display !== 'none';
  if (!isEdit) {
    // Abrir edição
    ['tema','objetivo','campanhas','datas'].forEach(function(f){
      var el = document.getElementById('plan-' + f);
      if (el) el.value = plan[f] || '';
    });
    ['narrativa','obs'].forEach(function(f){
      var el = document.getElementById('plan-' + f);
      if (el) el.value = plan[f] || '';
    });
    viewEl.style.display = 'none';
    editEl.style.display = 'block';
    document.getElementById('plan-edit-btn').textContent = 'Cancelar';
  } else {
    cancelarPlanEdit();
  }
}

function cancelarPlanEdit() {
  document.getElementById('plan-view-mode').style.display = 'block';
  document.getElementById('plan-edit-mode').style.display = 'none';
  document.getElementById('plan-edit-btn').textContent = 'Editar';
}

function salvarPlanMes() {
  var key = getMesKey();
  _planMes[key] = {
    tema: document.getElementById('plan-tema').value.trim(),
    objetivo: document.getElementById('plan-objetivo').value.trim(),
    campanhas: document.getElementById('plan-campanhas').value.trim(),
    datas: document.getElementById('plan-datas').value.trim(),
    narrativa: document.getElementById('plan-narrativa').value.trim(),
    obs: document.getElementById('plan-obs').value.trim()
  };
  savePlanMes(key);
  cancelarPlanEdit();
  renderResumoMes();
  toast('Planejamento salvo!');
}

// ── LISTA ──
function renderLista() {
  var evs = getEventosMes().sort(function(a,b){ return (a.data||'').localeCompare(b.data||''); });
  var el = document.getElementById('plan-lista');
  var countEl = document.getElementById('lista-count');
  if (countEl) countEl.textContent = evs.length;
  if (!el) return;
  if (!evs.length) {
    el.innerHTML = '<div class="empty" style="padding:32px"><div class="empty-t">Nenhum conteudo planejado</div><div class="empty-d">Clique em + Conteudo para comecar</div></div>';
    return;
  }
  el.innerHTML = evs.map(function(ev) {
    var cor = TIPO_COR_HEX[ev.tipo] || TIPO_COR_HEX.outro;
    var col = KAN_COLS.find(function(c){ return c.id===(ev.status||'ideias'); }) || KAN_COLS[0];
    return '<div class="plan-lista-item" data-id="' + ev.id + '" onclick="abrirModalConteudo(this.dataset.id)">' +
      '<div class="plan-tipo-dot" style="background:' + cor + '"></div>' +
      '<div style="min-width:60px;font-size:11px;color:var(--text3)">' + (ev.data ? ev.data.split('-').reverse().slice(0,2).join('/') : '-') + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:600;font-size:13px">' + ev.titulo + '</div>' +
        (ev.campanha ? '<div style="font-size:11px;color:var(--text3)">Campanha: ' + ev.campanha + '</div>' : '') +
      '</div>' +
      '<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;background:' + col.bg + ';color:' + col.cor + '">' + col.label + '</span>' +
      '<span style="font-size:11px;color:var(--text3);min-width:60px;text-align:right">' + (TIPO_LABEL[ev.tipo]||ev.tipo) + '</span>' +
    '</div>';
  }).join('');
}

// ── KANBAN ──
function renderKanban() {
  var evs = getEventosMes();
  var el = document.getElementById('plan-kanban');
  if (!el) return;
  var html = '';
  KAN_COLS.forEach(function(col) {
    var cards = evs.filter(function(e){ return (e.status||'ideias')===col.id; });
    var cardsHtml = '';
    cards.forEach(function(ev) {
      var c2 = TIPO_COR_HEX[ev.tipo] || TIPO_COR_HEX.outro;
      var btnsHtml = '';
      KAN_COLS.forEach(function(c3) {
        if (c3.id === col.id) return;
        btnsHtml += '<button class="btn btn-xs" style="background:' + c3.bg + ';color:' + c3.cor + ';border-color:transparent;margin:1px;font-size:10px;padding:2px 6px" data-evid="' + ev.id + '" data-col="' + c3.id + '" onclick="moverKan(this.dataset.evid,this.dataset.col)">' + c3.label + '</button>';
      });
      cardsHtml += '<div class="kan-card" data-evid="' + ev.id + '" onclick="abrirModalConteudo(this.dataset.evid)">' +
        '<div class="kan-card-title">' + ev.titulo + '</div>' +
        '<div class="kan-card-meta">' +
          '<span class="kan-card-tag" style="background:' + c2 + '18;color:' + c2 + '">' + (TIPO_LABEL[ev.tipo]||ev.tipo) + '</span>' +
          (ev.data ? '<span class="kan-card-date">' + ev.data.split('-').reverse().slice(0,2).join('/') + '</span>' : '') +
        '</div>' +
        (ev.objetivo ? '<div style="font-size:11px;color:var(--text3);margin-top:5px">' + ev.objetivo + '</div>' : '') +
        '<div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap">' + btnsHtml + '</div>' +
      '</div>';
    });
    html += '<div class="kan-col">' +
      '<div class="kan-col-header" style="background:' + col.bg + '">' +
        '<span class="kan-col-title" style="color:' + col.cor + '">' + col.label + '</span>' +
        '<span class="kan-col-count" style="background:' + col.cor + '22;color:' + col.cor + '">' + cards.length + '</span>' +
      '</div>' +
      '<div class="kan-cards">' + cardsHtml +
        '<div class="kan-drop-zone" data-col="' + col.id + '" onclick="abrirModalConteudo(null,this.dataset.col)">+ Adicionar</div>' +
      '</div>' +
    '</div>';
  });
  el.innerHTML = html;
}

function moverKan(id, novoStatus) {
  var idx = _eventos.findIndex(function(e){ return e.id===id; });
  if (idx === -1) return;
  _eventos[idx].status = novoStatus;
  saveEventos();
  renderKanban();
  toast('Movido para ' + (KAN_COLS.find(function(c){ return c.id===novoStatus; })||{}).label);
}

// ── CALENDÁRIO ──
function renderCalGrid() {
  var grid = document.getElementById('cal-grid');
  if (!grid) return;
  while (grid.children.length > 7) grid.removeChild(grid.lastChild);
  var primeiro = new Date(_calAno, _calMes, 1);
  var ultimo = new Date(_calAno, _calMes + 1, 0);
  var hoje = getTodayStr();
  var inicioDow = (primeiro.getDay() + 6) % 7;
  for (var i = 0; i < inicioDow; i++) {
    var d = new Date(_calAno, _calMes, -inicioDow + i + 1);
    var div = document.createElement('div'); div.className = 'cal-day other-month';
    div.innerHTML = '<div class="cal-dn">' + d.getDate() + '</div>';
    grid.appendChild(div);
  }
  for (var d2 = 1; d2 <= ultimo.getDate(); d2++) {
    var dateStr = _calAno + '-' + String(_calMes+1).padStart(2,'0') + '-' + String(d2).padStart(2,'0');
    var evsDia = _eventos.filter(function(e){ return e.data === dateStr; });
    var div2 = document.createElement('div');
    div2.className = 'cal-day' + (dateStr===hoje?' today':'') + (evsDia.length?' has-event':'');
    div2.setAttribute('data-date', dateStr);
    (function(ds){ div2.onclick = function(){ abrirModalConteudo(null, 'ideias', ds); }; })(dateStr);
    var html = '<div class="cal-dn">' + d2 + '</div>';
    evsDia.slice(0,2).forEach(function(ev){
      var cls = TIPOS_COR[ev.tipo] || 'outro';
      html += '<div class="cal-event ' + cls + '">' + ev.titulo + '</div>';
    });
    if (evsDia.length > 2) html += '<div style="font-size:9px;color:var(--text3);padding:1px 4px">+' + (evsDia.length-2) + '</div>';
    div2.innerHTML = html;
    grid.appendChild(div2);
  }
  var total = inicioDow + ultimo.getDate();
  var rest = (7-(total%7))%7;
  for (var r=1; r<=rest; r++) {
    var div3=document.createElement('div'); div3.className='cal-day other-month';
    div3.innerHTML='<div class="cal-dn">'+r+'</div>'; grid.appendChild(div3);
  }
}

// ── MODAL CONTEUDO ──
function abrirModalConteudo(id, statusDefault, dataDefault) {
  var ev = id ? _eventos.find(function(e){ return e.id===id; }) : null;
  document.getElementById('modal-ev-title').textContent = ev ? 'Editar Conteudo' : 'Novo Conteudo';
  document.getElementById('ev-edit-id').value = id || '';
  document.getElementById('ev-titulo').value = ev ? ev.titulo : '';
  document.getElementById('ev-tipo').value = ev ? (ev.tipo||'stories') : 'stories';
  document.getElementById('ev-status').value = ev ? (ev.status||'ideias') : (statusDefault||'ideias');
  document.getElementById('ev-data').value = ev ? (ev.data||'') : (dataDefault||getTodayStr());
  document.getElementById('ev-objetivo').value = ev ? (ev.objetivo||'') : '';
  document.getElementById('ev-campanha').value = ev ? (ev.campanha||'') : '';
  document.getElementById('ev-obs').value = ev ? (ev.obs||'') : '';
  // Pop ev sp
  var selEv = document.getElementById('ev-resp');
  if (selEv) {
    selEv.innerHTML = spSelectHtml(ev ? (ev.resp||'') : '');
    selEv.setAttribute('data-mid','ev-resp-manual');
    selEv.onchange = function(){ onRespChange(this,this.getAttribute('data-mid')); };
    var mEv = document.getElementById('ev-resp-manual');
    var isMEv = ev&&ev.resp&&!(_sp||[]).find(function(s){return s.name===ev.resp;});
    if(mEv){mEv.style.display=isMEv?'block':'none';mEv.value=isMEv?(ev.resp||''):'';}
    if(isMEv) selEv.value='__manual__';
  }
    document.getElementById('modal-evento').classList.add('open');
}

function fecharModalConteudo() {
  document.getElementById('modal-evento').classList.remove('open');
}

function salvarEvento() {
  var titulo = document.getElementById('ev-titulo').value.trim();
  if (!titulo) { toast('Informe o titulo', 'e'); return; }
  var editId = document.getElementById('ev-edit-id').value;
  var ev = {
    id: editId || Date.now().toString(),
    titulo: titulo,
    tipo: document.getElementById('ev-tipo').value,
    status: document.getElementById('ev-status').value,
    data: document.getElementById('ev-data').value,
    resp: getResponsavelValue('ev-resp','ev-resp-manual').trim(),
    objetivo: document.getElementById('ev-objetivo').value.trim(),
    campanha: document.getElementById('ev-campanha').value.trim(),
    obs: document.getElementById('ev-obs').value.trim()
  };
  if (editId) {
    var idx = _eventos.findIndex(function(e){ return e.id===editId; });
    if (idx !== -1) _eventos[idx] = ev; else _eventos.push(ev);
  } else {
    _eventos.push(ev);
  }
  saveEventos();
  fecharModalConteudo();
  renderPlanMes();
  toast(editId ? 'Conteudo atualizado!' : 'Conteudo adicionado!');
}

// ── METAS ──
var CAT_COR = {
  faturamento: 'var(--green)',
  clientes: 'var(--blue)',
  conversao: 'var(--gold)',
  conteudo: 'var(--purple)',
  personalizada: 'var(--red)'
};
var CAT_LABEL = {
  faturamento:'Faturamento', clientes:'Clientes',
  conversao:'Conversao', conteudo:'Conteudo', personalizada:'Personalizada'
};
var CAT_ICONE = {
  faturamento:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
  clientes:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  conversao:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  conteudo:'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  personalizada:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
};

function getStatusMeta(m) {
  var hoje = getTodayStr();
  var pct = m.alvo > 0 ? (m.atual / m.alvo) * 100 : 0;
  if (pct >= 100) return {label:'Concluida', cls:'bg-g', cor:'var(--green)'};
  if (m.fim && hoje > m.fim && pct < 100) return {label:'Atrasada', cls:'bg-r', cor:'var(--red)'};
  return {label:'Em andamento', cls:'bg-b', cor:'var(--blue)'};
}

function formatValorMeta(val, unidade) {
  val = parseFloat(val) || 0;
  if (unidade === 'reais') return 'R$ ' + val.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  if (unidade === 'percentual') return val + '%';
  return val.toString();
}

function diasRestantes(fim) {
  if (!fim) return null;
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var fimD = new Date(fim + 'T00:00:00');
  var diff = Math.ceil((fimD - hoje) / 86400000);
  return diff;
}

function abrirModalMeta(id) {
  var m = id ? _metas.find(function(x){ return x.id === id; }) : null;
  document.getElementById('modal-meta-title').textContent = m ? 'Editar Meta' : 'Nova Meta';
  document.getElementById('meta-edit-id').value = id || '';
  document.getElementById('meta-titulo').value = m ? m.titulo : '';
  document.getElementById('meta-cat').value = m ? (m.cat||'faturamento') : 'faturamento';
  document.getElementById('meta-unidade').value = m ? (m.unidade||'numero') : 'numero';
  document.getElementById('meta-inicio').value = m ? (m.inicio||'') : getTodayStr();
  document.getElementById('meta-fim').value = m ? (m.fim||'') : '';
  document.getElementById('meta-alvo').value = m ? m.alvo : '';
  document.getElementById('meta-atual').value = m ? m.atual : '0';
  document.getElementById('meta-desc').value = m ? (m.desc||'') : '';
  // Popular select de funis
  var selFunil = document.getElementById('meta-funil-id');
  if (selFunil) {
    selFunil.innerHTML = '<option value="">— Sem vinculo —</option>' +
      _funis.map(function(f){ return '<option value="' + f.id + '">' + f.nome + '</option>'; }).join('');
    selFunil.value = m ? (m.funil_id||'') : '';
  }
    var noDash = document.getElementById('meta-no-dash');
  if (noDash) noDash.checked = m ? (m.no_dashboard || false) : false;
  document.getElementById('modal-meta').classList.add('open');
}

function fecharModalMeta() {
  document.getElementById('modal-meta').classList.remove('open');
}

function salvarMeta() {
  var titulo = document.getElementById('meta-titulo').value.trim();
  var alvo = parseFloat(document.getElementById('meta-alvo').value);
  var inicio = document.getElementById('meta-inicio').value;
  var fim = document.getElementById('meta-fim').value;
  if (!titulo) { toast('Informe o nome da meta', 'e'); return; }
  if (!alvo || alvo <= 0) { toast('Informe o valor da meta', 'e'); return; }
  if (!inicio || !fim) { toast('Informe o periodo da meta', 'e'); return; }

  var editId = document.getElementById('meta-edit-id').value;
  var noDash = document.getElementById('meta-no-dash');
  if (noDash && noDash.checked) {
    _metas.forEach(function(m){ m.no_dashboard = false; });
  }
  var meta = {
    id: editId || Date.now().toString(),
    titulo: titulo,
    cat: document.getElementById('meta-cat').value,
    no_dashboard: noDash ? noDash.checked : false,
    unidade: document.getElementById('meta-unidade').value,
    inicio: inicio,
    fim: fim,
    alvo: alvo,
    atual: parseFloat(document.getElementById('meta-atual').value) || 0,
    desc: document.getElementById('meta-desc').value.trim(),
    funil_id: document.getElementById('meta-funil-id').value || null,
    criadaEm: editId ? (_metas.find(function(x){ return x.id===editId; })||{}).criadaEm : new Date().toISOString()
  };

  if (editId) {
    var idx = _metas.findIndex(function(x){ return x.id === editId; });
    if (idx !== -1) _metas[idx] = meta;
  } else {
    _metas.push(meta);
  }
  saveMetas();
  fecharModalMeta();
  renderMetas();
  toast(editId ? 'Meta atualizada!' : 'Meta criada!');
}

function excluirMeta(id) {
  if (!confirm('Excluir esta meta?')) return;
  _metas = _metas.filter(function(m){ return m.id !== id; });
  eoDelete('eo_metas', id);
  renderMetas();
  toast('Meta excluida.');
}

function abrirModalResultado(id) {
  var m = _metas.find(function(x){ return x.id === id; });
  if (!m) return;
  document.getElementById('res-meta-id').value = id;
  document.getElementById('res-meta-nome').textContent = m.titulo;
  document.getElementById('res-meta-alvo').textContent = 'Meta: ' + formatValorMeta(m.alvo, m.unidade);
  document.getElementById('res-valor').value = m.atual;
  document.getElementById('res-hint').textContent = 'Resultado atual: ' + formatValorMeta(m.atual, m.unidade) + ' de ' + formatValorMeta(m.alvo, m.unidade);
  document.getElementById('modal-resultado').classList.add('open');
  setTimeout(function(){ document.getElementById('res-valor').focus(); document.getElementById('res-valor').select(); }, 100);
}

function fecharModalResultado() {
  document.getElementById('modal-resultado').classList.remove('open');
}

function confirmarResultado() {
  var id = document.getElementById('res-meta-id').value;
  var valor = parseFloat(document.getElementById('res-valor').value);
  if (isNaN(valor) || valor < 0) { toast('Informe um valor valido', 'e'); return; }
  var idx = _metas.findIndex(function(x){ return x.id === id; });
  if (idx === -1) return;
  _metas[idx].atual = valor;
  saveMetas();
  fecharModalResultado();
  renderMetas();
  var pct = _metas[idx].alvo > 0 ? Math.round((valor/_metas[idx].alvo)*100) : 0;
  toast('Resultado atualizado! ' + pct + '% atingido');
}

function renderMetas() {
  var grid = document.getElementById('metas-grid');
  var resumoEl = document.getElementById('metas-resumo');
  if (!grid) return;

  // ── Resumo ──
  if (resumoEl && _metas.length) {
    var con  = _metas.filter(function(m){ return getStatusMeta(m).label==='Concluida'; }).length;
    var and_ = _metas.filter(function(m){ return getStatusMeta(m).label==='Em andamento'; }).length;
    var atr  = _metas.filter(function(m){ return getStatusMeta(m).label==='Atrasada'; }).length;
    var total = _metas.length;
    var pctG = total ? Math.round(con/total*100) : 0;
    resumoEl.style.display = 'flex';
    resumoEl.className = 'meta-resumo-v2';
    resumoEl.innerHTML =
      '<div style="flex:1;min-width:140px">' +
        '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">' + total + ' meta' + (total!==1?'s':'') + ' cadastrada' + (total!==1?'s':'') + '</div>' +
        '<div style="height:5px;background:var(--border);border-radius:20px;overflow:hidden;margin-bottom:4px"><div style="height:100%;width:' + pctG + '%;background:var(--green);border-radius:20px;transition:width .5s"></div></div>' +
        '<div style="font-size:11px;color:var(--text3)">' + pctG + '% concluídas</div>' +
      '</div>' +
      '<div style="display:flex;gap:0;flex-shrink:0">' +
        '<div class="meta-resumo-stat"><div class="meta-resumo-num" style="color:var(--green)">' + con + '</div><div class="meta-resumo-label">Concluída' + (con!==1?'s':'') + '</div></div>' +
        '<div class="meta-resumo-stat"><div class="meta-resumo-num" style="color:var(--blue)">' + and_ + '</div><div class="meta-resumo-label">Em andamento</div></div>' +
        '<div class="meta-resumo-stat"><div class="meta-resumo-num" style="color:var(--red)">' + atr + '</div><div class="meta-resumo-label">Atrasada' + (atr!==1?'s':'') + '</div></div>' +
      '</div>';
  } else if (resumoEl) {
    resumoEl.style.display = 'none';
  }

  var filtroAtivo = '';
  var filtroBtn = document.querySelector('.meta-filtro-btn.active');
  if (filtroBtn) filtroAtivo = filtroBtn.dataset.filtro || '';

  var metasFiltradas = filtroAtivo
    ? _metas.filter(function(m){ return getStatusMeta(m).label === filtroAtivo; })
    : _metas;

  if (!_metas.length) {
    grid.innerHTML =
      '<div style="text-align:center;padding:48px 20px">' +
      '<div style="width:48px;height:48px;border-radius:50%;background:var(--bg4);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>' +
      '<div style="font-weight:700;font-size:14px;color:var(--text2);margin-bottom:5px">Nenhuma meta cadastrada</div>' +
      '<div style="font-size:12px;color:var(--text3);margin-bottom:16px">Defina seus objetivos para acompanhar o progresso da loja</div>' +
      '<button class="btn btn-p btn-sm" onclick="abrirModalMeta()">+ Criar primeira meta</button>' +
      '</div>';
    return;
  }

  var rows = metasFiltradas.map(function(m) {
    var pct = m.alvo > 0 ? Math.min(100, Math.round((m.atual/m.alvo)*100)) : 0;
    var cor = CAT_COR[m.cat] || 'var(--green)';
    var corL = cor.replace(')', '-l)');
    var status = getStatusMeta(m);
    var dias = diasRestantes(m.fim);
    var icone = CAT_ICONE[m.cat] || CAT_ICONE.personalizada;
    var statusCor = status.label==='Concluida' ? 'var(--green)' : status.label==='Atrasada' ? 'var(--red)' : 'var(--blue)';
    var statusBg  = status.label==='Concluida' ? 'var(--green-l)' : status.label==='Atrasada' ? 'var(--red-l)' : 'var(--blue-l)';
    var progCor   = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--gold)' : cor;

    var periodoHtml = '';
    if (m.inicio || m.fim) {
      periodoHtml += (m.inicio ? m.inicio.split('-').reverse().join('/') : '—') + ' → ' + (m.fim ? m.fim.split('-').reverse().join('/') : '—');
    } else {
      periodoHtml = '—';
    }
    if (dias !== null) {
      if (dias > 0)      periodoHtml += '<br><span style="color:var(--text3)">' + dias + 'd restante' + (dias!==1?'s':'') + '</span>';
      else if (dias===0) periodoHtml += '<br><span style="color:var(--gold);font-weight:600">Termina hoje</span>';
      else               periodoHtml += '<br><span style="color:var(--red);font-weight:600">Encerrada</span>';
    }

    var svgEdit = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    var svgDel  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
    var svgUpd  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>';

    return '<div class="meta-row">' +
      // COLUNA 1: nome
      '<div class="meta-row-nome">' +
        '<div class="meta-cat-chip" style="background:' + corL + ';color:' + cor + '">' +
          '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' + icone + '</svg>' +
          (CAT_LABEL[m.cat]||'Meta') +
        '</div>' +
        '<div class="meta-titulo" title="' + m.titulo + '">' + m.titulo + '</div>' +
      '</div>' +
      // COLUNA 2: progresso
      '<div class="meta-row-prog">' +
        '<div class="meta-prog-nums">' +
          '<div><span class="meta-prog-atual" style="color:' + progCor + '">' + formatValorMeta(m.atual, m.unidade) + '</span><span class="meta-prog-alvo"> / ' + formatValorMeta(m.alvo, m.unidade) + '</span></div>' +
          '<span class="meta-prog-pct" style="color:' + progCor + '">' + pct + '%</span>' +
        '</div>' +
        '<div class="meta-prog-bar-wrap"><div class="meta-prog-bar-fill" style="width:' + pct + '%;background:' + progCor + '"></div></div>' +
      '</div>' +
      // COLUNA 3: período
      '<div class="meta-row-periodo">' + periodoHtml + '</div>' +
      // COLUNA 4: status
      '<div><span class="meta-status-chip" style="background:' + statusBg + ';color:' + statusCor + '">' + status.label + '</span></div>' +
      // COLUNA 5: ações
      '<div class="meta-row-acoes">' +
        '<button class="meta-btn-atualizar" data-darg="' + m.id + '" onclick="abrirModalResultado(this.dataset.darg)" title="Atualizar resultado">' + svgUpd + ' Atualizar</button>' +
        '<button class="meta-btn-icon" data-darg="' + m.id + '" onclick="abrirModalMeta(this.dataset.darg)" title="Editar">' + svgEdit + '</button>' +
        '<button class="meta-btn-icon del" data-darg="' + m.id + '" onclick="excluirMeta(this.dataset.darg)" title="Excluir">' + svgDel + '</button>' +
      '</div>' +
    '</div>';
  });

  var semResultado = filtroAtivo && !metasFiltradas.length
    ? '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px">Nenhuma meta ' + filtroAtivo.toLowerCase() + ' no momento.</div>'
    : '';

  var header = '<div class="meta-table-head">' +
    '<span>Meta</span><span>Progresso</span><span>Período</span><span>Status</span><span style="text-align:right">Ações</span>' +
  '</div>';

  var addRow = '<div class="meta-add-card" onclick="abrirModalMeta()">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
    '<span>Nova meta</span>' +
  '</div>';

  grid.innerHTML = semResultado || (header + rows.join('') + addRow);
}


function filtrarMetas(btn) {
  document.querySelectorAll('.meta-filtro-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderMetas();
}


// ── ROTINA COMERCIAL ──
var _rotinas = [];
var _atividades = [];
var _rotCheckTemp = [];
var _ativCheckTemp = [];
var _ativFiltro = 'todas';

var DIAS_LABEL = {
  segunda:'Segunda-feira', terca:'Terca-feira', quarta:'Quarta-feira',
  quinta:'Quinta-feira', sexta:'Sexta-feira', sabado:'Sabado',
  domingo:'Domingo', diario:'Todos os dias', personalizado:'Personalizado'
};
var DIAS_COR = {
  segunda:'var(--green)', terca:'var(--blue)', quarta:'var(--purple)',
  quinta:'var(--gold)', sexta:'var(--red)', sabado:'#e07020',
  domingo:'#8a9e90', diario:'var(--dark)', personalizado:'var(--text2)'
};
var DIAS_BG = {
  segunda:'var(--green-l)', terca:'var(--blue-l)', quarta:'var(--purple-l)',
  quinta:'var(--gold-l)', sexta:'var(--red-l)', sabado:'#fef0e6',
  domingo:'var(--bg4)', diario:'rgba(22,32,26,.07)', personalizado:'var(--bg4)'
};
var DIAS_ORDER = ['segunda','terca','quarta','quinta','sexta','sabado','domingo','diario','personalizado'];

// ── ROTINAS ──
function abrirModalRotina(id) {
  var rot = id ? _rotinas.find(function(r){ return r.id===id; }) : null;
  document.getElementById('modal-rotina-title').textContent = rot ? 'Editar Rotina' : 'Nova Rotina';
  document.getElementById('rot-edit-id').value = id || '';
  document.getElementById('rot-nome').value = rot ? rot.nome : '';
  document.getElementById('rot-dia').value = rot ? (rot.dia||'segunda') : 'segunda';
  document.getElementById('rot-hora').value = rot ? (rot.hora||'') : '';
  var selR = document.getElementById('rot-resp');
  var inpR = document.getElementById('rot-resp-manual');
  var respVal = rot ? (rot.responsavel||rot.resp||'') : '';
  var isManR = respVal && !(_sp||[]).find(function(s){ return s.name===respVal; });
  if (selR) { selR.innerHTML = spSelectHtml(isManR ? '' : respVal); selR.value = isManR ? '__manual__' : respVal; }
  if (inpR) { inpR.style.display = isManR ? 'block' : 'none'; inpR.value = isManR ? respVal : ''; }
  document.getElementById('rot-desc').value = rot ? (rot.desc||'') : '';
  document.getElementById('rot-check-input').value = '';
  _rotCheckTemp = rot ? (rot.checklist||[]).map(function(item){ return {texto:item.texto, done:false}; }) : [];
  renderCheckTempRotina();
  // Pop rot sp
  var selR = document.getElementById('rot-resp');
  if (selR) {
    selR.innerHTML = spSelectHtml(rot ? (rot.responsavel||'') : '');
    selR.setAttribute('data-mid','rot-resp-manual');
    selR.onchange = function(){ onRespChange(this,this.getAttribute('data-mid')); };
    var mR = document.getElementById('rot-resp-manual');
    var isM = rot&&rot.responsavel&&!(_sp||[]).find(function(s){return s.name===rot.responsavel;});
    if(mR){mR.style.display=isM?'block':'none';mR.value=isM?(rot.responsavel||''):'';}
    if(isM) selR.value='__manual__';
  }
    document.getElementById('modal-rotina').classList.add('open');
  setTimeout(function(){ document.getElementById('rot-nome').focus(); }, 100);
}

function fecharModalRotina() { document.getElementById('modal-rotina').classList.remove('open'); }

function addCheckRotina() {
  var inp = document.getElementById('rot-check-input');
  var val = inp.value.trim();
  if (!val) return;
  _rotCheckTemp.push({texto:val, done:false});
  inp.value = '';
  renderCheckTempRotina();
  inp.focus();
}

function renderCheckTempRotina() {
  var el = document.getElementById('rot-check-list');
  if (!el) return;
  el.innerHTML = _rotCheckTemp.map(function(item, i) {
    return '<div class="modal-check-item">' +
      '<div style="font-size:13px;flex:1">' + item.texto + '</div>' +
      '<button class="modal-check-remove" onclick="remCheckRotina(' + i + ')">×</button>' +
    '</div>';
  }).join('');
}

function remCheckRotina(i) {
  _rotCheckTemp.splice(i, 1);
  renderCheckTempRotina();
}

function salvarRotina() {
  var nome = document.getElementById('rot-nome').value.trim();
  if (!nome) { toast('Informe o nome da rotina', 'e'); return; }
  var editId = document.getElementById('rot-edit-id').value;
  var rot = {
    id: editId || Date.now().toString(),
    nome: nome,
    dia: document.getElementById('rot-dia').value,
    hora: document.getElementById('rot-hora').value,
    resp: document.getElementById('rot-resp').value.trim(),
    desc: document.getElementById('rot-desc').value.trim(),
    checklist: _rotCheckTemp.map(function(item){ return {texto:item.texto}; }),
    checkDone: {}
  };
  if (editId) {
    var idx = _rotinas.findIndex(function(r){ return r.id===editId; });
    if (idx !== -1) { rot.checkDone = _rotinas[idx].checkDone || {}; _rotinas[idx] = rot; }
    else _rotinas.push(rot);
  } else {
    _rotinas.push(rot);
  }
  saveRotinas();
  fecharModalRotina();
  renderRotinas();
  toast(editId ? 'Rotina atualizada!' : 'Rotina criada!');
}

function excluirRotina(id) {
  if (!confirm('Excluir esta rotina?')) return;
  _rotinas = _rotinas.filter(function(r){ return r.id!==id; });
  eoDelete('eo_rotinas', id);
  renderRotinas();
  toast('Rotina excluida.');
}

function toggleCheckRotina(rotId, idx) {
  var rot = _rotinas.find(function(r){ return r.id===rotId; });
  if (!rot) return;
  if (!rot.checkDone) rot.checkDone = {};
  rot.checkDone[idx] = !rot.checkDone[idx];
  saveRotinas();
  var box = document.getElementById('rc-' + rotId + '-' + idx);
  var txt = document.getElementById('rt-' + rotId + '-' + idx);
  if (box) box.classList.toggle('done', rot.checkDone[idx]);
  if (txt) txt.classList.toggle('done', rot.checkDone[idx]);
}

function toggleRotExpand(id) {
  var body = document.getElementById('rot-body-' + id);
  var arrow = document.getElementById('rot-arrow-' + id);
  if (!body) return;
  var isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function renderRotinas() {
  var grid = document.getElementById('rotinas-grid');
  var countEl = document.getElementById('rotinas-count');
  if (!grid) return;
  if (countEl) countEl.textContent = _rotinas.length;

  if (!_rotinas.length) {
    grid.innerHTML = '<div class="dash-vazio">' +
      '<div style="font-size:28px;margin-bottom:8px">📋</div>' +
      '<div style="font-weight:600;margin-bottom:4px">Nenhuma rotina criada</div>' +
      '<div style="font-size:12px;margin-bottom:14px">Crie rotinas fixas para organizar os processos da sua equipe</div>' +
      '<button class="btn btn-g btn-sm" onclick="abrirModalRotina()">+ Criar primeira rotina</button>' +
    '</div>';
    return;
  }

  // Ordenar por dia da semana
  var sorted = _rotinas.slice().sort(function(a,b){
    return DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia);
  });

  grid.innerHTML = sorted.map(function(rot) {
    var cor = DIAS_COR[rot.dia] || 'var(--text2)';
    var bg = DIAS_BG[rot.dia] || 'var(--bg4)';
    var doneCount = rot.checklist ? rot.checklist.filter(function(_,i){ return rot.checkDone && rot.checkDone[i]; }).length : 0;
    var totalCheck = rot.checklist ? rot.checklist.length : 0;
    var pct = totalCheck > 0 ? Math.round((doneCount/totalCheck)*100) : 0;

    return '<div class="rot-card">' +
      '<div class="rot-card-header" data-darg="' + rot.id + '" onclick="toggleRotExpand(this.dataset.darg)">' +
        '<div class="rot-dia-badge" style="background:' + bg + ';color:' + cor + '">' + (DIAS_LABEL[rot.dia]||rot.dia) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:14px">' + rot.nome + '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-top:3px;flex-wrap:wrap">' +
            (rot.hora ? '<span style="font-size:11px;color:var(--text3)">⏰ ' + rot.hora + '</span>' : '') +
            (rot.resp ? '<span style="font-size:11px;color:var(--text3)">👤 ' + rot.resp + '</span>' : '') +
            (totalCheck > 0 ? '<span style="font-size:11px;color:' + (pct===100?'var(--green)':'var(--text3)') + '">' + doneCount + '/' + totalCheck + ' itens</span>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          (totalCheck > 0 ? '<div style="width:40px;height:5px;background:var(--border);border-radius:20px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + (pct===100?'var(--green)':'var(--gold)') + ';border-radius:20px"></div></div>' : '') +
          '<svg id="rot-arrow-' + rot.id + '" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" style="flex-shrink:0;transition:transform .2s;transform:rotate(0deg)"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</div>' +
      '</div>' +
      '<div id="rot-body-' + rot.id + '" class="rot-card-body" style="display:none">' +
        (rot.desc ? '<p style="font-size:13px;color:var(--text2);margin-top:12px;line-height:1.5">' + rot.desc + '</p>' : '') +
        (rot.checklist && rot.checklist.length ? '<div class="rot-checklist">' +
          rot.checklist.map(function(item, i) {
            var done = rot.checkDone && rot.checkDone[i];
            return '<div class="rot-check-item">' +
              '<div class="rot-check-box' + (done?' done':'') + '" id="rc-' + rot.id + '-' + i + '" data-rotid="' + rot.id + '" data-idx="' + i + '" onclick="toggleCheckRotina(this.dataset.rotid,this.dataset.idx)"></div>' +
              '<span class="rot-check-text' + (done?' done':'') + '" id="rt-' + rot.id + '-' + i + '">' + item.texto + '</span>' +
            '</div>';
          }).join('') +
        '</div>' : '<p style="font-size:12px;color:var(--text3);margin-top:12px">Nenhum item no checklist</p>') +
        '<div style="display:flex;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">' +
          '<button class="btn btn-g btn-xs" data-darg="' + rot.id + '" onclick="abrirModalRotina(this.dataset.darg)">Editar</button>' +
          '<button class="btn btn-d btn-xs" data-darg="' + rot.id + '" onclick="excluirRotina(this.dataset.darg)">Excluir</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ── ATIVIDADES PONTUAIS ──
function abrirModalAtividade(id) {
  var at = id ? _atividades.find(function(a){ return a.id===id; }) : null;
  document.getElementById('modal-ativ-title').textContent = at ? 'Editar Atividade' : 'Nova Atividade';
  document.getElementById('ativ-edit-id').value = id || '';
  document.getElementById('ativ-titulo').value = at ? at.titulo : '';
  document.getElementById('ativ-data').value = at ? (at.data||'') : getTodayStr();
  document.getElementById('ativ-prio').value = at ? (at.prio||'normal') : 'normal';
  document.getElementById('ativ-resp').value = at ? (at.resp||'') : '';
  document.getElementById('ativ-status').value = at ? (at.status||'pendente') : 'pendente';
  document.getElementById('ativ-obs').value = at ? (at.obs||'') : '';
  document.getElementById('ativ-check-input').value = '';
  _ativCheckTemp = at ? (at.checklist||[]).map(function(item){ return {texto:item.texto, done:item.done||false}; }) : [];
  renderCheckTempAtiv();
  document.getElementById('modal-atividade').classList.add('open');
  setTimeout(function(){ document.getElementById('ativ-titulo').focus(); }, 100);
}

function fecharModalAtividade() { document.getElementById('modal-atividade').classList.remove('open'); }

function addCheckAtividade() {
  var inp = document.getElementById('ativ-check-input');
  var val = inp.value.trim();
  if (!val) return;
  _ativCheckTemp.push({texto:val, done:false});
  inp.value = '';
  renderCheckTempAtiv();
  inp.focus();
}

function renderCheckTempAtiv() {
  var el = document.getElementById('ativ-check-list');
  if (!el) return;
  el.innerHTML = _ativCheckTemp.map(function(item, i) {
    return '<div class="modal-check-item">' +
      '<div style="font-size:13px;flex:1">' + item.texto + '</div>' +
      '<button class="modal-check-remove" onclick="remCheckAtiv(' + i + ')">×</button>' +
    '</div>';
  }).join('');
}

function remCheckAtiv(i) { _ativCheckTemp.splice(i,1); renderCheckTempAtiv(); }

function salvarAtividade() {
  var titulo = document.getElementById('ativ-titulo').value.trim();
  if (!titulo) { toast('Informe o titulo', 'e'); return; }
  var editId = document.getElementById('ativ-edit-id').value;
  var at = {
    id: editId || Date.now().toString(),
    titulo: titulo,
    data: document.getElementById('ativ-data').value,
    prio: document.getElementById('ativ-prio').value,
    resp: document.getElementById('ativ-resp').value.trim(),
    status: document.getElementById('ativ-status').value,
    obs: document.getElementById('ativ-obs').value.trim(),
    checklist: _ativCheckTemp.map(function(item){ return {texto:item.texto, done:item.done}; })
  };
  if (editId) {
    var idx = _atividades.findIndex(function(a){ return a.id===editId; });
    if (idx !== -1) _atividades[idx] = at; else _atividades.push(at);
  } else {
    _atividades.push(at);
  }
  saveAtividades();
  fecharModalAtividade();
  renderAtividades();
  toast(editId ? 'Atividade atualizada!' : 'Atividade criada!');
}

function excluirAtividade(id) {
  if (!confirm('Excluir esta atividade?')) return;
  _atividades = _atividades.filter(function(a){ return a.id!==id; });
  eoDelete('eo_atividades', id);
  renderAtividades();
  toast('Atividade excluida.');
}

function toggleCheckAtiv(ativId, idx) {
  var at = _atividades.find(function(a){ return a.id===ativId; });
  if (!at || !at.checklist) return;
  at.checklist[idx].done = !at.checklist[idx].done;
  // Auto status se tudo concluido
  var allDone = at.checklist.every(function(item){ return item.done; });
  if (allDone && at.checklist.length > 0) at.status = 'concluida';
  saveAtividades();
  renderAtividades();
}

function mudarStatusAtiv(id, status) {
  var at = _atividades.find(function(a){ return a.id===id; });
  if (!at) return;
  at.status = status;
  saveAtividades();
  renderAtividades();
  toast('Status atualizado!');
}

function filtrarAtividades(filtro) {
  _ativFiltro = filtro;
  ['todas','pendente','andamento','concluida'].forEach(function(f) {
    var btn = document.getElementById('af-' + f);
    if (btn) { btn.classList.toggle('btn-p', f===filtro); btn.classList.toggle('btn-g', f!==filtro); }
  });
  renderAtividades();
}

function renderAtividades() {
  var lista = document.getElementById('atividades-lista');
  var countEl = document.getElementById('atividades-count');
  if (!lista) return;

  var filtered = _atividades;
  if (_ativFiltro !== 'todas') filtered = _atividades.filter(function(a){ return a.status===_ativFiltro; });
  if (countEl) countEl.textContent = _atividades.length;

  if (!filtered.length) {
    lista.innerHTML = '<div class="dash-vazio">' +
      (_atividades.length ? '<div style="font-size:13px">Nenhuma atividade neste filtro</div>' :
        '<div style="font-weight:600;margin-bottom:4px">Nenhuma atividade criada</div><div style="font-size:12px;margin-bottom:14px">Adicione atividades pontuais para projetos especificos</div>' +
        '<button class="btn btn-g btn-sm" onclick="abrirModalAtividade()">+ Criar atividade</button>') +
    '</div>';
    return;
  }

  // Ordenar: urgente > alta > normal; depois por data
  var prioOrd = {urgente:0, alta:1, normal:2};
  filtered = filtered.slice().sort(function(a,b){
    var pp = (prioOrd[a.prio]||2) - (prioOrd[b.prio]||2);
    if (pp !== 0) return pp;
    return (a.data||'').localeCompare(b.data||'');
  });

  lista.innerHTML = filtered.map(function(at) {
    var totalCheck = (at.checklist||[]).length;
    var doneCheck = (at.checklist||[]).filter(function(i){ return i.done; }).length;
    var pct = totalCheck > 0 ? Math.round((doneCheck/totalCheck)*100) : 0;
    var hoje = getTodayStr();
    var vencida = at.data && at.data < hoje && at.status !== 'concluida';

    return '<div class="ativ-card ' + at.status + '" data-darg="' + at.id + '" onclick="abrirModalAtividade(this.dataset.darg)">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:14px;margin-bottom:4px' + (at.status==='concluida'?';text-decoration:line-through;color:var(--text3)':'') + '">' + at.titulo + '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<span class="prio-badge prio-' + at.prio + '">' + (at.prio==='urgente'?'🔴 Urgente':at.prio==='alta'?'🟡 Alta':'Normal') + '</span>' +
            '<span class="status-badge status-' + at.status + '">' + (at.status==='concluida'?'Concluida':at.status==='andamento'?'Em andamento':'Pendente') + '</span>' +
            (at.data ? '<span style="font-size:11px;color:' + (vencida?'var(--red)':'var(--text3)') + '">' + (vencida?'⚠️ ':'') + at.data.split('-').reverse().join('/') + '</span>' : '') +
            (at.resp ? '<span style="font-size:11px;color:var(--text3)">👤 ' + at.resp + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:5px;flex-shrink:0" onclick="event.stopPropagation()">' +
          (at.status !== 'concluida' ? '<button class="btn btn-g btn-xs" data-atid="' + at.id + '" data-status="concluida" onclick="mudarStatusAtiv(this.dataset.atid,this.dataset.status)">✓</button>' : '') +
          '<button class="btn btn-d btn-xs" data-darg="' + at.id + '" onclick="excluirAtividade(this.dataset.darg)">×</button>' +
        '</div>' +
      '</div>' +
      (totalCheck > 0 ?
        '<div style="margin-top:10px">' +
          (at.checklist||[]).map(function(item, i) {
            return '<div class="rot-check-item" data-atid="' + at.id + '" data-idx="' + i + '" onclick="event.stopPropagation();toggleCheckAtiv(this.dataset.atid,this.dataset.idx)">' +
              '<div class="rot-check-box' + (item.done?' done':'') + '"></div>' +
              '<span class="rot-check-text' + (item.done?' done':'') + '">' + item.texto + '</span>' +
            '</div>';
          }).join('') +
          '<div style="margin-top:8px">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:var(--text3)">' + doneCheck + '/' + totalCheck + ' concluidos</span><span style="font-size:11px;font-weight:600;color:' + (pct===100?'var(--green)':'var(--text2)') + '">' + pct + '%</span></div>' +
            '<div style="height:5px;background:var(--border);border-radius:20px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + (pct===100?'var(--green)':'var(--blue)') + ';border-radius:20px;transition:width .4s"></div></div>' +
          '</div>' +
        '</div>' : '') +
    '</div>';
  }).join('');
}

function abrirModalTarefa() { abrirModalAtividade(); }
function salvarTarefa() { salvarAtividade(); }

// ── FUNIS ──
// ══════════════════════════════════════════════════
// FUNIS COMERCIAIS v2
// ══════════════════════════════════════════════════
var FUNIL_TIPOS = [
  {id:'aquisicao', label:'Funil de Aquisicao', icon:'🎯', desc:'Captacao e conversao de novos clientes', cor:'var(--blue)', corL:'var(--blue-l)'},
  {id:'live', label:'Funil de Live', icon:'📱', desc:'Planejamento e execucao de lives', cor:'var(--purple)', corL:'var(--purple-l)'},
  {id:'whatsapp', label:'Funil de Grupo de WhatsApp', icon:'💬', desc:'Estrategia via grupo de WhatsApp', cor:'var(--green)', corL:'var(--green-l)'},
  {id:'venda_direta', label:'Funil de Venda Direta', icon:'🛍️', desc:'Abordagem e fechamento direto', cor:'var(--gold)', corL:'var(--gold-l)'},
  {id:'personalizado', label:'Funil Personalizado', icon:'⚙️', desc:'Crie sua propria estrutura', cor:'var(--text2)', corL:'var(--bg4)'}
];

var FUNIL_STATUS = [
  {id:'planejando', label:'Planejando', cor:'var(--blue)', bg:'var(--blue-l)'},
  {id:'ativo', label:'Em andamento', cor:'var(--green)', bg:'var(--green-l)'},
  {id:'pausado', label:'Pausado', cor:'var(--gold)', bg:'var(--gold-l)'},
  {id:'encerrado', label:'Encerrado', cor:'var(--text3)', bg:'var(--bg4)'}
];

var FUNIL_CHECK_DEFAULTS = [
  'Planejamento realizado',
  'Comunicacao preparada',
  'Conteudos produzidos',
  'Divulgacao iniciada',
  'Campanha em andamento',
  'Encerramento realizado'
];

var _funilTipoSelecionado = null;

function saveFunis() {
  eoBulkUpsert('eo_funis', _funis.map(funilToRow));
}

function getFunilTipo(id) {
  return FUNIL_TIPOS.find(function(t){ return t.id === id; }) || FUNIL_TIPOS[4];
}

function getFunilStatus(id) {
  return FUNIL_STATUS.find(function(s){ return s.id === id; }) || FUNIL_STATUS[0];
}

function renderFunis() {
  var el = document.getElementById('funis-list');
  if (!el) return;
  if (!_funis.length) {
    el.innerHTML = '<div class="funil-empty"><div class="funil-empty-icon">🎯</div><div style="font-size:14px;font-weight:600;margin-bottom:6px">Nenhum funil criado ainda</div><div style="font-size:12px">Crie seu primeiro funil para comecar a organizar suas campanhas</div></div>';
    return;
  }
  el.innerHTML = _funis.map(function(f) {
    var tipo = getFunilTipo(f.tipo);
    var status = getFunilStatus(f.status);
    var checks = f.checklist || [];
    var done = checks.filter(function(ch){ return ch.done; }).length;
    var pct = checks.length ? Math.round(done/checks.length*100) : 0;
    var isOpen = f._open ? 'open' : '';
    return '<div class="funil-item ' + isOpen + '" id="funil-' + f.id + '">' +
      '<div class="funil-item-header" data-fid="' + f.id + '" onclick="toggleFunil(this.dataset.fid)">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">' +
            '<span class="funil-tipo-badge" style="background:' + tipo.corL + ';color:' + tipo.cor + '">' + tipo.icon + ' ' + tipo.label + '</span>' +
            '<span class="funil-status-pill" style="background:' + status.bg + ';color:' + status.cor + '">' + status.label + '</span>' +
          '</div>' +
          '<div class="funil-item-title">' + f.nome + '</div>' +
          '<div class="funil-item-meta">' +
            (f.inicio ? '<span>📅 ' + f.inicio.split('-').reverse().join('/') + (f.fim ? ' → ' + f.fim.split('-').reverse().join('/') : '') + '</span>' : '') +
            (f.responsavel ? '<span>👤 ' + f.responsavel + '</span>' : '') +
            (checks.length ? '<span>✓ ' + done + '/' + checks.length + ' etapas</span>' : '') +
          '</div>' +
          (checks.length ? '<div style="margin-top:8px"><div class="funil-progress-bar"><div class="funil-progress-fill" style="width:' + pct + '%"></div></div><div style="font-size:10px;color:var(--text3);margin-top:2px">' + pct + '% concluido</div></div>' : '') +
        '</div>' +
        '<div class="funil-header-actions">' +
          '<button class="btn btn-g btn-xs" data-fid="' + f.id + '" onclick="event.stopPropagation();editarFunil(this.dataset.fid)">Editar</button>' +
          '<button class="btn btn-d btn-xs" data-fid="' + f.id + '" onclick="event.stopPropagation();excluirFunil(this.dataset.fid)">×</button>' +
          '<span class="funil-chevron">▾</span>' +
        '</div>' +
      '</div>' +
      '<div class="funil-item-body ' + isOpen + '" id="funil-body-' + f.id + '">' +
        renderFunilBodyTabs(f) +
      '</div>' +
    '</div>';
  }).join('');
}

function renderFunilBodyTabs(f) {
  return '<div class="funil-body-tabs">' +
    '<div class="funil-body-tab active" data-fid="' + f.id + '" data-tab="info" onclick="switchFunilTab(this.dataset.fid,this.dataset.tab,this)">Informacoes</div>' +
    '<div class="funil-body-tab" data-fid="' + f.id + '" data-tab="execucao" onclick="switchFunilTab(this.dataset.fid,this.dataset.tab,this)">Execucao</div>' +
    '<div class="funil-body-tab" data-fid="' + f.id + '" data-tab="resultados" onclick="switchFunilTab(this.dataset.fid,this.dataset.tab,this)">Resultados</div>' +
  '</div>' +
  '<div id="ftab-info-' + f.id + '" class="funil-body-panel active">' + renderFunilInfo(f) + '</div>' +
  '<div id="ftab-execucao-' + f.id + '" class="funil-body-panel">' + renderFunilExecucao(f) + '</div>' +
  '<div id="ftab-resultados-' + f.id + '" class="funil-body-panel">' + renderFunilResultados(f) + '</div>';
}

function renderFunilInfo(f) {
  var statusOpts = FUNIL_STATUS.map(function(s){
    return '<option value="' + s.id + '"' + (f.status===s.id?' selected':'') + '>' + s.label + '</option>';
  }).join('');
  return '<div class="funil-section-label">Informacoes Gerais</div>' +
  '<div class="funil-fields-grid">' +
    '<div class="funil-field"><label>Objetivo</label><div class="fval">' + (f.objetivo||'—') + '</div></div>' +
    '<div class="funil-field"><label>Status</label>' +
      '<select class="fval" data-fid="' + f.id + '" data-campo="status" onchange="atualizarCampoFunil(this.dataset.fid,this.dataset.campo,this.value)">' + statusOpts + '</select>' +
    '</div>' +
    '<div class="funil-field"><label>Inicio</label><div class="fval">' + (f.inicio ? f.inicio.split('-').reverse().join('/') : '—') + '</div></div>' +
    '<div class="funil-field"><label>Encerramento</label><div class="fval">' + (f.fim ? f.fim.split('-').reverse().join('/') : '—') + '</div></div>' +
    '<div class="funil-field"><label>Responsavel</label><div class="fval">' + (f.responsavel||'—') + '</div></div>' +
    '<div class="funil-field"><label>Canal</label><div class="fval">' + (f.canal||'—') + '</div></div>' +
  '</div>' +
  '<div class="funil-section-label">Meta Vinculada</div>' +
  renderMetaVinculadaFunil(f) +
    '<div class="funil-section-label">Estrategia</div>' +
  '<div class="funil-field"><div class="fval">' + (f.descricao||'—') + '</div></div>' +
  '<div class="funil-section-label">Publico e Observacoes</div>' +
  '<div class="funil-fields-grid">' +
    '<div class="funil-field"><label>Publico-alvo</label><div class="fval">' + (f.publico||'—') + '</div></div>' +
    '<div class="funil-field"><label>Observacoes</label><div class="fval">' + (f.obs||'—') + '</div></div>' +
  '</div>';
}

function renderFunilExecucao(f) {
  var checks = f.checklist || [];
  var done = checks.filter(function(ch){ return ch.done; }).length;
  var pct = checks.length ? Math.round(done/checks.length*100) : 0;
  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
    '<div class="funil-section-label" style="margin:0">Checklist de Execucao</div>' +
    '<button class="btn btn-g btn-xs" data-fid="' + f.id + '" onclick="addCheckFunil(this.dataset.fid)">+ Etapa</button>' +
  '</div>';
  if (checks.length) {
    html += '<div style="margin-bottom:14px"><div class="funil-progress-bar" style="height:8px"><div class="funil-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:4px">' + done + ' de ' + checks.length + ' etapas concluidas (' + pct + '%)</div></div>';
  }
  html += '<div class="funil-checklist">';
  checks.forEach(function(ch, i) {
    html += '<div class="funil-check-item' + (ch.done?' done':'') + '" data-fid="' + f.id + '" data-idx="' + i + '" onclick="toggleCheckFunil(this.dataset.fid,this.dataset.idx)">' +
      '<div class="funil-check-box">' + (ch.done ? '✓' : '') + '</div>' +
      '<div class="funil-check-text">' + ch.texto + '</div>' +
      '<span class="funil-check-del" data-fid="' + f.id + '" data-idx="' + i + '" onclick="event.stopPropagation();delCheckFunil(this.dataset.fid,this.dataset.idx)">×</span>' +
    '</div>';
  });
  html += '</div>';
  if (!checks.length) {
    html += '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px">Nenhuma etapa. Clique em "+ Etapa" para adicionar.</div>';
  }
  return html;
}

function renderFunilResultados(f) {
  var r = f.resultados || {};
  var mVinc = f.meta_id ? _metas.find(function(m){ return m.id === f.meta_id; }) : null;
  
  var metaDestaque = '';
  if (mVinc) {
    var pct = mVinc.alvo > 0 ? Math.min(100, Math.round((mVinc.atual/mVinc.alvo)*100)) : 0;
    metaDestaque = '<div style="background:var(--green-l);border:1px solid var(--green);border-radius:var(--rs);padding:14px;margin-bottom:18px;display:flex;align-items:center;gap:14px">' +
      '<div style="font-size:24px">🎯</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px">Meta vinculada</div>' +
        '<div style="font-size:14px;font-weight:700;color:var(--text)">' + mVinc.titulo + '</div>' +
        '<div style="font-size:12px;color:var(--green2);margin-top:2px">' + formatValorMeta(mVinc.atual, mVinc.unidade) + ' de ' + formatValorMeta(mVinc.alvo, mVinc.unidade) + ' · ' + pct + '% atingido</div>' +
      '</div>' +
      '<button class="btn btn-p btn-xs" data-fid="' + f.id + '" onclick="abrirResultadoViaFunil(this.dataset.fid)">Atualizar meta</button>' +
    '</div>';
  }

  return metaDestaque +
  '<div class="funil-section-label">Resultados da Campanha</div>' +
  '<div style="font-size:12px;color:var(--text3);margin-bottom:12px">Preencha os resultados ao encerrar a campanha e clique em Salvar.</div>' +
  '<div class="funil-resultado-grid" id="fres-grid-' + f.id + '">' +
    funilResCard('Novos clientes', r.novos_clientes||'', '👥', f.id, 'novos_clientes') +
    funilResCard('Novos seguidores', r.novos_seguidores||'', '📲', f.id, 'novos_seguidores') +
    funilResCard('Participantes', r.participantes||'', '🙋', f.id, 'participantes') +
    funilResCard('Qtd de vendas', r.qtd_vendas||'', '🛍️', f.id, 'qtd_vendas') +
    funilResCard('Faturamento (R$)', r.faturamento||'', '💰', f.id, 'faturamento') +
  '</div>' +
  '<div class="funil-section-label" style="margin-top:18px">Observacoes Finais</div>' +
  '<textarea id="fres-obs-' + f.id + '" class="fval" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;margin-bottom:14px" rows="3" placeholder="Aprendizados, pontos de melhoria...">' + (r.obs_final||'') + '</textarea>' +
  '<button class="btn btn-p btn-sm" data-fid="' + f.id + '" onclick="salvarResultadoFunil(this.dataset.fid)" style="width:100%">Salvar Resultados</button>';
}


function renderMetaVinculadaFunil(f) {
  var metaVinc = f.meta_id ? _metas.find(function(m){ return m.id === f.meta_id; }) : null;
  var optsHtml = '<option value="">— Sem vinculo —</option>' +
    _metas.map(function(m){
      return '<option value="' + m.id + '"' + (f.meta_id===m.id?' selected':'') + '>' + m.titulo + '</option>';
    }).join('');
  if (!metaVinc) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg3);border:1px dashed var(--border2);border-radius:var(--rs)">' +
      '<div style="flex:1">' +
        '<select style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--rs);background:var(--bg2);font-size:13px;color:var(--text)" ' +
          'data-fid="' + f.id + '" onchange="vincularMetaFunil(this.dataset.fid,this.value)">' +
          optsHtml +
        '</select>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:5px">Vincule uma meta para acompanhar o progresso automaticamente</div>' +
      '</div>' +
    '</div>';
  }
  var pct = metaVinc.alvo > 0 ? Math.min(100, Math.round((metaVinc.atual/metaVinc.alvo)*100)) : 0;
  var progCor = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--gold)' : 'var(--blue)';
  return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--rs);padding:16px">' +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px">' +
      '<div>' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px">' + metaVinc.titulo + '</div>' +
        '<div style="font-size:11px;color:var(--text3)">Resultado atual: ' + formatValorMeta(metaVinc.atual, metaVinc.unidade) + ' / ' + formatValorMeta(metaVinc.alvo, metaVinc.unidade) + '</div>' +
      '</div>' +
      '<button class="btn btn-g btn-xs" data-fid="' + f.id + '" onclick="desvincularMetaFunil(this.dataset.fid)">Desvincular</button>' +
    '</div>' +
    '<div style="height:8px;background:var(--border);border-radius:20px;overflow:hidden;margin-bottom:6px">' +
      '<div style="height:100%;width:' + pct + '%;background:' + progCor + ';border-radius:20px;transition:width .4s"></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
      '<span style="font-size:12px;color:var(--text3)">' + pct + '% atingido</span>' +
      '<button class="btn btn-p btn-xs" data-fid="' + f.id + '" onclick="abrirResultadoViaFunil(this.dataset.fid)">Atualizar resultado</button>' +
    '</div>' +
    '<div style="padding-top:10px;border-top:1px solid var(--border)">' +
      '<div style="font-size:11px;color:var(--text3);margin-bottom:5px">Trocar meta vinculada:</div>' +
      '<select style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:var(--rs);background:var(--bg2);font-size:12px;color:var(--text)" ' +
        'data-fid="' + f.id + '" onchange="vincularMetaFunil(this.dataset.fid,this.value)">' +
        optsHtml +
      '</select>' +
    '</div>' +
  '</div>';
}

function vincularMetaFunil(fid, metaId) {
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f) return;
  f.meta_id = metaId || null;
  saveFunis();
  renderFunis();
  setTimeout(function(){
    var tab = document.querySelector('#funil-body-' + fid + ' [data-tab="info"]');
    if (tab) switchFunilTab(fid, 'info', tab);
  }, 30);
  toast(metaId ? 'Meta vinculada!' : 'Vinculo removido.');
}

function desvincularMetaFunil(fid) {
  vincularMetaFunil(fid, null);
}

function abrirResultadoViaFunil(fid) {
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f || !f.meta_id) return;
  abrirModalResultado(f.meta_id);
}


function funilResCard(label, val, icon, fid, campo) {
  return '<div class="funil-res-card" style="cursor:text">' +
    '<div style="font-size:20px;margin-bottom:4px">' + icon + '</div>' +
    '<div class="funil-res-label">' + label + '</div>' +
    '<input type="text" id="fres-' + fid + '-' + campo + '"' +
    ' style="border:none;border-bottom:2px solid var(--border2);background:transparent;text-align:center;width:80%;font-size:20px;font-weight:700;font-family:Syne,sans-serif;color:var(--green);outline:none;padding:4px 0"' +
    ' value="' + val + '" placeholder="0">' +
  '</div>';
}

function salvarResultadoFunil(fid) {
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f) return;
  if (!f.resultados) f.resultados = {};
  var campos = ['novos_clientes','novos_seguidores','participantes','qtd_vendas','faturamento'];
  campos.forEach(function(campo){
    var el = document.getElementById('fres-' + fid + '-' + campo);
    if (el) f.resultados[campo] = el.value;
  });
  var obsEl = document.getElementById('fres-obs-' + fid);
  if (obsEl) f.resultados.obs_final = obsEl.value;
  saveFunis();
  toast('Resultados salvos!');
  // Se tem meta vinculada e tem faturamento, oferecer atualizar meta
  if (f.meta_id && f.resultados.faturamento) {
    var m = _metas.find(function(x){ return x.id===f.meta_id; });
    if (m && m.unidade === 'reais') {
      var val = parseFloat(f.resultados.faturamento.toString().replace(',','.'));
      if (!isNaN(val) && confirm('Atualizar tambem o resultado da meta "' + m.titulo + '" com R$ ' + val.toFixed(2) + '?')) {
        var idx = _metas.findIndex(function(x){ return x.id===m.id; });
        if (idx !== -1) {
          _metas[idx].atual = val;
          saveMetas();
          renderMetas();
          toast('Meta atualizada tambem!');
        }
      }
    }
  }
}


function toggleFunil(fid) {
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f) return;
  f._open = !f._open;
  saveFunis();
  renderFunis();
}

function switchFunilTab(fid, tab, el) {
  var body = document.getElementById('funil-body-' + fid);
  if (!body) return;
  body.querySelectorAll('.funil-body-tab').forEach(function(t){ t.classList.remove('active'); });
  body.querySelectorAll('.funil-body-panel').forEach(function(p){ p.classList.remove('active'); });
  el.classList.add('active');
  var panel = document.getElementById('ftab-' + tab + '-' + fid);
  if (panel) panel.classList.add('active');
}

function toggleCheckFunil(fid, idx) {
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f || !f.checklist[idx]) return;
  f.checklist[idx].done = !f.checklist[idx].done;
  saveFunis();
  var execTab = document.querySelector('#funil-body-' + fid + ' [data-tab="execucao"]');
  renderFunis();
  setTimeout(function(){
    if (execTab) switchFunilTab(fid, 'execucao', document.querySelector('#funil-body-' + fid + ' [data-tab="execucao"]'));
  }, 30);
}

function addCheckFunil(fid) {
  var texto = prompt('Nome da etapa:');
  if (!texto || !texto.trim()) return;
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f) return;
  if (!f.checklist) f.checklist = [];
  f.checklist.push({texto: texto.trim(), done: false});
  saveFunis();
  renderFunis();
  setTimeout(function(){
    var el = document.querySelector('#funil-body-' + fid + ' [data-tab="execucao"]');
    if (el) switchFunilTab(fid, 'execucao', el);
  }, 30);
}

function delCheckFunil(fid, idx) {
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f) return;
  f.checklist.splice(parseInt(idx), 1);
  saveFunis();
  renderFunis();
  setTimeout(function(){
    var el = document.querySelector('#funil-body-' + fid + ' [data-tab="execucao"]');
    if (el) switchFunilTab(fid, 'execucao', el);
  }, 30);
}

function atualizarCampoFunil(fid, campo, valor) {
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f) return;
  f[campo] = valor;
  saveFunis();
  renderFunis();
}

function atualizarResultadoFunil(fid, campo, valor) {
  var f = _funis.find(function(x){ return x.id===fid; });
  if (!f) return;
  if (!f.resultados) f.resultados = {};
  f.resultados[campo] = valor;
  saveFunis();
}

function abrirEscolhaTipoFunil() {
  _funilTipoSelecionado = null;
  var tiposHtml = FUNIL_TIPOS.map(function(t) {
    return '<div class="funil-modelo-card" data-tid="' + t.id + '" onclick="selecionarModeloFunil(this.dataset.tid,this)">' +
      '<div class="funil-modelo-icon">' + t.icon + '</div>' +
      '<div><div class="funil-modelo-label">' + t.label + '</div><div class="funil-modelo-desc">' + t.desc + '</div></div>' +
    '</div>';
  }).join('');
  var mo = document.getElementById('mo-funil-tipo');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = 'mo-funil-tipo';
    mo.className = 'mo';
    mo.addEventListener('click', function(e){ if(e.target===this) mo.classList.remove('open'); });
    document.body.appendChild(mo);
  }
  mo.innerHTML = '<div class="modal" style="max-width:520px">' +
    '<div class="mh"><h3 class="mt">Novo Funil</h3><button class="mc" id="btn-fecha-funil-tipo"></button></div>' +
    '<div class="mb">' +
      '<p style="font-size:13px;color:var(--text2);margin-bottom:14px">Selecione o tipo de funil para comecar:</p>' +
      '<div class="funil-tipo-escolha">' + tiposHtml + '</div>' +
      '<div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end">' +
        '<button class="btn btn-g btn-sm" id="btn-cancela-funil-tipo">Cancelar</button>' +
        '<button class="btn btn-p btn-sm" id="btn-continuar-funil" disabled>Continuar</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  mo.classList.add('open');
  document.getElementById('btn-fecha-funil-tipo').onclick = function(){ mo.classList.remove('open'); };
  document.getElementById('btn-cancela-funil-tipo').onclick = function(){ mo.classList.remove('open'); };
  document.getElementById('btn-continuar-funil').onclick = continuarCriarFunil;
}

function selecionarModeloFunil(tid, el) {
  document.querySelectorAll('.funil-modelo-card').forEach(function(card){ card.classList.remove('selected'); });
  el.classList.add('selected');
  _funilTipoSelecionado = tid;
  var btn = document.getElementById('btn-continuar-funil');
  if (btn) btn.disabled = false;
}

function continuarCriarFunil() {
  if (!_funilTipoSelecionado) return;
  var mo = document.getElementById('mo-funil-tipo');
  if (mo) mo.classList.remove('open');
  abrirFormFunil(null, _funilTipoSelecionado);
}

function abrirFormFunil(fid, tipoPreset) {
  var f = fid ? _funis.find(function(x){ return x.id===fid; }) : null;
  var tipo = tipoPreset || (f ? f.tipo : 'personalizado');
  var tipoObj = getFunilTipo(tipo);
  var checks = f ? (f.checklist||[]) : FUNIL_CHECK_DEFAULTS.map(function(t){ return {texto:t,done:false}; });
  var statusOpts = FUNIL_STATUS.map(function(s){
    return '<option value="' + s.id + '"' + ((f?f.status:'planejando')===s.id?' selected':'') + '>' + s.label + '</option>';
  }).join('');
  var checksHtml = checks.map(function(ch){
    return '<div class="funil-check-item" style="cursor:default">' +
      '<div class="funil-check-box" style="border-color:var(--border2)">' + (ch.done?'✓':'') + '</div>' +
      '<input type="text" class="ff-check-input" value="' + (ch.texto||'') + '" style="flex:1;border:none;background:transparent;font-size:13px;color:var(--text);outline:none" placeholder="Nome da etapa">' +
      '<span style="color:var(--text3);cursor:pointer;padding:0 4px;font-size:16px" onclick="this.parentElement.remove()">×</span>' +
    '</div>';
  }).join('');
  var mo = document.getElementById('mo-funil-form');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = 'mo-funil-form';
    mo.className = 'mo';
    mo.addEventListener('click', function(e){ if(e.target===this) mo.classList.remove('open'); });
    document.body.appendChild(mo);
  }
  mo.innerHTML = '<div class="modal modal-lg" style="max-height:90vh;overflow-y:auto">' +
    '<div class="mh"><h3 class="mt">' + (f ? 'Editar Funil' : 'Novo Funil — ' + tipoObj.label) + '</h3><button class="mc" id="btn-fecha-funil-form"></button></div>' +
    '<div class="mb">' +
      '<input type="hidden" id="ff-id" value="' + (f?f.id:'') + '">' +
      '<input type="hidden" id="ff-tipo" value="' + tipo + '">' +
      '<div class="funil-section-label">Informacoes Gerais</div>' +
      '<div class="funil-fields-grid" style="margin-bottom:12px">' +
        '<div class="funil-field" style="grid-column:1/-1"><label>Nome do funil *</label><input id="ff-nome" class="input" type="text" value="' + (f?f.nome:'') + '" placeholder="Ex: Live de Lancamento - Agosto"></div>' +
        '<div class="funil-field" style="grid-column:1/-1"><label>Objetivo</label><input id="ff-objetivo" class="input" type="text" value="' + (f?f.objetivo||'':'') + '" placeholder="Ex: Vender 30 pecas, captar 50 novos clientes"></div>' +
        '<div class="funil-field"><label>Data de inicio</label><input id="ff-inicio" class="input" type="date" value="' + (f?f.inicio||'':'') + '"></div>' +
        '<div class="funil-field"><label>Data de encerramento</label><input id="ff-fim" class="input" type="date" value="' + (f?f.fim||'':'') + '"></div>' +
        '<div class="funil-field"><label>Responsavel</label><select id="ff-resp-sel" class="input" data-mid="ff-resp-inp" onchange="onRespChange(this,this.dataset.mid)">' +spSelectHtml(f?f.responsavel||'':'') +'</select><input type="text" id="ff-resp-inp" class="input" style="margin-top:6px;display:none" placeholder="Nome do responsavel"></div>' +
        '<div class="funil-field"><label>Canal principal</label><input id="ff-canal" class="input" type="text" value="' + (f?f.canal||'':'') + '" placeholder="Instagram, WhatsApp, Loja fisica..."></div>' +
      '</div>' +
      '<div class="funil-section-label">Estrategia</div>' +
      '<div class="funil-field" style="margin-bottom:12px"><textarea id="ff-descricao" class="input" rows="3" style="resize:vertical" placeholder="Descreva a estrategia e o plano de acao...">' + (f?f.descricao||'':'') + '</textarea></div>' +
      '<div class="funil-fields-grid" style="margin-bottom:12px">' +
        '<div class="funil-field"><label>Publico-alvo</label><textarea id="ff-publico" class="input" rows="2" style="resize:vertical" placeholder="Quem e o publico desta campanha?">' + (f?f.publico||'':'') + '</textarea></div>' +
        '<div class="funil-field"><label>Observacoes</label><textarea id="ff-obs" class="input" rows="2" style="resize:vertical" placeholder="Informacoes adicionais...">' + (f?f.obs||'':'') + '</textarea></div>' +
      '</div>' +
      '<div class="funil-section-label">Status</div>' +
      '<div class="funil-field" style="margin-bottom:16px"><select id="ff-status" class="input">' + statusOpts + '</select></div>' +
      '<div class="funil-section-label">Checklist de Execucao</div>' +
      '<div id="ff-checks" class="funil-checklist" style="margin-bottom:10px">' + checksHtml + '</div>' +
      '<button class="btn btn-g btn-xs" style="margin-bottom:16px" onclick="addCheckFormFunil()">+ Adicionar etapa</button>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;padding-top:16px;border-top:1px solid var(--border)">' +
        '<button class="btn btn-g btn-sm" id="btn-cancela-funil-form">Cancelar</button>' +
        '<button class="btn btn-p btn-sm" onclick="salvarFunil()">Salvar Funil</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  mo.classList.add('open');
  document.getElementById('btn-fecha-funil-form').onclick = function(){ mo.classList.remove('open'); };
  document.getElementById('btn-cancela-funil-form').onclick = function(){ mo.classList.remove('open'); };
}

function addCheckFormFunil() {
  var cont = document.getElementById('ff-checks');
  if (!cont) return;
  var div = document.createElement('div');
  div.className = 'funil-check-item';
  div.style.cursor = 'default';
  div.innerHTML = '<div class="funil-check-box" style="border-color:var(--border2)"></div>' +
    '<input type="text" class="ff-check-input" value="" style="flex:1;border:none;background:transparent;font-size:13px;color:var(--text);outline:none" placeholder="Nome da etapa">' +
    '<span style="color:var(--text3);cursor:pointer;padding:0 4px;font-size:16px" onclick="this.parentElement.remove()">×</span>';
  cont.appendChild(div);
  div.querySelector('input').focus();
}

function salvarFunil() {
  var nome = (document.getElementById('ff-nome').value||'').trim();
  if (!nome) { alert('Informe o nome do funil.'); return; }
  var checks = [];
  document.querySelectorAll('.ff-check-input').forEach(function(inp){
    if (inp.value.trim()) checks.push({texto: inp.value.trim(), done: false});
  });
  var fid = document.getElementById('ff-id').value;
  var existing = fid ? _funis.find(function(x){ return x.id===fid; }) : null;
  if (existing) {
    existing.nome = nome;
    existing.objetivo = document.getElementById('ff-objetivo').value;
    existing.inicio = document.getElementById('ff-inicio').value;
    existing.fim = document.getElementById('ff-fim').value;
    existing.responsavel = getResponsavelValue('ff-resp-sel','ff-resp-inp');
    existing.canal = document.getElementById('ff-canal').value;
    existing.descricao = document.getElementById('ff-descricao').value;
    existing.publico = document.getElementById('ff-publico').value;
    existing.obs = document.getElementById('ff-obs').value;
    existing.status = document.getElementById('ff-status').value;
    checks.forEach(function(ch, i){
      if (existing.checklist && existing.checklist[i]) ch.done = existing.checklist[i].done;
    });
    existing.checklist = checks;
  } else {
    _funis.unshift({
      id: uid(),
      tipo: document.getElementById('ff-tipo').value,
      nome: nome,
      objetivo: document.getElementById('ff-objetivo').value,
      inicio: document.getElementById('ff-inicio').value,
      fim: document.getElementById('ff-fim').value,
      responsavel: getResponsavelValue('ff-resp-sel','ff-resp-inp'),
      canal: document.getElementById('ff-canal').value,
      descricao: document.getElementById('ff-descricao').value,
      publico: document.getElementById('ff-publico').value,
      obs: document.getElementById('ff-obs').value,
      status: document.getElementById('ff-status').value,
      checklist: checks,
      resultados: {},
      _open: true
    });
  }
  saveFunis();
  var mo = document.getElementById('mo-funil-form');
  if (mo) mo.classList.remove('open');
  renderFunis();
  toast('Funil salvo!');
}

function editarFunil(fid) {
  abrirFormFunil(fid, null);
}

function excluirFunil(fid) {
  if (!confirm('Excluir este funil?')) return;
  _funis = _funis.filter(function(x){ return x.id!==fid; });
  eoDelete('eo_funis', fid);
  renderFunis();
  toast('Funil excluido.');
}

function abrirModalFunil() {
  abrirEscolhaTipoFunil();
}
