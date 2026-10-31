// ── ESCRITÓRIO: PLANO DO MÊS, PLANEJAMENTO DE AÇÕES, ROTINA E TAREFAS ──
// Carregado depois de escritorio-digital.js (usa _eventos, _rotinas,
// _atividades, _metas, _funis, _planMes, eoBulkUpsert, eoDelete, saveX…).
//
// A ideia: tudo nasce no planejamento. Uma AÇÃO (live, promoção, grupo de
// WhatsApp, parceria…) tem período, meta e um passo a passo. Ao salvar, cada
// etapa vira TAREFA (Rotina e Tarefas) ou CONTEÚDO (calendário de conteúdo),
// e a meta da ação aparece no Plano do Mês. O Plano do Mês junta tudo: meta de
// faturamento puxada das Vendas, tema/objetivo, alertas, linha do tempo das
// ações, tarefas da semana e metas.
//
// Banco: as ações usam a tabela eo_funis (com a coluna nova "etapas"); tarefas
// = eo_atividades (acao_id, etapa_id); conteúdos = eo_eventos (acao_id,
// etapa_id); metas = eo_metas (fonte: manual | faturamento | vendas | ticket |
// clientes_novas | contatos; funil_id = ação dona da meta).

// ── Mapeamentos com os campos novos (substituem os de escritorio-digital.js) ──
function atividadeToRow(a){ return {id:a.id, titulo:a.titulo, data:a.data||null, prio:a.prio||'media', resp:a.resp||null, status:a.status||'pendente', obs:a.obs||null, checklist:a.checklist||[], acao_id:a.acao_id||null, etapa_id:a.etapa_id||null}; }
function rowToAtividade(row){ return {id:row.id, titulo:row.titulo, data:row.data, prio:row.prio, resp:row.resp, status:row.status, obs:row.obs, checklist:row.checklist||[], acao_id:row.acao_id||null, etapa_id:row.etapa_id||null}; }
function eventoToRow(e){ return {id:e.id, titulo:e.titulo, tipo:e.tipo, status:e.status, data:e.data||null, resp:e.resp, objetivo:e.objetivo, campanha:e.campanha, obs:e.obs, acao_id:e.acao_id||null, etapa_id:e.etapa_id||null}; }
function rowToEvento(row){ return {id:row.id, titulo:row.titulo, tipo:row.tipo, status:row.status, data:row.data, resp:row.resp, objetivo:row.objetivo, campanha:row.campanha, obs:row.obs, acao_id:row.acao_id||null, etapa_id:row.etapa_id||null}; }
function metaToRow(m){ return {id:m.id, titulo:m.titulo, cat:m.cat||'personalizada', no_dashboard:!!m.no_dashboard, unidade:m.unidade||'numero', inicio:m.inicio||null, fim:m.fim||null, alvo:m.alvo||0, atual:m.atual||0, descricao:m.desc||null, funil_id:m.funil_id||null, criada_em:m.criadaEm||null, fonte:m.fonte||'manual'}; }
function rowToMeta(row){ return {id:row.id, titulo:row.titulo, cat:row.cat, no_dashboard:row.no_dashboard, unidade:row.unidade, inicio:row.inicio, fim:row.fim, alvo:parseFloat(row.alvo)||0, atual:parseFloat(row.atual)||0, desc:row.descricao, funil_id:row.funil_id, criadaEm:row.criada_em, fonte:row.fonte||'manual'}; }
function funilToRow(f){ return {id:f.id, tipo:f.tipo, nome:f.nome, objetivo:f.objetivo||null, inicio:f.inicio||null, fim:f.fim||null, responsavel:f.responsavel||null, canal:f.canal||null, descricao:f.descricao||null, publico:f.publico||null, obs:f.obs||null, status:f.status||'planejada', checklist:f.checklist||[], resultados:f.resultados||{}, meta_id:f.meta_id||null, aberto:true, etapas:f.etapas||[]}; }
function rowToFunil(row){ return {id:row.id, tipo:row.tipo, nome:row.nome, objetivo:row.objetivo, inicio:row.inicio, fim:row.fim, responsavel:row.responsavel, canal:row.canal, descricao:row.descricao, publico:row.publico, obs:row.obs, status:row.status, checklist:row.checklist||[], resultados:row.resultados||{}, meta_id:row.meta_id, etapas:row.etapas||[]}; }
function renderAcoesFunisRotina() {} // bloco antigo de "ações de funis" saiu da Rotina
function saveFunis(){ eoBulkUpsert('eo_funis', _funis.map(funilToRow)); }

