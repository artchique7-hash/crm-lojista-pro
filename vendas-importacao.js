// ── IMPORTAÇÃO DE VENDAS ──
// Carregado depois de clientes-importacao.js (reaproveita impParseCSV,
// impNorm, impEsc, impData, impFmtValor) e de vendas.js.
//
// Cada sistema de caixa exporta o relatório de vendas de um jeito. Por isso a
// lojista confirma quais colunas são data, valor, cliente etc. (o sistema
// sugere e lembra para a próxima vez). Depois, cada venda aparece com o que vai
// acontecer com ela — ligada a uma cliente, cliente nova, sem cliente ou já
// lançada — e nada é gravado antes da confirmação.

var IMV = { tabela:null, mapa:{}, vendas:[], canalPadrao:'fisico', nomeArquivo:'' };
var IMV_CAMPOS = [
  {id:'data', label:'Data da venda', obrig:true, chaves:['data venda','data da venda','data emissao','data de emissao','dt venda','emissao','data','dt']},
  {id:'valor', label:'Valor da venda', obrig:true, chaves:['valor total','total venda','total da venda','valor liquido','vl total','valor venda','total','valor','vlr total','vlr']},
  {id:'nome', label:'Nome da cliente', chaves:['nome cliente','nome do cliente','cliente','nome','consumidor','razao social']},
  {id:'telefone', label:'Telefone / celular da cliente', chaves:['celular','whatsapp','telefone','fone','tel']},
  {id:'cpf', label:'CPF da cliente', chaves:['cpf','cpf/cnpj','cpf cnpj','documento']},
  {id:'numero', label:'Número da venda / pedido / cupom', chaves:['numero venda','n venda','numero pedido','pedido','cupom','nfce','nota','numero','codigo venda','cod venda','venda','documento fiscal']},
  {id:'vendedora', label:'Vendedora', chaves:['vendedor','vendedora','atendente','operador','colaborador']},
  {id:'canal', label:'Canal (loja física / online)', chaves:['canal','origem','tipo venda','loja']},
  {id:'descricao', label:'Produtos / descrição', chaves:['produtos','produto','descricao','itens','item']}
];

function imvValor(v){
  if (typeof v === 'number') return v;
  var s = String(v==null?'':v).replace(/R\$|\s/g,'');
  if (!s) return NaN;
  if (s.indexOf(',') !== -1 && s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',', '.'); // 1.234,56
  else s = s.replace(/,/g,'');                                                                               // 1,234.56
  return parseFloat(s);
}

