// ── COMO USAR O SISTEMA ──
// Manual dentro do sistema (menu > Ajuda > Como usar). O conteúdo fica aqui
// em uma lista simples para ser fácil de atualizar: cada tópico tem título,
// onde fica no menu e o texto (parágrafos e listas).

var AJUDA = [
  { grupo:'Comece por aqui', itens:[
    { t:'O que é o Loja Previsível', onde:'', txt:[
      'É o sistema que transforma o movimento da loja em vendas previsíveis. Ele não substitui o seu sistema de caixa ou estoque: ele cuida do que acontece antes e depois da venda — quem atendeu, quem comprou, quem precisa de contato hoje e o que está planejado para o mês.',
      'Tudo gira em torno de três hábitos: registrar (atendimentos e vendas), agir (oportunidades do dia) e planejar (o mês no Escritório).'
    ]},
    { t:'Configuração inicial (faça uma vez)', onde:'', lista:[
      'Configurações > Vendedoras: cadastre quem atende na loja.',
      'Oportunidades > Cashback a Vencer: ligue ou desligue o cashback e defina percentual e validade.',
      'Configurações > Tags e Filtros: crie os grupos de tags do seu nicho (ex.: Tamanho, Cor, Estilo).',
      'Clientes > Base de Clientes > Importar: suba a lista de clientes do seu sistema em Excel ou CSV.',
      'Clientes > Conferir Cadastros: corrija telefones errados e junte fichas duplicadas.',
      'Central de Atendimento: cadastre suas mensagens de pós-venda, aniversário e reativação.',
      'Clientes > Captação: gere o link do formulário para novas clientes se cadastrarem.'
    ]},
    { t:'Rotina diária sugerida (10 minutos)', onde:'', lista:[
      'Abra o Dashboard e veja as prioridades do dia.',
      'Pós-venda: fale com quem comprou. Use "Mensagem" para abrir o WhatsApp com o texto pronto.',
      'Retornos pendentes: faça os contatos agendados.',
      'Cashback a vencer e Aniversariantes: avise quem tem algo para usar.',
      'Ao longo do dia: registre cada atendimento no Fluxo do Dia.',
      'No fim do dia: confira a tela de Vendas. Se usa outro sistema de caixa, importe o relatório (pode ser 1 vez por semana).'
    ]}
  ]},
  { grupo:'Operação diária', itens:[
    { t:'Fluxo do Dia', onde:'Operação diária > Fluxo do Dia', txt:[
      'Registra cada atendimento, na loja física ou online, e se a pessoa comprou ou não. É daqui que saem a taxa de conversão, as perdas e boa parte das vendas.'
    ], lista:[
      'Toque em Atendimento Físico ou Online e marque Comprou ou Não comprou.',
      'Comprou: busque a cliente pelo nome ou telefone, ou faça o cadastro rápido (nome, telefone e tags de interesse).',
      'Marque se é primeira compra, voltou na loja ou voltou pelo online — o sistema já sugere.',
      'Se a cliente tem cashback, aparece o saldo. Marque "Usar cashback" e o sistema mostra quanto ela paga.',
      'Escolha a vendedora. O sistema lembra a última escolhida no aparelho.',
      'Não comprou: registre o que ela buscava e o motivo. Dá para agendar um retorno.',
      'Venda sem cliente identificada também pode ser lançada com valor — entra no total do dia.'
    ]},
    { t:'Vendas', onde:'Operação diária > Vendas', txt:[
      'Mostra todas as vendas do sistema, venham do Fluxo, da ficha da cliente ou da importação.'
    ], lista:[
      'Por dia: atendimentos, vendas, total, física, online, ticket médio, cashback usado e retornos. Compare com o fechamento do seu caixa.',
      'Linha amarela: o Fluxo contou mais vendas do que as que têm valor lançado. Toque no dia para conferir.',
      'Por mês: o ano inteiro, mês a mês.',
      'Por vendedora: quanto cada uma vendeu e a participação no mês.',
      'Lista de vendas: todas as vendas. Excluir uma venda desfaz o cashback ligado a ela.'
    ]},
    { t:'Importar vendas do seu sistema de caixa', onde:'Vendas > Importar vendas', lista:[
      'No seu sistema, exporte o relatório de vendas do período em Excel ou CSV.',
      'Envie o arquivo e confira as colunas: data e valor são obrigatórias; telefone ou CPF ligam a venda à cliente certa.',
      'Se o relatório tem uma linha por produto, escolha a coluna do número da venda — o sistema junta os itens.',
      'Na conferência, cada venda mostra o que vai acontecer: cliente encontrada, confirme a cliente, cliente nova, sem cliente ou já lançada. Dá para mudar venda a venda.',
      'Vendas que já estão no sistema não entram de novo.',
      'Ao importar, o sistema gera o cashback (se a loja usa e a venda ainda está dentro da validade) e coloca as clientes no pós-venda.',
      'Na próxima vez, as colunas do mesmo sistema já vêm escolhidas.'
    ]}
  ]},
  { grupo:'Oportunidades de venda', itens:[
    { t:'Pós-venda', onde:'Oportunidades > Pós-venda', lista:[
      'Toda cliente que compra entra aqui e só sai quando alguém marca Feito, envia a mensagem de pós-venda ou marca Não vou fazer.',
      'Até 7 dias: no prazo. 8 a 14: atenção. 15 a 30: atrasado. Mais de 30: vencido — continua na lista até ser resolvido.',
      'Toque no nome para ver a ficha rápida sem sair da lista.'
    ]},
    { t:'Retornos, Cashback, Aniversariantes e Inativos', onde:'Oportunidades', lista:[
      'Retornos pendentes: contatos agendados para hoje ou atrasados.',
      'Cashback a vencer: clientes com saldo, com filtros por vencimento. O botão Mensagem já leva o valor e a data.',
      'Aniversariantes: quem faz aniversário no mês e ainda não recebeu contato no ano.',
      'Inativos: quem não compra há mais de 60 dias.',
      'Em todas: Feito tira da lista; Mensagem abre o WhatsApp com o texto pronto e registra o contato.'
    ]},
    { t:'Campanha por Interesse', onde:'Oportunidades > Campanha por Interesse', lista:[
      'Toque nas tags para montar a lista da ação.',
      'Dentro do mesmo grupo vale uma OU outra (M ou G). Entre grupos valem as duas (M e Alfaiataria).',
      'Use "Copiar telefones" para montar uma lista de transmissão.'
    ]}
  ]},
  { grupo:'Clientes', itens:[
    { t:'Base de Clientes e ficha', onde:'Clientes > Base de Clientes', lista:[
      'Cadastre, busque e abra a ficha completa: compras, atendimentos, contatos, retornos e cashback.',
      'Na ficha dá para registrar compra (com cashback), contato, observação e agendar retorno.',
      'Importar: envie a lista do seu sistema e confirme as colunas. Cada linha aparece como nova, já cadastrada, telefone inválido ou possível duplicada antes de gravar.'
    ]},
    { t:'Conferir Cadastros', onde:'Clientes > Conferir Cadastros', lista:[
      'Mostra telefones repetidos, telefones em formato errado, nomes repetidos e clientes sem telefone.',
      'Juntar fichas: escolha qual fica. Compras, cashback, contatos e tags da outra passam para ela.'
    ]},
    { t:'Captação de clientes', onde:'Clientes > Captação de Clientes', lista:[
      'Gere um link ou QR Code de cadastro para divulgar no Instagram, no balcão ou no grupo.',
      'A cliente preenche nome, WhatsApp, aniversário, cidade, interesses (suas tags) e o que procura.',
      'Se ela já existe na base (mesmo telefone), o cadastro é completado em vez de duplicado.'
    ]},
    { t:'Tags e Filtros', onde:'Configurações > Tags e Filtros', lista:[
      'Organize as tags em grupos do seu nicho. Elas aparecem para tocar na ficha, no Fluxo do Dia e no formulário de captação.',
      'Use o menu de cada tag para renomear, juntar duas tags parecidas ou excluir de todas as clientes.'
    ]}
  ]},
  { grupo:'Atendimento', itens:[
    { t:'Central de Atendimento', onde:'Atendimento > Central de Atendimento', lista:[
      'Mensagens: os modelos usados no botão Mensagem das oportunidades. Use {nome} para o primeiro nome da cliente e {loja} para o nome da loja.',
      'Roteiros e Objeções: respostas prontas para a equipe usar no WhatsApp e no balcão.',
      'Tudo fica salvo no servidor: aparece igual em qualquer celular ou computador.'
    ]}
  ]},
  { grupo:'Escritório da Loja', itens:[
    { t:'Plano do Mês', onde:'Escritório > Plano do Mês', lista:[
      'Meta de faturamento do mês, calculada sozinha com as vendas, com o valor por dia que falta.',
      'Atenção: tarefas atrasadas, ações sem passo a passo, metas abaixo do ritmo e conteúdos sem responsável.',
      'Linha do tempo das ações, tarefas dos próximos 7 dias, metas e a direção do mês (tema, objetivo, narrativa e datas).'
    ]},
    { t:'Planejamento de Ações', onde:'Escritório > Planejamento de Ações', lista:[
      'Crie uma ação: live, campanha, coleção, grupo de WhatsApp, tráfego, parceria, captação, reativação, evento ou personalizada.',
      'Defina período, responsável, objetivo e, se quiser, uma meta (faturamento, vendas, clientes contatadas ou um número que você atualiza).',
      'Monte o passo a passo. Cada etapa vira tarefa ou conteúdo na data certa (ex.: 3 dias antes do início, no último dia, toda quarta).',
      'Salve o passo a passo como modelo para reaproveitar. Ao terminar, registre o resultado.'
    ]},
    { t:'Rotina e Tarefas', onde:'Escritório > Rotina e Tarefas', lista:[
      'Todas as tarefas num lugar: das ações e avulsas. Filtre por hoje, 7 dias, atrasadas, pendentes ou concluídas.',
      'Rotina fixa: o que a equipe faz toda semana, com checklist.',
      'As tarefas de hoje também aparecem no Dashboard.'
    ]},
    { t:'Conteúdo', onde:'Escritório > Conteúdo', lista:[
      'Calendário, lista e kanban do conteúdo do mês, com responsável e etapa (ideia, produção, agendado, publicado).',
      'Cada conteúdo pode estar ligado a uma ação ou ser da rotina de divulgação.'
    ]}
  ]},
  { grupo:'Gestão e configurações', itens:[
    { t:'Insights e Exportar', onde:'Gestão', lista:[
      'Insights: conversão, perdas, contatos e resultados do período.',
      'Exportar: baixe seus dados em planilha ou faça backup.'
    ]},
    { t:'Cashback', onde:'Oportunidades > Cashback a Vencer', lista:[
      '"Minha loja usa cashback": desligado, as vendas não geram cashback novo (saldos atuais continuam valendo).',
      'Percentual, validade e valor mínimo de compra.',
      'O cashback é calculado sobre o valor que a cliente pagou. Ao usar, ele é abatido da venda.'
    ]}
  ]},
  { grupo:'Dúvidas frequentes', itens:[
    { t:'A mensagem não abre o WhatsApp', onde:'', txt:['O telefone da cliente está incompleto ou errado. Corrija na ficha ou em Clientes > Conferir Cadastros.'] },
    { t:'Lancei uma venda errada', onde:'', txt:['Vá em Vendas > Lista de vendas e exclua. O cashback gerado por ela sai e o cashback usado volta para a cliente. Depois lance de novo.'] },
    { t:'Uso no celular e no computador', onde:'', txt:['Os dados ficam no servidor. Entre com o mesmo e-mail em qualquer aparelho. No celular, o botão voltar do aparelho volta para a tela anterior do sistema.'] },
    { t:'Importei e uma venda ficou de fora', onde:'', txt:['Na tela de conferência ela aparece como "Já lançada" quando já existe uma venda igual (mesmo número, ou mesma data e valor da mesma cliente). Se não for duplicada, mude a opção dela antes de importar.'] }
  ]}
];

