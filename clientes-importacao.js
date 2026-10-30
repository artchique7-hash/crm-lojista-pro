// ── IMPORTAÇÃO DE CLIENTES + CONFERIR CADASTROS ──
// Carregado pelo index.html depois do script principal (usa _sb, CU, _clients,
// gC, toast, capitalize, formatTel, telDigitos, showDetail, openEditClient,
// renderClients, updateBadges).
//
// Por que existe: a importação antiga adivinhava as colunas sozinha e errava
// (telefone de uma cliente ia para outra, vírgula dentro do texto deslocava as
// colunas, data de nascimento derrubava lotes inteiros). Agora:
//   1. o arquivo é lido como uma tabela, respeitando aspas e separador real;
//   2. a lojista CONFIRMA qual coluna é o quê (o sistema sugere e lembra);
//   3. cada linha aparece com um status antes de gravar (nova, já existe,
//      telefone inválido, possível duplicada) e nada é descartado em silêncio;
//   4. se uma linha der erro, só ela falha — as outras entram.

var IMP = { tabela: null, mapa: {}, linhas: [], nomeArquivo: '' };

var IMP_CAMPOS = [
  { id: 'name',   label: 'Nome da cliente', obrig: true,
    chaves: ['nome cliente','nome do cliente','nome completo','nome','cliente','razao social','razão social','name'] },
  { id: 'phone',  label: 'Celular / WhatsApp',
    chaves: ['whatsapp','whats','celular','cel','fone celular','telefone celular','movel','móvel'] },
  { id: 'phone2', label: 'Telefone (usado se não tiver celular)',
    chaves: ['telefone','fone','tel','contato','phone'] },
  { id: 'cpf',    label: 'CPF',
    chaves: ['cpf','cpf/cnpj','cpf cnpj','documento'] },
  { id: 'birth',  label: 'Data de nascimento',
    chaves: ['nascimento','data nascimento','data de nascimento','data nasc','dt nasc','dt nascimento','nasc','aniversario','data aniversario','birth'] },
  { id: 'city',   label: 'Cidade',
    chaves: ['cidade','municipio','município','city','localidade'] }
];

function impNorm(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function impEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── MODAL ──
function impModal() {
  var mo = document.getElementById('mo-imp');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = 'mo-imp'; mo.className = 'mo';
    mo.innerHTML = '<div class="modal" style="max-width:760px;max-height:92vh;overflow-y:auto">' +
      '<div class="mh"><h3 class="mt" id="imp-titulo">Importar clientes</h3>' +
      '<button class="mc" onclick="document.getElementById(\'mo-imp\').classList.remove(\'open\')">×</button></div>' +
      '<div class="mb" id="imp-corpo"></div></div>';
    document.body.appendChild(mo);
  }
  return mo;
}
function impCorpo(html) { document.getElementById('imp-corpo').innerHTML = html; }

function abrirImportarClientes() {
  IMP = { tabela: null, mapa: {}, linhas: [], nomeArquivo: '' };
  impModal().classList.add('open');
  impPasso1();
}

function impPasso1(msgErro) {
  impCorpo(
    '<div style="background:var(--bg3);border-radius:var(--rs);padding:12px 14px;margin-bottom:16px;font-size:12px;color:var(--text2);line-height:1.6">' +
      'Exporte a lista de clientes do seu sistema em <strong>Excel (.xlsx)</strong> ou <strong>CSV</strong> e envie aqui. ' +
      'PDF também funciona (Gdoor e listas simples), mas Excel é sempre mais seguro.<br>' +
      'No próximo passo você confere qual coluna é o nome, o celular etc. Nada é gravado antes da sua confirmação.' +
    '</div>' +
    (msgErro ? '<div style="background:var(--red-l);color:var(--red);border-radius:var(--rs);padding:10px 12px;font-size:13px;margin-bottom:12px">' + impEsc(msgErro) + '</div>' : '') +
    '<div class="import-drop" id="imp-drop" onclick="document.getElementById(\'imp-file\').click()" ' +
      'ondragover="event.preventDefault();this.classList.add(\'drag\')" ondragleave="this.classList.remove(\'drag\')" ' +
      'ondrop="event.preventDefault();this.classList.remove(\'drag\');impLerArquivo(event.dataTransfer.files[0])">' +
      '<div class="import-drop-icon">📂</div>' +
      '<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">Clique ou arraste o arquivo aqui</div>' +
      '<div style="font-size:12px;color:var(--text3)">Excel, CSV ou PDF</div>' +
      '<input type="file" id="imp-file" accept=".xlsx,.xls,.csv,.txt,.pdf" style="display:none" onchange="impLerArquivo(this.files[0])">' +
    '</div>');
}

function impCarregando(txt) {
  impCorpo('<div style="text-align:center;padding:36px 0"><div style="font-size:24px;margin-bottom:8px">⏳</div>' +
    '<div style="font-size:13px;color:var(--text2)">' + impEsc(txt) + '</div></div>');
}

