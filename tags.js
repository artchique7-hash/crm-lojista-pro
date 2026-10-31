// ── TAGS E FILTROS ──
// Carregado pelo index.html depois do script principal.
//
// As tags continuam gravadas na ficha da cliente como texto (clients.tags),
// então nada do que já existe se perde. O que muda:
//  • cada loja organiza suas tags em GRUPOS que ela mesma cria (moda: Tamanho,
//    Cor, Estilo; calçados: Numeração, Modelo; chimarrão: Tipo de cuia, Erva…).
//    O catálogo fica salvo no servidor (store_data, chave slp_tag_catalogo);
//  • ao marcar uma tag, escolhe da lista com um toque (sem digitar "Vestido",
//    "vestidos" e "VESTIDO" como três coisas diferentes);
//  • o filtro combina grupos: Tamanho M + Estilo Alfaiataria. Dentro do mesmo
//    grupo vale "um OU outro" (M ou G); entre grupos vale "os dois" (M e
//    Alfaiataria). A busca é pela tag exata, não por pedaço do texto;
//  • dá para marcar tags no cadastro rápido do Fluxo do Dia.

var TAG_SEM_GRUPO = '_outras';

function tagEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function tagChave(t) { return String(t || '').trim().toLowerCase(); }

function tagCatalogo() {
  var c = slpGet('slp_tag_catalogo', null);
  if (!c || !Array.isArray(c.grupos)) c = { grupos: [] };
  return c;
}
function tagSalvarCatalogo(c) { slpSet('slp_tag_catalogo', c); }

// Todas as tags que existem (catálogo + fichas), com a grafia que já é usada.
function tagTodas() {
  var vistas = {}, lista = [];
  var add = function (t) { var k = tagChave(t); if (k && !vistas[k]) { vistas[k] = true; lista.push(String(t).trim()); } };
  tagCatalogo().grupos.forEach(function (g) { (g.tags || []).forEach(add); });
  (gC() || []).forEach(function (c) { (c.tags || []).forEach(add); });
  return lista;
}
// Se já existe uma tag igual (sem diferenciar maiúscula), usa a grafia existente.
function tagNormalizar(t) {
  var k = tagChave(t); if (!k) return '';
  var ex = tagTodas().find(function (x) { return tagChave(x) === k; });
  return ex || String(t).trim().replace(/\s+/g, ' ');
}
function tagContagem() {
  var n = {};
  (gC() || []).forEach(function (c) { (c.tags || []).forEach(function (t) { var k = tagChave(t); n[k] = (n[k] || 0) + 1; }); });
  return n;
}
// Grupos com suas tags + o grupo "Outras" com as tags ainda sem grupo.
function tagAgrupadas() {
  var cat = tagCatalogo(), noGrupo = {};
  var grupos = cat.grupos.map(function (g) {
    (g.tags || []).forEach(function (t) { noGrupo[tagChave(t)] = true; });
    return { id: g.id, nome: g.nome, tags: (g.tags || []).slice() };
  });
  var soltas = tagTodas().filter(function (t) { return !noGrupo[tagChave(t)]; });
  if (soltas.length) grupos.push({ id: TAG_SEM_GRUPO, nome: cat.grupos.length ? 'Outras' : 'Tags', tags: soltas });
  return grupos;
}