var _ajudaBusca = '';
function renderAjuda(){
  var root = document.getElementById('ajuda-root'); if (!root) return;
  var q = (_ajudaBusca||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  var norm = function(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); };
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var html = '';
  AJUDA.forEach(function(g, gi){
    var itens = g.itens.filter(function(it){ return !q || norm(it.t+' '+(it.onde||'')+' '+(it.txt||[]).join(' ')+' '+(it.lista||[]).join(' ')).indexOf(q)!==-1; });
    if (!itens.length) return;
    html += '<div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text3);margin:22px 0 8px">'+esc(g.grupo)+'</div><div class="card" style="padding:0;overflow:hidden">';
    itens.forEach(function(it, ii){
      var id = 'aj-'+gi+'-'+ii, aberto = !!q || (gi===0 && ii===0);
      html += '<div style="border-top:'+(ii?'1px solid var(--border)':'none')+'">'+
        '<button onclick="var b=document.getElementById(\''+id+'\');var a=b.style.display!==\'none\';b.style.display=a?\'none\':\'block\';this.querySelector(\'svg\').style.transform=a?\'\':\'rotate(90deg)\'" style="width:100%;display:flex;align-items:center;gap:10px;padding:14px 18px;background:none;border:none;cursor:pointer;text-align:left;font-family:inherit;color:var(--text)">'+
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2.2" style="flex-shrink:0;transition:transform .15s;'+(aberto?'transform:rotate(90deg)':'')+'"><polyline points="9 18 15 12 9 6"/></svg>'+
          '<span style="flex:1;font-size:14px;font-weight:600">'+esc(it.t)+'</span>'+(it.onde?'<span style="font-size:11px;color:var(--text3);text-align:right">'+esc(it.onde)+'</span>':'')+'</button>'+
        '<div id="'+id+'" style="display:'+(aberto?'block':'none')+';padding:0 18px 16px 42px;font-size:13px;line-height:1.65;color:var(--text2)">'+
          (it.txt||[]).map(function(p){ return '<p style="margin-bottom:8px">'+esc(p)+'</p>'; }).join('')+
          (it.lista ? '<ul style="margin:0;padding-left:18px">'+it.lista.map(function(l){ return '<li style="margin-bottom:5px">'+esc(l)+'</li>'; }).join('')+'</ul>' : '')+
        '</div></div>';
    });
    html += '</div>';
  });
  root.innerHTML =
    '<div class="ph"><div><h1 class="pt">Como usar o sistema</h1><p class="ps">O passo a passo de cada parte do Loja Previsível. Comece pela configuração inicial e depois siga a rotina diária.</p></div></div>'+
    '<div class="siw" style="max-width:420px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input type="text" class="si-in" placeholder="Buscar: cashback, importar, pós-venda..." value="'+esc(_ajudaBusca)+'" oninput="_ajudaBusca=this.value;renderAjuda();var i=document.querySelector(\'#ajuda-root .si-in\');i.focus();i.setSelectionRange(i.value.length,i.value.length)"></div>'+
    (html || '<div class="empty" style="margin-top:20px"><div class="empty-d">Nada encontrado para "'+esc(_ajudaBusca)+'"</div></div>');
}