// ── LEITURA DO ARQUIVO → TABELA (array de linhas) ──
function impLerArquivo(file) {
  if (!file) return;
  IMP.nomeArquivo = file.name;
  var ext = file.name.split('.').pop().toLowerCase();
  impCarregando('Lendo ' + file.name + '...');
  if (ext === 'csv' || ext === 'txt') return impLerCSV(file);
  if (ext === 'xlsx' || ext === 'xls') return impLerExcel(file);
  if (ext === 'pdf') return impLerPDF(file);
  impPasso1('Formato não suportado. Use Excel, CSV ou PDF.');
}

function impLerCSV(file) {
  var r = new FileReader();
  r.onload = function (e) {
    var txt = e.target.result;
    // Arquivo salvo em Windows-1252 (comum em sistemas brasileiros) vira "�" em UTF-8: relê no formato certo.
    if (txt.indexOf('�') !== -1) {
      var r2 = new FileReader();
      r2.onload = function (e2) { impTabelaPronta(impParseCSV(e2.target.result)); };
      r2.readAsText(file, 'windows-1252');
      return;
    }
    impTabelaPronta(impParseCSV(txt));
  };
  r.onerror = function () { impPasso1('Não foi possível ler o arquivo.'); };
  r.readAsText(file, 'UTF-8');
}