function abrirImportarVendas(){
  IMV = { tabela:null, mapa:{}, vendas:[], canalPadrao:'fisico', nomeArquivo:'' };
  impModal().classList.add('open');
  document.getElementById('imp-titulo').textContent = 'Importar vendas';
  imvPasso1();
}
function imvPasso1(erro){
  impCorpo(
    '<div style="background:var(--bg3);border-radius:var(--rs);padding:12px 14px;margin-bottom:16px;font-size:12px;color:var(--text2);line-height:1.6">'+
      'No seu sistema de caixa, exporte o <strong>relatório de vendas</strong> do período (dia, semana ou mês) em <strong>Excel</strong> ou <strong>CSV</strong> e envie aqui.<br>'+
      'O sistema liga cada venda à cliente pelo telefone ou CPF, gera o cashback (se a sua loja usa) e coloca no pós-venda. Vendas que já estão aqui não entram de novo.</div>'+
    (erro ? '<div style="background:var(--red-l);color:var(--red);border-radius:var(--rs);padding:10px 12px;font-size:13px;margin-bottom:12px">'+impEsc(erro)+'</div>' : '')+
    '<div class="import-drop" onclick="document.getElementById(\'imv-file\').click()" ondragover="event.preventDefault();this.classList.add(\'drag\')" ondragleave="this.classList.remove(\'drag\')" ondrop="event.preventDefault();this.classList.remove(\'drag\');imvLerArquivo(event.dataTransfer.files[0])">'+
      '<div class="import-drop-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>'+
      '<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">Clique ou arraste o relatório aqui</div><div style="font-size:12px;color:var(--text3)">Excel ou CSV</div>'+
      '<input type="file" id="imv-file" accept=".xlsx,.xls,.csv,.txt" style="display:none" onchange="imvLerArquivo(this.files[0])"></div>');
}
function imvLerArquivo(file){
  if (!file) return;
  IMV.nomeArquivo = file.name;
  var ext = file.name.split('.').pop().toLowerCase();
  impCarregando('Lendo '+file.name+'...');
  var pronto = function(dados){ imvTabelaPronta(dados); };
  if (ext==='csv' || ext==='txt') {
    var r=new FileReader();
    r.onload=function(e){ var t=e.target.result; if (t.indexOf('�')!==-1) { var r2=new FileReader(); r2.onload=function(e2){ pronto(impParseCSV(e2.target.result)); }; r2.readAsText(file,'windows-1252'); } else pronto(impParseCSV(t)); };
    r.readAsText(file,'UTF-8');
  } else if (ext==='xlsx' || ext==='xls') {
    var r3=new FileReader();
    r3.onload=function(e){ try { var wb=XLSX.read(e.target.result,{type:'array',cellDates:true}); var melhor=null; wb.SheetNames.forEach(function(nm){ var d=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,raw:true,defval:''}); if(!melhor||d.length>melhor.length) melhor=d; }); pronto(melhor||[]); } catch(err) { imvPasso1('Erro ao ler o Excel: '+err.message); } };
    r3.readAsArrayBuffer(file);
  } else imvPasso1('Formato não suportado. Use Excel ou CSV. Se o seu sistema só gera PDF, procure a opção "exportar para Excel" no relatório de vendas.');
}
function imvTabelaPronta(dados){
  dados=(dados||[]).filter(function(r){ return r && r.some(function(c){ return String(c==null?'':c).trim()!==''; }); });
  if (dados.length<2) return imvPasso1('O arquivo não tem linhas suficientes.');
  var iCab=0, melhor=-1;
  for (var i=0;i<Math.min(15,dados.length);i++){
    var pts=0; dados[i].forEach(function(c){ var n=impNorm(c); if(!n||/^[\d.,\s]+$/.test(n)) return; IMV_CAMPOS.forEach(function(f){ if(f.chaves.some(function(k){ return n===k || (' '+n+' ').indexOf(' '+k+' ')!==-1; })) pts++; }); });
    if (pts>melhor){ melhor=pts; iCab=i; }
  }
  var cab=dados[iCab].map(function(c,j){ return String(c==null?'':c).trim() || ('Coluna '+String.fromCharCode(65+(j%26))); });
  var corpo=dados.slice(iCab+1);
  IMV.tabela={cab:cab, corpo:corpo};
  var salvo=null; try { salvo=JSON.parse(localStorage.getItem('slp_imv_map_'+cab.map(impNorm).join('|'))||'null'); } catch(e){}
  IMV.mapa = salvo && salvo.mapa ? salvo.mapa : imvSugerir(cab, corpo);
  if (salvo && salvo.canal) IMV.canalPadrao = salvo.canal;
  imvPasso2();
}
function imvSugerir(cab, corpo){
  var norm=cab.map(impNorm), mapa={}, usadas={};
  IMV_CAMPOS.forEach(function(f){
    var esc=-1, melhor=0;
    norm.forEach(function(h,j){
      if (usadas[j]||!h) return;
      f.chaves.forEach(function(k,ki){ var pts=0; if(h===k) pts=100-ki; else if((' '+h+' ').indexOf(' '+k+' ')!==-1) pts=60-ki; if(pts>melhor){ melhor=pts; esc=j; } });
    });
    if (esc!==-1) { mapa[f.id]=esc; usadas[esc]=true; }
  });
  // Data sem cabeçalho claro: coluna cujos valores parecem data.
  if (mapa.data===undefined) cab.forEach(function(_,j){ if (mapa.data===undefined && !usadas[j] && corpo.slice(0,10).filter(function(r){ return impData(r[j]); }).length>=5) { mapa.data=j; usadas[j]=true; } });
  return mapa;
}
function imvPasso2(){
  var t=IMV.tabela;
  var op=function(sel){ return '<option value="">— não usar —</option>'+t.cab.map(function(h,j){ var ex=t.corpo.slice(0,3).map(function(r){ return impFmtValor(r[j]); }).filter(Boolean).join(' · '); return '<option value="'+j+'"'+(String(sel)===String(j)?' selected':'')+'>'+impEsc(h)+(ex?' — ex.: '+impEsc(ex.slice(0,55)):'')+'</option>'; }).join(''); };
  impCorpo(
    '<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Arquivo: <strong>'+impEsc(IMV.nomeArquivo)+'</strong> · '+t.corpo.length+' linhas</div>'+
    '<div style="background:var(--gold-l);border-radius:var(--rs);padding:10px 12px;font-size:12px;color:var(--text2);margin-bottom:14px">Confira cada informação. Só <strong>data</strong> e <strong>valor</strong> são obrigatórias. Com telefone ou CPF a venda é ligada à cliente certa. Se o relatório tem uma linha por produto, escolha a coluna do número da venda que o sistema junta os itens.</div>'+
    IMV_CAMPOS.map(function(f){ return '<div class="fg" style="margin-bottom:9px"><label class="fl">'+f.label+(f.obrig?' *':'')+'</label><select class="fi" data-campo="'+f.id+'" onchange="var c=this.getAttribute(\'data-campo\');if(this.value===\'\')delete IMV.mapa[c];else IMV.mapa[c]=parseInt(this.value,10);">'+op(IMV.mapa[f.id])+'</select></div>'; }).join('')+
    '<div class="fg"><label class="fl">Quando não houver coluna de canal, essas vendas são da</label><select class="fi" onchange="IMV.canalPadrao=this.value"><option value="fisico"'+(IMV.canalPadrao==='fisico'?' selected':'')+'>Loja física</option><option value="online"'+(IMV.canalPadrao==='online'?' selected':'')+'>Online</option></select></div>'+
    '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)"><button class="btn btn-g btn-sm" style="width:auto" onclick="imvPasso1()">Trocar arquivo</button><button class="btn btn-p btn-sm" style="width:auto" onclick="imvMontar()">Conferir vendas →</button></div>');
}