// ── Utilidades ──
var ESC = {};
function eEsc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function eMoeda(v){ return 'R$ ' + (Number(v)||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
function eNum(v){ return (Number(v)||0).toLocaleString('pt-BR', {maximumFractionDigits:1}); }
function eAddDias(dataStr, n){ var p=dataStr.split('-'); var d=new Date(+p[0], +p[1]-1, +p[2]); d.setDate(d.getDate()+n); return toLocalDateStr(d); }
function eDataCurta(dataStr){ if(!dataStr) return 'Sem data'; var p=dataStr.split('-'); return p[2]+'/'+p[1]; }
function eMesKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function eMesIni(key){ return key+'-01'; }
function eMesFim(key){ var p=key.split('-'); return key+'-'+String(new Date(+p[0], +p[1], 0).getDate()).padStart(2,'0'); }
var E_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function eMesNome(key){ var p=key.split('-'); return E_MESES[+p[1]-1]+' '+p[0]; }

var E_ICO = {
  plano:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  acao:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  tarefa:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
  conteudo:'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  alvo:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  alerta:'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  live:'<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49M19.07 4.93a10 10 0 010 14.14M4.93 19.07a10 10 0 010-14.14"/>',
  campanha:'<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  grupo:'<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  trafego:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  parceria:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  captacao:'<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  reativacao:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>',
  colecao:'<path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>',
  evento:'<path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
  personalizada:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  mais:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  editar:'<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  lixo:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  seta:'<polyline points="9 18 15 12 9 6"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  pessoa:'<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  relogio:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
};
function eIco(nome, tam, cor){ return '<svg width="'+(tam||16)+'" height="'+(tam||16)+'" viewBox="0 0 24 24" fill="none" stroke="'+(cor||'currentColor')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">'+(E_ICO[nome]||'')+'</svg>'; }

var ACAO_TIPOS = [
  {id:'live', label:'Live', cor:'#7d3c98', desc:'Venda ao vivo, com antecipação e pós-live'},
  {id:'campanha', label:'Campanha / Promoção', cor:'#1f5c3a', desc:'Data comemorativa, liquidação, condição especial'},
  {id:'colecao', label:'Lançamento de coleção', cor:'#a07830', desc:'Chegada de novidades e antecipação'},
  {id:'grupo', label:'Grupo de WhatsApp', cor:'#1e8449', desc:'Ação ou rotina no grupo de clientes'},
  {id:'trafego', label:'Tráfego pago', cor:'#2471a3', desc:'Anúncios para vender ou captar clientes'},
  {id:'parceria', label:'Parceria', cor:'#b9770e', desc:'Ação com outra marca, influenciadora ou loja'},
  {id:'captacao', label:'Captação de clientes', cor:'#117a8b', desc:'Trazer clientes novas para a base'},
  {id:'reativacao', label:'Reativação de clientes', cor:'#b83232', desc:'Trazer de volta quem parou de comprar'},
  {id:'evento', label:'Evento na loja', cor:'#6c3483', desc:'Bazar, coquetel, desfile, encontro'},
  {id:'personalizada', label:'Personalizada', cor:'#5d6d7e', desc:'Monte do seu jeito'}
];
var ACAO_TIPO_LEGADO = {aquisicao:'captacao', whatsapp:'grupo', grupo_whatsapp:'grupo', venda_direta:'campanha', personalizado:'personalizada'};
function acaoTipo(id){ id = ACAO_TIPO_LEGADO[id] || id; return ACAO_TIPOS.find(function(t){ return t.id===id; }) || ACAO_TIPOS[ACAO_TIPOS.length-1]; }
var ACAO_STATUS = {planejada:{label:'Planejada', cor:'var(--blue)', bg:'var(--blue-l)'}, andamento:{label:'Em andamento', cor:'var(--green)', bg:'var(--green-l)'}, concluida:{label:'Concluída', cor:'var(--text3)', bg:'var(--bg3)'}, cancelada:{label:'Cancelada', cor:'var(--text3)', bg:'var(--bg3)'}};
function acaoStatusAuto(a){
  if (a.status==='concluida' || a.status==='cancelada') return a.status;
  var h=getTodayStr();
  if (a.inicio && a.inicio > h) return 'planejada';
  return 'andamento';
}
var META_FONTES = {
  faturamento:{label:'Faturamento (puxa das Vendas)', unidade:'valor'},
  vendas:{label:'Número de vendas (puxa das Vendas)', unidade:'numero'},
  ticket:{label:'Ticket médio (puxa das Vendas)', unidade:'valor'},
  clientes_novas:{label:'Clientes novas cadastradas', unidade:'numero'},
  contatos:{label:'Clientes contatadas (mensagens e contatos registrados)', unidade:'numero'},
  manual:{label:'Outra (eu atualizo, ex: seguidores, inscritas na live)', unidade:'numero'}
};

// ── Dados de vendas para as metas automáticas ──
var _eVendas = [], _eVendasDe = null;
async function eCarregarVendas(desde){
  if (_eVendasDe && _eVendasDe <= desde && _eVendas._carregadoEm && (Date.now()-_eVendas._carregadoEm) < 60000) return;
  var todas=[], de=0;
  while (true) {
    var r = await _sb.from('purchases').select('date, amount, tipo_cliente').eq('store_id', CU.id).gte('date', desde).range(de, de+999);
    if (r.error) break;
    todas = todas.concat(r.data||[]);
    if (!r.data || r.data.length < 1000) break;
    de += 1000;
  }
  _eVendas = todas; _eVendas._carregadoEm = Date.now(); _eVendasDe = desde;
}
function metaValorAtual(m){
  var ini = m.inicio || '0000-01-01', fim = m.fim || '9999-12-31';
  var noPeriodo = function(d){ return d && d >= ini && d <= fim; };
  switch (m.fonte) {
    case 'faturamento': return _eVendas.filter(function(v){ return noPeriodo(v.date); }).reduce(function(s,v){ return s+(parseFloat(v.amount)||0); }, 0);
    case 'vendas': return _eVendas.filter(function(v){ return noPeriodo(v.date); }).length;
    case 'ticket': var vs=_eVendas.filter(function(v){ return noPeriodo(v.date) && parseFloat(v.amount)>0; }); return vs.length ? vs.reduce(function(s,v){ return s+parseFloat(v.amount); },0)/vs.length : 0;
    case 'clientes_novas': return (_clients||[]).filter(function(c){ return c.created_at && noPeriodo(toLocalDateStr(new Date(c.created_at))); }).length;
    case 'contatos': var ids={}; (_log||[]).forEach(function(l){ if (l.sent_at && noPeriodo(toLocalDateStr(new Date(l.sent_at))) && l.client_id) ids[l.client_id]=1; }); return Object.keys(ids).length;
    default: return parseFloat(m.atual)||0;
  }
}
function metaFmt(m, v){ return (m.unidade==='valor' || m.fonte==='faturamento' || m.fonte==='ticket') ? eMoeda(v) : eNum(v); }
function metaSituacao(m){
  var atual = metaValorAtual(m), alvo = parseFloat(m.alvo)||0;
  var pct = alvo ? Math.min(100, Math.round(atual/alvo*100)) : 0;
  var h = getTodayStr(), ini = m.inicio, fim = m.fim;
  var tempo = (ini && fim && fim > ini) ? Math.max(0, Math.min(1, (diasDesde(ini)+1) / (diasDesde(ini)-diasDesde(fim)+1))) : null;
  var sit = 'ok';
  if (pct >= 100) sit = 'batida';
  else if (fim && h > fim) sit = 'nao_batida';
  else if (tempo !== null && tempo > .25 && pct/100 < tempo - .2) sit = 'risco';
  return {atual:atual, alvo:alvo, pct:pct, tempo:tempo, sit:sit};
}
var META_SIT = {ok:{label:'No ritmo', cor:'var(--green)'}, risco:{label:'Abaixo do ritmo', cor:'var(--gold-b)'}, batida:{label:'Meta batida', cor:'var(--green)'}, nao_batida:{label:'Não batida', cor:'var(--red)'}};

// ── NAVEGAÇÃO DO ESCRITÓRIO ──
var _escAba = 'plano', _escMes = null;
function abrirEscritorio(aba){
  if (typeof showPage==='function' && !document.getElementById('page-escritorio').classList.contains('active')) { _escAba = aba||'plano'; showPage('escritorio'); return; }
  switchEscrit(aba||'plano');
}
function switchEscrit(section, btn){
  if (section==='objetivos' || section==='funis') section = section==='objetivos' ? 'plano' : 'acoes';
  _escAba = section;
  var pg = document.getElementById('page-escritorio'); if (!pg) return;
  pg.querySelectorAll('.escrit-section').forEach(function(el){ el.classList.toggle('active', el.id==='escrit-'+section); });
  pg.querySelectorAll('.escrit-tab').forEach(function(el){ el.classList.toggle('active', el.getAttribute('data-aba')===section); });
  document.querySelectorAll('.nav-i[data-page="escritorio"]').forEach(function(el){ el.classList.toggle('active', el.getAttribute('data-esc-tab')===section); });
  if (section==='plano') renderPlanoMes();
  else if (section==='acoes') { renderAcoes(); if (typeof renderWppAuto==='function') renderWppAuto(); }
  else if (section==='rotina') { renderTarefas(); if (typeof renderRotinas==='function') renderRotinas(); }
  else if (section==='calendario' && typeof renderPlanMes==='function') renderPlanMes();
}
function renderEscritorio(){ switchEscrit(_escAba || 'plano'); }

// ════════════════════════════════════════════
// PLANO DO MÊS
// ════════════════════════════════════════════
function eCard(titulo, corpo, acao, extra){
  return '<div class="card" style="padding:18px;'+(extra||'')+'"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px">'+
    '<div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text3)">'+titulo+'</div>'+(acao||'')+'</div>'+corpo+'</div>';
}
function eLink(txt, onclick){ return '<a style="font-size:12px;font-weight:600;color:var(--green);cursor:pointer;white-space:nowrap" onclick="'+onclick+'">'+txt+'</a>'; }
function eBarra(pct, cor){ return '<div style="height:8px;background:var(--bg3);border-radius:20px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,pct)+'%;background:'+(cor||'var(--green)')+';border-radius:20px;transition:width .4s"></div></div>'; }

async function renderPlanoMes(){
  var root = document.getElementById('plano-root'); if (!root) return;
  if (!_escMes) _escMes = eMesKey(new Date());
  var mk = _escMes, ini = eMesIni(mk), fim = eMesFim(mk), h = getTodayStr();
  var desde = ini;
  (_metas||[]).forEach(function(m){ if (m.inicio && m.inicio < desde && (!m.fim || m.fim >= ini)) desde = m.inicio; });
  root.innerHTML = '<div class="empty" style="padding:40px"><div class="empty-d">Carregando o plano...</div></div>';
  await eCarregarVendas(desde);
  if (_escMes !== mk) return;

  // Meta do mês (loja)
  var metaMes = (_metas||[]).find(function(m){ return !m.funil_id && m.fonte==='faturamento' && m.inicio===ini && m.fim===fim; });
  var vendidoMes = metaValorAtual({fonte:'faturamento', inicio:ini, fim:fim});
  var nVendas = metaValorAtual({fonte:'vendas', inicio:ini, fim:fim});
  var ticket = metaValorAtual({fonte:'ticket', inicio:ini, fim:fim});
  var novas = metaValorAtual({fonte:'clientes_novas', inicio:ini, fim:fim});
  var contatos = metaValorAtual({fonte:'contatos', inicio:ini, fim:fim});
  var diasRest = (h >= ini && h <= fim) ? (diasDesde(h) - diasDesde(fim) + 1) : (h < ini ? (diasDesde(ini)-diasDesde(fim)+1) : 0);
  var metaHtml;
  if (metaMes) {
    var s = metaSituacao(metaMes), falta = Math.max(0, s.alvo - s.atual);
    metaHtml = '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:10px">'+
      '<div><div style="font-size:28px;font-weight:700;letter-spacing:-.5px">'+eMoeda(s.atual)+'</div><div style="font-size:13px;color:var(--text3)">de '+eMoeda(s.alvo)+' · '+s.pct+'%</div></div>'+
      '<div style="text-align:right"><div style="font-size:12px;font-weight:700;color:'+META_SIT[s.sit].cor+'">'+META_SIT[s.sit].label+'</div>'+
        (falta && diasRest ? '<div style="font-size:12px;color:var(--text2);margin-top:2px">Faltam '+eMoeda(falta)+' · '+eMoeda(falta/diasRest)+' por dia em '+diasRest+' dia'+(diasRest>1?'s':'')+'</div>' : '')+'</div></div>'+
      eBarra(s.pct, META_SIT[s.sit].cor)+
      (s.tempo!==null ? '<div style="position:relative;height:14px"><div title="Onde o mês está hoje" style="position:absolute;left:'+Math.round(s.tempo*100)+'%;top:2px;width:2px;height:10px;background:var(--text3);border-radius:2px"></div></div>' : '');
  } else {
    metaHtml = '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div style="font-size:28px;font-weight:700;letter-spacing:-.5px">'+eMoeda(vendidoMes)+'</div><div style="font-size:13px;color:var(--text3)">vendido em '+eMesNome(mk).toLowerCase()+'</div></div>'+
      '<button class="btn btn-p btn-sm" style="width:auto" onclick="abrirModalMetaE(null,{fonte:\'faturamento\',inicio:\''+ini+'\',fim:\''+fim+'\',titulo:\'Faturamento de '+eMesNome(mk)+'\'})">Definir meta do mês</button></div>';
  }
  var kpi = function(lbl, v){ return '<div><div style="font-size:18px;font-weight:700">'+v+'</div><div style="font-size:11px;color:var(--text3)">'+lbl+'</div></div>'; };
  var cardMeta = eCard('Meta de faturamento do mês', metaHtml +
    '<div class="e-kpis">'+
      kpi('vendas', nVendas)+kpi('ticket médio', eMoeda(ticket))+kpi('clientes novas', novas)+kpi('clientes contatadas', contatos)+'</div>',
    metaMes ? eLink('Ajustar meta', "abrirModalMetaE('"+metaMes.id+"')") : '');

  // Planejamento (tema, objetivo...)
  var p = (_planMes||{})[mk] || {};
  var campo = function(lbl, v){ return v ? '<div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:2px">'+lbl+'</div><div style="font-size:13px;line-height:1.5">'+eEsc(v)+'</div></div>' : ''; };
  var planCorpo = (p.tema||p.objetivo||p.narrativa||p.datas||p.campanhas) ? campo('Tema', p.tema)+campo('Objetivo principal', p.objetivo)+campo('Narrativa da comunicação', p.narrativa)+campo('Datas importantes', p.datas)+campo('Anotações de campanhas', p.campanhas)
    : '<div style="font-size:13px;color:var(--text3);line-height:1.6">Defina o tema, o objetivo e a narrativa do mês. É o que orienta as ações e o conteúdo.</div>';
  var cardPlan = eCard('Direção do mês', planCorpo, eLink(p.tema||p.objetivo?'Editar':'Preencher', 'abrirPlanoEdit()'));

  // Alertas
  var alertas = [];
  var atrasadas = (_atividades||[]).filter(function(a){ return a.status!=='concluida' && a.data && a.data < h; });
  if (atrasadas.length) alertas.push({cor:'var(--red)', txt:atrasadas.length+' tarefa'+(atrasadas.length>1?'s':'')+' atrasada'+(atrasadas.length>1?'s':''), on:"_tarFiltro='atrasadas';abrirEscritorio('rotina')"});
  (_funis||[]).forEach(function(a){
    var st = acaoStatusAuto(a); if (st==='concluida'||st==='cancelada') return;
    var nT = (_atividades||[]).filter(function(t){ return t.acao_id===a.id; }).length + (_eventos||[]).filter(function(e){ return e.acao_id===a.id; }).length;
    if (a.inicio && a.inicio >= h && diasDesde(a.inicio) >= -5 && !nT) alertas.push({cor:'var(--gold-b)', txt:'"'+a.nome+'" começa em '+(-diasDesde(a.inicio))+' dia(s) e não tem passo a passo', on:"abrirAcaoForm('"+a.id+"')"});
    if (a.fim && a.fim < h && st!=='concluida') alertas.push({cor:'var(--blue)', txt:'"'+a.nome+'" terminou — registre o resultado', on:"abrirAcaoDetalhe('"+a.id+"')"});
  });
  (_metas||[]).forEach(function(m){ if (!m.inicio || m.fim < ini || m.inicio > fim) return; var s=metaSituacao(m); if (s.sit==='risco') alertas.push({cor:'var(--gold-b)', txt:'Meta "'+m.titulo+'" abaixo do ritmo ('+s.pct+'%)', on:"abrirEscritorio('plano')"}); });
  var semDono = (_eventos||[]).filter(function(e){ return e.data && e.data >= h && e.data <= eAddDias(h,7) && !e.resp && e.status!=='publicado'; }).length;
  if (semDono) alertas.push({cor:'var(--purple)', txt:semDono+' conteúdo(s) desta semana sem responsável', on:"abrirEscritorio('calendario')"});
  var cardAlertas = eCard('Atenção', alertas.length ? alertas.slice(0,6).map(function(a){
      return '<div onclick="'+a.on+'" style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--border);cursor:pointer;font-size:13px"><span style="width:8px;height:8px;border-radius:50%;background:'+a.cor+';margin-top:6px;flex-shrink:0"></span><span style="flex:1">'+eEsc(a.txt)+'</span>'+eIco('seta',14,'var(--text3)')+'</div>';
    }).join('').replace('border-top:1px solid var(--border);','') : '<div style="font-size:13px;color:var(--green)">Nada pendente. Tudo em dia.</div>');

  // Linha do tempo das ações
  var nDias = +fim.slice(8), acoesMes = (_funis||[]).filter(function(a){ var i=a.inicio||a.fim, f=a.fim||a.inicio; return i && f && f >= ini && i <= fim; })
    .sort(function(a,b){ return (a.inicio||'') < (b.inicio||'') ? -1 : 1; });
  var hojeX = (h >= ini && h <= fim) ? ((+h.slice(8)-.5)/nDias*100) : null;
  var linha = acoesMes.length ? '<div style="position:relative">'+
      '<div style="position:relative;height:14px;font-size:10px;color:var(--text3);margin-bottom:4px">'+[1,8,15,22,nDias].map(function(d){ return '<span style="position:absolute;left:min('+((d-1)/nDias*100)+'%, calc(100% - 14px))">'+d+'</span>'; }).join('')+'</div>'+
      (hojeX!==null ? '<div style="position:absolute;top:16px;bottom:0;left:'+hojeX+'%;width:2px;background:var(--red);opacity:.5;border-radius:2px" title="Hoje"></div>' : '')+
      acoesMes.map(function(a){
        var t = acaoTipo(a.tipo), i = (a.inicio||a.fim) < ini ? ini : (a.inicio||a.fim), f = (a.fim||a.inicio) > fim ? fim : (a.fim||a.inicio);
        var x = (+i.slice(8)-1)/nDias*100, w = Math.max(3, (+f.slice(8) - +i.slice(8) + 1)/nDias*100);
        return '<div style="position:relative;height:34px;margin-top:6px"><div onclick="abrirAcaoDetalhe(\''+a.id+'\')" title="'+eEsc(a.nome)+'" style="position:absolute;left:min('+x+'%, calc(100% - 140px));width:'+w+'%;min-width:140px;max-width:100%;height:30px;border-radius:8px;background:'+t.cor+'1f;border-left:3px solid '+t.cor+';display:flex;align-items:center;gap:6px;padding:0 9px;cursor:pointer;overflow:hidden;white-space:nowrap;font-size:12px;font-weight:600;color:var(--text)">'+eIco(t.id==='personalizada'?'personalizada':t.id,13,t.cor)+eEsc(a.nome)+'<span style="font-weight:400;color:var(--text3)">'+eDataCurta(a.inicio)+(a.fim&&a.fim!==a.inicio?'–'+eDataCurta(a.fim):'')+'</span></div></div>';
      }).join('')+'</div>'
    : '<div style="font-size:13px;color:var(--text3)">Nenhuma ação planejada para este mês.</div>';
  var cardLinha = eCard('Ações do mês', linha, eLink('+ Nova ação', 'abrirAcaoForm()'));

  // Tarefas da semana
  var fimSemana = eAddDias(h, 6);
  var tSemana = (_atividades||[]).filter(function(a){ return a.status!=='concluida' && a.data && a.data <= fimSemana; }).sort(function(a,b){ return a.data < b.data ? -1 : 1; });
  var cardTarefas = eCard('Próximos 7 dias', tSemana.length ? tSemana.slice(0,8).map(eLinhaTarefa).join('') + (tSemana.length>8?'<div style="font-size:12px;color:var(--text3);padding-top:8px">+ '+(tSemana.length-8)+' tarefas</div>':'')
    : '<div style="font-size:13px;color:var(--text3)">Nenhuma tarefa para os próximos dias.</div>', eLink('Ver todas', "abrirEscritorio('rotina')"));

  // Metas do mês (exceto a de faturamento principal)
  var metasMes = (_metas||[]).filter(function(m){ return m !== metaMes && m.inicio && m.fim >= ini && m.inicio <= fim; });
  var cardMetas = eCard('Metas do mês', metasMes.length ? metasMes.map(eLinhaMeta).join('') : '<div style="font-size:13px;color:var(--text3)">Sem outras metas. Crie metas da loja ou dentro de cada ação.</div>', eLink('+ Meta', "abrirModalMetaE(null,{inicio:'"+ini+"',fim:'"+fim+"'})"));

  // Conteúdo do mês
  var evMes = (_eventos||[]).filter(function(e){ return e.data && e.data >= ini && e.data <= fim; });
  var porSt = {}; evMes.forEach(function(e){ porSt[e.status||'ideias']=(porSt[e.status||'ideias']||0)+1; });
  var stLbl = {ideias:'Ideias', planejamento:'Planejamento', producao:'Em produção', agendado:'Agendado', publicado:'Publicado'};
  var cardConteudo = eCard('Conteúdo do mês', evMes.length ? '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">'+Object.keys(stLbl).map(function(k){ return '<div style="background:var(--bg3);border-radius:10px;padding:10px"><div style="font-size:18px;font-weight:700">'+(porSt[k]||0)+'</div><div style="font-size:11px;color:var(--text3)">'+stLbl[k]+'</div></div>'; }).join('')+'</div>'+
      '<div style="font-size:12px;color:var(--text3);margin-top:10px">'+evMes.filter(function(e){ return e.acao_id; }).length+' ligados a ações · '+evMes.filter(function(e){ return !e.acao_id; }).length+' de rotina de conteúdo</div>'
    : '<div style="font-size:13px;color:var(--text3)">Nenhum conteúdo planejado neste mês.</div>', eLink('Abrir conteúdo', "abrirEscritorio('calendario')"));

  root.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">'+
      '<div style="display:flex;align-items:center;gap:6px"><button class="cal-nav-btn" onclick="eMudarMes(-1)">&#8249;</button><span style="font-size:17px;font-weight:700;min-width:150px;text-align:center">'+eMesNome(mk)+'</span><button class="cal-nav-btn" onclick="eMudarMes(1)">&#8250;</button>'+
        (mk!==eMesKey(new Date())?'<button class="btn btn-g btn-sm" style="width:auto" onclick="_escMes=null;renderPlanoMes()">Mês atual</button>':'')+'</div>'+
      '<div style="display:flex;gap:6px"><button class="btn btn-g btn-sm" style="width:auto" onclick="abrirTarefaForm()">+ Tarefa</button><button class="btn btn-p btn-sm" style="width:auto" onclick="abrirAcaoForm()">+ Nova ação</button></div></div>'+
    '<div class="e-grid2">'+cardMeta+cardAlertas+'</div>'+
    '<div style="margin-top:14px">'+cardLinha+'</div>'+
    '<div class="e-grid2" style="margin-top:14px">'+cardTarefas+cardMetas+'</div>'+
    '<div class="e-grid2" style="margin-top:14px">'+cardPlan+cardConteudo+'</div>';
}
function eMudarMes(d){ var p=_escMes.split('-'); var dt=new Date(+p[0], +p[1]-1+d, 1); _escMes=eMesKey(dt); renderPlanoMes(); }

function eLinhaMeta(m){
  var s = metaSituacao(m), dona = m.funil_id ? (_funis||[]).find(function(a){ return a.id===m.funil_id; }) : null;
  return '<div style="padding:10px 0;border-bottom:1px solid var(--border)">'+
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:6px"><div style="font-size:13px;font-weight:600;min-width:0">'+eEsc(m.titulo)+(dona?' <span style="font-weight:400;font-size:11px;color:var(--text3)">· '+eEsc(dona.nome)+'</span>':'')+'</div>'+
    '<div style="font-size:12px;white-space:nowrap"><strong>'+metaFmt(m,s.atual)+'</strong> <span style="color:var(--text3)">/ '+metaFmt(m,s.alvo)+'</span></div></div>'+
    eBarra(s.pct, META_SIT[s.sit].cor)+
    '<div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:var(--text3)"><span style="color:'+META_SIT[s.sit].cor+'">'+META_SIT[s.sit].label+'</span><span>'+
      (m.fonte==='manual' ? '<a style="cursor:pointer;color:var(--green);font-weight:600" onclick="atualizarMetaManual(\''+m.id+'\')">Atualizar número</a> · ' : 'automática · ')+
      '<a style="cursor:pointer" onclick="abrirModalMetaE(\''+m.id+'\')">editar</a></span></div></div>';
}
function eOrigemTarefa(t){
  if (t.acao_id) { var a=(_funis||[]).find(function(x){ return x.id===t.acao_id; }); if (a) { var tp=acaoTipo(a.tipo); return '<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;background:'+tp.cor+'1a;color:'+tp.cor+'">'+eEsc(a.nome)+'</span>'; } }
  return '<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;background:var(--bg3);color:var(--text3)">Avulsa</span>';
}
function eLinhaTarefa(t){
  var h=getTodayStr(), atrasada = t.status!=='concluida' && t.data && t.data < h, feita = t.status==='concluida';
  return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">'+
    '<button onclick="toggleTarefa(\''+t.id+'\')" title="'+(feita?'Reabrir':'Concluir')+'" style="width:20px;height:20px;border-radius:6px;border:1.5px solid '+(feita?'var(--green)':'var(--border2,var(--border))')+';background:'+(feita?'var(--green)':'transparent')+';display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0">'+(feita?eIco('check',13,'#fff'):'')+'</button>'+
    '<div style="flex:1;min-width:0;cursor:pointer" onclick="abrirTarefaForm(\''+t.id+'\')"><div style="font-size:13px;font-weight:600;'+(feita?'text-decoration:line-through;color:var(--text3)':'')+'">'+eEsc(t.titulo)+'</div>'+
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:3px;font-size:11px;color:'+(atrasada?'var(--red)':'var(--text3)')+'">'+(t.data?(t.data===h?'Hoje':eDataCurta(t.data))+(atrasada?' · atrasada':''):'Sem data')+(t.resp?' · '+eEsc(t.resp):'')+' '+eOrigemTarefa(t)+'</div></div></div>';
}

// ── Editar direção do mês ──
function abrirPlanoEdit(){
  var mk=_escMes, p=(_planMes||{})[mk]||{};
  eModal('Direção de '+eMesNome(mk),
    '<div class="fg"><label class="fl">Tema do mês</label><input id="pe-tema" class="fi" value="'+eEsc(p.tema||'')+'" placeholder="Ex: Inverno com estilo"></div>'+
    '<div class="fg"><label class="fl">Objetivo principal</label><input id="pe-obj" class="fi" value="'+eEsc(p.objetivo||'')+'" placeholder="Ex: Trazer de volta clientes que não compram há 60 dias"></div>'+
    '<div class="fg"><label class="fl">Narrativa da comunicação</label><textarea id="pe-nar" class="fta" style="min-height:70px" placeholder="Qual mensagem o mês todo vai reforçar?">'+eEsc(p.narrativa||'')+'</textarea></div>'+
    '<div class="fg"><label class="fl">Datas importantes</label><input id="pe-datas" class="fi" value="'+eEsc(p.datas||'')+'" placeholder="Ex: 10/05 Dia das Mães · 15/05 chegada da coleção"></div>'+
    '<div class="fg"><label class="fl">Anotações</label><textarea id="pe-camp" class="fta" style="min-height:50px">'+eEsc(p.campanhas||'')+'</textarea></div>',
    function(){
      _planMes[mk] = Object.assign({}, p, {tema:val('pe-tema'), objetivo:val('pe-obj'), narrativa:val('pe-nar'), datas:val('pe-datas'), campanhas:val('pe-camp')});
      savePlanMes(mk); renderPlanoMes(); toast('Direção do mês salva.'); return true;
    });
}
function val(id){ var el=document.getElementById(id); return el ? el.value.trim() : ''; }

// ── Modal genérico ──
function eModal(titulo, corpo, onSalvar, opts){
  opts = opts || {};
  var mo = document.getElementById('mo-esc');
  if (!mo) { mo=document.createElement('div'); mo.id='mo-esc'; mo.className='mo'; mo.addEventListener('click',function(e){ if(e.target===mo) mo.classList.remove('open'); }); document.body.appendChild(mo); }
  mo.innerHTML = '<div class="modal" style="max-width:'+(opts.largura||520)+'px;max-height:92vh;display:flex;flex-direction:column"><div class="mh"><h3 class="mt">'+titulo+'</h3><button class="mc" onclick="document.getElementById(\'mo-esc\').classList.remove(\'open\')">×</button></div>'+
    '<div class="mb" style="overflow-y:auto">'+corpo+'</div>'+
    '<div class="mf" style="display:flex;justify-content:space-between;gap:8px">'+(opts.esquerda||'<span></span>')+'<span style="display:flex;gap:8px"><button class="btn btn-g" onclick="document.getElementById(\'mo-esc\').classList.remove(\'open\')">'+(onSalvar?'Cancelar':'Fechar')+'</button>'+
    (onSalvar?'<button class="btn btn-p" style="width:auto" id="mo-esc-ok">'+(opts.ok||'Salvar')+'</button>':'')+'</span></div></div>';
  mo.classList.add('open');
  if (onSalvar) document.getElementById('mo-esc-ok').onclick = async function(){ var b=this; b.disabled=true; var r=await onSalvar(); b.disabled=false; if (r!==false) mo.classList.remove('open'); };
  return mo;
}
function eSelResp(id, atual){
  return '<select id="'+id+'" class="fi"><option value="">Sem responsável</option>'+(_sp||[]).map(function(s){ return '<option'+(atual===s.name?' selected':'')+'>'+eEsc(s.name)+'</option>'; }).join('')+
    (atual && !(_sp||[]).some(function(s){ return s.name===atual; }) ? '<option selected>'+eEsc(atual)+'</option>' : '')+'</select>';
}

// ════════════════════════════════════════════
// METAS
// ════════════════════════════════════════════
function abrirModalMetaE(id, padrao){
  var m = id ? (_metas||[]).find(function(x){ return x.id===id; }) : null;
  var d = m || Object.assign({titulo:'', fonte:'faturamento', alvo:'', inicio:eMesIni(_escMes||eMesKey(new Date())), fim:eMesFim(_escMes||eMesKey(new Date()))}, padrao||{});
  eModal(m ? 'Editar meta' : 'Nova meta',
    '<div class="fg"><label class="fl">Nome da meta</label><input id="me-titulo" class="fi" value="'+eEsc(d.titulo)+'" placeholder="Ex: Faturamento de novembro, 100 seguidores novos"></div>'+
    '<div class="fg"><label class="fl">Como medir</label><select id="me-fonte" class="fi" onchange="document.getElementById(\'me-atual-wrap\').style.display=this.value===\'manual\'?\'block\':\'none\'">'+
      Object.keys(META_FONTES).map(function(k){ return '<option value="'+k+'"'+(d.fonte===k?' selected':'')+'>'+META_FONTES[k].label+'</option>'; }).join('')+'</select></div>'+
    '<div class="fgrid"><div class="fg"><label class="fl">Alvo</label><input id="me-alvo" type="number" step="0.01" class="fi" value="'+(d.alvo||'')+'"></div>'+
    '<div class="fg" id="me-atual-wrap" style="display:'+(d.fonte==='manual'?'block':'none')+'"><label class="fl">Valor atual</label><input id="me-atual" type="number" step="0.01" class="fi" value="'+(d.atual||'')+'"></div></div>'+
    '<div class="fgrid"><div class="fg"><label class="fl">De</label><input id="me-ini" type="date" class="fi" value="'+(d.inicio||'')+'"></div><div class="fg"><label class="fl">Até</label><input id="me-fim" type="date" class="fi" value="'+(d.fim||'')+'"></div></div>'+
    '<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:4px"><input type="checkbox" id="me-dash"'+(d.no_dashboard?' checked':'')+'> Mostrar no Dashboard</label>',
    function(){
      var titulo=val('me-titulo'), fonte=document.getElementById('me-fonte').value, alvo=parseFloat(val('me-alvo'));
      if (!titulo) { toast('Dê um nome para a meta.','e'); return false; }
      if (!alvo) { toast('Informe o alvo.','e'); return false; }
      var nova = Object.assign(m || {id:uid(), criadaEm:new Date().toISOString(), funil_id:d.funil_id||null}, {titulo:titulo, fonte:fonte, alvo:alvo, atual:parseFloat(val('me-atual'))||0,
        unidade:META_FONTES[fonte].unidade, cat: fonte==='faturamento'||fonte==='ticket'?'faturamento':fonte==='clientes_novas'||fonte==='contatos'?'clientes':'personalizada',
        inicio:val('me-ini')||null, fim:val('me-fim')||null, no_dashboard:document.getElementById('me-dash').checked});
      if (!m) _metas.push(nova);
      saveMetas(); eRerender(); toast('Meta salva.'); return true;
    }, {esquerda: m ? '<button class="btn btn-g" style="width:auto;color:var(--red)" onclick="excluirMetaE(\''+m.id+'\')">Excluir</button>' : ''});
}
function excluirMetaE(id){
  if (!confirm('Excluir esta meta?')) return;
  _metas = _metas.filter(function(m){ return m.id!==id; }); eoDelete('eo_metas', id);
  (_funis||[]).forEach(function(a){ if (a.meta_id===id) { a.meta_id=null; } }); saveFunis();
  document.getElementById('mo-esc').classList.remove('open'); eRerender();
}
function atualizarMetaManual(id){
  var m=(_metas||[]).find(function(x){ return x.id===id; }); if (!m) return;
  var v = prompt('Quanto está hoje em "'+m.titulo+'"?', m.atual||0); if (v===null) return;
  m.atual = parseFloat(String(v).replace(',','.'))||0; saveMetas(); eRerender();
}
function eRerender(){ if (typeof updateBadges==='function') { try{ updateBadges(); }catch(e){} } switchEscrit(_escAba||'plano'); }

// ════════════════════════════════════════════
// PLANEJAMENTO DE AÇÕES
// ════════════════════════════════════════════
var _acaoFiltro = 'ativas';
function renderAcoes(){
  var root=document.getElementById('acoes-root'); if (!root) return;
  var lista=(_funis||[]).slice().sort(function(a,b){ return (a.inicio||'9') < (b.inicio||'9') ? -1 : 1; });
  var cont={ativas:0, planejada:0, andamento:0, concluida:0};
  lista.forEach(function(a){ var s=acaoStatusAuto(a); if (s==='planejada'||s==='andamento') cont.ativas++; cont[s]=(cont[s]||0)+1; });
  var filtrada=lista.filter(function(a){ var s=acaoStatusAuto(a); return _acaoFiltro==='todas' || (_acaoFiltro==='ativas' ? (s==='planejada'||s==='andamento') : s===_acaoFiltro); });
  var chip=function(id,lbl,n){ var on=_acaoFiltro===id; return '<button class="btn btn-sm '+(on?'btn-p':'btn-g')+'" style="width:auto" onclick="_acaoFiltro=\''+id+'\';renderAcoes()">'+lbl+(n!=null?' · '+n:'')+'</button>'; };
  root.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px">'+
      '<div><h2 style="font-size:16px;font-weight:700">Planejamento de Ações</h2><p style="font-size:12px;color:var(--text3);margin-top:3px;max-width:560px">Cada ação tem período, meta e passo a passo. Ao salvar, as etapas viram tarefas na Rotina e conteúdos no calendário.</p></div>'+
      '<button class="btn btn-p btn-sm" style="width:auto" onclick="abrirAcaoForm()">+ Nova ação</button></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'+chip('ativas','Ativas',cont.ativas)+chip('planejada','Planejadas',cont.planejada)+chip('andamento','Em andamento',cont.andamento)+chip('concluida','Concluídas',cont.concluida)+chip('todas','Todas')+'</div>'+
    (filtrada.length ? '<div class="e-grid-cards">'+filtrada.map(eCardAcao).join('')+'</div>'
      : '<div class="card" style="text-align:center;padding:36px"><div style="display:flex;justify-content:center;margin-bottom:10px">'+eIco('acao',28,'var(--text3)')+'</div><div style="font-weight:600;margin-bottom:4px">Nenhuma ação aqui</div><div style="font-size:12px;color:var(--text3);margin-bottom:14px">Planeje uma live, uma promoção, uma rotina de grupo ou uma parceria.</div><button class="btn btn-p btn-sm" style="width:auto" onclick="abrirAcaoForm()">+ Nova ação</button></div>');
}
function eProgressoAcao(a){
  var ts=(_atividades||[]).filter(function(t){ return t.acao_id===a.id; }), cs=(_eventos||[]).filter(function(e){ return e.acao_id===a.id; });
  var tot=ts.length+cs.length, feitas=ts.filter(function(t){ return t.status==='concluida'; }).length + cs.filter(function(e){ return e.status==='publicado'; }).length;
  return {tot:tot, feitas:feitas, tarefas:ts, conteudos:cs, pct: tot?Math.round(feitas/tot*100):0};
}
function eCardAcao(a){
  var t=acaoTipo(a.tipo), st=ACAO_STATUS[acaoStatusAuto(a)], pr=eProgressoAcao(a), meta=a.meta_id?(_metas||[]).find(function(m){ return m.id===a.meta_id; }):null;
  var ms = meta ? metaSituacao(meta) : null;
  return '<div class="card e-card-acao" onclick="abrirAcaoDetalhe(\''+a.id+'\')" style="padding:16px;cursor:pointer;border-top:3px solid '+t.cor+'">'+
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="display:flex;gap:8px;align-items:center;min-width:0"><span style="width:30px;height:30px;border-radius:8px;background:'+t.cor+'1a;display:flex;align-items:center;justify-content:center">'+eIco(t.id,15,t.cor)+'</span>'+
      '<div style="min-width:0"><div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+eEsc(a.nome)+'</div><div style="font-size:11px;color:var(--text3)">'+t.label+'</div></div></div>'+
      '<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;background:'+st.bg+';color:'+st.cor+';white-space:nowrap">'+st.label+'</span></div>'+
    '<div style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--text2);margin:12px 0 10px">'+eIco('plano',13,'var(--text3)')+(a.inicio?eDataCurta(a.inicio):'Sem data')+(a.fim&&a.fim!==a.inicio?' a '+eDataCurta(a.fim):'')+(a.responsavel?'<span style="color:var(--text3)">·</span>'+eEsc(a.responsavel):'')+'</div>'+
    '<div style="font-size:11px;color:var(--text3);display:flex;justify-content:space-between;margin-bottom:4px"><span>Passo a passo</span><span>'+pr.feitas+'/'+pr.tot+'</span></div>'+eBarra(pr.pct, t.cor)+
    (ms ? '<div style="font-size:11px;color:var(--text3);display:flex;justify-content:space-between;margin:10px 0 4px"><span>Meta</span><span>'+metaFmt(meta,ms.atual)+' / '+metaFmt(meta,ms.alvo)+'</span></div>'+eBarra(ms.pct, META_SIT[ms.sit].cor) : '')+
  '</div>';
}

// ── Detalhe da ação ──
function abrirAcaoDetalhe(id){
  var a=(_funis||[]).find(function(x){ return x.id===id; }); if (!a) return;
  var t=acaoTipo(a.tipo), pr=eProgressoAcao(a), meta=a.meta_id?(_metas||[]).find(function(m){ return m.id===a.meta_id; }):null, st=acaoStatusAuto(a);
  var itens = pr.tarefas.map(function(x){ return {k:'t', d:x.data||'', o:x}; }).concat(pr.conteudos.map(function(x){ return {k:'c', d:x.data||'', o:x}; })).sort(function(x,y){ return x.d < y.d ? -1 : 1; });
  var res = a.resultados || {};
  var corpo =
    '<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap"><span style="font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;background:'+t.cor+'1a;color:'+t.cor+';display:inline-flex;gap:6px;align-items:center">'+eIco(t.id,13,t.cor)+t.label+'</span>'+
      '<span style="font-size:13px;color:var(--text2)">'+(a.inicio?eDataCurta(a.inicio):'')+(a.fim&&a.fim!==a.inicio?' a '+eDataCurta(a.fim):'')+(a.responsavel?' · '+eEsc(a.responsavel):'')+'</span>'+
      '<select class="fi" style="width:auto;margin-left:auto;padding:6px 10px;font-size:12px" onchange="mudarStatusAcao(\''+a.id+'\',this.value)">'+['','concluida','cancelada'].map(function(s){ return '<option value="'+s+'"'+((a.status===s)||(!s&&a.status!=='concluida'&&a.status!=='cancelada')?' selected':'')+'>'+(s?ACAO_STATUS[s].label:'Ativa (automático)')+'</option>'; }).join('')+'</select></div>'+
    (a.objetivo ? '<div style="font-size:13px;line-height:1.6;color:var(--text2);margin-bottom:14px">'+eEsc(a.objetivo)+'</div>' : '')+
    (a.descricao && a.descricao!==a.objetivo ? '<div style="font-size:12px;line-height:1.6;color:var(--text3);margin-bottom:14px;white-space:pre-wrap">'+eEsc(a.descricao)+'</div>' : '')+
    (meta ? '<div style="background:var(--bg3);border-radius:12px;padding:12px 14px;margin-bottom:16px">'+eLinhaMeta(meta).replace('border-bottom:1px solid var(--border)','')+'</div>' : '')+
    '<div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text3);margin-bottom:6px">Passo a passo · '+pr.feitas+'/'+pr.tot+'</div>'+
    (itens.length ? itens.map(function(it){
        if (it.k==='t') return eLinhaTarefa(it.o);
        var e=it.o, pub=e.status==='publicado';
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)"><span style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:'+(pub?'var(--green)':'var(--purple)')+'">'+eIco('conteudo',15)+'</span>'+
          '<div style="flex:1;min-width:0;cursor:pointer" onclick="document.getElementById(\'mo-esc\').classList.remove(\'open\');abrirModalConteudo(\''+e.id+'\')"><div style="font-size:13px;font-weight:600">'+eEsc(e.titulo)+'</div><div style="font-size:11px;color:var(--text3)">Conteúdo · '+eDataCurta(e.data)+' · '+((typeof TIPO_LABEL!=='undefined'&&TIPO_LABEL[e.tipo])||e.tipo||'')+' · '+(({ideias:'Ideia',planejamento:'Planejamento',producao:'Em produção',agendado:'Agendado',publicado:'Publicado'})[e.status]||e.status)+(e.resp?' · '+eEsc(e.resp):'')+'</div></div></div>';
      }).join('') : '<div style="font-size:13px;color:var(--text3);padding:6px 0 12px">Sem etapas ainda. Edite a ação para montar o passo a passo.</div>')+
    '<div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text3);margin:18px 0 6px">Resultado</div>'+
    '<div class="fgrid"><div class="fg"><label class="fl">Vendido com a ação (R$)</label><input id="ad-res-valor" type="number" step="0.01" class="fi" value="'+(res.valor||'')+'"></div><div class="fg"><label class="fl">Vendas / pedidos</label><input id="ad-res-qtd" type="number" class="fi" value="'+(res.qtd||'')+'"></div></div>'+
    '<div class="fg"><label class="fl">O que funcionou e o que mudar na próxima</label><textarea id="ad-res-obs" class="fta" style="min-height:60px">'+eEsc(res.obs||'')+'</textarea></div>';
  eModal(eEsc(a.nome), corpo, function(){
    a.resultados = Object.assign({}, a.resultados||{}, {valor:parseFloat(val('ad-res-valor'))||null, qtd:parseInt(val('ad-res-qtd'))||null, obs:val('ad-res-obs')});
    saveFunis(); toast('Resultado salvo.'); eRerender(); return true;
  }, {largura:640, ok:'Salvar resultado', esquerda:'<span style="display:flex;gap:6px"><button class="btn btn-g" style="width:auto" onclick="abrirAcaoForm(\''+a.id+'\')">'+eIco('editar',14)+' Editar</button><button class="btn btn-g" style="width:auto" onclick="duplicarAcao(\''+a.id+'\')">Repetir</button></span>'});
}
function mudarStatusAcao(id, s){ var a=(_funis||[]).find(function(x){ return x.id===id; }); if (!a) return; a.status = s || 'planejada'; saveFunis(); eRerender(); }
function duplicarAcao(id){
  var a=(_funis||[]).find(function(x){ return x.id===id; }); if (!a) return;
  var n=JSON.parse(JSON.stringify(a)); n.id=uid(); n.nome=a.nome+' (cópia)'; n.inicio=''; n.fim=''; n.status='planejada'; n.meta_id=null; n.resultados={};
  n.etapas=(n.etapas||[]).map(function(e){ e.id=uid(); return e; });
  document.getElementById('mo-esc').classList.remove('open');
  abrirAcaoForm(null, n);
}

// ── Formulário da ação ──
var _af = null; // estado do formulário
var E_QUANDO = [
  {id:'antes', label:'dias antes do início', dias:true},
  {id:'inicio', label:'no dia do início'},
  {id:'durante', label:'no dia (data)', data:true},
  {id:'fim', label:'no último dia'},
  {id:'depois', label:'dias depois do fim', dias:true},
  {id:'semanal', label:'toda semana no período', semana:true}
];
var E_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function abrirAcaoForm(id, base){
  var a = id ? (_funis||[]).find(function(x){ return x.id===id; }) : null;
  var meta = a && a.meta_id ? (_metas||[]).find(function(m){ return m.id===a.meta_id; }) : null;
  var src = a || base || {};
  _af = {id: a?a.id:null, tipo: ACAO_TIPO_LEGADO[src.tipo]||src.tipo||'', nome:src.nome||'', inicio:src.inicio||'', fim:src.fim||'', responsavel:src.responsavel||'', objetivo:src.objetivo||'',
    etapas: JSON.parse(JSON.stringify(src.etapas||[])), metaFonte: meta?meta.fonte:'', metaAlvo: meta?meta.alvo:'', metaTitulo: meta?meta.titulo:''};
  eRenderAcaoForm();
}
function eRenderAcaoForm(){
  var f=_af, modelos=eModelos();
  var tiposHtml = ACAO_TIPOS.map(function(t){ var on=f.tipo===t.id; return '<button type="button" onclick="_afSet(\'tipo\',\''+t.id+'\')" style="display:flex;gap:8px;align-items:center;text-align:left;padding:9px 10px;border-radius:10px;cursor:pointer;border:1.5px solid '+(on?t.cor:'var(--border)')+';background:'+(on?t.cor+'12':'var(--bg2)')+';font-family:inherit">'+
      '<span style="color:'+t.cor+'">'+eIco(t.id,16,t.cor)+'</span><span><span style="display:block;font-size:12px;font-weight:700;color:var(--text)">'+t.label+'</span><span style="display:block;font-size:10px;color:var(--text3);line-height:1.3">'+t.desc+'</span></span></button>'; }).join('');
  var etapasHtml = f.etapas.map(function(e,i){
    var q=E_QUANDO.find(function(x){ return x.id===e.quando; })||E_QUANDO[0];
    return '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;background:var(--bg2)">'+
      '<div style="display:flex;gap:6px;align-items:center"><span style="font-size:11px;font-weight:700;color:var(--text3);width:18px">'+(i+1)+'</span>'+
        '<input class="fi" style="flex:1" placeholder="O que fazer (ex: anunciar a live nos stories)" value="'+eEsc(e.titulo)+'" oninput="_af.etapas['+i+'].titulo=this.value">'+
        '<button type="button" class="btn btn-g btn-sm" style="width:auto;padding:6px 8px" title="Remover etapa" onclick="_af.etapas.splice('+i+',1);eRenderAcaoForm()">'+eIco('lixo',14)+'</button></div>'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 0 24px;align-items:center">'+
        '<select class="fi" style="width:auto;padding:6px 8px;font-size:12px" onchange="_af.etapas['+i+'].tipo=this.value;eRenderAcaoForm()"><option value="tarefa"'+(e.tipo!=='conteudo'?' selected':'')+'>Tarefa</option><option value="conteudo"'+(e.tipo==='conteudo'?' selected':'')+'>Conteúdo</option></select>'+
        (e.tipo==='conteudo' ? '<select class="fi" style="width:auto;padding:6px 8px;font-size:12px" onchange="_af.etapas['+i+'].formato=this.value">'+['stories','reels','feed','live','outro'].map(function(k){ return '<option value="'+k+'"'+(e.formato===k?' selected':'')+'>'+((typeof TIPO_LABEL!=='undefined'&&TIPO_LABEL[k])||k)+'</option>'; }).join('')+'</select>' : '')+
        (q.dias ? '<input type="number" min="0" class="fi" style="width:64px;padding:6px 8px;font-size:12px" value="'+(e.dias||0)+'" oninput="_af.etapas['+i+'].dias=parseInt(this.value)||0">' : '')+
        '<select class="fi" style="width:auto;padding:6px 8px;font-size:12px" onchange="_af.etapas['+i+'].quando=this.value;eRenderAcaoForm()">'+E_QUANDO.map(function(x){ return '<option value="'+x.id+'"'+(x.id===q.id?' selected':'')+'>'+x.label+'</option>'; }).join('')+'</select>'+
        (q.data ? '<input type="date" class="fi" style="width:auto;padding:6px 8px;font-size:12px" value="'+(e.data||f.inicio||'')+'" onchange="_af.etapas['+i+'].data=this.value">' : '')+
        (q.semana ? '<select class="fi" style="width:auto;padding:6px 8px;font-size:12px" onchange="_af.etapas['+i+'].diaSemana=parseInt(this.value)">'+E_SEMANA.map(function(d,k){ return '<option value="'+k+'"'+(+e.diaSemana===k?' selected':'')+'>'+d+'</option>'; }).join('')+'</select>' : '')+
        '<select class="fi" style="width:auto;padding:6px 8px;font-size:12px" onchange="_af.etapas['+i+'].resp=this.value"><option value="">Responsável: quem for da ação</option>'+(_sp||[]).map(function(s){ return '<option'+(e.resp===s.name?' selected':'')+'>'+eEsc(s.name)+'</option>'; }).join('')+'</select>'+
      '</div></div>';
  }).join('');
  var modelosTipo = modelos.filter(function(m){ return !f.tipo || m.tipo===f.tipo; });
  var corpo =
    '<div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Tipo de ação</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px;margin-bottom:16px">'+tiposHtml+'</div>'+
    '<div class="fgrid"><div class="fg c2"><label class="fl">Nome da ação *</label><input class="fi" value="'+eEsc(f.nome)+'" placeholder="Ex: Live de lançamento da coleção de verão" oninput="_af.nome=this.value"></div>'+
      '<div class="fg"><label class="fl">Início</label><input type="date" class="fi" value="'+f.inicio+'" onchange="_af.inicio=this.value;if(!_af.fim||_af.fim<this.value){_af.fim=this.value;eRenderAcaoForm();}"></div>'+
      '<div class="fg"><label class="fl">Fim</label><input type="date" class="fi" value="'+f.fim+'" onchange="_af.fim=this.value"></div>'+
      '<div class="fg"><label class="fl">Responsável</label>'+eSelResp('af-resp', f.responsavel).replace('<select ','<select onchange="_af.responsavel=this.value" ')+'</div>'+
      '<div class="fg"><label class="fl">Objetivo</label><input class="fi" value="'+eEsc(f.objetivo)+'" placeholder="Ex: vender as peças novas para quem já é cliente" oninput="_af.objetivo=this.value"></div></div>'+
    '<div style="background:var(--bg3);border-radius:12px;padding:12px 14px;margin:6px 0 16px"><div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Meta desta ação (opcional)</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><select class="fi" style="flex:2;min-width:200px" onchange="_af.metaFonte=this.value;eRenderAcaoForm()"><option value="">Sem meta</option>'+Object.keys(META_FONTES).map(function(k){ return '<option value="'+k+'"'+(f.metaFonte===k?' selected':'')+'>'+META_FONTES[k].label+'</option>'; }).join('')+'</select>'+
      (f.metaFonte ? '<input type="number" step="0.01" class="fi" style="flex:1;min-width:110px" placeholder="Alvo" value="'+(f.metaAlvo||'')+'" oninput="_af.metaAlvo=this.value">' : '')+'</div>'+
      (f.metaFonte==='manual' ? '<input class="fi" style="margin-top:8px" placeholder="O que vai medir (ex: inscritas na live, seguidores novos)" value="'+eEsc(f.metaTitulo||'')+'" oninput="_af.metaTitulo=this.value">' : '')+
      (f.metaFonte && f.metaFonte!=='manual' ? '<div style="font-size:11px;color:var(--text3);margin-top:6px">Calculada sozinha no período da ação.</div>' : '')+'</div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap"><div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text3)">Passo a passo</div>'+
      (modelosTipo.length ? '<select class="fi" style="width:auto;padding:6px 8px;font-size:12px" onchange="if(this.value){usarModeloAcao(this.value)}"><option value="">Usar um modelo salvo...</option>'+modelosTipo.map(function(m){ return '<option value="'+m.id+'">'+eEsc(m.nome)+' ('+m.etapas.length+' etapas)</option>'; }).join('')+'</select>' : '')+'</div>'+
    '<div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.5">Cada etapa vira uma tarefa na Rotina ou um conteúdo no calendário, na data certa. Etapas "toda semana" criam uma tarefa por semana dentro do período (bom para rotina de grupo).</div>'+
    etapasHtml+
    '<button type="button" class="btn btn-g btn-sm" style="width:auto" onclick="_af.etapas.push({id:uid(),titulo:\'\',tipo:\'tarefa\',quando:\'antes\',dias:1});eRenderAcaoForm()">'+eIco('mais',14)+' Adicionar etapa</button>'+
    '<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:16px"><input type="checkbox" id="af-salvar-modelo"> Salvar este passo a passo como modelo para as próximas</label>';
  var mo = eModal(_af.id ? 'Editar ação' : 'Nova ação', corpo, salvarAcaoForm, {largura:720, ok:'Salvar ação',
    esquerda: _af.id ? '<button class="btn btn-g" style="width:auto;color:var(--red)" onclick="excluirAcao(\''+_af.id+'\')">Excluir</button>' : ''});
  var mb = mo.querySelector('.mb'); if (mb && _af._scroll) mb.scrollTop = _af._scroll;
  if (mb) mb.addEventListener('scroll', function(){ _af._scroll = mb.scrollTop; });
}
function _afSet(k, v){ _af[k]=v; eRenderAcaoForm(); }

async function salvarAcaoForm(){
  var f=_af;
  if (!f.tipo) { toast('Escolha o tipo de ação.','e'); return false; }
  if (!f.nome.trim()) { toast('Dê um nome para a ação.','e'); return false; }
  if (!f.inicio) { toast('Informe a data de início.','e'); return false; }
  if (f.fim && f.fim < f.inicio) { toast('O fim não pode ser antes do início.','e'); return false; }
  var etapas = f.etapas.filter(function(e){ return (e.titulo||'').trim(); });
  var a = f.id ? (_funis||[]).find(function(x){ return x.id===f.id; }) : null;
  if (!a) { a = {id:uid(), status:'planejada', checklist:[], resultados:{}}; _funis.push(a); }
  Object.assign(a, {tipo:f.tipo, nome:f.nome.trim(), inicio:f.inicio, fim:f.fim||f.inicio, responsavel:f.responsavel, objetivo:f.objetivo, etapas:etapas});
  // Meta da ação
  if (f.metaFonte && parseFloat(f.metaAlvo)) {
    var m = a.meta_id ? (_metas||[]).find(function(x){ return x.id===a.meta_id; }) : null;
    if (!m) { m = {id:uid(), criadaEm:new Date().toISOString(), atual:0}; _metas.push(m); a.meta_id = m.id; }
    Object.assign(m, {titulo: f.metaFonte==='manual' ? (f.metaTitulo||'Meta da ação') : META_FONTES[f.metaFonte].label.replace(/ \(.*\)$/,'')+' da ação', fonte:f.metaFonte, alvo:parseFloat(f.metaAlvo),
      unidade:META_FONTES[f.metaFonte].unidade, cat:'personalizada', inicio:a.inicio, fim:a.fim, funil_id:a.id, no_dashboard:false});
    saveMetas();
  } else if (a.meta_id) {
    eoDelete('eo_metas', a.meta_id); _metas = _metas.filter(function(x){ return x.id!==a.meta_id; }); a.meta_id = null;
  }
  saveFunis();
  var r = sincronizarEtapas(a);
  if (document.getElementById('af-salvar-modelo') && document.getElementById('af-salvar-modelo').checked && etapas.length) {
    var nome = prompt('Nome do modelo:', acaoTipo(a.tipo).label + ' — ' + a.nome);
    if (nome) { var ms=eModelos(); ms.push({id:uid(), nome:nome, tipo:a.tipo, etapas:etapas.map(function(e){ var c=Object.assign({},e); delete c.id; if (c.quando==='durante') { c.quando='inicio'; } return c; })}); slpSet('slp_acao_modelos', ms); }
  }
  toast('Ação salva · '+r.tarefas+' tarefa(s) e '+r.conteudos+' conteúdo(s) no planejamento.');
  _af = null; eRerender(); return true;
}
function excluirAcao(id){
  var a=(_funis||[]).find(function(x){ return x.id===id; }); if (!a) return;
  var pr=eProgressoAcao(a);
  if (!confirm('Excluir a ação "'+a.nome+'"? As '+pr.tarefas.length+' tarefa(s) e '+pr.conteudos.length+' conteúdo(s) criados por ela também serão excluídos.')) return;
  pr.tarefas.forEach(function(t){ eoDelete('eo_atividades', t.id); }); _atividades=_atividades.filter(function(t){ return t.acao_id!==id; });
  pr.conteudos.forEach(function(e){ eoDelete('eo_eventos', e.id); }); _eventos=_eventos.filter(function(e){ return e.acao_id!==id; });
  if (a.meta_id) { eoDelete('eo_metas', a.meta_id); _metas=_metas.filter(function(m){ return m.id!==a.meta_id; }); }
  eoDelete('eo_funis', id); _funis=_funis.filter(function(x){ return x.id!==id; });
  document.getElementById('mo-esc').classList.remove('open'); toast('Ação excluída.'); eRerender();
}

// Transforma as etapas em tarefas/conteúdos com data. Mantém o que já existe
// (e o que já foi concluído), cria o que é novo e remove o que saiu do plano.
function eDatasEtapa(e, a){
  var ini=a.inicio, fim=a.fim||a.inicio;
  switch (e.quando) {
    case 'antes': return [eAddDias(ini, -(parseInt(e.dias)||0))];
    case 'inicio': return [ini];
    case 'durante': return [e.data || ini];
    case 'fim': return [fim];
    case 'depois': return [eAddDias(fim, parseInt(e.dias)||0)];
    case 'semanal':
      var out=[], d=ini, alvo=parseInt(e.diaSemana)||0, n=0;
      while (d <= fim && n < 60) { var p=d.split('-'); if (new Date(+p[0],+p[1]-1,+p[2]).getDay()===alvo) out.push(d); d=eAddDias(d,1); n++; }
      return out;
  }
  return [ini];
}
function sincronizarEtapas(a){
  var desejadas = [];
  (a.etapas||[]).forEach(function(e){
    var datas = eDatasEtapa(e, a);
    datas.forEach(function(d){ desejadas.push({key: e.quando==='semanal' ? e.id+'@'+d : e.id, etapa:e, data:d}); });
  });
  var chaves = {}; desejadas.forEach(function(x){ chaves[x.key]=1; });
  var nT=0, nC=0;
  // remove o que saiu (só o que não foi concluído/publicado)
  _atividades.filter(function(t){ return t.acao_id===a.id && t.etapa_id && !chaves[t.etapa_id] && t.status!=='concluida'; }).forEach(function(t){ eoDelete('eo_atividades', t.id); t._rm=1; });
  _atividades = _atividades.filter(function(t){ return !t._rm; });
  _eventos.filter(function(ev){ return ev.acao_id===a.id && ev.etapa_id && !chaves[ev.etapa_id] && ev.status!=='publicado'; }).forEach(function(ev){ eoDelete('eo_eventos', ev.id); ev._rm=1; });
  _eventos = _eventos.filter(function(ev){ return !ev._rm; });
  desejadas.forEach(function(x){
    var e=x.etapa, resp=e.resp||a.responsavel||'';
    if (e.tipo==='conteudo') {
      var ev=_eventos.find(function(v){ return v.acao_id===a.id && v.etapa_id===x.key; });
      // se mudou de tarefa para conteúdo, tira a tarefa antiga
      _atividades.filter(function(t){ return t.acao_id===a.id && t.etapa_id===x.key && t.status!=='concluida'; }).forEach(function(t){ eoDelete('eo_atividades', t.id); t._rm=1; });
      _atividades = _atividades.filter(function(t){ return !t._rm; });
      if (ev) { ev.titulo=e.titulo; ev.data=x.data; ev.tipo=e.formato||ev.tipo||'stories'; ev.campanha=a.nome; if (!ev.resp) ev.resp=resp; }
      else _eventos.push({id:uid(), titulo:e.titulo, tipo:e.formato||'stories', status:'planejamento', data:x.data, resp:resp, objetivo:a.objetivo||'', campanha:a.nome, obs:'', acao_id:a.id, etapa_id:x.key});
      nC++;
    } else {
      var t=_atividades.find(function(v){ return v.acao_id===a.id && v.etapa_id===x.key; });
      _eventos.filter(function(v){ return v.acao_id===a.id && v.etapa_id===x.key && v.status!=='publicado'; }).forEach(function(v){ eoDelete('eo_eventos', v.id); v._rm=1; });
      _eventos = _eventos.filter(function(v){ return !v._rm; });
      if (t) { t.titulo=e.titulo; t.data=x.data; if (e.resp || !t.resp) t.resp=resp; }
      else _atividades.push({id:uid(), titulo:e.titulo, data:x.data, prio:'media', resp:resp, status:'pendente', obs:'', checklist:[], acao_id:a.id, etapa_id:x.key});
      nT++;
    }
  });
  saveAtividades(); saveEventos();
  return {tarefas:nT, conteudos:nC};
}

// ── Modelos de passo a passo (de cada loja, salvos no servidor) ──
function eModelos(){ var m=slpGet('slp_acao_modelos', []); return Array.isArray(m) ? m : []; }
function usarModeloAcao(id){
  var m=eModelos().find(function(x){ return x.id===id; }); if (!m) return;
  if (_af.etapas.length && !confirm('Substituir as etapas atuais pelas do modelo "'+m.nome+'"?')) return;
  _af.etapas = m.etapas.map(function(e){ return Object.assign({id:uid()}, e); });
  if (!_af.tipo) _af.tipo = m.tipo;
  eRenderAcaoForm();
}

// ════════════════════════════════════════════
// ROTINA E TAREFAS
// ════════════════════════════════════════════
var _tarFiltro = 'hoje';
function renderTarefas(){
  var root=document.getElementById('tarefas-root'); if (!root) return;
  var h=getTodayStr(), fimSem=eAddDias(h,6);
  var pend=(_atividades||[]).filter(function(t){ return t.status!=='concluida'; });
  var grupos = {
    hoje: pend.filter(function(t){ return t.data===h || (t.data && t.data<h); }),
    semana: pend.filter(function(t){ return t.data && t.data<=fimSem; }),
    atrasadas: pend.filter(function(t){ return t.data && t.data<h; }),
    pendentes: pend,
    concluidas: (_atividades||[]).filter(function(t){ return t.status==='concluida'; })
  };
  var lbl={hoje:'Hoje', semana:'Próximos 7 dias', atrasadas:'Atrasadas', pendentes:'Todas pendentes', concluidas:'Concluídas'};
  var lista = grupos[_tarFiltro] || grupos.hoje;
  lista = lista.slice().sort(function(a,b){ return (a.data||'9999') < (b.data||'9999') ? -1 : 1; });
  if (_tarFiltro==='concluidas') lista.reverse();
  var porData = {}; lista.forEach(function(t){ var k=t.data||'sem'; (porData[k]=porData[k]||[]).push(t); });
  var dias=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  var titData = function(k){ if (k==='sem') return 'Sem data'; if (k===h) return 'Hoje'; if (k===eAddDias(h,1)) return 'Amanhã'; var p=k.split('-'); return dias[new Date(+p[0],+p[1]-1,+p[2]).getDay()]+', '+p[2]+'/'+p[1]+(k<h?' · atrasada':''); };
  root.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px">'+
      '<div><h2 style="font-size:16px;font-weight:700">Rotina e Tarefas</h2><p style="font-size:12px;color:var(--text3);margin-top:3px">Tarefas das ações, tarefas avulsas e a rotina fixa da semana, num lugar só.</p></div>'+
      '<span style="display:flex;gap:6px"><button class="btn btn-g btn-sm" style="width:auto" onclick="abrirModalRotina()">+ Rotina fixa</button><button class="btn btn-p btn-sm" style="width:auto" onclick="abrirTarefaForm()">+ Tarefa</button></span></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+Object.keys(lbl).map(function(k){ var on=_tarFiltro===k, n=grupos[k].length; return '<button class="btn btn-sm '+(on?'btn-p':'btn-g')+'" style="width:auto'+(k==='atrasadas'&&n&&!on?';color:var(--red)':'')+'" onclick="_tarFiltro=\''+k+'\';renderTarefas()">'+lbl[k]+' · '+n+'</button>'; }).join('')+'</div>'+
    '<div class="card" style="padding:4px 18px 10px">'+(lista.length ? Object.keys(porData).map(function(k){
        return '<div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:'+(k!=='sem'&&k<h?'var(--red)':'var(--text3)')+';margin:14px 0 2px">'+titData(k)+'</div>'+porData[k].slice(0,200).map(eLinhaTarefa).join('');
      }).join('') : '<div style="padding:26px 0;text-align:center;font-size:13px;color:var(--text3)">'+(_tarFiltro==='hoje'?'Nada para hoje.':'Nenhuma tarefa aqui.')+'</div>')+'</div>';
}
function toggleTarefa(id){
  var t=(_atividades||[]).find(function(x){ return x.id===id; }); if (!t) return;
  t.status = t.status==='concluida' ? 'pendente' : 'concluida';
  eoBulkUpsert('eo_atividades', [atividadeToRow(t)]);
  eRerender();
  var mo=document.getElementById('mo-esc'); if (mo && mo.classList.contains('open') && t.acao_id && document.getElementById('ad-res-obs')) abrirAcaoDetalhe(t.acao_id);
}
function abrirTarefaForm(id){
  var t = id ? (_atividades||[]).find(function(x){ return x.id===id; }) : null;
  var d = t || {titulo:'', data:getTodayStr(), resp:'', obs:'', acao_id:null};
  var acoes=(_funis||[]).filter(function(a){ var s=acaoStatusAuto(a); return s!=='concluida' && s!=='cancelada' || a.id===d.acao_id; });
  eModal(t ? 'Editar tarefa' : 'Nova tarefa',
    '<div class="fg"><label class="fl">O que fazer *</label><input id="tf-titulo" class="fi" value="'+eEsc(d.titulo)+'"></div>'+
    '<div class="fgrid"><div class="fg"><label class="fl">Data</label><input id="tf-data" type="date" class="fi" value="'+(d.data||'')+'"></div><div class="fg"><label class="fl">Responsável</label>'+eSelResp('tf-resp', d.resp)+'</div></div>'+
    '<div class="fg"><label class="fl">Faz parte de uma ação?</label><select id="tf-acao" class="fi"><option value="">Não — tarefa avulsa</option>'+acoes.map(function(a){ return '<option value="'+a.id+'"'+(a.id===d.acao_id?' selected':'')+'>'+eEsc(a.nome)+'</option>'; }).join('')+'</select></div>'+
    '<div class="fg"><label class="fl">Observações</label><textarea id="tf-obs" class="fta" style="min-height:60px">'+eEsc(d.obs||'')+'</textarea></div>'+
    (t && t.etapa_id ? '<div style="font-size:11px;color:var(--text3)">Esta tarefa veio do passo a passo da ação. Se você editar a ação depois, o nome e a data voltam a seguir o passo a passo.</div>' : ''),
    function(){
      var titulo=val('tf-titulo'); if (!titulo) { toast('Escreva o que fazer.','e'); return false; }
      var novo = Object.assign(t || {id:uid(), prio:'media', status:'pendente', checklist:[], etapa_id:null}, {titulo:titulo, data:val('tf-data')||null, resp:document.getElementById('tf-resp').value, acao_id:document.getElementById('tf-acao').value||null, obs:val('tf-obs')});
      if (!t) _atividades.push(novo);
      eoBulkUpsert('eo_atividades', [atividadeToRow(novo)]); toast(t?'Tarefa atualizada.':'Tarefa criada.'); eRerender(); return true;
    }, {esquerda: t ? '<button class="btn btn-g" style="width:auto;color:var(--red)" onclick="excluirTarefaE(\''+t.id+'\')">Excluir</button>' : ''});
}
function excluirTarefaE(id){
  if (!confirm('Excluir esta tarefa?')) return;
  eoDelete('eo_atividades', id); _atividades=_atividades.filter(function(t){ return t.id!==id; });
  document.getElementById('mo-esc').classList.remove('open'); eRerender();
}

// ── Conteúdo: ligar a uma ação ──
// Gravação dos conteúdos com um pequeno atraso, para várias alterações seguidas
// virarem uma gravação só (evita uma gravação antiga chegar depois da nova).
var _evSaveTimer = null;
function saveEventos(){
  clearTimeout(_evSaveTimer);
  _evSaveTimer = setTimeout(function(){ eoBulkUpsert('eo_eventos', (_eventos||[]).map(eventoToRow)); }, 80);
}
var _evEditando = null;
(function(){
  var origAbrir = window.abrirModalConteudo;
  window.abrirModalConteudo = function(id, st, dt){
    if (origAbrir) origAbrir(id, st, dt);
    var ev = id ? (_eventos||[]).find(function(e){ return e.id===id; }) : null;
    _evEditando = ev ? {acao_id:ev.acao_id||null, etapa_id:ev.etapa_id||null} : null;
    var camp = document.getElementById('ev-campanha'); if (!camp) return;
    var sel = document.getElementById('ev-acao');
    if (!sel) {
      sel = document.createElement('select'); sel.id='ev-acao'; sel.className='fi';
      camp.parentNode.insertBefore(sel, camp); camp.style.display='none';
      var lb = camp.parentNode.querySelector('.fl'); if (lb) lb.textContent = 'Faz parte de uma ação?';
      sel.addEventListener('change', function(){ var a=(_funis||[]).find(function(x){ return x.id===sel.value; }); camp.value = a ? a.nome : ''; });
    }
    sel.innerHTML = '<option value="">Não — conteúdo de rotina / divulgação</option>' + (_funis||[]).filter(function(a){ return acaoStatusAuto(a)!=='cancelada'; }).map(function(a){ return '<option value="'+a.id+'">'+eEsc(a.nome)+'</option>'; }).join('');
    sel.value = ev && ev.acao_id ? ev.acao_id : '';
  };
  var origSalvar = window.salvarEvento;
  window.salvarEvento = function(){
    var editId = document.getElementById('ev-edit-id').value;
    var acaoSel = (document.getElementById('ev-acao')||{}).value || null;
    var antes = (_eventos||[]).length;
    if (origSalvar) origSalvar();
    var ev = editId ? (_eventos||[]).find(function(e){ return e.id===editId; }) : ((_eventos||[]).length > antes ? _eventos[_eventos.length-1] : null);
    if (ev) {
      ev.acao_id = acaoSel;
      ev.etapa_id = (editId && _evEditando && _evEditando.acao_id===acaoSel) ? _evEditando.etapa_id : null;
      saveEventos();
    }
  };
})();

// ── Meta no Dashboard ──
async function renderMetaDashboard(el){
  if (!el || !CU) return;
  var mk=eMesKey(new Date()), ini=eMesIni(mk), fim=eMesFim(mk);
  var meta = (_metas||[]).find(function(m){ return !m.funil_id && m.fonte==='faturamento' && m.inicio===ini && m.fim===fim; }) || (_metas||[]).find(function(m){ return m.no_dashboard; });
  if (!meta) { el.innerHTML=''; return; }
  await eCarregarVendas(meta.inicio && meta.inicio < ini ? meta.inicio : ini);
  var s=metaSituacao(meta), h=getTodayStr(), falta=Math.max(0,s.alvo-s.atual);
  var diasRest = meta.fim && h <= meta.fim ? (diasDesde(h)-diasDesde(meta.fim)+1) : 0;
  el.innerHTML = '<div class="card" style="padding:16px 18px;cursor:pointer" onclick="abrirEscritorio(\'plano\')">'+
    '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px;flex-wrap:wrap"><div style="font-size:13px;font-weight:700;display:flex;gap:8px;align-items:center">'+eIco('alvo',15,'var(--green)')+eEsc(meta.titulo)+'</div>'+
    '<div style="font-size:12px;color:var(--text2)"><strong>'+metaFmt(meta,s.atual)+'</strong> de '+metaFmt(meta,s.alvo)+' · '+s.pct+'%</div></div>'+eBarra(s.pct, META_SIT[s.sit].cor)+
    '<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px"><span style="color:'+META_SIT[s.sit].cor+';font-weight:600">'+META_SIT[s.sit].label+'</span>'+(falta&&diasRest&&(meta.fonte==='faturamento')?'<span style="color:var(--text3)">'+eMoeda(falta/diasRest)+' por dia para bater</span>':'')+'</div></div>';
}