// CSV de verdade: respeita aspas (vírgula dentro de "Rua X, 123" não quebra a
// coluna) e descobre o separador olhando as primeiras linhas.
function impParseCSV(txt) {
  txt = String(txt || '').replace(/^﻿/, '');
  var amostra = txt.split(/\r?\n/).filter(function (l) { return l.trim(); }).slice(0, 10);
  var seps = [';', ',', '\t', '|'], melhor = ';', melhorScore = -1;
  seps.forEach(function (sp) {
    var cont = amostra.map(function (l) { return impContaForaAspas(l, sp); });
    var min = Math.min.apply(null, cont.length ? cont : [0]);
    var score = min > 0 ? min * 10 + cont.filter(function (c) { return c === cont[0]; }).length : 0;
    if (score > melhorScore) { melhorScore = score; melhor = sp; }
  });
  var linhas = [], linha = [], campo = '', aspas = false;
  for (var i = 0; i < txt.length; i++) {
    var ch = txt[i];
    if (aspas) {
      if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === melhor) { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && txt[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += ch;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}
function impContaForaAspas(l, sp) {
  var n = 0, aspas = false;
  for (var i = 0; i < l.length; i++) { if (l[i] === '"') aspas = !aspas; else if (!aspas && l[i] === sp) n++; }
  return n;
}

function impLerExcel(file) {
  if (typeof XLSX === 'undefined') { impPasso1('A biblioteca de Excel não carregou. Verifique a internet e tente de novo.'); return; }
  var r = new FileReader();
  r.onload = function (e) {
    try {
      var wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      if (!wb.SheetNames.length) return impPasso1('A planilha não tem abas.');
      // Usa a aba com mais linhas preenchidas (alguns sistemas põem uma capa na 1ª aba).
      var melhor = null;
      wb.SheetNames.forEach(function (nm) {
        var dados = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, raw: true, defval: '' });
        if (!melhor || dados.length > melhor.length) melhor = dados;
      });
      impTabelaPronta(melhor || []);
    } catch (err) { impPasso1('Erro ao ler o Excel: ' + err.message); }
  };
  r.onerror = function () { impPasso1('Não foi possível ler o arquivo.'); };
  r.readAsArrayBuffer(file);
}

function impLerPDF(file) {
  var r = new FileReader();
  r.onload = function (e) {
    var bytes = new Uint8Array(e.target.result);
    var go = function () {
      pdfjsLib.getDocument({ data: bytes }).promise.then(async function (pdf) {
        var texto = '';
        for (var p = 1; p <= pdf.numPages; p++) {
          var page = await pdf.getPage(p);
          var content = await page.getTextContent();
          // Junta os pedaços por linha (mesma altura Y) para não colar uma cliente na outra.
          var porY = {};
          content.items.forEach(function (it) {
            var y = Math.round(it.transform[5]);
            (porY[y] = porY[y] || []).push(it);
          });
          Object.keys(porY).map(Number).sort(function (a, b) { return b - a; }).forEach(function (y) {
            texto += porY[y].sort(function (a, b) { return a.transform[4] - b.transform[4]; })
              .map(function (it) { return it.str; }).join(' ') + '\n';
          });
        }
        var cls = impExtrairDoTextoPDF(texto);
        if (!cls.length) return impPasso1('Não encontrei clientes nesse PDF. Exporte em Excel ou CSV pelo seu sistema.');
        impTabelaPronta([['Nome', 'Celular', 'Cidade']].concat(cls.map(function (c) { return [c.nome, c.telefone, c.cidade]; })));
      }).catch(function () { impPasso1('Não foi possível ler o PDF. Exporte em Excel ou CSV pelo seu sistema.'); });
    };
    if (typeof pdfjsLib !== 'undefined') return go();
    var sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    sc.onload = function () {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      go();
    };
    sc.onerror = function () { impPasso1('Não foi possível carregar o leitor de PDF. Use Excel ou CSV.'); };
    document.head.appendChild(sc);
  };
  r.readAsArrayBuffer(file);
}

function impExtrairDoTextoPDF(texto) {
  var clientes = [];
  // Formato Gdoor: blocos "Cliente: 000001 - Nome" com Celular/Telefone dentro do próprio bloco.
  if (texto.indexOf('Cliente:') !== -1) {
    texto.split(/(?=Cliente:\s*\d+\s*-)/).forEach(function (bloco) {
      var mNome = bloco.match(/Cliente:\s*\d+\s*-\s*([^\n]+)/);
      if (!mNome) return;
      var nome = capitalize(mNome[1].replace(/\s{2,}.*/, '').trim());
      if (nome.length < 2) return;
      var mCid = bloco.match(/Munic[^.]*\.:\s*([^\n]+?)(?:\s+Estado|\n)/);
      var tel = impTelDoCampo(bloco, 'Celular') || impTelDoCampo(bloco, 'Telefone');
      clientes.push({ nome: nome, telefone: tel, cidade: mCid ? mCid[1].trim() : '' });
    });
    if (clientes.length) return clientes;
  }
  // Lista simples: o telefone só vale se estiver NA MESMA LINHA do nome, ou na
  // linha logo abaixo quando essa linha não é outra cliente. (A versão antiga
  // procurava até 3 linhas abaixo e pegava o telefone da cliente seguinte.)
  var telRe = /(\(?\d{2}\)?\s?9?\s?\d{4}[-\s.]?\d{4})/;
  var pareceNome = function (l) { return /^[A-Za-zÀ-ú][A-Za-zÀ-ú'\s.]{2,60}$/.test(l) && l.trim().split(/\s+/).length >= 2; };
  var linhas = texto.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i];
    var mesma = l.match(telRe);
    var nomeParte = mesma ? l.replace(mesma[0], '').replace(/[|;,\-–]+\s*$/, '').trim() : l;
    if (!pareceNome(nomeParte)) continue;
    var tel = mesma ? mesma[0] : '';
    if (!tel && linhas[i + 1] && !pareceNome(linhas[i + 1])) {
      var prox = linhas[i + 1].match(telRe);
      if (prox && linhas[i + 1].replace(prox[0], '').trim().length < 4) { tel = prox[0]; i++; }
    }
    clientes.push({ nome: capitalize(nomeParte), telefone: tel, cidade: '' });
  }
  return clientes;
}
function impTelDoCampo(texto, campo) {
  var m = texto.match(new RegExp(campo + '\\.?:\\s*([^\\n]+)'));
  if (!m) return '';
  var t = m[1].match(/[\d()\s.-]{8,}/);
  return t ? t[0].trim() : '';
}

// ── PASSO 2: CONFERIR COLUNAS ──
function impTabelaPronta(dados) {
  dados = (dados || []).map(function (r) { return (r || []).map(function (c) { return c == null ? '' : c; }); })
    .filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  if (dados.length < 2) return impPasso1('O arquivo não tem linhas suficientes (precisa de cabeçalho + clientes).');
  // Acha a linha de cabeçalho: alguns relatórios têm título/logo nas primeiras linhas.
  var iCab = 0, melhor = -1;
  for (var i = 0; i < Math.min(15, dados.length); i++) {
    var pts = 0;
    dados[i].forEach(function (c) {
      var n = impNorm(c);
      if (!n || /^\d+$/.test(n)) return;
      IMP_CAMPOS.forEach(function (f) { if (f.chaves.some(function (k) { return n === k || n.indexOf(k) !== -1; })) pts++; });
    });
    if (pts > melhor) { melhor = pts; iCab = i; }
  }
  var cab = dados[iCab].map(function (c, j) { return String(c).trim() || ('Coluna ' + String.fromCharCode(65 + (j % 26))); });
  var corpo = dados.slice(iCab + 1);
  var nCols = Math.max.apply(null, [cab.length].concat(corpo.map(function (r) { return r.length; })));
  while (cab.length < nCols) cab.push('Coluna ' + String.fromCharCode(65 + (cab.length % 26)));
  IMP.tabela = { cab: cab, corpo: corpo };
  IMP.mapa = impMapaSalvo(cab) || impSugerirMapa(cab, corpo);
  impPasso2();
}

function impAssinatura(cab) { return 'slp_imp_map_' + cab.map(impNorm).join('|'); }
function impMapaSalvo(cab) {
  try { var v = localStorage.getItem(impAssinatura(cab)); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function impSalvarMapa() {
  try { localStorage.setItem(impAssinatura(IMP.tabela.cab), JSON.stringify(IMP.mapa)); } catch (e) {}
}

function impSugerirMapa(cab, corpo) {
  var mapa = {}, usadas = {};
  var norm = cab.map(impNorm);
  IMP_CAMPOS.forEach(function (f) {
    var escolha = -1, melhor = 0;
    norm.forEach(function (h, j) {
      if (usadas[j] || !h) return;
      // Evita "código do cliente", "nome da mãe", "nome fantasia" etc.
      if (f.id === 'name' && /(cod|codigo|id|mae|pai|fantasia|vendedor|contato)/.test(h) && h !== 'nome') return;
      f.chaves.forEach(function (k, ki) {
        var pts = 0;
        if (h === k) pts = 100 - ki;
        else if ((' ' + h + ' ').indexOf(' ' + k + ' ') !== -1) pts = 60 - ki;
        if (pts > melhor) { melhor = pts; escolha = j; }
      });
    });
    // Celular sem cabeçalho claro: procura a coluna cujos valores parecem celular.
    if (escolha === -1 && f.id === 'phone') {
      var melhorTaxa = 0;
      cab.forEach(function (_, j) {
        if (usadas[j]) return;
        var amostra = corpo.slice(0, 30), ok = 0;
        amostra.forEach(function (r) { var d = telDigitos(r[j]); if (d && d.length === 11) ok++; });
        var taxa = amostra.length ? ok / amostra.length : 0;
        if (taxa > 0.5 && taxa > melhorTaxa) { melhorTaxa = taxa; escolha = j; }
      });
    }
    if (escolha !== -1) { mapa[f.id] = escolha; usadas[escolha] = true; }
  });
  return mapa;
}

function impPasso2() {
  var t = IMP.tabela;
  var opcoes = function (sel) {
    return '<option value="">— não usar —</option>' + t.cab.map(function (h, j) {
      var ex = t.corpo.slice(0, 3).map(function (r) { return impFmtValor(r[j]); }).filter(Boolean).join(' · ');
      return '<option value="' + j + '"' + (String(sel) === String(j) ? ' selected' : '') + '>' + impEsc(h) + (ex ? ' — ex.: ' + impEsc(ex.slice(0, 60)) : '') + '</option>';
    }).join('');
  };
  impCorpo(
    '<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Arquivo: <strong>' + impEsc(IMP.nomeArquivo) + '</strong> · ' + t.corpo.length + ' linhas</div>' +
    '<div style="background:var(--gold-l);border-radius:var(--rs);padding:10px 12px;font-size:12px;color:var(--text2);margin-bottom:16px">' +
      'Confira se cada informação está ligada à coluna certa. O sistema já sugeriu, mas é você quem confirma. ' +
      'Da próxima vez que importar um arquivo do mesmo sistema, isso já vem preenchido.</div>' +
    IMP_CAMPOS.map(function (f) {
      return '<div class="fg" style="margin-bottom:10px"><label class="fl">' + f.label + (f.obrig ? ' *' : '') + '</label>' +
        '<select class="fi" data-campo="' + f.id + '" onchange="impMudarMapa(this)">' + opcoes(IMP.mapa[f.id]) + '</select></div>';
    }).join('') +
    '<div style="margin-top:14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">Como ficará (primeiras 5 linhas)</div>' +
    '<div id="imp-amostra" style="margin-top:6px"></div>' +
    '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">' +
      '<button class="btn btn-g btn-sm" onclick="impPasso1()">Trocar arquivo</button>' +
      '<button class="btn btn-p btn-sm" onclick="impIrParaPrevia()">Conferir clientes →</button></div>');
  impRenderAmostra();
}

function impMudarMapa(sel) {
  var campo = sel.getAttribute('data-campo');
  if (sel.value === '') delete IMP.mapa[campo]; else IMP.mapa[campo] = parseInt(sel.value, 10);
  impRenderAmostra();
}

function impRenderAmostra() {
  var el = document.getElementById('imp-amostra'); if (!el) return;
  var linhas = IMP.tabela.corpo.slice(0, 5).map(impMontarLinha);
  el.innerHTML = '<div style="border:1px solid var(--border);border-radius:var(--r);overflow:auto">' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:var(--bg3);text-align:left">' +
    '<th style="padding:7px 10px">Nome</th><th style="padding:7px 10px">Celular</th><th style="padding:7px 10px">CPF</th><th style="padding:7px 10px">Nascimento</th><th style="padding:7px 10px">Cidade</th></tr>' +
    linhas.map(function (l) {
      return '<tr style="border-top:1px solid var(--border)"><td style="padding:7px 10px">' + impEsc(l.name || '—') + '</td>' +
        '<td style="padding:7px 10px;' + (l.telInvalido ? 'color:var(--red)' : '') + '">' + impEsc(l.phone || (l.telInvalido ? l.telOriginal + ' (inválido)' : '—')) + '</td>' +
        '<td style="padding:7px 10px">' + impEsc(l.cpf || '—') + '</td>' +
        '<td style="padding:7px 10px">' + impEsc(l.birth ? l.birth.split('-').reverse().join('/') : '—') + '</td>' +
        '<td style="padding:7px 10px">' + impEsc(l.city || '—') + '</td></tr>';
    }).join('') + '</table></div>';
}

function impFmtValor(v) {
  if (v instanceof Date) return v.toLocaleDateString('pt-BR');
  return String(v == null ? '' : v).trim();
}
function impPega(r, campo) { var j = IMP.mapa[campo]; return (j === undefined || j === null) ? '' : r[j]; }

function impData(v) {
  if (v === '' || v == null) return null;
  var d = null;
  if (v instanceof Date && !isNaN(v)) d = new Date(v.getTime() + 12 * 3600 * 1000); // meio-dia evita virar o dia por fuso
  else if (typeof v === 'number' && v > 1000 && v < 80000) d = new Date(Math.round((v - 25569) * 86400000) + 12 * 3600 * 1000);
  else {
    var s = String(v).trim(), m;
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) {
      var a = +m[3]; if (a < 100) a += a > 30 ? 1900 : 2000;
      d = new Date(Date.UTC(a, +m[2] - 1, +m[1], 12));
      if (d.getUTCDate() !== +m[1] || d.getUTCMonth() !== +m[2] - 1) return null; // 31/02 etc.
    } else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) {
      d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
      if (d.getUTCDate() !== +m[3] || d.getUTCMonth() !== +m[2] - 1) return null;
    }
  }
  if (!d || isNaN(d)) return null;
  var ano = d.getUTCFullYear();
  if (ano < 1900 || ano > new Date().getFullYear()) return null;
  return d.toISOString().slice(0, 10);
}

function impMontarLinha(r) {
  var nome = capitalize(String(impPega(r, 'name') || '').replace(/\s+/g, ' ').trim());
  var t1 = impFmtValor(impPega(r, 'phone')), t2 = impFmtValor(impPega(r, 'phone2'));
  var d1 = telDigitos(t1), d2 = telDigitos(t2);
  var dig = d1 || d2;
  var original = t1 || t2;
  var cpfDig = String(impPega(r, 'cpf') || '').replace(/\D/g, '');
  if (cpfDig.length > 0 && cpfDig.length < 11) cpfDig = cpfDig.padStart(11, '0'); // Excel come zeros à esquerda
  var cpf = cpfDig.length === 11 ? cpfDig.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
  return {
    name: nome,
    phone: dig ? formatTel(dig) : '',
    telDig: dig,
    telInvalido: !dig && !!original.replace(/\D/g, ''),
    telOriginal: original,
    cpf: cpf,
    birth: impData(impPega(r, 'birth')),
    city: capitalize(impFmtValor(impPega(r, 'city')))
  };
}

// ── PASSO 3: PRÉVIA COM STATUS ──
var IMP_STATUS = {
  nova:        { label: 'Nova',                 cor: 'var(--green)', bg: 'var(--green-l)', padrao: true },
  existe:      { label: 'Já cadastrada',        cor: 'var(--blue)',  bg: 'var(--blue-l)',  padrao: true },
  tel_invalido:{ label: 'Telefone inválido',    cor: 'var(--gold)',  bg: 'var(--gold-l)',  padrao: true },
  dup_nome:    { label: 'Possível duplicada',   cor: 'var(--purple)',bg: 'var(--purple-l)',padrao: false },
  repetida:    { label: 'Repetida no arquivo',  cor: 'var(--text3)', bg: 'var(--bg3)',     padrao: false },
  sem_nome:    { label: 'Sem nome',             cor: 'var(--red)',   bg: 'var(--red-l)',   padrao: false }
};

function impIrParaPrevia() {
  if (IMP.mapa.name === undefined) { toast('Escolha qual coluna tem o nome da cliente.', 'e'); return; }
  impSalvarMapa();
  var existentes = gC();
  var porTel = {}, porCpf = {}, porNome = {};
  existentes.forEach(function (c) {
    var d = telDigitos(c.phone); if (d) porTel[d] = c;
    var cp = String(c.cpf || '').replace(/\D/g, ''); if (cp.length === 11) porCpf[cp] = c;
    var n = impNorm(c.name); if (n) (porNome[n] = porNome[n] || []).push(c);
  });
  var vistosTel = {}, vistosNome = {};
  IMP.linhas = IMP.tabela.corpo.map(function (r) {
    var l = impMontarLinha(r);
    var cpfDig = l.cpf.replace(/\D/g, '');
    if (!l.name || l.name.length < 2) l.status = 'sem_nome';
    else if (l.telDig && vistosTel[l.telDig]) l.status = 'repetida';
    else if (l.telDig && porTel[l.telDig]) { l.status = 'existe'; l.existente = porTel[l.telDig]; }
    else if (cpfDig && porCpf[cpfDig]) { l.status = 'existe'; l.existente = porCpf[cpfDig]; }
    else if (!l.telDig && vistosNome[impNorm(l.name)]) l.status = 'repetida';
    else if (porNome[impNorm(l.name)]) { l.status = 'dup_nome'; l.existente = porNome[impNorm(l.name)][0]; }
    else if (l.telInvalido) l.status = 'tel_invalido';
    else l.status = 'nova';
    if (l.telDig) vistosTel[l.telDig] = true;
    if (l.name) vistosNome[impNorm(l.name)] = true;
    l.incluir = IMP_STATUS[l.status].padrao;
    return l;
  });
  IMP.filtro = '';
  impPasso3();
}

function impPasso3() {
  var cont = {};
  IMP.linhas.forEach(function (l) { cont[l.status] = (cont[l.status] || 0) + 1; });
  var marcadas = IMP.linhas.filter(function (l) { return l.incluir; });
  var novas = marcadas.filter(function (l) { return l.status !== 'existe'; }).length;
  var atual = marcadas.filter(function (l) { return l.status === 'existe'; }).length;
  var chips = Object.keys(IMP_STATUS).filter(function (k) { return cont[k]; }).map(function (k) {
    var st = IMP_STATUS[k], ativo = IMP.filtro === k;
    return '<span onclick="IMP.filtro=(IMP.filtro===\'' + k + '\'?\'\':\'' + k + '\');impPasso3()" style="cursor:pointer;display:inline-block;margin:0 6px 6px 0;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:600;background:' + st.bg + ';color:' + st.cor + ';' + (ativo ? 'outline:2px solid ' + st.cor : '') + '">' + st.label + ': ' + cont[k] + '</span>';
  }).join('');
  var lista = IMP.linhas.map(function (l, i) { l._i = i; return l; }).filter(function (l) { return !IMP.filtro || l.status === IMP.filtro; });
  var mostrar = lista.slice(0, 300);
  impCorpo(
    '<div style="font-size:12px;color:var(--text2);margin-bottom:10px">Toque num status para filtrar. Desmarque o que não quer importar.</div>' +
    '<div>' + chips + '</div>' +
    '<div style="background:var(--bg3);border-radius:var(--rs);padding:10px 12px;font-size:12px;color:var(--text2);margin:6px 0 12px;line-height:1.6">' +
      '<strong>Já cadastrada</strong>: mesmo telefone ou CPF de uma cliente que você já tem — só completa o que estiver vazio na ficha dela (não apaga nada).<br>' +
      '<strong>Possível duplicada</strong>: mesmo nome de uma cliente que você já tem, mas sem telefone igual. Vem desmarcada; marque se for outra pessoa.<br>' +
      '<strong>Telefone inválido</strong>: entra sem telefone, para você corrigir depois em Conferir cadastros.</div>' +
    '<div style="border:1px solid var(--border);border-radius:var(--r);max-height:340px;overflow:auto">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<tr style="background:var(--bg3);text-align:left;position:sticky;top:0"><th style="padding:7px 8px;width:28px"></th><th style="padding:7px 8px">Nome</th><th style="padding:7px 8px">Celular</th><th style="padding:7px 8px">Status</th></tr>' +
      mostrar.map(function (l) {
        var st = IMP_STATUS[l.status];
        var obs = l.status === 'existe' ? ' → ' + impEsc(l.existente.name) : l.status === 'dup_nome' ? ' (já existe ' + impEsc(l.existente.name) + (l.existente.phone ? ' ' + impEsc(l.existente.phone) : '') + ')' : '';
        return '<tr style="border-top:1px solid var(--border)">' +
          '<td style="padding:6px 8px"><input type="checkbox" ' + (l.incluir ? 'checked' : '') + (l.status === 'sem_nome' ? ' disabled' : '') + ' onchange="IMP.linhas[' + l._i + '].incluir=this.checked;impAtualizarRodape()"></td>' +
          '<td style="padding:6px 8px">' + impEsc(l.name || '(sem nome)') + '</td>' +
          '<td style="padding:6px 8px">' + impEsc(l.phone || (l.telInvalido ? l.telOriginal : '—')) + '</td>' +
          '<td style="padding:6px 8px"><span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:' + st.bg + ';color:' + st.cor + '">' + st.label + '</span><span style="font-size:11px;color:var(--text3)">' + obs + '</span></td></tr>';
      }).join('') +
      (lista.length > mostrar.length ? '<tr><td colspan="4" style="padding:10px;text-align:center;color:var(--text3)">+ ' + (lista.length - mostrar.length) + ' linhas (filtre por status para ver)</td></tr>' : '') +
      '</table></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">' +
      '<button class="btn btn-g btn-sm" onclick="impPasso2()">← Colunas</button>' +
      '<span id="imp-rodape" style="font-size:12px;color:var(--text2)"></span>' +
      '<button class="btn btn-p btn-sm" id="imp-btn-ok" onclick="impGravar()">Importar</button></div>');
  impAtualizarRodape();
}

function impAtualizarRodape() {
  var m = IMP.linhas.filter(function (l) { return l.incluir; });
  var novas = m.filter(function (l) { return l.status !== 'existe'; }).length;
  var atual = m.length - novas;
  var el = document.getElementById('imp-rodape');
  if (el) el.textContent = novas + ' novas' + (atual ? ' · ' + atual + ' para completar' : '');
}

// ── PASSO 4: GRAVAR ──
async function impGravar() {
  var marcadas = IMP.linhas.filter(function (l) { return l.incluir && l.status !== 'sem_nome'; });
  if (!marcadas.length) { toast('Nenhuma linha marcada para importar.', 'e'); return; }
  var novas = marcadas.filter(function (l) { return l.status !== 'existe'; });
  var atualizar = marcadas.filter(function (l) { return l.status === 'existe'; });
  var total = marcadas.length, feitos = 0, okNovas = 0, okAtual = 0, erros = [];
  var progresso = function () {
    impCorpo('<div style="padding:24px 0"><div style="font-size:13px;font-weight:600;margin-bottom:8px">Importando ' + feitos + ' de ' + total + '...</div>' +
      '<div style="height:6px;background:var(--border);border-radius:20px;overflow:hidden"><div style="height:100%;width:' + Math.round(feitos / total * 100) + '%;background:var(--green)"></div></div></div>');
  };
  progresso();
  var paraRow = function (l) {
    return { store_id: CU.id, name: l.name, phone: l.phone || null, cpf: l.cpf || null, birth_date: l.birth || null,
      city: l.city || null, status: 'comprou', origin: 'importacao' };
  };
  for (var i = 0; i < novas.length; i += 50) {
    var lote = novas.slice(i, i + 50);
    var res = await _sb.from('clients').insert(lote.map(paraRow)).select();
    if (!res.error && res.data) {
      res.data.forEach(function (r) { r.purchases = []; _clients.unshift(r); });
      okNovas += res.data.length;
    } else {
      // Lote falhou: tenta uma por uma para que só a linha com problema fique de fora.
      for (var k = 0; k < lote.length; k++) {
        var r1 = await _sb.from('clients').insert(paraRow(lote[k])).select().single();
        if (r1.error || !r1.data) erros.push({ nome: lote[k].name, erro: r1.error ? r1.error.message : 'erro desconhecido' });
        else { r1.data.purchases = []; _clients.unshift(r1.data); okNovas++; }
      }
    }
    feitos += lote.length; progresso();
  }
  for (var j = 0; j < atualizar.length; j++) {
    var l = atualizar[j], ex = l.existente, upd = {};
    if (!ex.phone && l.phone) upd.phone = l.phone;
    if (!ex.cpf && l.cpf) upd.cpf = l.cpf;
    if (!ex.birth_date && l.birth) upd.birth_date = l.birth;
    if (!ex.city && l.city) upd.city = l.city;
    if (Object.keys(upd).length) {
      var ru = await _sb.from('clients').update(upd).eq('id', ex.id).select().single();
      if (ru.error) erros.push({ nome: l.name, erro: ru.error.message });
      else { Object.assign(ex, upd); okAtual++; }
    }
    feitos++; if (j % 10 === 0) progresso();
  }
  impCorpo('<div style="padding:12px 0">' +
    '<div style="font-size:16px;font-weight:700;color:var(--green);margin-bottom:6px">Importação concluída</div>' +
    '<div style="font-size:13px;color:var(--text2);margin-bottom:12px">' + okNovas + ' clientes novas · ' + okAtual + ' fichas completadas' + (erros.length ? ' · <span style="color:var(--red)">' + erros.length + ' com erro</span>' : '') + '</div>' +
    (erros.length ? '<div style="border:1px solid var(--border);border-radius:var(--r);max-height:200px;overflow:auto;font-size:12px">' +
      erros.map(function (e) { return '<div style="padding:7px 10px;border-bottom:1px solid var(--border)"><strong>' + impEsc(e.nome) + '</strong> — ' + impEsc(e.erro) + '</div>'; }).join('') + '</div>' : '') +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">' +
      '<button class="btn btn-g btn-sm" onclick="document.getElementById(\'mo-imp\').classList.remove(\'open\');showPage(\'conferir\')">Conferir cadastros</button>' +
      '<button class="btn btn-p btn-sm" onclick="document.getElementById(\'mo-imp\').classList.remove(\'open\')">Fechar</button></div></div>');
  renderClients(); updateBadges();
}

// ══════════════════════════════════════════════
// CONFERIR CADASTROS
// ══════════════════════════════════════════════
function getProblemasCadastro() {
  var cls = gC();
  var invalidos = cls.filter(function (c) { return c.phone && String(c.phone).replace(/\D/g, '') && !telDigitos(c.phone); });
  var semTel = cls.filter(function (c) { return !c.phone || !String(c.phone).replace(/\D/g, ''); });
  var porTel = {}, porNome = {};
  cls.forEach(function (c) {
    var d = telDigitos(c.phone); if (d) (porTel[d] = porTel[d] || []).push(c);
    var n = impNorm(c.name); if (n) (porNome[n] = porNome[n] || []).push(c);
  });
  var telRep = Object.keys(porTel).filter(function (k) { return porTel[k].length > 1; }).map(function (k) { return porTel[k]; });
  var nomeRep = Object.keys(porNome).filter(function (k) { return porNome[k].length > 1; }).map(function (k) { return porNome[k]; })
    .filter(function (g) { // não repete grupo que já aparece em telefone repetido
      return !telRep.some(function (t) { return g.every(function (c) { return t.indexOf(c) !== -1; }); });
    });
  return { invalidos: invalidos, semTel: semTel, telRep: telRep, nomeRep: nomeRep };
}

function renderConferir() {
  var el = document.getElementById('conferir-conteudo'); if (!el) return;
  var p = getProblemasCadastro();
  var linhaCliente = function (c, extra) {
    var compras = (c.purchases || []).length;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid var(--border)">' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;cursor:pointer" onclick="showDetail(\'' + c.id + '\')">' + impEsc(c.name) + '</div>' +
      '<div style="font-size:11px;color:var(--text3)">' + impEsc(c.phone || 'sem telefone') + ' · ' + compras + ' compra' + (compras === 1 ? '' : 's') + ' · cadastrada em ' + (c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—') + '</div></div>' +
      (extra || '') +
      '<button class="btn btn-g btn-sm" onclick="openEditClient(\'' + c.id + '\')">Editar</button></div>';
  };
  var grupo = function (lista) {
    var ids = lista.map(function (c) { return c.id; });
    return '<div style="border:1px solid var(--border);border-radius:var(--r);margin-bottom:10px;overflow:hidden">' +
      lista.map(function (c, i) { return linhaCliente(c, i === 0 ? '' : '<button class="btn btn-o btn-sm" onclick="abrirMesclar(\'' + ids[0] + '\',\'' + c.id + '\')">Juntar com a de cima</button>'); }).join('').replace('border-top:1px solid var(--border)', '') +
      '</div>';
  };
  var secao = function (titulo, desc, n, html) {
    return '<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<h3 style="font-size:14px;font-weight:700">' + titulo + '</h3><span class="nb' + (n ? ' red' : '') + '" style="display:inline">' + n + '</span></div>' +
      '<p style="font-size:12px;color:var(--text3);margin-bottom:12px">' + desc + '</p>' +
      (n ? html : '<div style="font-size:12px;color:var(--green)">Nada para conferir aqui.</div>') + '</div>';
  };
  el.innerHTML =
    secao('Telefone repetido', 'Duas fichas com o mesmo número: quase sempre é a mesma cliente cadastrada duas vezes, ou um telefone trocado na importação. Junte as fichas ou corrija o número.',
      p.telRep.length, p.telRep.map(grupo).join('')) +
    secao('Telefone em formato errado', 'Números com dígitos a mais ou a menos — não abrem no WhatsApp e não geram oportunidade.',
      p.invalidos.length, '<div style="border:1px solid var(--border);border-radius:var(--r);overflow:hidden">' + p.invalidos.map(function (c) { return linhaCliente(c); }).join('') + '</div>') +
    secao('Nome repetido', 'Mesmo nome, telefones diferentes ou vazios. Pode ser a mesma cliente ou duas pessoas diferentes — confira antes de juntar.',
      p.nomeRep.length, p.nomeRep.map(grupo).join('')) +
    secao('Sem telefone', 'Clientes sem WhatsApp não entram em pós-venda, aniversário nem cashback por mensagem.',
      p.semTel.length, '<div style="border:1px solid var(--border);border-radius:var(--r);overflow:hidden;max-height:360px;overflow-y:auto">' + p.semTel.slice(0, 200).map(function (c) { return linhaCliente(c); }).join('') + '</div>');
  var badge = document.getElementById('sb-conf');
  var nProb = p.telRep.length + p.invalidos.length + p.nomeRep.length;
  if (badge) { badge.textContent = nProb; badge.style.display = nProb ? 'inline' : 'none'; }
}

function abrirMesclar(idA, idB) {
  var a = gC().find(function (c) { return c.id === idA; }), b = gC().find(function (c) { return c.id === idB; });
  if (!a || !b) return;
  var mo = document.getElementById('mo-mesclar');
  if (!mo) {
    mo = document.createElement('div'); mo.id = 'mo-mesclar'; mo.className = 'mo';
    mo.addEventListener('click', function (e) { if (e.target === mo) mo.classList.remove('open'); });
    document.body.appendChild(mo);
  }
  var cartao = function (c, v) {
    return '<label style="display:block;border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;margin-bottom:8px;cursor:pointer">' +
      '<input type="radio" name="mesc-keep" value="' + v + '"' + (v === 'a' ? ' checked' : '') + ' style="margin-right:8px">' +
      '<strong>' + impEsc(c.name) + '</strong><div style="font-size:12px;color:var(--text3);margin:4px 0 0 22px">' +
      impEsc(c.phone || 'sem telefone') + ' · ' + (c.purchases || []).length + ' compras · ' + ((c.tags || []).join(', ') || 'sem tags') + '</div></label>';
  };
  mo.innerHTML = '<div class="modal" style="max-width:440px"><div class="mh"><h3 class="mt">Juntar fichas</h3>' +
    '<button class="mc" onclick="document.getElementById(\'mo-mesclar\').classList.remove(\'open\')">×</button></div><div class="mb">' +
    '<p style="font-size:13px;color:var(--text2);margin-bottom:12px">Escolha qual ficha fica. A outra é apagada, mas compras, cashback, contatos, observações e tags dela passam para a que fica. Campos vazios são completados.</p>' +
    cartao(a, 'a') + cartao(b, 'b') +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn btn-g" onclick="document.getElementById(\'mo-mesclar\').classList.remove(\'open\')">Cancelar</button>' +
    '<button class="btn btn-p" id="mesc-ok">Juntar</button></div></div></div>';
  mo.classList.add('open');
  document.getElementById('mesc-ok').onclick = async function () {
    var btn = this; btn.disabled = true; btn.textContent = 'Juntando...';
    var keepA = document.querySelector('input[name="mesc-keep"]:checked').value === 'a';
    var keep = keepA ? a : b, drop = keepA ? b : a;
    var res = await _sb.rpc('merge_clients', { p_keep: keep.id, p_drop: drop.id });
    if (res.error) { toast('Não foi possível juntar: ' + res.error.message, 'e'); btn.disabled = false; btn.textContent = 'Juntar'; return; }
    mo.classList.remove('open');
    toast('Fichas juntadas.');
    await loadAll();
    renderConferir();
  };
}