// Junta linhas da mesma venda, acha a cliente e decide o que fazer com cada venda.
async function imvMontar(){
  if (IMV.mapa.data===undefined || IMV.mapa.valor===undefined) { toast('Escolha as colunas de data e de valor.','e'); return; }
  try { localStorage.setItem('slp_imv_map_'+IMV.tabela.cab.map(impNorm).join('|'), JSON.stringify({mapa:IMV.mapa, canal:IMV.canalPadrao})); } catch(e){}
  impCarregando('Conferindo vendas...');
  var pega=function(r,c){ var j=IMV.mapa[c]; return j===undefined?'':r[j]; };
  var porChave={}, ordem=[], ignoradas=0;
  IMV.tabela.corpo.forEach(function(r, idx){
    var data=impData(pega(r,'data')), valor=imvValor(pega(r,'valor'));
    if (!data || isNaN(valor)) { ignoradas++; return; } // linhas de total, subtítulos etc.
    var num=String(pega(r,'numero')||'').trim();
    var chave = num ? 'n:'+num : 'l:'+idx;
    var v=porChave[chave];
    if (!v) { v=porChave[chave]={numero:num, data:data, valor:0, nome:'', tel:'', cpf:'', vendedora:'', canal:'', desc:[]}; ordem.push(chave); }
    v.valor += valor;
    v.nome = v.nome || capitalize(String(pega(r,'nome')||'').replace(/\s+/g,' ').trim());
    v.tel = v.tel || telDigitos(impFmtValor(pega(r,'telefone')));
    var cpf=String(pega(r,'cpf')||'').replace(/\D/g,''); if (cpf.length>0&&cpf.length<11) cpf=cpf.padStart(11,'0'); if (cpf.length===11) v.cpf = v.cpf || cpf;
    v.vendedora = v.vendedora || String(pega(r,'vendedora')||'').trim();
    var cn=impNorm(pega(r,'canal')); if (cn && !v.canal) v.canal = /online|site|insta|whats|delivery|ecommerce|e commerce|internet/.test(cn) ? 'online' : 'fisico';
    var d=String(pega(r,'descricao')||'').trim(); if (d && v.desc.length<6) v.desc.push(d);
  });
  var vendas = ordem.map(function(k){ var v=porChave[k]; v.valor=Math.round(v.valor*100)/100; v.canal=v.canal||IMV.canalPadrao; return v; }).filter(function(v){ return v.valor>0; });
  if (!vendas.length) return imvPasso1('Não encontrei vendas com data e valor válidos. Confira as colunas escolhidas.');
  // Vendas já registradas no período (para não duplicar)
  var datas=vendas.map(function(v){ return v.data; }).sort(), ini=datas[0], fim=datas[datas.length-1];
  var exist=[], de=0;
  while (true) { var r=await _sb.from('purchases').select('id, client_id, date, amount, numero_venda').eq('store_id',CU.id).gte('date',ini).lte('date',fim).range(de,de+999); if (r.error) break; exist=exist.concat(r.data||[]); if(!r.data||r.data.length<1000) break; de+=1000; }
  var porNum={}; exist.forEach(function(p){ if (p.numero_venda) porNum[p.numero_venda]=p; });
  var porTel={}, porCpf={}, porNome={};
  gC().forEach(function(c){ var t=telDigitos(c.phone); if(t) porTel[t]=c; var cp=String(c.cpf||'').replace(/\D/g,''); if(cp.length===11) porCpf[cp]=c; var n=impNorm(c.name); if(n) (porNome[n]=porNome[n]||[]).push(c); });
  vendas.forEach(function(v){
    var cl = (v.tel && porTel[v.tel]) || (v.cpf && porCpf[v.cpf]) || null;
    v.cliente = cl; v.provavel = null;
    if (!cl && v.nome && porNome[impNorm(v.nome)] && porNome[impNorm(v.nome)].length===1) v.provavel = porNome[impNorm(v.nome)][0];
    var dup = (v.numero && porNum[v.numero]) || exist.find(function(p){ return p.date===v.data && Math.abs((parseFloat(p.amount)||0)-v.valor)<0.01 && (!cl || p.client_id===cl.id); });
    if (dup) v.acao='ignorar', v.status='ja_lancada';
    else if (cl) v.acao='vincular', v.status='vinculada';
    else if (v.provavel) v.acao='provavel', v.status='provavel';
    else if (v.nome && (v.tel || v.cpf)) v.acao='nova', v.status='nova';
    else if (v.nome) v.acao='nova', v.status='nova_sem_tel';
    else v.acao='avulsa', v.status='sem_cliente';
  });
  IMV.vendas = vendas; IMV.ignoradas = ignoradas; IMV.filtro='';
  imvPasso3();
}
var IMV_ST = {
  vinculada:{label:'Cliente encontrada', cor:'var(--green)', bg:'var(--green-l)'},
  provavel:{label:'Confirme a cliente', cor:'var(--gold-b)', bg:'var(--gold-l)'},
  nova:{label:'Cliente nova', cor:'var(--blue)', bg:'var(--blue-l)'},
  nova_sem_tel:{label:'Cliente nova sem telefone', cor:'var(--blue)', bg:'var(--blue-l)'},
  sem_cliente:{label:'Sem cliente', cor:'var(--text3)', bg:'var(--bg3)'},
  ja_lancada:{label:'Já lançada', cor:'var(--text3)', bg:'var(--bg3)'}
};
function imvPasso3(){
  var cont={}, tot=0, n=0;
  IMV.vendas.forEach(function(v){ cont[v.status]=(cont[v.status]||0)+1; if (v.acao!=='ignorar') { tot+=v.valor; n++; } });
  var lista=IMV.vendas.map(function(v,i){ v._i=i; return v; }).filter(function(v){ return !IMV.filtro || v.status===IMV.filtro; });
  var opcoes=function(v){
    var o=[];
    if (v.cliente) o.push(['vincular','Lançar em '+v.cliente.name]);
    if (v.provavel) o.push(['provavel','É '+v.provavel.name+(v.provavel.phone?' ('+v.provavel.phone+')':'')]);
    if (v.nome) o.push(['nova','Cadastrar '+v.nome+' como cliente nova']);
    o.push(['avulsa','Lançar sem cliente']); o.push(['ignorar','Não importar']);
    return o.map(function(x){ return '<option value="'+x[0]+'"'+(v.acao===x[0]?' selected':'')+'>'+impEsc(x[1])+'</option>'; }).join('');
  };
  impCorpo(
    '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px"><div><div style="font-size:20px;font-weight:700">'+n+'</div><div style="font-size:11px;color:var(--text3)">vendas para importar</div></div><div><div style="font-size:20px;font-weight:700">'+vndMoeda(tot)+'</div><div style="font-size:11px;color:var(--text3)">total</div></div>'+
      (IMV.ignoradas?'<div style="font-size:11px;color:var(--text3);align-self:flex-end">'+IMV.ignoradas+' linha(s) sem data/valor ignoradas (totais, cabeçalhos)</div>':'')+'</div>'+
    '<div style="margin-bottom:8px">'+Object.keys(IMV_ST).filter(function(k){ return cont[k]; }).map(function(k){ var s=IMV_ST[k], on=IMV.filtro===k; return '<span onclick="IMV.filtro=(IMV.filtro===\''+k+'\'?\'\':\''+k+'\');imvPasso3()" style="cursor:pointer;display:inline-block;margin:0 6px 6px 0;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:600;background:'+s.bg+';color:'+s.cor+';'+(on?'outline:2px solid '+s.cor:'')+'">'+s.label+': '+cont[k]+'</span>'; }).join('')+'</div>'+
    '<div style="border:1px solid var(--border);border-radius:var(--r);max-height:360px;overflow:auto">'+
      lista.slice(0,300).map(function(v){ var s=IMV_ST[v.status];
        return '<div style="display:flex;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--border);flex-wrap:wrap">'+
          '<div style="min-width:120px;flex:1"><div style="font-size:13px;font-weight:600">'+impEsc(v.nome||'Sem nome')+'</div><div style="font-size:11px;color:var(--text3)">'+v.data.split('-').reverse().join('/')+(v.numero?' · nº '+impEsc(v.numero):'')+(v.vendedora?' · '+impEsc(v.vendedora):'')+' · '+(v.canal==='online'?'Online':'Loja física')+'</div></div>'+
          '<div style="font-weight:700;font-size:13px;min-width:90px;text-align:right">'+vndMoeda(v.valor)+'</div>'+
          '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:'+s.bg+';color:'+s.cor+'">'+s.label+'</span>'+
          '<select class="fi" style="width:auto;max-width:260px;padding:5px 8px;font-size:12px" onchange="IMV.vendas['+v._i+'].acao=this.value;imvPasso3()">'+opcoes(v)+'</select></div>';
      }).join('')+(lista.length>300?'<div style="padding:10px;text-align:center;font-size:12px;color:var(--text3)">+ '+(lista.length-300)+' vendas (filtre por status para ver)</div>':'')+'</div>'+
    '<div style="font-size:11px;color:var(--text3);margin-top:8px;line-height:1.5">"Confirme a cliente": achei uma cliente com o mesmo nome, mas sem telefone/CPF igual para ter certeza — confira se é ela.</div>'+
    '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)"><button class="btn btn-g btn-sm" style="width:auto" onclick="imvPasso2()">← Colunas</button><button class="btn btn-p btn-sm" style="width:auto" onclick="imvGravar()">Importar '+n+' vendas</button></div>');
}
async function imvGravar(){
  var lista=IMV.vendas.filter(function(v){ return v.acao!=='ignorar'; });
  if (!lista.length) { toast('Nenhuma venda para importar.','e'); return; }
  var feitos=0, ok=0, novas=0, erros=[], cbGerado=0;
  var prog=function(){ impCorpo('<div style="padding:24px 0"><div style="font-size:13px;font-weight:600;margin-bottom:8px">Importando '+feitos+' de '+lista.length+'...</div><div style="height:6px;background:var(--border);border-radius:20px;overflow:hidden"><div style="height:100%;width:'+Math.round(feitos/lista.length*100)+'%;background:var(--green)"></div></div></div>'); };
  prog();
  lista.sort(function(a,b){ return a.data<b.data?-1:1; });
  var criadasNoArquivo = {}; // mesma cliente nova em várias vendas do arquivo
  var hoje=getTodayStr(), validade=(_cbConfig&&_cbConfig.validade)||60;
  for (var i=0;i<lista.length;i++){
    var v=lista[i], cid=null;
    try {
      if (v.acao==='vincular' && v.cliente) cid=v.cliente.id;
      else if (v.acao==='provavel' && v.provavel) cid=v.provavel.id;
      else if (v.acao==='nova') {
        var chave=(v.tel||'')+'|'+(v.cpf||'')+'|'+impNorm(v.nome);
        if (criadasNoArquivo[chave]) cid=criadasNoArquivo[chave];
        else {
          var rc=await _sb.from('clients').insert({store_id:CU.id, name:v.nome, phone:v.tel?formatTel(v.tel):null, cpf:v.cpf?v.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):null, status:'comprou', origin:'importacao'}).select().single();
          if (rc.error) throw new Error('cliente: '+rc.error.message);
          rc.data.purchases=[]; _clients.unshift(rc.data); cid=rc.data.id; criadasNoArquivo[chave]=cid; novas++;
        }
      }
      var cl = cid ? gC().find(function(c){ return c.id===cid; }) : null;
      var anteriores = cl ? (cl.purchases||[]).filter(function(p){ return p.date < v.data; }).length : 0;
      var tipo = cid ? (anteriores ? (v.canal==='online'?'retorno_online':'retorno_fisico') : 'primeira') : null;
      var rp=await _sb.from('purchases').insert({store_id:CU.id, client_id:cid, date:v.data, amount:v.valor, valor_bruto:v.valor, cashback_usado:0, canal:v.canal, origem:'importacao',
        tipo_cliente:tipo, salesperson:v.vendedora||null, numero_venda:v.numero||null, description:v.desc.length?v.desc.join(', ').slice(0,300):null}).select().single();
      if (rp.error) throw new Error(rp.error.message);
      if (cl) { cl.purchases=(cl.purchases||[]).concat([rp.data]); if (cl.status!=='comprou') { cl.status='comprou'; _sb.from('clients').update({status:'comprou'}).eq('id',cid); } }
      // Cashback só para vendas que ainda estariam dentro da validade.
      if (cid && eAddDiasImv(v.data, validade) >= hoje && typeof gerarCashbackVenda==='function' && (!_cbConfig || _cbConfig.ativo!==false)) { var antes=(_cashback||[]).length; await gerarCashbackVenda(cid, v.valor, rp.data.id); if ((_cashback||[]).length>antes) cbGerado++; }
      ok++;
    } catch(e) { erros.push({nome:(v.nome||'Sem cliente')+' · '+v.data.split('-').reverse().join('/')+' · '+vndMoeda(v.valor), erro:e.message}); }
    feitos++; if (i%5===0) prog();
  }
  impCorpo('<div style="padding:12px 0"><div style="font-size:16px;font-weight:700;color:var(--green);margin-bottom:6px">Importação concluída</div>'+
    '<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6">'+ok+' vendas importadas · '+novas+' clientes novas cadastradas'+(cbGerado?' · cashback gerado em '+cbGerado+' venda(s)':'')+(erros.length?' · <span style="color:var(--red)">'+erros.length+' com erro</span>':'')+'</div>'+
    (erros.length?'<div style="border:1px solid var(--border);border-radius:var(--r);max-height:200px;overflow:auto;font-size:12px">'+erros.map(function(e){ return '<div style="padding:7px 10px;border-bottom:1px solid var(--border)"><strong>'+impEsc(e.nome)+'</strong> — '+impEsc(e.erro)+'</div>'; }).join('')+'</div>':'')+
    '<div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-p btn-sm" style="width:auto" onclick="document.getElementById(\'mo-imp\').classList.remove(\'open\');if(typeof renderVendas===\'function\')renderVendas()">Ver vendas</button></div></div>');
  if (typeof loadAll==='function') loadAll().then(function(){ if (typeof updateBadges==='function') updateBadges(); });
}
function eAddDiasImv(d, n){ var p=d.split('-'); var x=new Date(+p[0],+p[1]-1,+p[2]); x.setDate(x.getDate()+n); return toLocalDateStr(x); }

// Título do modal volta ao normal quando a importação de clientes é aberta.
(function(){ var orig=window.abrirImportarClientes; if (!orig) return; window.abrirImportarClientes=function(){ orig(); var t=document.getElementById('imp-titulo'); if (t) t.textContent='Importar clientes'; }; })();