// ── SELETOR DE TAGS (reutilizado na ficha, no Fluxo e no filtro) ──
// sel = array de tags marcadas (é alterado aqui). onChange é chamado a cada toque.
var _tagPickers = {};
function tagPicker(containerId, sel, onChange, opts) {
  opts = opts || {};
  _tagPickers[containerId] = { sel: sel, onChange: onChange, opts: opts };
  tagPickerRender(containerId);
}
function tagPickerRender(containerId) {
  var el = document.getElementById(containerId), st = _tagPickers[containerId];
  if (!el || !st) return;
  var marcadas = {}; st.sel.forEach(function (t) { marcadas[tagChave(t)] = true; });
  var grupos = tagAgrupadas();
  var cont = st.opts.contagem ? tagContagem() : null;
  var html = grupos.map(function (g) {
    if (!g.tags.length && !st.opts.permitirNova) return '';
    return '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--text3);margin-bottom:5px">' + tagEsc(g.nome) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
      g.tags.map(function (t) {
        var on = marcadas[tagChave(t)];
        return '<span data-t="' + tagEsc(t) + '" onclick="tagPickerToggle(\'' + containerId + '\',this.getAttribute(\'data-t\'))" style="cursor:pointer;user-select:none;font-size:12px;font-weight:600;padding:5px 11px;border-radius:20px;border:1.5px solid ' + (on ? 'var(--green)' : 'var(--border)') + ';background:' + (on ? 'var(--green)' : 'var(--bg2)') + ';color:' + (on ? '#fff' : 'var(--text2)') + '">' +
          tagEsc(t) + (cont ? ' <span style="opacity:.6">' + (cont[tagChave(t)] || 0) + '</span>' : '') + '</span>';
      }).join('') +
      (st.opts.permitirNova && g.id !== TAG_SEM_GRUPO ? '<span onclick="tagPickerNova(\'' + containerId + '\',\'' + g.id + '\')" style="cursor:pointer;font-size:12px;padding:5px 10px;border-radius:20px;border:1.5px dashed var(--border);color:var(--text3)">+ nova</span>' : '') +
      '</div></div>';
  }).join('');
  if (!grupos.length) html = '<div style="font-size:12px;color:var(--text3);margin-bottom:8px">Nenhuma tag criada ainda.</div>';
  if (st.opts.permitirNova) {
    html += '<div style="display:flex;gap:6px;margin-top:4px"><input type="text" class="fi" id="' + containerId + '-nova" placeholder="Nova tag (ex: tamanho G, vestidos, cuia...)" style="flex:1;padding:8px 10px;font-size:13px" onkeydown="if(event.key===\'Enter\'){event.preventDefault();tagPickerNova(\'' + containerId + '\')}">' +
      '<button type="button" class="btn btn-g btn-sm" style="width:auto" onclick="tagPickerNova(\'' + containerId + '\')">Adicionar</button></div>';
  }
  el.innerHTML = html;
}
function tagPickerToggle(containerId, t) {
  var st = _tagPickers[containerId]; if (!st) return;
  var k = tagChave(t), i = st.sel.findIndex(function (x) { return tagChave(x) === k; });
  if (i === -1) st.sel.push(t); else st.sel.splice(i, 1);
  tagPickerRender(containerId);
  if (st.onChange) st.onChange(st.sel);
}
function tagPickerNova(containerId, grupoId) {
  var st = _tagPickers[containerId]; if (!st) return;
  var nome;
  if (grupoId) {
    var g = tagCatalogo().grupos.find(function (x) { return x.id === grupoId; });
    nome = prompt('Nova tag em "' + (g ? g.nome : '') + '":');
  } else {
    var inp = document.getElementById(containerId + '-nova'); nome = inp ? inp.value : '';
    if (inp) inp.value = '';
  }
  nome = tagNormalizar(nome || '');
  if (!nome) return;
  if (grupoId) {
    var cat = tagCatalogo(), gg = cat.grupos.find(function (x) { return x.id === grupoId; });
    if (gg && !gg.tags.some(function (x) { return tagChave(x) === tagChave(nome); })) { gg.tags.push(nome); tagSalvarCatalogo(cat); }
  }
  if (!st.sel.some(function (x) { return tagChave(x) === tagChave(nome); })) st.sel.push(nome);
  tagPickerRender(containerId);
  if (st.onChange) st.onChange(st.sel);
}

// ── FICHA DA CLIENTE (modal de cadastro/edição) ──
// O campo de digitar continua funcionando; abaixo dele aparece o catálogo para tocar.
(function () {
  var origRender = typeof renderTagsDisp === 'function' ? renderTagsDisp : null;
  var origAdd = typeof addTagFromInput === 'function' ? addTagFromInput : null;
  window.renderTagsDisp = function () {
    if (origRender) origRender();
    if (!document.getElementById('cf-tag-picker')) {
      var disp = document.getElementById('tags-disp');
      var tiw = disp ? disp.closest('.tiw') : null;
      if (tiw && tiw.parentNode) {
        var d = document.createElement('div');
        d.id = 'cf-tag-picker'; d.style.marginTop = '10px'; d.style.width = '100%';
        tiw.parentNode.insertBefore(d, tiw.nextSibling);
      }
    }
    if (document.getElementById('cf-tag-picker') && typeof TAGS !== 'undefined') {
      if (!_tagPickers['cf-tag-picker'] || _tagPickers['cf-tag-picker'].sel !== TAGS) {
        tagPicker('cf-tag-picker', TAGS, function () { if (origRender) origRender(); }, { permitirNova: false });
      } else tagPickerRender('cf-tag-picker');
    }
  };
  window.addTagFromInput = function () {
    var inp = document.getElementById('tag-inp'); if (!inp) return;
    var v = tagNormalizar(inp.value.replace(',', ''));
    if (v && !TAGS.some(function (x) { return tagChave(x) === tagChave(v); })) { TAGS.push(v); renderTagsDisp(); }
    inp.value = ''; inp.focus();
  };
})();

