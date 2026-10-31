// ── VENDAS ──
// Carregado pelo index.html depois do script principal (usa _sb, CU, _fluxo,
// _cashback, _clients, toast, fD, getTodayStr, toLocalDateStr, showDetail,
// TIPO_CLIENTE_LBL).
//
// Não é estoque nem caixa: é o registro das vendas que alimenta pós-venda,
// cashback e inativos, com uma tabela por dia/mês para a lojista comparar com
// o fechamento do sistema dela. Toda venda aparece aqui, venha do Fluxo do Dia,
// da ficha da cliente ou (fase 3) da importação.

var VND = { vista: 'dia', mes: null, ano: null, vendas: [], carregando: false };

function vndMoeda(v) {
  return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function vndEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function vndUltimoDia(ano, mes) { return new Date(ano, mes, 0).getDate(); }

function renderVendas() {
  var hoje = getTodayStr();
  if (!VND.mes) VND.mes = hoje.slice(0, 7);
  if (!VND.ano) VND.ano = parseInt(hoje.slice(0, 4), 10);
  var root = document.getElementById('vendas-root'); if (!root) return;
  var anos = []; for (var a = parseInt(hoje.slice(0, 4), 10); a >= 2024; a--) anos.push(a);
  root.innerHTML =
    '<div class="ph"><div><h1 class="pt">Vendas</h1><p class="ps">Todas as vendas registradas no sistema. Compare o total de cada dia com o fechamento do seu sistema de caixa.</p></div>' +
      '<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-g btn-sm" style="width:auto;flex-shrink:0" onclick="abrirImportarVendas()">Importar vendas</button><button class="btn btn-p btn-sm" style="width:auto;flex-shrink:0" onclick="showPage(\'fluxo\')">+ Registrar no Fluxo</button></span></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px">' +
      ['dia', 'mes', 'vendedora', 'lista'].map(function (v) {
        var lbl = { dia: 'Por dia', mes: 'Por mês', vendedora: 'Por vendedora', lista: 'Lista de vendas' }[v];
        var on = VND.vista === v;
        return '<button class="btn btn-sm ' + (on ? 'btn-p' : 'btn-g') + '" style="width:auto;flex-shrink:0;white-space:nowrap" onclick="VND.vista=\'' + v + '\';renderVendas()">' + lbl + '</button>';
      }).join('') +
      '<span style="flex:1;min-width:8px"></span>' +
      (VND.vista === 'mes'
        ? '<select class="fi" style="width:auto" onchange="VND.ano=parseInt(this.value,10);renderVendas()">' + anos.map(function (a) { return '<option' + (a === VND.ano ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select>'
        : '<input type="month" class="fi" style="width:auto" value="' + VND.mes + '" onchange="if(this.value){VND.mes=this.value;renderVendas()}">') +
    '</div>' +
    '<div id="vnd-kpis" style="margin-bottom:16px"></div>' +
    '<div class="card" style="padding:0;overflow:hidden"><div id="vnd-conteudo"><div class="empty"><div class="empty-d">Carregando vendas...</div></div></div></div>';
  vndCarregar();
}

async function vndCarregar() {
  var ini, fim;
  if (VND.vista === 'mes') { ini = VND.ano + '-01-01'; fim = VND.ano + '-12-31'; }
  else {
    var p = VND.mes.split('-'); ini = VND.mes + '-01';
    fim = VND.mes + '-' + String(vndUltimoDia(+p[0], +p[1])).padStart(2, '0');
  }
  var chave = ini + fim + VND.vista;
  VND.chave = chave;
  var todas = [], de = 0, passo = 1000;
  // Busca em páginas de 1000 (limite do banco por consulta).
  while (true) {
    var res = await _sb.from('purchases').select('*, clients(name, phone)').eq('store_id', CU.id)
      .gte('date', ini).lte('date', fim).order('date', { ascending: false }).order('created_at', { ascending: false })
      .range(de, de + passo - 1);
    if (res.error) {
      var el = document.getElementById('vnd-conteudo');
      if (el) el.innerHTML = '<div class="empty"><div class="empty-t">Não foi possível carregar as vendas</div><div class="empty-d">' + vndEsc(res.error.message) + '</div></div>';
      return;
    }
    todas = todas.concat(res.data || []);
    if (!res.data || res.data.length < passo) break;
    de += passo;
  }
  if (VND.chave !== chave) return; // a lojista trocou de período enquanto carregava
  VND.vendas = todas;
  VND.ini = ini; VND.fim = fim;
  vndRenderKpis();
  if (VND.vista === 'dia') vndRenderDia();
  else if (VND.vista === 'mes') vndRenderMes();
  else if (VND.vista === 'vendedora') vndRenderVendedora();
  else vndRenderLista();
}

function vndAgrupar(vendas, chaveFn) {
  var g = {};
  vendas.forEach(function (v) {
    var k = chaveFn(v);
    var x = g[k] || (g[k] = { qtd: 0, comValor: 0, total: 0, fisico: 0, online: 0, cashback: 0, retorno: 0, primeira: 0 });
    x.qtd++;
    var val = parseFloat(v.amount) || 0;
    if (val > 0) x.comValor++;
    x.total += val;
    if (v.canal === 'online') x.online += val; else if (v.canal === 'fisico') x.fisico += val;
    x.cashback += parseFloat(v.cashback_usado) || 0;
    if (v.tipo_cliente && v.tipo_cliente.indexOf('retorno') === 0) x.retorno++;
    if (v.tipo_cliente === 'primeira') x.primeira++;
  });
  return g;
}

function vndRenderKpis() {
  var el = document.getElementById('vnd-kpis'); if (!el) return;
  var t = vndAgrupar(VND.vendas, function () { return 't'; }).t || { qtd: 0, comValor: 0, total: 0, fisico: 0, online: 0, cashback: 0, retorno: 0, primeira: 0 };
  var classif = t.retorno + t.primeira;
  var kpi = function (lbl, val, sub, cor) {
    return '<div class="ri"><div class="rv"' + (cor ? ' style="color:' + cor + '"' : '') + '>' + val + '</div><div class="rl">' + lbl + '</div>' + (sub ? '<div style="font-size:10px;color:var(--text3);margin-top:2px">' + sub + '</div>' : '') + '</div>';
  };
  el.innerHTML = '<div class="rg" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">' +
    kpi('Total vendido', vndMoeda(t.total), '', 'var(--green)') +
    kpi('Vendas', t.qtd, t.qtd !== t.comValor ? (t.qtd - t.comValor) + ' sem valor' : '') +
    kpi('Ticket médio', vndMoeda(t.comValor ? t.total / t.comValor : 0)) +
    kpi('Loja física', vndMoeda(t.fisico)) +
    kpi('Online', vndMoeda(t.online)) +
    kpi('Cashback usado', vndMoeda(t.cashback), '', 'var(--gold-b)') +
    kpi('Vendas de retorno', classif ? Math.round(t.retorno / classif * 100) + '%' : '—', classif ? t.retorno + ' de ' + classif + ' classificadas' : 'marque no Fluxo', 'var(--blue)') +
    '</div>';
}

var VND_TH = 'padding:9px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);text-align:right;white-space:nowrap';
var VND_TD = 'padding:9px 10px;font-size:13px;text-align:right;white-space:nowrap;border-top:1px solid var(--border)';

function vndRenderDia() {
  var el = document.getElementById('vnd-conteudo'); if (!el) return;
  var g = vndAgrupar(VND.vendas, function (v) { return v.date; });
  var p = VND.mes.split('-'), n = vndUltimoDia(+p[0], +p[1]), hoje = getTodayStr();
  var linhas = [], tot = { at: 0, fx: 0, qtd: 0, total: 0, fisico: 0, online: 0, cashback: 0, retorno: 0, comValor: 0 };
  for (var d = n; d >= 1; d--) {
    var data = VND.mes + '-' + String(d).padStart(2, '0');
    if (data > hoje) continue;
    var x = g[data], f = (typeof _fluxo !== 'undefined' && _fluxo[data]) || null;
    var at = f ? (f.fisico || 0) + (f.online || 0) : 0;
    var fxV = f ? (f.vendas_fisico || 0) + (f.vendas_online || 0) : 0;
    if (!x && !at) continue;
    x = x || { qtd: 0, comValor: 0, total: 0, fisico: 0, online: 0, cashback: 0, retorno: 0 };
    var faltam = Math.max(0, fxV - x.comValor);
    tot.at += at; tot.fx += fxV; tot.qtd += x.qtd; tot.total += x.total; tot.fisico += x.fisico; tot.online += x.online; tot.cashback += x.cashback; tot.retorno += x.retorno; tot.comValor += x.comValor;
    var dt = new Date(+p[0], +p[1] - 1, d);
    var dia = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][dt.getDay()];
    linhas.push('<tr' + (faltam ? ' style="background:var(--gold-l)"' : '') + '>' +
      '<td style="' + VND_TD + ';text-align:left"><a style="cursor:pointer;color:var(--text);font-weight:600" onclick="VND.vista=\'lista\';VND.filtroDia=\'' + data + '\';renderVendas()">' + String(d).padStart(2, '0') + '/' + p[1] + '</a> <span style="color:var(--text3);font-size:11px">' + dia + '</span>' +
        (faltam ? '<div style="font-size:10px;color:var(--gold-b);font-weight:700">Fluxo marcou ' + fxV + ' venda' + (fxV > 1 ? 's' : '') + ', ' + faltam + ' sem valor lançado</div>' : '') + '</td>' +
      '<td style="' + VND_TD + '">' + (at || '—') + '</td>' +
      '<td style="' + VND_TD + '">' + x.qtd + '</td>' +
      '<td style="' + VND_TD + ';font-weight:700">' + vndMoeda(x.total) + '</td>' +
      '<td style="' + VND_TD + '">' + vndMoeda(x.fisico) + '</td>' +
      '<td style="' + VND_TD + '">' + vndMoeda(x.online) + '</td>' +
      '<td style="' + VND_TD + '">' + (x.comValor ? vndMoeda(x.total / x.comValor) : '—') + '</td>' +
      '<td style="' + VND_TD + '">' + (x.cashback ? vndMoeda(x.cashback) : '—') + '</td>' +
      '<td style="' + VND_TD + '">' + (x.retorno || '—') + '</td></tr>');
  }
  if (!linhas.length) { el.innerHTML = '<div class="empty"><div class="empty-t">Nenhuma venda neste mês</div><div class="empty-d">As vendas registradas no Fluxo do Dia ou na ficha da cliente aparecem aqui.</div></div>'; return; }
  el.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">' +
    '<tr style="background:var(--bg3)"><th style="' + VND_TH + ';text-align:left">Dia</th><th style="' + VND_TH + '">Atendim.</th><th style="' + VND_TH + '">Vendas</th><th style="' + VND_TH + '">Total</th><th style="' + VND_TH + '">Física</th><th style="' + VND_TH + '">Online</th><th style="' + VND_TH + '">Ticket</th><th style="' + VND_TH + '">Cashback</th><th style="' + VND_TH + '">Retornos</th></tr>' +
    linhas.join('') +
    '<tr style="background:var(--bg3);font-weight:700"><td style="' + VND_TD + ';text-align:left">Total do mês</td><td style="' + VND_TD + '">' + tot.at + '</td><td style="' + VND_TD + '">' + tot.qtd + '</td><td style="' + VND_TD + '">' + vndMoeda(tot.total) + '</td><td style="' + VND_TD + '">' + vndMoeda(tot.fisico) + '</td><td style="' + VND_TD + '">' + vndMoeda(tot.online) + '</td><td style="' + VND_TD + '">' + (tot.comValor ? vndMoeda(tot.total / tot.comValor) : '—') + '</td><td style="' + VND_TD + '">' + vndMoeda(tot.cashback) + '</td><td style="' + VND_TD + '">' + tot.retorno + '</td></tr>' +
    '</table></div>' +
    '<div style="padding:10px 14px;font-size:11px;color:var(--text3);border-top:1px solid var(--border)">Linha amarela: o Fluxo do Dia contou mais vendas do que as que têm valor lançado. Toque no dia para ver as vendas dele.</div>';
}

function vndRenderMes() {
  var el = document.getElementById('vnd-conteudo'); if (!el) return;
  var g = vndAgrupar(VND.vendas, function (v) { return (v.date || '').slice(0, 7); });
  var nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var hojeM = getTodayStr().slice(0, 7), linhas = [], tot = { qtd: 0, total: 0, fisico: 0, online: 0, cashback: 0, retorno: 0, comValor: 0, at: 0 };
  for (var m = 12; m >= 1; m--) {
    var k = VND.ano + '-' + String(m).padStart(2, '0');
    if (k > hojeM) continue;
    var x = g[k] || { qtd: 0, comValor: 0, total: 0, fisico: 0, online: 0, cashback: 0, retorno: 0 };
    var at = 0;
    if (typeof _fluxo !== 'undefined') Object.keys(_fluxo).forEach(function (d) { if (d.slice(0, 7) === k) at += (_fluxo[d].fisico || 0) + (_fluxo[d].online || 0); });
    if (!x.qtd && !at) continue;
    ['qtd', 'total', 'fisico', 'online', 'cashback', 'retorno', 'comValor'].forEach(function (f) { tot[f] += x[f]; });
    tot.at += at;
    linhas.push('<tr><td style="' + VND_TD + ';text-align:left"><a style="cursor:pointer;color:var(--text);font-weight:600" onclick="VND.vista=\'dia\';VND.mes=\'' + k + '\';renderVendas()">' + nomes[m - 1] + '</a></td>' +
      '<td style="' + VND_TD + '">' + (at || '—') + '</td><td style="' + VND_TD + '">' + x.qtd + '</td><td style="' + VND_TD + ';font-weight:700">' + vndMoeda(x.total) + '</td>' +
      '<td style="' + VND_TD + '">' + vndMoeda(x.fisico) + '</td><td style="' + VND_TD + '">' + vndMoeda(x.online) + '</td>' +
      '<td style="' + VND_TD + '">' + (x.comValor ? vndMoeda(x.total / x.comValor) : '—') + '</td><td style="' + VND_TD + '">' + (x.cashback ? vndMoeda(x.cashback) : '—') + '</td><td style="' + VND_TD + '">' + (x.retorno || '—') + '</td></tr>');
  }
  if (!linhas.length) { el.innerHTML = '<div class="empty"><div class="empty-t">Nenhuma venda em ' + VND.ano + '</div></div>'; return; }
  el.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">' +
    '<tr style="background:var(--bg3)"><th style="' + VND_TH + ';text-align:left">Mês</th><th style="' + VND_TH + '">Atendim.</th><th style="' + VND_TH + '">Vendas</th><th style="' + VND_TH + '">Total</th><th style="' + VND_TH + '">Física</th><th style="' + VND_TH + '">Online</th><th style="' + VND_TH + '">Ticket</th><th style="' + VND_TH + '">Cashback</th><th style="' + VND_TH + '">Retornos</th></tr>' +
    linhas.join('') +
    '<tr style="background:var(--bg3);font-weight:700"><td style="' + VND_TD + ';text-align:left">Total ' + VND.ano + '</td><td style="' + VND_TD + '">' + tot.at + '</td><td style="' + VND_TD + '">' + tot.qtd + '</td><td style="' + VND_TD + '">' + vndMoeda(tot.total) + '</td><td style="' + VND_TD + '">' + vndMoeda(tot.fisico) + '</td><td style="' + VND_TD + '">' + vndMoeda(tot.online) + '</td><td style="' + VND_TD + '">' + (tot.comValor ? vndMoeda(tot.total / tot.comValor) : '—') + '</td><td style="' + VND_TD + '">' + vndMoeda(tot.cashback) + '</td><td style="' + VND_TD + '">' + tot.retorno + '</td></tr>' +
    '</table></div>';
}

function vndRenderVendedora() {
  var el = document.getElementById('vnd-conteudo'); if (!el) return;
  var g = vndAgrupar(VND.vendas, function (v) { return v.salesperson || '—'; });
  var nomes = Object.keys(g).sort(function (a, b) { return g[b].total - g[a].total; });
  if (!nomes.length) { el.innerHTML = '<div class="empty"><div class="empty-t">Nenhuma venda neste mês</div></div>'; return; }
  var tot = VND.vendas.reduce(function (s, v) { return s + (parseFloat(v.amount) || 0); }, 0);
  el.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">' +
    '<tr style="background:var(--bg3)"><th style="' + VND_TH + ';text-align:left">Vendedora</th><th style="' + VND_TH + '">Vendas</th><th style="' + VND_TH + '">Total</th><th style="' + VND_TH + '">% do mês</th><th style="' + VND_TH + '">Ticket</th><th style="' + VND_TH + '">Retornos</th></tr>' +
    nomes.map(function (n) {
      var x = g[n];
      return '<tr><td style="' + VND_TD + ';text-align:left;font-weight:600">' + (n === '—' ? '<span style="color:var(--text3);font-weight:400">Sem vendedora marcada</span>' : vndEsc(n)) + '</td>' +
        '<td style="' + VND_TD + '">' + x.qtd + '</td><td style="' + VND_TD + ';font-weight:700">' + vndMoeda(x.total) + '</td>' +
        '<td style="' + VND_TD + '">' + (tot ? Math.round(x.total / tot * 100) + '%' : '—') + '</td>' +
        '<td style="' + VND_TD + '">' + (x.comValor ? vndMoeda(x.total / x.comValor) : '—') + '</td><td style="' + VND_TD + '">' + (x.retorno || '—') + '</td></tr>';
    }).join('') + '</table></div>' +
    '<div style="padding:10px 14px;font-size:11px;color:var(--text3);border-top:1px solid var(--border)">A vendedora é marcada ao registrar a venda no Fluxo do Dia ou na ficha da cliente.</div>';
}

function vndRenderLista() {
  var el = document.getElementById('vnd-conteudo'); if (!el) return;
  var lista = VND.vendas;
  var filtro = VND.filtroDia && VND.filtroDia.slice(0, 7) === VND.mes ? VND.filtroDia : null;
  if (filtro) lista = lista.filter(function (v) { return v.date === filtro; });
  var topo = filtro ? '<div style="padding:10px 14px;font-size:12px;background:var(--bg3);display:flex;justify-content:space-between;align-items:center">Vendas de ' + fD(filtro) + ' · ' + lista.length +
    '<a style="cursor:pointer;color:var(--green);font-weight:600" onclick="VND.filtroDia=null;vndRenderLista()">Ver o mês todo</a></div>' : '';
  if (!lista.length) { el.innerHTML = topo + '<div class="empty"><div class="empty-t">Nenhuma venda</div></div>'; return; }
  var origemLbl = { fluxo: 'Fluxo', ficha: 'Ficha', importacao: 'Importada' };
  el.innerHTML = topo + '<div class="ol">' + lista.map(function (v) {
    var nome = v.clients && v.clients.name ? v.clients.name : 'Sem cliente';
    var info = [fD(v.date)];
    if (v.canal) info.push(v.canal === 'online' ? 'Online' : 'Loja física');
    if (v.tipo_cliente) info.push((typeof TIPO_CLIENTE_LBL !== 'undefined' && TIPO_CLIENTE_LBL[v.tipo_cliente]) || v.tipo_cliente);
    if (v.salesperson) info.push(v.salesperson);
    if (v.origem) info.push(origemLbl[v.origem] || v.origem);
    if (v.description) info.push(v.description);
    var cb = parseFloat(v.cashback_usado) || 0;
    return '<div class="ol-i"' + (v.client_id ? ' onclick="showDetail(\'' + v.client_id + '\')"' : ' style="cursor:default"') + '>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px' + (v.client_id ? '' : ';color:var(--text3)') + '">' + vndEsc(nome) + '</div>' +
      '<div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + vndEsc(info.join(' · ')) + '</div></div>' +
      '<div style="text-align:right;flex-shrink:0;margin-left:8px"><div style="font-weight:700;font-size:13px">' + (v.amount ? vndMoeda(v.amount) : '<span style="color:var(--gold-b)">sem valor</span>') + '</div>' +
        (cb ? '<div style="font-size:10px;color:var(--gold-b)">' + vndMoeda(cb) + ' de cashback</div>' : '') + '</div>' +
      '<button class="btn btn-g btn-sm" style="margin-left:8px;padding:6px 9px" title="Excluir venda" onclick="event.stopPropagation();vndExcluir(\'' + v.id + '\')">×</button>' +
    '</div>';
  }).join('') + '</div>';
}

// Exclui a venda e desfaz o cashback ligado a ela: o cashback que ela GEROU
// (se ainda não foi usado) é removido, e o cashback que ela USOU volta para o
// saldo da cliente.
async function vndExcluir(pid) {
  var v = VND.vendas.find(function (x) { return x.id === pid; }); if (!v) return;
  var nome = v.clients && v.clients.name ? v.clients.name : 'venda sem cliente';
  if (!confirm('Excluir a venda de ' + nome + ' (' + fD(v.date) + (v.amount ? ', ' + vndMoeda(v.amount) : '') + ')?\n\nO cashback gerado por ela é removido e o cashback usado nela volta para o saldo da cliente.')) return;
  var gerados = (_cashback || []).filter(function (cb) { return cb.purchase_id === pid && cb.status === 'disponivel'; });
  var usados = (_cashback || []).filter(function (cb) { return cb.usado_em_purchase_id === pid && cb.status === 'utilizado'; });
  if (gerados.length) {
    var r1 = await _sb.from('cashback').delete().in('id', gerados.map(function (c) { return c.id; }));
    if (r1.error) { toast('Não foi possível remover o cashback da venda: ' + r1.error.message, 'e'); return; }
    _cashback = _cashback.filter(function (c) { return gerados.indexOf(c) === -1; });
  }
  if (usados.length) {
    var hoje = getTodayStr();
    var r2 = await _sb.from('cashback').update({ status: 'disponivel', utilizado_em: null, utilizado_valor: null, usado_em_purchase_id: null }).in('id', usados.map(function (c) { return c.id; }));
    if (r2.error) { toast('Não foi possível devolver o cashback usado: ' + r2.error.message, 'e'); return; }
    usados.forEach(function (c) { c.status = (c.validade && c.validade < hoje) ? 'expirado' : 'disponivel'; c.utilizado_em = null; c.utilizado_valor = null; c.usado_em_purchase_id = null; });
  }
  var res = await _sb.from('purchases').delete().eq('id', pid);
  if (res.error) { toast('Não foi possível excluir: ' + res.error.message, 'e'); return; }
  VND.vendas = VND.vendas.filter(function (x) { return x.id !== pid; });
  var cl = (_clients || []).find(function (c) { return c.id === v.client_id; });
  if (cl && cl.purchases) cl.purchases = cl.purchases.filter(function (p) { return p.id !== pid; });
  toast('Venda excluída.');
  if (typeof updateBadges === 'function') updateBadges();
  vndRenderKpis(); vndRenderLista();
}


// ══════════════════════════════════════════════
// FICHA RÁPIDA (painel lateral)
// Ao tocar no nome da cliente nas listas de oportunidade e no cashback, abre
// um painel com o essencial — sem sair da lista e sem precisar voltar.
// ══════════════════════════════════════════════
function abrirFichaRapida(cid) {
  var c = (_clients || []).find(function (x) { return x.id === cid; });
  if (!c) { showDetail(cid); return; }
  var pn = document.getElementById('ficha-rapida');
  if (!pn) {
    pn = document.createElement('div'); pn.id = 'ficha-rapida';
    pn.innerHTML = '<div class="fr-fundo" onclick="fecharFichaRapida()"></div><div class="fr-painel"></div>';
    document.body.appendChild(pn);
    var st = document.createElement('style');
    st.textContent = '#ficha-rapida{position:fixed;inset:0;z-index:900;display:none}#ficha-rapida.open{display:block}' +
      '#ficha-rapida .fr-fundo{position:absolute;inset:0;background:rgba(0,0,0,.35)}' +
      '#ficha-rapida .fr-painel{position:absolute;top:0;right:0;bottom:0;width:380px;max-width:100%;background:var(--bg2);box-shadow:var(--sh-lg);overflow-y:auto;padding:20px;animation:frIn .18s ease-out}' +
      '@keyframes frIn{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}' +
      '#ficha-rapida .fr-sec{font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text3);margin:18px 0 8px}' +
      '#ficha-rapida .fr-tag{display:inline-block;font-size:11px;padding:3px 9px;border-radius:20px;background:var(--bg3);margin:0 5px 5px 0}' +
      '@media(max-width:768px){#ficha-rapida .fr-painel{top:auto;left:0;width:100%;max-height:85vh;border-radius:20px 20px 0 0}}';
    document.head.appendChild(st);
  }
  var saldo = typeof getCbSaldo === 'function' ? getCbSaldo(c.id) : 0;
  var prox = (_cashback || []).filter(function (cb) { return cb.client_id === c.id && cb.status === 'disponivel' && cb.validade; }).map(function (cb) { return cb.validade; }).sort()[0];
  var compras = (c.purchases || []).slice().sort(function (a, b) { return (b.date || '') > (a.date || '') ? 1 : -1; });
  var total = compras.reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
  var contatos = (_log || []).filter(function (l) { return l.client_id === c.id; });
  var ultimo = contatos[0];
  var tel = typeof telDigitos === 'function' ? telDigitos(c.phone) : '';
  var esc = vndEsc;
  pn.querySelector('.fr-painel').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
      '<div><div style="font-size:18px;font-weight:700">' + esc(c.name) + '</div>' +
      '<div style="font-size:13px;color:var(--text2);margin-top:3px">' + esc(c.phone || 'sem telefone') + (c.city ? ' · ' + esc(c.city) : '') + '</div></div>' +
      '<button class="mc" onclick="fecharFichaRapida()" style="flex-shrink:0">×</button></div>' +
    '<div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap">' +
      (tel ? '<a class="btn btn-p btn-sm" style="width:auto" href="https://wa.me/55' + tel + '" target="_blank">WhatsApp</a>' : '') +
      '<button class="btn btn-g btn-sm" style="width:auto" onclick="fecharFichaRapida();openSendModal(\'' + c.id + '\',\'' + (saldo > 0 ? 'cashback' : '') + '\')">Mensagem pronta</button>' +
      '<button class="btn btn-g btn-sm" style="width:auto" onclick="fecharFichaRapida();showDetail(\'' + c.id + '\')">Ficha completa</button></div>' +
    (saldo > 0 ? '<div style="background:var(--gold-l);border-radius:var(--rs);padding:10px 12px;margin-top:16px;font-size:13px"><strong style="color:var(--gold-b)">Cashback: ' + vndMoeda(saldo) + '</strong>' + (prox ? '<span style="color:var(--text2)"> · vence em ' + fD(prox) + '</span>' : '') + '</div>' : '') +
    '<div class="fr-sec">Interesses</div>' +
    ((c.tags || []).length ? (c.tags || []).map(function (t) { return '<span class="fr-tag">' + esc(t) + '</span>'; }).join('') : '<div style="font-size:12px;color:var(--text3)">Nenhuma tag</div>') +
    '<div class="fr-sec">Compras · ' + compras.length + (total ? ' · ' + vndMoeda(total) : '') + '</div>' +
    (compras.length ? compras.slice(0, 3).map(function (p) {
      return '<div style="display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px solid var(--border)"><span>' + fD(p.date) + (p.description ? ' · ' + esc(p.description) : '') + '</span><strong>' + (p.amount ? vndMoeda(p.amount) : '—') + '</strong></div>';
    }).join('') : '<div style="font-size:12px;color:var(--text3)">Nenhuma compra registrada</div>') +
    '<div class="fr-sec">Último contato</div>' +
    (ultimo ? '<div style="font-size:13px">' + esc(ultimo.message_title || 'Contato') + '<div style="font-size:11px;color:var(--text3)">' + new Date(ultimo.sent_at).toLocaleDateString('pt-BR') + (ultimo.salesperson ? ' · ' + esc(ultimo.salesperson) : '') + '</div></div>' : '<div style="font-size:12px;color:var(--text3)">Nenhum contato registrado</div>') +
    (c.reminder ? '<div class="fr-sec">Retorno agendado</div><div style="font-size:13px">' + fD(c.reminder) + '</div>' : '');
  pn.classList.add('open');
}
function fecharFichaRapida() { var pn = document.getElementById('ficha-rapida'); if (pn) pn.classList.remove('open'); }