// ── FLUXO DO DIA: tags no cadastro rápido ──
var _atendTags = [], _atendTagsTocadas = false, _atendTagsCliente = null;
function tagsAtendReset() { _atendTags = []; _atendTagsTocadas = false; _atendTagsCliente = null; tagsAtendAtualizar(); }
function tagsAtendAtualizar() {
  ['comprou', 'perda'].forEach(function (lado) {
    var wrap = document.getElementById('atend-tags-wrap-' + lado); if (!wrap) return;
    var cid = lado === 'comprou' ? (typeof _atendClienteId !== 'undefined' ? _atendClienteId : null) : (typeof _atendPerdaClienteId !== 'undefined' ? _atendPerdaClienteId : null);
    var novo = document.getElementById(lado === 'comprou' ? 'atend-novo-cliente' : 'atend-perda-novo-cliente');
    var novoAberto = novo && novo.style.display === 'block';
    var mostrar = !!cid || novoAberto;
    wrap.style.display = mostrar ? 'block' : 'none';
    if (!mostrar) return;
    // Cliente escolhida: começa com as tags que ela já tem.
    if (cid && _atendTagsCliente !== cid) {
      var c = gC().find(function (x) { return x.id === cid; });
      _atendTags.length = 0; ((c && c.tags) || []).forEach(function (t) { _atendTags.push(t); });
      _atendTagsCliente = cid; _atendTagsTocadas = false;
    } else if (!cid && _atendTagsCliente) { _atendTags.length = 0; _atendTagsCliente = null; }
    tagPicker('atend-tag-picker-' + lado, _atendTags, function () { _atendTagsTocadas = true; }, { permitirNova: true });
  });
}
// Chamado depois que a venda/atendimento é salvo e a cliente é conhecida.
async function aplicarTagsAtend(clienteId) {
  if (!clienteId || !_atendTagsTocadas) return;
  var tags = _atendTags.map(tagNormalizar).filter(Boolean);
  var res = await _sb.from('clients').update({ tags: tags }).eq('id', clienteId).select().single();
  if (res.error) { toast('Atendimento salvo, mas as tags não foram gravadas: ' + res.error.message, 'e'); return; }
  var c = gC().find(function (x) { return x.id === clienteId; }); if (c) c.tags = tags;
}

// ── CAMPANHA POR INTERESSE (filtro combinado) ──
var _filtroTags = [];
window.renderFilter = function () {
  var pg = document.getElementById('page-filter'); if (!pg) return;
  var ph = pg.querySelector('.ph');
  if (ph) ph.innerHTML = '<div><h1 class="pt">Campanha por Interesse</h1><p class="ps">Escolha as tags para montar a lista da ação. Dentro do mesmo grupo vale uma OU outra (M ou G); entre grupos valem as duas (M e Alfaiataria).</p></div>' +
    '<button class="btn btn-g btn-sm" style="width:auto" onclick="showPage(\'tags\')">Organizar tags</button>';
  var card = pg.querySelector('.card');
  if (card) card.innerHTML = '<div id="filtro-tag-picker"></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:8px;flex-wrap:wrap"><span id="filtro-resumo" style="font-size:12px;color:var(--text2)"></span>' +
    '<span style="display:flex;gap:6px"><button class="btn btn-g btn-sm" style="width:auto" onclick="_filtroTags.length=0;renderFilter()">Limpar</button>' +
    '<button class="btn btn-g btn-sm" style="width:auto" onclick="copiarTelefonesFiltro()">Copiar telefones</button></span></div>';
  tagPicker('filtro-tag-picker', _filtroTags, filterByTag, { contagem: true });
  filterByTag();
};
function filtroResultado() {
  if (!_filtroTags.length) return [];
  // Agrupa as tags escolhidas pelo grupo de cada uma.
  var porGrupo = {};
  var grupos = tagAgrupadas();
  _filtroTags.forEach(function (t) {
    var g = grupos.find(function (gr) { return gr.tags.some(function (x) { return tagChave(x) === tagChave(t); }); });
    var gid = g ? g.id : TAG_SEM_GRUPO;
    (porGrupo[gid] = porGrupo[gid] || []).push(tagChave(t));
  });
  return (gC() || []).filter(function (c) {
    var minhas = {}; (c.tags || []).forEach(function (t) { minhas[tagChave(t)] = true; });
    return Object.keys(porGrupo).every(function (gid) {
      var ts = porGrupo[gid];
      // Tags sem grupo: cada uma é exigida (comportamento mais seguro).
      if (gid === TAG_SEM_GRUPO) return ts.every(function (k) { return minhas[k]; });
      return ts.some(function (k) { return minhas[k]; });
    });
  });
}
window.filterByTag = function () {
  var el = document.getElementById('tag-results'); if (!el) return;
  var res = document.getElementById('filtro-resumo');
  if (!_filtroTags.length) {
    if (res) res.textContent = '';
    el.innerHTML = '<div class="empty"><div class="empty-d">Toque nas tags acima para montar a lista</div></div>';
    return;
  }
  var lista = filtroResultado();
  var comTel = lista.filter(function (c) { return telDigitos(c.phone); }).length;
  if (res) res.innerHTML = '<strong>' + lista.length + '</strong> cliente' + (lista.length === 1 ? '' : 's') + ' · ' + comTel + ' com WhatsApp';
  renderCTable(lista, 'tag-results');
};
function copiarTelefonesFiltro() {
  var tels = filtroResultado().map(function (c) { return telDigitos(c.phone); }).filter(Boolean).map(function (d) { return formatTel(d); });
  if (!tels.length) { toast('Nenhum telefone para copiar.', 'e'); return; }
  var txt = tels.join('\n');
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
    toast(tels.length + ' telefones copiados.');
  }).catch(function () { prompt('Copie os telefones:', txt); });
}

// ── ORGANIZAR TAGS (Configurações) ──
var TAG_GRUPOS_SUGERIDOS = ['Tamanho', 'Cor', 'Estilo', 'Produto de interesse', 'Ocasião'];
function renderTagsConfig() {
  var root = document.getElementById('tags-root'); if (!root) return;
  var cat = tagCatalogo(), grupos = tagAgrupadas(), cont = tagContagem();
  var outrosGrupos = cat.grupos;
  var chip = function (t, gid) {
    var mover = outrosGrupos.length ? '<select onchange="tagMover(this.getAttribute(\'data-t\'),this.value)" data-t="' + tagEsc(t) + '" style="border:none;background:transparent;font-size:13px;color:var(--text3);cursor:pointer;width:20px;padding:0 2px;-webkit-appearance:none;appearance:none" title="Mover para outro grupo"><option value="">⇄</option>' +
      outrosGrupos.filter(function (g) { return g.id !== gid; }).map(function (g) { return '<option value="' + g.id + '">' + tagEsc(g.nome) + '</option>'; }).join('') +
      (gid !== TAG_SEM_GRUPO ? '<option value="' + TAG_SEM_GRUPO + '">Tirar do grupo</option>' : '') + '</select>' : '';
    return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:5px 6px 5px 11px;border-radius:20px;background:var(--bg3);margin:0 6px 6px 0">' +
      '<span>' + tagEsc(t) + '</span><span style="opacity:.55">' + (cont[tagChave(t)] || 0) + '</span>' + mover +
      '<button data-t="' + tagEsc(t) + '" onclick="tagAcoes(this.getAttribute(\'data-t\'))" title="Renomear, juntar ou excluir" style="border:none;background:none;cursor:pointer;color:var(--text3);font-size:13px;padding:0 4px">⋯</button></span>';
  };
  root.innerHTML =
    '<div class="ph"><div><h1 class="pt">Tags e filtros</h1><p class="ps">Organize as tags da sua loja em grupos. São elas que viram filtro na Campanha por Interesse e aparecem para tocar no Fluxo do Dia e no formulário de captação.</p></div>' +
      '<button class="btn btn-p btn-sm" style="width:auto" onclick="tagNovoGrupo()">+ Novo grupo</button></div>' +
    (!cat.grupos.length ? '<div class="card" style="margin-bottom:14px;background:var(--gold-l)"><div style="font-size:13px;margin-bottom:10px">Você ainda não tem grupos. Comece pelos sugeridos para moda (pode renomear ou apagar depois) ou crie os do seu nicho.</div>' +
      '<button class="btn btn-g btn-sm" style="width:auto" onclick="tagCriarSugeridos()">Criar: ' + TAG_GRUPOS_SUGERIDOS.join(', ') + '</button></div>' : '') +
    grupos.map(function (g) {
      var ehOutras = g.id === TAG_SEM_GRUPO;
      return '<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px">' +
        '<h3 style="font-size:14px;font-weight:700">' + tagEsc(g.nome) + (ehOutras ? ' <span style="font-weight:400;font-size:12px;color:var(--text3)">— tags que ainda não estão em nenhum grupo</span>' : '') + '</h3>' +
        (ehOutras ? '' : '<span style="display:flex;gap:6px"><button class="btn btn-g btn-sm" style="width:auto" onclick="tagNovaNoGrupo(\'' + g.id + '\')">+ Tag</button>' +
          '<button class="btn btn-g btn-sm" style="width:auto" onclick="tagRenomearGrupo(\'' + g.id + '\')">Renomear</button>' +
          '<button class="btn btn-g btn-sm" style="width:auto" onclick="tagExcluirGrupo(\'' + g.id + '\')">Excluir</button></span>') + '</div>' +
        (g.tags.length ? g.tags.map(function (t) { return chip(t, g.id); }).join('') : '<div style="font-size:12px;color:var(--text3)">Nenhuma tag neste grupo.</div>') + '</div>';
    }).join('') +
    '<div style="font-size:11px;color:var(--text3);margin-top:6px">⇄ move a tag de grupo · ⋯ renomeia, junta duas tags parecidas (ex.: "Vestido" e "vestidos") ou exclui de todas as clientes. O número ao lado é quantas clientes têm a tag.</div>';
}
function tagUid() { return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function tagCriarSugeridos() {
  var cat = tagCatalogo();
  TAG_GRUPOS_SUGERIDOS.forEach(function (n) { if (!cat.grupos.some(function (g) { return tagChave(g.nome) === tagChave(n); })) cat.grupos.push({ id: tagUid(), nome: n, tags: [] }); });
  tagSalvarCatalogo(cat); renderTagsConfig();
}
function tagNovoGrupo() {
  var n = (prompt('Nome do grupo (ex: Tamanho, Numeração, Tipo de cuia):') || '').trim(); if (!n) return;
  var cat = tagCatalogo(); cat.grupos.push({ id: tagUid(), nome: n, tags: [] }); tagSalvarCatalogo(cat); renderTagsConfig();
}
function tagRenomearGrupo(gid) {
  var cat = tagCatalogo(), g = cat.grupos.find(function (x) { return x.id === gid; }); if (!g) return;
  var n = (prompt('Novo nome do grupo:', g.nome) || '').trim(); if (!n) return;
  g.nome = n; tagSalvarCatalogo(cat); renderTagsConfig();
}
function tagExcluirGrupo(gid) {
  var cat = tagCatalogo(), g = cat.grupos.find(function (x) { return x.id === gid; }); if (!g) return;
  if (!confirm('Excluir o grupo "' + g.nome + '"? As tags dele continuam nas clientes e vão para "Outras".')) return;
  cat.grupos = cat.grupos.filter(function (x) { return x.id !== gid; }); tagSalvarCatalogo(cat); renderTagsConfig();
}
function tagNovaNoGrupo(gid) {
  var cat = tagCatalogo(), g = cat.grupos.find(function (x) { return x.id === gid; }); if (!g) return;
  var txt = prompt('Tags para "' + g.nome + '" (pode colocar várias separadas por vírgula, ex: PP, P, M, G, GG):'); if (!txt) return;
  txt.split(',').map(tagNormalizar).filter(Boolean).forEach(function (t) {
    cat.grupos.forEach(function (x) { x.tags = x.tags.filter(function (y) { return tagChave(y) !== tagChave(t); }); });
    g.tags.push(t);
  });
  tagSalvarCatalogo(cat); renderTagsConfig();
}
function tagMover(t, destino) {
  if (!destino) return;
  var cat = tagCatalogo();
  cat.grupos.forEach(function (g) { g.tags = (g.tags || []).filter(function (x) { return tagChave(x) !== tagChave(t); }); });
  if (destino !== TAG_SEM_GRUPO) { var g = cat.grupos.find(function (x) { return x.id === destino; }); if (g) g.tags.push(t); }
  tagSalvarCatalogo(cat); renderTagsConfig();
}
function tagAcoes(t) {
  var acao = prompt('O que fazer com a tag "' + t + '"?\n\n1 = Renomear\n2 = Juntar com outra tag (as clientes passam a ter a outra)\n3 = Excluir de todas as clientes\n\nDigite 1, 2 ou 3:');
  if (acao === '1') {
    var novo = (prompt('Novo nome para "' + t + '":', t) || '').trim();
    if (novo && novo !== t) tagTrocarEmClientes(t, novo);
  } else if (acao === '2') {
    var outra = (prompt('Juntar "' + t + '" com qual tag? Digite o nome exato da tag que vai ficar:') || '').trim();
    if (!outra) return;
    var existe = tagTodas().find(function (x) { return tagChave(x) === tagChave(outra); });
    if (!existe) { toast('Não encontrei a tag "' + outra + '".', 'e'); return; }
    tagTrocarEmClientes(t, existe);
  } else if (acao === '3') {
    var n = tagContagem()[tagChave(t)] || 0;
    if (confirm('Excluir a tag "' + t + '"' + (n ? ' de ' + n + ' cliente' + (n === 1 ? '' : 's') : '') + '? Isso não pode ser desfeito.')) tagTrocarEmClientes(t, null);
  }
}
// Troca (ou remove, quando para = null) uma tag em todas as clientes e no catálogo.
async function tagTrocarEmClientes(de, para) {
  var kDe = tagChave(de), afetadas = (gC() || []).filter(function (c) { return (c.tags || []).some(function (x) { return tagChave(x) === kDe; }); });
  var erros = 0;
  for (var i = 0; i < afetadas.length; i++) {
    var c = afetadas[i], vistas = {}, nova = [];
    (c.tags || []).forEach(function (x) {
      var v = tagChave(x) === kDe ? para : x;
      if (v && !vistas[tagChave(v)]) { vistas[tagChave(v)] = true; nova.push(v); }
    });
    var r = await _sb.from('clients').update({ tags: nova }).eq('id', c.id);
    if (r.error) erros++; else c.tags = nova;
  }
  var cat = tagCatalogo();
  cat.grupos.forEach(function (g) {
    var tinha = g.tags.some(function (x) { return tagChave(x) === kDe; });
    g.tags = g.tags.filter(function (x) { return tagChave(x) !== kDe; });
    if (tinha && para && !cat.grupos.some(function (gg) { return gg.tags.some(function (x) { return tagChave(x) === tagChave(para); }); })) g.tags.push(para);
  });
  tagSalvarCatalogo(cat);
  toast(erros ? 'Concluído com ' + erros + ' erro(s).' : (para ? 'Tag atualizada em ' + afetadas.length + ' cliente(s).' : 'Tag excluída de ' + afetadas.length + ' cliente(s).'), erros ? 'e' : undefined);
  renderTagsConfig();
}

// ── FORMULÁRIO PÚBLICO DE CAPTAÇÃO: tags agrupadas ──
window.carregarTagsPublicas = function () {
  if (typeof _capStoreId === 'undefined' || !_capStoreId) return;
  _sb.rpc('get_tags_publicas_v2', { p_store_id: _capStoreId }).then(function (res) {
    var d = res && res.data, el = document.getElementById('pub-tags-list'), wrap = document.getElementById('pub-tags-wrap');
    if (!d || !el || !wrap) return;
    var grupos = (d.grupos || []).filter(function (g) { return (g.tags || []).length; });
    if (d.soltas && d.soltas.length) grupos.push({ nome: grupos.length ? 'Outros interesses' : '', tags: d.soltas });
    if (!grupos.length) return;
    wrap.style.display = 'block';
    var lbl = wrap.querySelector('.fl'); if (lbl) lbl.textContent = 'Seus interesses';
    el.style.display = 'block';
    el.innerHTML = grupos.map(function (g) {
      return '<div style="margin-bottom:10px">' + (g.nome ? '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:6px">' + tagEsc(g.nome) + '</div>' : '') +
        '<div class="cg">' + g.tags.map(function (t) { return '<div class="ci" onclick="togglePubTag(this)" data-tag="' + tagEsc(t) + '">' + tagEsc(t) + '</div>'; }).join('') + '</div></div>';
    }).join('');
  });
};
