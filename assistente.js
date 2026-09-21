/* =====================================================
   AGENTES — assistente do painel, Marketing (e anúncios) e Atendimento
   =====================================================
   Arquivo fechado. No resto do app só existe a linha que o carrega no
   index.html: tirando essa linha, o app volta a ser o que era.

   Três agentes, um cérebro só:
   1. Assistente — botão fixo em todas as abas do painel. Lê passeios,
      agenda, vagas e reservas; grava (passeio, preço, horário, bloqueio,
      cupom, plano, criativo, anúncio, memória) depois de um cartão
      "confirma?".
   2. Marketing — plano de postagem ligado às vagas, criativos (foto num
      molde da marca → PNG, nunca imagem de IA), planos de anúncio, kit de
      marca e memória.
   3. Atendimento — WhatsApp e Instagram: a mensagem do cliente chega, o
      agente consulta as vagas reais e escreve a resposta no idioma dele;
      o guia aprova com um toque, ou deixa no automático.

   MODO DEMONSTRAÇÃO (sem chave): o protótipo de venda não tem chave de
   ninguém. Os pedidos prontos rodam as MESMAS ferramentas, de verdade, nos
   dados do protótipo — só o texto do Claude é pré-escrito. Com uma chave
   da Anthropic colada, vira o Claude de verdade.

   A chave fica só no navegador (localStorage), nunca vai para o backup,
   para a nuvem ou para o GitHub. Não existe ferramenta que mande nada
   para fora: o assistente escreve, quem envia é o guia. */
'use strict';

const IA_CHAVE = 'guia_ia_chave';
const IA_HIST = 'guia_ia_hist';
const IA_GASTO = 'guia_ia_gasto';
const IA_CONFIRMA = 'guia_ia_confirma';
const IA_MODELO = 'claude-haiku-4-5';
const IA_PRECO = { in: 1, out: 5, cacheW: 1.25, cacheR: 0.10 };  /* US$ por milhão de tokens */
const IA_MAX_VOLTAS = 10;

const iaLe = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const iaGrava = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const iaChave = () => { try { return (localStorage.getItem(IA_CHAVE) || '').trim(); } catch (e) { return ''; } };
const iaDemo = () => !iaChave();
const iaPerguntaAntes = () => iaLe(IA_CONFIRMA, true) !== false;

/* ---------- textos (PT e EN aqui; FR, IT, DE, ES em IA_TR no fim) ---------- */
const IA_TXT = {
  assistente: { pt: 'Assistente', en: 'Assistant' },
  fechar: { pt: 'Fechar', en: 'Close' },
  vendo: { pt: 'Vendo', en: 'Viewing' },
  pensando: { pt: 'pensando…', en: 'thinking…' },
  enviar: { pt: 'Enviar', en: 'Send' },
  ph: { pt: 'Pergunte ou peça algo…', en: 'Ask or request something…' },
  foto: { pt: 'Mandar uma foto', en: 'Send a photo' },
  fotoPronta: { pt: 'foto pronta para enviar', en: 'photo ready to send' },
  tirar: { pt: 'tirar', en: 'remove' },
  copiar: { pt: 'Copiar', en: 'Copy' },
  copiado: { pt: 'Copiado ✓', en: 'Copied ✓' },
  confirma: { pt: 'confirma?', en: 'confirm?' },
  cancelar: { pt: 'Cancelar', en: 'Cancel' },
  confirmar: { pt: 'Confirmar', en: 'Confirm' },
  feito: { pt: '✓ Feito', en: '✓ Done' },
  cancelado: { pt: 'Cancelado — nada foi gravado', en: 'Cancelled — nothing was saved' },
  assumi: { pt: 'Assumi', en: 'I assumed' },
  perguntar: { pt: 'Perguntar antes de gravar', en: 'Ask before saving' },
  gasto: { pt: 'Gasto aqui: US$', en: 'Spent here: US$' },
  nova: { pt: 'Nova conversa', en: 'New chat' },
  trocarChave: { pt: 'Trocar chave', en: 'Change key' },
  tirarChave: { pt: 'Tirar a chave deste aparelho? Depois é só colar de novo.', en: 'Remove the key from this device? You can paste it again later.' },
  demoTit: { pt: 'Demonstração', en: 'Demo' },
  demoTxt: { pt: 'Toque num pedido. As ações acontecem de verdade nos dados deste protótipo; as respostas são exemplos prontos. Com uma chave da Anthropic, vira o Claude de verdade, escrevendo com as suas palavras.', en: 'Tap a request. The actions really happen on this prototype’s data; the replies are ready-made examples. With an Anthropic key it becomes the real Claude, writing in your own words.' },
  experimente: { pt: 'Experimente pedir', en: 'Try asking' },
  conectar: { pt: 'Conectar o Claude de verdade', en: 'Connect the real Claude' },
  oi: { pt: 'Oi! Consulto passeios, agenda, vagas e reservas; crio e altero passeio, preço, horário, bloqueio e cupom; monto plano de postagem, criativo, anúncio e resposta para cliente. Antes de gravar qualquer coisa, mostro o que vou fazer.', en: 'Hi! I check tours, schedule, seats and bookings; I create and edit tours, prices, times, blocked dates and coupons; I build post plans, creatives, ads and replies to clients. Before saving anything, I show you what I’m about to do.' },
  chaveTit: { pt: 'Para o Claude de verdade responder, cole a sua chave da Anthropic. Ela fica só neste aparelho.', en: 'For the real Claude to answer, paste your Anthropic key. It stays on this device only.' },
  chave1: { pt: 'Entre em console.anthropic.com', en: 'Go to console.anthropic.com' },
  chave2: { pt: 'Em Billing, ponha créditos (US$ 5 duram meses)', en: 'In Billing, add credit (US$ 5 lasts months)' },
  chave3: { pt: 'Em API Keys, crie uma chave e copie', en: 'In API Keys, create a key and copy it' },
  chave4: { pt: 'Cole aqui embaixo', en: 'Paste it below' },
  chaveOk: { pt: 'Guardar e testar', en: 'Save and test' },
  chaveVolta: { pt: '← Voltar para a demonstração', en: '← Back to the demo' },
  chaveRuim: { pt: 'Essa não parece uma chave da Anthropic — ela começa com sk-ant-.', en: 'That doesn’t look like an Anthropic key — it starts with sk-ant-.' },
  testando: { pt: 'Testando…', en: 'Testing…' },
  e401: { pt: 'A chave não foi aceita. Confira se colou inteira.', en: 'The key was not accepted. Check you pasted all of it.' },
  eCredito: { pt: 'Acabaram os créditos da conta Anthropic (console.anthropic.com → Billing).', en: 'Your Anthropic credit ran out (console.anthropic.com → Billing).' },
  e429: { pt: 'Muitas perguntas seguidas. Espere um minuto.', en: 'Too many requests in a row. Wait a minute.' },
  eCheio: { pt: 'A Anthropic está sobrecarregada agora. Tente de novo em instantes.', en: 'Anthropic is overloaded right now. Try again shortly.' },
  eRede: { pt: 'Sem internet, ou a conexão caiu.', en: 'No internet, or the connection dropped.' },
  eFoto: { pt: 'Não consegui abrir essa foto.', en: 'I couldn’t open that photo.' },
  semEspaco: { pt: 'O aparelho ficou sem espaço para fotos. Apague alguma em Marketing → Criativos.', en: 'This device ran out of space for photos. Delete some in Marketing → Creatives.' },
  /* aba Marketing */
  marketing: { pt: 'Marketing', en: 'Marketing' },
  subPlano: { pt: 'Plano de postagem', en: 'Post plan' },
  subCriativos: { pt: 'Criativos', en: 'Creatives' },
  subAnuncios: { pt: 'Anúncios', en: 'Ads' },
  subKit: { pt: 'Kit de marca', en: 'Brand kit' },
  subMemoria: { pt: 'Memória', en: 'Memory' },
  pedirPlano: { pt: '✦ Pedir o plano ao assistente', en: '✦ Ask the assistant for the plan' },
  pedidoPlano: { pt: 'Monte o plano de postagem de {mes}. Olhe a agenda e priorize as saídas com vaga sobrando.', en: 'Build the post plan for {mes}. Check the schedule and prioritise departures with empty seats.' },
  mesVazio: { pt: 'Nada planejado em {mes}, e nenhuma saída com vaga sobrando.', en: 'Nothing planned for {mes}, and no departures with empty seats.' },
  livres: { pt: '{l} de {c} livres', en: '{l} of {c} free' },
  ideia: { pt: 'ideia', en: 'idea' },
  pronto: { pt: 'pronto', en: 'ready' },
  postado: { pt: '✓ postado', en: '✓ posted' },
  copiarLegenda: { pt: 'Copiar legenda', en: 'Copy caption' },
  legendaCopiada: { pt: 'Legenda copiada', en: 'Caption copied' },
  marcarPostado: { pt: 'Marcar postado', en: 'Mark as posted' },
  reescrever: { pt: 'Reescrever', en: 'Rewrite' },
  pedidoReescrever: { pt: 'Reescreva a legenda do item do plano {id} ({tema}).', en: 'Rewrite the caption of plan item {id} ({tema}).' },
  apagar: { pt: 'Apagar', en: 'Delete' },
  apagarItem: { pt: 'Apagar este item?', en: 'Delete this item?' },
  criativosTxt: { pt: 'Foto num molde da sua marca, ou fundo na cor da marca com texto explicativo. Pronto para postar.', en: 'A photo in your brand template, or a brand-colour background with explanatory text. Ready to post.' },
  pedirCriativo: { pt: '✦ Pedir um criativo', en: '✦ Ask for a creative' },
  pedidoCriativo: { pt: 'Monte um story para a próxima saída com vaga sobrando.', en: 'Make a story for the next departure with empty seats.' },
  pedirTexto: { pt: 'Pedir um só de texto', en: 'Ask for a text-only one' },
  pedidoTexto: { pt: 'Monte um post sem foto, com fundo na cor da marca, explicando por que vale a pena fazer o passeio com um guia local.', en: 'Make a post without a photo, on a brand-colour background, explaining why a local guide is worth it.' },
  suasFotos: { pt: 'Suas fotos', en: 'Your photos' },
  enviarFotos: { pt: '+ Enviar fotos', en: '+ Upload photos' },
  fotosTxt: { pt: 'Suas ou de banco de imagens (Unsplash, Pexels — gratuitos). O assistente usa as dos passeios e estas.', en: 'Yours or from free image banks (Unsplash, Pexels). The assistant uses the tour photos and these.' },
  fotoEmUso: { pt: 'Esta foto está num criativo. Apagar mesmo assim?', en: 'This photo is used in a creative. Delete anyway?' },
  baixar: { pt: 'Baixar PNG', en: 'Download PNG' },
  outroTitulo: { pt: 'Outro título', en: 'Another title' },
  pedidoTitulo: { pt: 'Troque o título do criativo {id} por outra opção.', en: 'Give creative {id} a different title.' },
  semCriativo: { pt: 'Nenhum criativo ainda. Peça ao assistente: "faz um story do passeio de sábado".', en: 'No creatives yet. Ask the assistant: "make a story for Saturday’s tour".' },
  anunciosTxt: { pt: 'Planos de anúncio para você montar no Gerenciador de Anúncios da Meta. Quem liga e paga é você.', en: 'Ad plans for you to set up in Meta Ads Manager. You switch them on and pay — never the assistant.' },
  pedirAnuncio: { pt: '✦ Pedir um plano', en: '✦ Ask for a plan' },
  pedidoAnuncio: { pt: 'Monte um plano de anúncio para a saída com mais vaga sobrando nas próximas semanas.', en: 'Build an ad plan for the departure with the most empty seats in the coming weeks.' },
  subiMeta: { pt: 'Subi na Meta', en: 'It’s live on Meta' },
  noAr: { pt: '● no ar', en: '● live' },
  rascunho: { pt: 'rascunho', en: 'draft' },
  objetivo: { pt: 'Objetivo', en: 'Goal' },
  publico: { pt: 'Público', en: 'Audience' },
  verba: { pt: 'Verba', en: 'Budget' },
  porDia: { pt: '/dia', en: '/day' },
  dias: { pt: 'dias', en: 'days' },
  total: { pt: 'total', en: 'total' },
  paraEncher: { pt: 'Para encher', en: 'To fill' },
  fotoRot: { pt: 'Foto', en: 'Photo' },
  porque: { pt: 'Por quê', en: 'Why' },
  versao: { pt: 'Versão', en: 'Version' },
  botaoRot: { pt: 'Botão', en: 'Button' },
  semAnuncio: { pt: 'Nenhum plano de anúncio ainda.', en: 'No ad plans yet.' },
  coresTit: { pt: 'Cores dos criativos', en: 'Creative colours' },
  corPrincipal: { pt: 'Principal', en: 'Main' },
  corDestaque: { pt: 'Destaque', en: 'Accent' },
  corEscura: { pt: 'Escura', en: 'Dark' },
  corNeutra: { pt: 'Neutra', en: 'Neutral' },
  fontesTit: { pt: 'Fontes', en: 'Fonts' },
  fonteImpacto: { pt: 'League Spartan — impacto', en: 'League Spartan — impact' },
  fonteTexto: { pt: 'Montserrat — títulos e texto', en: 'Montserrat — headings and text' },
  vozTit: { pt: 'Sua voz', en: 'Your voice' },
  vozPh: { pt: 'Como você escreve: curto ou longo, com humor ou sério, o que você nunca diria. O assistente segue isto.', en: 'How you write: short or long, witty or serious, what you’d never say. The assistant follows this.' },
  frasesTit: { pt: 'Frases suas (uma por linha)', en: 'Your signature lines (one per line)' },
  proibidasTit: { pt: 'Palavras que o assistente nunca usa (separe por vírgula)', en: 'Words the assistant never uses (comma-separated)' },
  hashtagsTit: { pt: 'Hashtags fixas', en: 'Fixed hashtags' },
  salvar: { pt: 'Salvar', en: 'Save' },
  salvo: { pt: 'Salvo', en: 'Saved' },
  memoriaTxt: { pt: 'O que o assistente aprendeu com você. Ele lê isto antes de cada conversa.', en: 'What the assistant has learned from you. It reads this before every chat.' },
  ensinar: { pt: 'Ensinar algo novo', en: 'Teach something new' },
  ensinarPh: { pt: 'ex.: criança até 6 anos não paga', en: 'e.g. children under 6 go free' },
  guardar: { pt: 'Guardar', en: 'Save' },
  nadaGuardado: { pt: 'Nada guardado ainda.', en: 'Nothing saved yet.' },
  /* aba Atendimento */
  atendimento: { pt: 'Atendimento', en: 'Inbox' },
  inboxTxt: { pt: 'WhatsApp e Instagram num lugar só. O agente lê a pergunta, consulta as vagas de verdade e escreve a resposta no idioma do cliente.', en: 'WhatsApp and Instagram in one place. The agent reads the question, checks the real availability and writes the reply in the client’s language.' },
  inboxDemo: { pt: 'Demonstração: no app real, estas mensagens chegam do WhatsApp e do Instagram do guia.', en: 'Demo: in the real app, these messages arrive from the guide’s WhatsApp and Instagram.' },
  modoAprovar: { pt: 'Eu aprovo cada resposta', en: 'I approve every reply' },
  modoAuto: { pt: 'Automático', en: 'Automatic' },
  aprovar: { pt: 'Aprovar e enviar', en: 'Approve and send' },
  descartar: { pt: 'Descartar', en: 'Discard' },
  rascunhoIA: { pt: 'Resposta escrita pelo agente', en: 'Reply written by the agent' },
  paraVoce: { pt: 'Para você entender', en: 'So you know what it says' },
  enviada: { pt: 'Enviada', en: 'Sent' },
  enviadaAuto: { pt: 'Respondida sozinha', en: 'Answered automatically' },
  aguardando: { pt: 'aguardando você', en: 'waiting for you' },
  simular: { pt: '+ Simular mensagem nova', en: '+ Simulate a new message' },
  voltar: { pt: '← Conversas', en: '← Chats' },
  escolha: { pt: 'Escolha uma conversa.', en: 'Pick a chat.' },
  falta: { pt: 'Falta um dado que só você tem', en: 'Missing something only you know' },
  descartada: { pt: 'Resposta descartada', en: 'Reply discarded' },
  /* modo demonstração: os pedidos prontos */
  dVagasPede: { pt: 'Quais saídas estão com mais vaga nas próximas semanas?', en: 'Which departures have the most empty seats in the coming weeks?' },
  dVagasResp: { pt: 'As mais vazias:\n{lista}\n\nQuer que eu monte um post ou um anúncio para elas?', en: 'The emptiest ones:\n{lista}\n\nShall I make a post or an ad for them?' },
  dVagasNada: { pt: 'Nas próximas semanas todas as saídas estão cheias ou quase. Boa notícia.', en: 'Every departure in the coming weeks is full or nearly full. Good news.' },
  dPrecoPede: { pt: 'Sobe o preço de "{tour}" para {preco} €', en: 'Raise the price of "{tour}" to €{preco}' },
  dPrecoResp: { pt: 'Pronto: "{tour}" agora custa {preco} €. Reservas que já existem não mudam de valor.', en: 'Done: "{tour}" now costs €{preco}. Existing bookings keep their price.' },
  dPlanoPede: { pt: 'Monta o plano de postagem das próximas duas semanas', en: 'Build the post plan for the next two weeks' },
  dPlanoResp: { pt: 'Salvei {n} posts no plano, puxando as saídas com mais vaga. Estão em Marketing → Plano de postagem, com a legenda pronta para copiar.', en: 'I saved {n} posts to the plan, pushing the departures with the most empty seats. They’re in Marketing → Post plan, captions ready to copy.' },
  dP1Tema: { pt: '{tour}: o que quase ninguém repara', en: '{tour}: what almost nobody notices' },
  dP1Leg: { pt: 'Todo mundo passa por aqui olhando para cima. A melhor parte está na altura dos olhos.\n\n{tour} · {data}, {hora}. Grupo pequeno, no seu ritmo.\n\nReserva pelo link da bio.', en: 'Everyone walks past here looking up. The best part is at eye level.\n\n{tour} · {data}, {hora}. Small group, at your pace.\n\nBook via the link in bio.' },
  dP1Rot: { pt: '0–3 s: close num detalhe da rua, sem música. Fala: "Todo mundo passa por aqui olhando para cima."\n3–12 s: câmera desce até o detalhe. Fala: "E perde isto."\n12–20 s: você explicando em uma frase.\n20–25 s: chamada: "{data}, {hora}. Link na bio."', en: '0–3 s: close-up on a street detail, no music. Line: "Everyone walks past here looking up."\n3–12 s: camera tilts down to the detail. Line: "And misses this."\n12–20 s: you explaining in one sentence.\n20–25 s: call to action: "{data}, {hora}. Link in bio."' },
  dP2Tema: { pt: 'Story: sobram {livres} lugares em {data}', en: 'Story: {livres} seats left on {data}' },
  dP2Leg: { pt: '{data}, {hora}: sobram {livres} lugares no "{tour}". Responde este story que eu te mando o link.', en: '{data}, {hora}: {livres} seats left on "{tour}". Reply to this story and I’ll send you the link.' },
  dP3Tema: { pt: 'Carrossel: 3 coisas para saber antes do "{tour}"', en: 'Carousel: 3 things to know before "{tour}"' },
  dP3Leg: { pt: '1. Dura {dur}. Sapato confortável ajuda.\n2. O encontro é em: {encontro}.\n3. Grupo pequeno: dá para perguntar tudo.\n\nPróxima data: {data}, {hora}.', en: '1. It lasts {dur}. Comfortable shoes help.\n2. We meet at: {encontro}.\n3. Small group: ask me anything.\n\nNext date: {data}, {hora}.' },
  dStoryPede: { pt: 'Faz um story para a saída com mais vaga', en: 'Make a story for the departure with the most empty seats' },
  dStoryTexto: { pt: '{data} · {hora}. Sobram {livres} lugares.', en: '{data} · {hora}. {livres} seats left.' },
  dStoryRod: { pt: '{preco} € · link na bio', en: '€{preco} · link in bio' },
  dStoryResp: { pt: 'Story pronto em Marketing → Criativos, para baixar em PNG. Quer outro título?', en: 'Story ready in Marketing → Creatives, to download as PNG. Want a different title?' },
  dTextoPede: { pt: 'Faz um post só de texto explicando por que fazer o passeio com guia local', en: 'Make a text-only post on why to tour with a local guide' },
  dTextoTit: { pt: 'Por que ir com guia local?', en: 'Why go with a local guide?' },
  dTextoTexto: { pt: 'O mapa mostra onde ir. O guia mostra por que aquilo importa — e o que está fechado, lotado ou mudou desde o último guia de viagem.', en: 'The map shows where to go. A guide shows why it matters — and what’s closed, packed or has changed since the last guidebook.' },
  dTextoResp: { pt: 'Post pronto em Marketing → Criativos, com fundo na cor da marca.', en: 'Post ready in Marketing → Creatives, on a brand-colour background.' },
  dAnuncioPede: { pt: 'Monta um anúncio para encher a saída de {data}', en: 'Build an ad to fill the {data} departure' },
  dAnObj: { pt: 'Mensagens no WhatsApp', en: 'WhatsApp messages' },
  dAnPub: { pt: 'Quem vai viajar para {cidade} nas próximas semanas, 25–60 anos, interesse em viagem, cultura e fotografia; português, inglês e espanhol', en: 'People travelling to {cidade} in the coming weeks, aged 25–60, interested in travel, culture and photography; Portuguese, English and Spanish' },
  dAnPorque: { pt: 'É a saída com mais lugar vazio e a data está perto: verba pequena, curta, direto para conversa.', en: 'It’s the departure with the most empty seats and it’s close: small, short budget, straight to a chat.' },
  dAnT1: { pt: 'Ainda dá tempo', en: 'There’s still time' },
  dAnX1: { pt: '{tour} · {data}, {hora}. Grupo pequeno, no seu ritmo. Sobram {livres} lugares.', en: '{tour} · {data}, {hora}. Small group, at your pace. {livres} seats left.' },
  dAnT2: { pt: 'A cidade que o guia de bolso não mostra', en: 'The city the pocket guide won’t show you' },
  dAnX2: { pt: 'Em {data} eu levo um grupo pequeno pelo "{tour}". Pergunte o que quiser pelo WhatsApp.', en: 'On {data} I’m taking a small group on "{tour}". Ask me anything on WhatsApp.' },
  dAnBot: { pt: 'Enviar mensagem', en: 'Send message' },
  dAnuncioResp: { pt: 'Plano salvo em Marketing → Anúncios: {verba} € por dia durante 7 dias. Você monta no Gerenciador de Anúncios da Meta — eu não ligo nem pago nada.', en: 'Plan saved in Marketing → Ads: €{verba} a day for 7 days. You set it up in Meta Ads Manager — I never switch on or pay for anything.' },
  dBloqPede: { pt: 'Bloqueia o dia 25 de dezembro', en: 'Block 25 December' },
  dBloqResp: { pt: 'Bloqueado: nenhum passeio sai em 25/12. Se alguém já tinha reserva nesse dia, eu aviso aqui antes — o bloqueio não cancela ninguém.', en: 'Blocked: no tours on 25/12. If someone had already booked that day I’d flag it first — blocking never cancels anyone.' },
  dMemPede: { pt: 'Lembra: criança até 6 anos não paga', en: 'Remember: children under 6 go free' },
  dMemResp: { pt: 'Guardado na memória. Vou considerar isso em respostas e anúncios.', en: 'Saved to memory. I’ll take it into account in replies and ads.' },
  /* atendimento: respostas no idioma do cliente */
  aDisp: { pt: 'Oi, {nome}! Tem sim: {data}, às {hora}, sobram {livres} lugares no "{tour}". Custa {preco} € por pessoa. Te mando o link para reservar?', en: 'Hi {nome}! Yes: on {data} at {hora} there are {livres} seats left on "{tour}". It’s €{preco} per person. Shall I send you the booking link?' },
  aDispNao: { pt: 'Oi, {nome}! Essa data já está cheia. A próxima com lugar é {data}, às {hora} ({livres} lugares). Serve?', en: 'Hi {nome}! That date is full. The next one with space is {data} at {hora} ({livres} seats). Would that work?' },
  aPreco: { pt: 'Oi, {nome}! "{tour}" custa {preco} € {modo}. Próximas datas com lugar: {datas}. Quer que eu segure uma?', en: 'Hi {nome}! "{tour}" costs €{preco} {modo}. Next dates with space: {datas}. Shall I hold one for you?' },
  porPessoa: { pt: 'por pessoa', en: 'per person' },
  porSessao: { pt: 'pela sessão', en: 'per session' },
  aSemana: { pt: 'Oi, {nome}! Para {n} pessoas, estas datas têm lugar: {datas}. Qual prefere?', en: 'Hi {nome}! For {n} people, these dates have space: {datas}. Which do you prefer?' },
  aCrianca: { pt: 'Oi, {nome}! Criança é bem-vinda no "{tour}". [idade mínima e preço de criança] Próximas datas: {datas}.', en: 'Hi {nome}! Children are welcome on "{tour}". [minimum age and child price] Next dates: {datas}.' },
  aCriancaFalta: { pt: 'idade mínima e preço de criança', en: 'minimum age and child price' },
  aPagar: { pt: 'Oi, {nome}! Pode pagar com cartão pelo link da reserva. {politica} Te mando o link?', en: 'Hi {nome}! You can pay by card through the booking link. {politica} Shall I send it?' },
  polMetade: { pt: 'Paga metade para garantir a vaga e o resto até 30 dias antes.', en: 'You pay half to secure the seat and the rest up to 30 days before.' },
  polTudo: { pt: 'O valor é pago na reserva.', en: 'The full amount is paid when booking.' },
};

/* texto do assistente no idioma da tela: o escolhido, senão inglês, senão português */
function ia(k, vars) {
  const e = IA_TXT[k];
  let s = e ? (e[LANG] || (LANG !== 'pt' && e.en) || e.pt) : k;
  if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
  return s;
}
/* o mesmo texto num idioma escolhido (resposta ao cliente na língua dele) */
function iaEm(lang, k, vars) {
  const antes = LANG; LANG = lang;
  try { return ia(k, vars); } finally { LANG = antes; }
}
const naLingua = (lang, fn) => { const a = LANG; LANG = lang; try { return fn(); } finally { LANG = a; } };

/* ---------- dados do marketing e do atendimento ----------
   Protótipo: guardados neste navegador. No app de um cliente viram linhas
   no Supabase dele, para celular e laptop verem o mesmo. */
const MKT_KEY = 'guia_mkt';
const KIT_PADRAO = { cores: { principal: '#E8A33D', destaque: '#C4553B', escura: '#1E3A4C', neutra: '#6B6B73' },
  voz: '', frases: '', proibidas: 'imperdível, incrível, experiência única, o melhor', hashtags: '' };
const Mkt = {
  d: null,
  get() {
    if (!this.d) {
      this.d = Object.assign({ posts: [], anuncios: [], criativos: [], memoria: [], fotos: [], conversas: null, modoAuto: false }, iaLe(MKT_KEY, {}));
      this.d.kit = Object.assign({}, KIT_PADRAO, this.d.kit || {});
      this.d.kit.cores = Object.assign({}, KIT_PADRAO.cores, (this.d.kit && this.d.kit.cores) || {});
    }
    return this.d;
  },
  salva() {
    if (iaGrava(MKT_KEY, this.get())) return true;
    toast(ia('semEspaco')); return false;
  },
};

/* ---------- ajudantes ---------- */
const nomeTour = (x) => x ? tl(x.name) : '?';
const hojeIso = () => isoToday();
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const nomeDia = (d) => new Date(2026, 0, 4 + d).toLocaleDateString(locale(), { weekday: 'short' }).replace('.', '');
const dataCurta = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' }) : '';
const dataLonga = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }) : '';
const isoOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const FORMATOS_POST = ['post', 'carrossel', 'reel', 'story'];
const CORES_NOMES = ['principal', 'destaque', 'escura', 'neutra'];
const corDe = (n) => Mkt.get().kit.cores[n] || Mkt.get().kit.cores.principal;
const FORMATOS_CRIATIVO = { story: [1080, 1920], post: [1080, 1080], flyer: [1080, 1350] };
/* texto escuro sobre cor clara, branco sobre cor escura */
function tintaSobre(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1b1b1b' : '#ffffff';
}

/* fotos que existem no app: capa e paradas de cada passeio + as enviadas */
function iaFotos() {
  const out = [];
  for (const x of Tours.all()) {
    if (x.photo) out.push({ ref: x.id + '-capa', src: x.photo, passeio: nomeTour(x), onde: 'capa' });
    (x.stops || []).forEach((s, i) => {
      if (s && s.ph) out.push({ ref: `${x.id}-parada-${i + 1}`, src: s.ph, passeio: nomeTour(x), onde: 'parada ' + (i + 1) + (s.n ? ': ' + tl(s.n) : '') });
    });
  }
  for (const f of Mkt.get().fotos) out.push({ ref: f.id, src: f.src, passeio: null, onde: (f.ia ? 'imagem gerada por IA: ' : '') + (f.nome || 'foto enviada'), ia: !!f.ia });
  return out;
}
const fotoSrc = (ref) => (iaFotos().find(f => f.ref === ref) || {}).src;
function guardaFoto(src, nome) {
  const f = { id: 'foto-' + uid(), src, nome: nome || 'foto enviada', criado: hojeIso() };
  Mkt.get().fotos.unshift(f);
  if (!Mkt.salva()) { Mkt.get().fotos.shift(); return null; }
  return f;
}

/* ---------- imagem por IA: Gemini, com a chave do guia (fica só no aparelho) ---------- */
const IMG_CHAVE = 'guia_gemini_chave';
const IMG_MODELOS = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'];
const PROPORCAO = { story: '9:16', post: '1:1', flyer: '4:5' };
const imgChave = () => { try { return (localStorage.getItem(IMG_CHAVE) || '').trim(); } catch (e) { return ''; } };
async function geraImagemIA(descricao, formato, chave) {
  chave = chave || imgChave();
  if (!chave) throw new Error(ia('imgSemChave'));
  let ultimo = '';
  for (const modelo of IMG_MODELOS) {
    for (const comProporcao of [true, false]) {
      const corpo = { contents: [{ parts: [{ text: descricao + '. No text, no letters, no logos, no watermark.' }] }],
        generationConfig: { responseModalities: ['IMAGE'], ...(comProporcao ? { imageConfig: { aspectRatio: PROPORCAO[formato] || '1:1' } } : {}) } };
      let r;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, { method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': chave }, body: JSON.stringify(corpo) });
      } catch (e) { throw new Error(ia('eRede')); }
      const j = await r.json().catch(() => null);
      if (r.ok) {
        const parte = ((j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).find(p => p.inlineData || p.inline_data);
        const d = parte && (parte.inlineData || parte.inline_data);
        if (d && d.data) return `data:${d.mimeType || d.mime_type || 'image/png'};base64,${d.data}`;
        throw new Error(ia('imgRecusou'));
      }
      const msg = (j && j.error && j.error.message) || '';
      if (/API key|API_KEY/i.test(msg) || r.status === 401 || r.status === 403) throw new Error(ia('imgChaveRuim'));
      if (r.status === 429) throw new Error(ia('imgCota'));
      if (r.status === 400 && comProporcao) { ultimo = msg; continue; }   /* modelo sem proporção: tenta sem */
      ultimo = `Gemini ${r.status}. ${msg}`; break;                       /* 404 = modelo não existe: o próximo */
    }
  }
  throw new Error(ultimo || ia('imgRecusou'));
}
/* reduz para JPEG — PNG de 1–2 MB enche o aparelho em poucas imagens */
function reduzImagem(src, lado) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => { const k = Math.min(1, (lado || 1600) / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.86)); };
    img.onerror = () => falha(new Error(ia('eFoto'))); img.src = src;
  });
}
async function geraEGuarda(descricao, formato) {
  const bruta = await geraImagemIA(descricao, formato);
  const f = guardaFoto(await reduzImagem(bruta, 1600), 'IA: ' + descricao.slice(0, 60));
  if (!f) throw new Error(ia('semEspaco'));
  f.ia = true; Mkt.salva();
  return f;
}

/* saídas das próximas semanas, das mais vazias para as mais cheias */
function saidasVazias(dias) {
  const de = addDays(hojeIso(), 1), ate = addDays(de, dias || 30), out = [];
  for (const x of Tours.live()) for (const d of Cal.departures(x.id, de, ate)) {
    const livres = Cal.seatsLeft(x.id, d.date, d.time, d.capacity);
    if (livres > 0) out.push({ x, ...d, livres });
  }
  return out.sort((a, b) => (b.livres / b.capacity) - (a.livres / a.capacity) || a.date.localeCompare(b.date));
}

/* ---------- ferramentas ---------- */
const obj = (props, req) => ({ type: 'object', properties: props || {}, ...(req ? { required: req } : {}) });
const S_ = (d) => ({ type: 'string', ...(d ? { description: d } : {}) });
const N_ = (d) => ({ type: 'number', ...(d ? { description: d } : {}) });

const IA_FERRAMENTAS = [
  { name: 'ver_passeios', description: 'Passeios: id, preço, criança, grupo, publicado ou rascunho, encontro, duração e horários fixos (com id).', input_schema: obj() },
  { name: 'ver_agenda', description: 'Saídas de um período com vagas: capacidade, pagas, livres. Datas AAAA-MM-DD. Sem datas = próximos 30 dias.', input_schema: obj({ de: S_(), ate: S_(), passeio_id: S_() }) },
  { name: 'ver_reservas', description: 'Reservas por data do passeio: cliente, idioma, passeio, data, hora, pessoas, situação, total e pago.', input_schema: obj({ de: S_(), ate: S_() }) },
  { name: 'ver_cupons', description: 'Cupons existentes.', input_schema: obj() },
  { name: 'ver_bloqueios', description: 'Períodos bloqueados na agenda.', input_schema: obj() },
  { name: 'ver_fotos', description: 'Fotos disponíveis para criativos, com a ref de cada uma.', input_schema: obj() },
  { name: 'ver_marketing', description: 'Plano de postagem (mês AAAA-MM opcional), anúncios e criativos salvos.', input_schema: obj({ mes: S_() }) },
  { name: 'criar_passeio', description: 'Cria passeio novo como RASCUNHO.', input_schema: obj({ nome: S_(), descricao: S_(), preco: N_(), por: { type: 'string', enum: ['pessoa', 'sessao'] }, min: { type: 'integer' }, max: { type: 'integer' }, duracao: S_(), ponto_encontro: S_() }, ['nome', 'preco']) },
  { name: 'alterar_passeio', description: 'Altera nome, descrição, encontro, duração, grupo ou publicação de um passeio.', input_schema: obj({ passeio_id: S_(), nome: S_(), descricao: S_(), ponto_encontro: S_(), duracao: S_(), min: { type: 'integer' }, max: { type: 'integer' }, publicado: { type: 'boolean' } }, ['passeio_id']) },
  { name: 'mudar_preco', description: 'Muda o preço (adulto e/ou criança) de um passeio.', input_schema: obj({ passeio_id: S_(), preco: N_(), preco_crianca: N_() }, ['passeio_id']) },
  { name: 'adicionar_horario', description: 'Adiciona horário fixo: dias da semana, hora, vagas, período.', input_schema: obj({ passeio_id: S_(), dias: { type: 'array', items: { type: 'string', enum: DIAS } }, hora: S_('HH:MM'), vagas: { type: 'integer' }, de: S_(), ate: S_() }, ['passeio_id', 'dias', 'hora']) },
  { name: 'remover_horario', description: 'Remove um horário fixo (id de ver_passeios).', input_schema: obj({ horario_id: S_() }, ['horario_id']) },
  { name: 'bloquear_datas', description: 'Bloqueia um período: nenhum passeio sai. Não cancela reservas.', input_schema: obj({ de: S_(), ate: S_(), motivo: S_() }, ['de']) },
  { name: 'liberar_datas', description: 'Remove um bloqueio (id de ver_bloqueios).', input_schema: obj({ bloqueio_id: S_() }, ['bloqueio_id']) },
  { name: 'criar_cupom', description: 'Cria cupom de desconto em %.', input_schema: obj({ codigo: S_(), desconto: N_(), validade: S_(), uma_vez_por_pessoa: { type: 'boolean' } }, ['codigo', 'desconto']) },
  { name: 'apagar_cupom', description: 'Apaga um cupom.', input_schema: obj({ codigo: S_() }, ['codigo']) },
  { name: 'salvar_posts', description: 'Salva itens no plano de postagem, com legenda pronta (e roteiro se for reel).', input_schema: obj({ itens: { type: 'array', items: obj({ data: S_(), formato: { type: 'string', enum: FORMATOS_POST }, tema: S_(), passeio_id: S_(), legenda: S_(), roteiro: S_() }, ['data', 'formato', 'tema']) } }, ['itens']) },
  { name: 'mudar_post', description: 'Muda um item do plano.', input_schema: obj({ post_id: S_(), data: S_(), formato: { type: 'string', enum: FORMATOS_POST }, tema: S_(), legenda: S_(), roteiro: S_(), situacao: { type: 'string', enum: ['ideia', 'pronto', 'postado'] } }, ['post_id']) },
  { name: 'apagar_post', description: 'Apaga um item do plano.', input_schema: obj({ post_id: S_() }, ['post_id']) },
  { name: 'salvar_anuncio', description: 'Salva um plano de anúncio (Meta) para o guia montar.', input_schema: obj({ titulo: S_(), objetivo: S_(), publico: S_(), verba_dia: N_(), duracao_dias: { type: 'integer' }, datas_alvo: S_(), passeio_id: S_(), textos: { type: 'array', items: obj({ titulo: S_(), texto: S_(), chamada: S_() }) }, foto: S_(), porque: S_() }, ['titulo', 'objetivo', 'publico', 'verba_dia', 'textos']) },
  { name: 'apagar_anuncio', description: 'Apaga um plano de anúncio.', input_schema: obj({ anuncio_id: S_() }, ['anuncio_id']) },
  { name: 'criar_criativo', description: 'Criativo no molde da marca (nunca imagem de IA): story 1080×1920, post 1080×1080, flyer 1080×1350. foto = ref de ver_fotos, ou "nenhuma" para fundo na cor da marca com texto.', input_schema: obj({ formato: { type: 'string', enum: Object.keys(FORMATOS_CRIATIVO) }, foto: S_(), titulo: S_(), texto: S_(), rodape: S_(), cor: { type: 'string', enum: CORES_NOMES } }, ['formato', 'foto', 'titulo']) },
  { name: 'mudar_criativo', description: 'Muda um criativo salvo.', input_schema: obj({ criativo_id: S_(), formato: { type: 'string', enum: Object.keys(FORMATOS_CRIATIVO) }, foto: S_(), titulo: S_(), texto: S_(), rodape: S_(), cor: { type: 'string', enum: CORES_NOMES } }, ['criativo_id']) },
  { name: 'apagar_criativo', description: 'Apaga um criativo.', input_schema: obj({ criativo_id: S_() }, ['criativo_id']) },
  { name: 'gerar_imagem', description: 'Gera uma imagem por IA (Gemini) para fundo, ilustração, conceito ou textura — nunca para fingir foto de um lugar real, do passeio ou de pessoas. Descreva em inglês, sem texto na imagem. Fica em Suas fotos com o selo IA; a ref volta no resultado para usar em criar_criativo.',
    input_schema: obj({ descricao: S_('em inglês'), formato: { type: 'string', enum: Object.keys(FORMATOS_CRIATIVO) } }, ['descricao']) },
  { name: 'guardar_memoria', description: 'Guarda uma regra ou preferência que vale para sempre.', input_schema: obj({ texto: S_() }, ['texto']) },
  { name: 'apagar_memoria', description: 'Apaga um item da memória.', input_schema: obj({ memoria_id: S_() }, ['memoria_id']) },
];
const IA_LEITURA = new Set(['ver_passeios', 'ver_agenda', 'ver_reservas', 'ver_cupons', 'ver_bloqueios', 'ver_fotos', 'ver_marketing']);

function iaLeitura(nome, i) {
  if (nome === 'ver_passeios') return Tours.all().map(x => ({
    id: x.id, nome: nomeTour(x), publicado: x.status !== 'draft', preco: +x.price || 0,
    por: x.priceMode === 'session' ? 'sessão' : 'pessoa', preco_crianca: +x.priceChild || 0,
    grupo: { min: +x.min || 0, max: +x.max || 0 }, duracao: x.duration || null, ponto_encontro: tl(x.meeting),
    horarios: Cal.rulesFor(x.id).map(r => ({ id: r.id, dias: r.weekdays.map(nomeDia).join(', '), hora: r.time, vagas: r.capacity, de: r.from, ate: r.until })) }));
  if (nome === 'ver_agenda') {
    const de = i.de || hojeIso(), ate = i.ate || addDays(de, 30), out = [];
    for (const x of (i.passeio_id ? [Tours.get(i.passeio_id)].filter(Boolean) : Tours.all()))
      for (const d of Cal.departures(x.id, de, ate)) {
        const livres = Cal.seatsLeft(x.id, d.date, d.time, d.capacity);
        out.push({ passeio: nomeTour(x), passeio_id: x.id, data: d.date, hora: d.time, capacidade: d.capacity, pagas: d.capacity - livres, livres });
      }
    return out.length ? out.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)) : 'nenhuma saída neste período';
  }
  if (nome === 'ver_reservas') {
    const de = i.de || hojeIso(), ate = i.ate || '9999-12-31';
    const l = DB.bookings.filter(b => b.date >= de && b.date <= ate).slice(0, 60).map(b => ({
      codigo: b.code, cliente: b.name, idioma: b.lang || null, passeio: nomeTour(Tours.get(b.tourId)), data: b.date, hora: b.time,
      pessoas: b.pax, situacao: b.status, total: b.total, pago: Bookings.paid(b) }));
    return l.length ? l : 'nenhuma reserva neste período';
  }
  if (nome === 'ver_cupons') return DB.coupons.length ? DB.coupons.map(c => ({ codigo: c.code, desconto: c.pct + '%', validade: c.until })) : 'nenhum cupom';
  if (nome === 'ver_bloqueios') return DB.blocks.length ? DB.blocks.map(b => ({ id: b.id, de: b.from, ate: b.until, motivo: b.note || '' })) : 'nenhum bloqueio';
  if (nome === 'ver_fotos') return iaFotos().map(({ ref, passeio, onde, ia: gerada }) => ({ ref, passeio, onde, gerada_por_ia: !!gerada }));
  if (nome === 'ver_marketing') {
    const m = Mkt.get();
    return { posts: m.posts.filter(p => i.mes ? p.data.startsWith(i.mes) : p.data >= hojeIso()), anuncios: m.anuncios,
      criativos: m.criativos.map(c => ({ id: c.id, formato: c.formato, titulo: c.titulo, foto: c.fotoRef })) };
  }
}

/* ---------- gravação: primeiro o plano (o cartão), depois a ação ---------- */
const E_ = (erro) => ({ erro });
function iaPlano(nome, i) {
  const m = Mkt.get();
  if (nome === 'criar_passeio') {
    const preco = +i.preco; if (!i.nome || !(preco > 0)) return E_('faltou nome ou preço');
    const porSessao = i.por === 'sessao';
    const min = Math.max(1, +i.min || (porSessao ? 1 : 2)), max = Math.max(min, +i.max || (porSessao ? 4 : 12));
    return { titulo: ia('cCriarPasseio'), assumiu: (!i.min || !i.max) ? [`${ia('cGrupo')} ${min}–${max}`] : [],
      linhas: [[ia('cNome'), i.nome], [ia('cPreco'), `${eur(preco)} ${ia(porSessao ? 'cPorSessao' : 'cPorPessoa')}`], [ia('cGrupo'), `${min}–${max}`]],
      fazer: () => { const nt = Tours.create({ type: 'walk', region: (regioes()[0] || ['cidade'])[0], name: { pt: i.nome, en: i.nome },
        desc: { pt: i.descricao || '', en: '' }, meeting: i.ponto_encontro || '', duration: i.duracao || '', photo: 'capa.jpg',
        price: preco, priceMode: porSessao ? 'session' : 'pp', min, max, payPolicy: 'split', status: 'draft' }); return { ok: true, passeio_id: nt.id }; } };
  }
  if (nome === 'alterar_passeio') {
    const x = Tours.get(i.passeio_id); if (!x) return E_('passeio não encontrado');
    const muda = {}, linhas = [[ia('xPasseio'), nomeTour(x)]];
    if (i.nome) { muda.name = { ...x.name, pt: i.nome }; linhas.push([ia('cNome'), i.nome]); }
    if (i.descricao) { muda.desc = { ...(x.desc || {}), pt: i.descricao }; linhas.push([ia('cDescricao'), i.descricao]); }
    if (i.ponto_encontro) { muda.meeting = typeof x.meeting === 'object' && x.meeting ? { ...x.meeting, pt: i.ponto_encontro } : i.ponto_encontro; linhas.push([ia('cEncontro'), i.ponto_encontro]); }
    if (i.duracao) { muda.duration = i.duracao; linhas.push([ia('cDuracao'), i.duracao]); }
    if (i.min || i.max) { muda.min = +i.min || +x.min; muda.max = +i.max || +x.max; if (muda.max < muda.min) return E_('máximo menor que mínimo'); linhas.push([ia('cGrupo'), `${muda.min}–${muda.max}`]); }
    if (typeof i.publicado === 'boolean') { muda.status = i.publicado ? 'live' : 'draft'; linhas.push([ia('cSite'), i.publicado ? '✓' : '—']); }
    if (linhas.length === 1) return E_('nada muda');
    return { titulo: ia('cAlterarPasseio'), linhas, assumiu: [], fazer: () => { Tours.update(x.id, muda); return { ok: true }; } };
  }
  if (nome === 'mudar_preco') {
    const x = Tours.get(i.passeio_id); if (!x) return E_('passeio não encontrado');
    const muda = {}, linhas = [[ia('xPasseio'), nomeTour(x)]];
    for (const [k, rot, v] of [['price', ia('cPreco'), i.preco], ['priceChild', ia('cCrianca'), i.preco_crianca]]) {
      if (v === undefined || v === null || v === '' || !(+v >= 0) || +v === (+x[k] || 0)) continue;
      muda[k] = +v; linhas.push([rot, `${eur(+x[k] || 0)} → ${eur(+v)}`]);
    }
    if (!Object.keys(muda).length) return E_('nada muda');
    if (muda.price === 0) return E_('preço zero não é permitido');
    return { titulo: ia('cMudarPreco'), linhas, assumiu: [], fazer: () => { Tours.update(x.id, muda); return { ok: true, mudou: muda }; } };
  }
  if (nome === 'adicionar_horario') {
    const x = Tours.get(i.passeio_id); if (!x) return E_('passeio não encontrado');
    const dias = [...new Set((i.dias || []).map(d => DIAS.indexOf(d)).filter(d => d >= 0))].sort();
    if (!dias.length) return E_('faltaram os dias'); if (!/^\d{1,2}:\d{2}$/.test(i.hora || '')) return E_('hora HH:MM');
    const hora = i.hora.padStart(5, '0'), de = isoOk(i.de) ? i.de : hojeIso(), ate = isoOk(i.ate) ? i.ate : addDays(de, 180), vagas = +i.vagas || +x.max || 12;
    return { titulo: ia('cAddHorario'), assumiu: [], linhas: [[ia('xPasseio'), nomeTour(x)], [ia('cDias'), dias.map(nomeDia).join(', ')], [ia('cHora'), hora], [ia('cVagas'), String(vagas)], [ia('cPeriodo'), `${dataCurta(de)} – ${dataCurta(ate)}`]],
      fazer: () => { const r = Cal.addRule({ tourId: x.id, weekdays: dias, time: hora, capacity: vagas, from: de, until: ate }); return { ok: true, horario_id: r.id }; } };
  }
  if (nome === 'remover_horario') {
    const r = DB.rules.find(r => r.id === i.horario_id); if (!r) return E_('horário não encontrado');
    return { titulo: ia('cRemHorario'), assumiu: [], linhas: [[ia('xPasseio'), nomeTour(Tours.get(r.tourId))], [ia('cHorario'), `${r.weekdays.map(nomeDia).join(', ')} · ${r.time}`]],
      fazer: () => { Cal.removeRule(r.id); return { ok: true }; } };
  }
  if (nome === 'bloquear_datas') {
    if (!isoOk(i.de)) return E_('data AAAA-MM-DD'); const ate = isoOk(i.ate) ? i.ate : i.de;
    const afetadas = DB.bookings.filter(b => b.date >= i.de && b.date <= ate && b.status !== 'cancelled').length;
    const linhas = [[ia('cPeriodo'), i.de === ate ? dataLonga(i.de) : `${dataCurta(i.de)} – ${dataCurta(ate)}`]];
    if (i.motivo) linhas.push([ia('cMotivo'), i.motivo]);
    if (afetadas) linhas.push(['⚠', ia('cReservasValem', { n: afetadas })]);
    return { titulo: ia('cBloquear'), linhas, assumiu: [], fazer: () => { const b = Cal.addBlock({ from: i.de, until: ate, note: i.motivo || '' }); return { ok: true, bloqueio_id: b.id }; } };
  }
  if (nome === 'liberar_datas') {
    const b = DB.blocks.find(b => b.id === i.bloqueio_id); if (!b) return E_('bloqueio não encontrado');
    return { titulo: ia('cLiberar'), assumiu: [], linhas: [[ia('cPeriodo'), `${dataCurta(b.from)} – ${dataCurta(b.until)}`]], fazer: () => { Cal.removeBlock(b.id); return { ok: true }; } };
  }
  if (nome === 'criar_cupom') {
    const code = String(i.codigo || '').toUpperCase().replace(/\s+/g, ''), pct = +i.desconto;
    if (!code || !(pct > 0 && pct <= 100)) return E_('código e desconto de 1 a 100%');
    if (DB.coupons.some(c => c.code.toUpperCase() === code)) return E_('já existe um cupom com esse código');
    const until = isoOk(i.validade) ? i.validade : addDays(hojeIso(), 90);
    return { titulo: ia('cCriarCupom'), assumiu: [], linhas: [[ia('cCodigo'), code], [ia('cDesconto'), pct + '%'], [ia('cValidade'), dataCurta(until)]],
      fazer: () => { Coupons.create({ code, pct, until, oncePerPerson: i.uma_vez_por_pessoa !== false, uses: [] }); return { ok: true }; } };
  }
  if (nome === 'apagar_cupom') {
    const c = DB.coupons.find(c => c.code.toUpperCase() === String(i.codigo || '').toUpperCase()); if (!c) return E_('cupom não encontrado');
    return { titulo: ia('cApagarCupom'), assumiu: [], linhas: [[ia('cCodigo'), c.code]], fazer: () => { Coupons.remove(c.code); return { ok: true }; } };
  }
  if (nome === 'salvar_posts') {
    const itens = (i.itens || []).filter(p => isoOk(p.data) && p.tema); if (!itens.length) return E_('nenhum item válido');
    return { titulo: `${ia('subPlano')}: ${itens.length}`, assumiu: [], linhas: itens.slice(0, 8).map(p => [dataCurta(p.data), `${p.formato} · ${p.tema}`]),
      fazer: () => { const novos = itens.map(p => ({ id: uid(), data: p.data, formato: FORMATOS_POST.includes(p.formato) ? p.formato : 'post', tema: p.tema,
        passeio_id: p.passeio_id || null, legenda: p.legenda || '', roteiro: p.roteiro || '', situacao: 'ideia' }));
        m.posts.push(...novos); Mkt.salva(); return { ok: true, ids: novos.map(p => p.id) }; } };
  }
  if (nome === 'mudar_post') {
    const p = m.posts.find(p => p.id === i.post_id); if (!p) return E_('item não encontrado');
    const muda = {}; for (const k of ['data', 'formato', 'tema', 'legenda', 'roteiro', 'situacao']) if (i[k] && i[k] !== p[k]) muda[k] = i[k];
    if (!Object.keys(muda).length) return E_('nada muda');
    return { titulo: ia('cMudarPost'), assumiu: [], linhas: [[ia('cItem'), p.tema], ...Object.keys(muda).map(k => [k, String(muda[k]).slice(0, 80)])],
      fazer: () => { Object.assign(p, muda); Mkt.salva(); return { ok: true }; } };
  }
  if (nome === 'apagar_post') {
    const p = m.posts.find(p => p.id === i.post_id); if (!p) return E_('item não encontrado');
    return { titulo: ia('apagar'), assumiu: [], linhas: [[ia('cItem'), p.tema]], fazer: () => { m.posts = m.posts.filter(x => x !== p); Mkt.salva(); return { ok: true }; } };
  }
  if (nome === 'salvar_anuncio') {
    if (!(+i.verba_dia > 0)) return E_('verba por dia'); const dur = +i.duracao_dias || 7;
    return { titulo: ia('subAnuncios'), assumiu: [], linhas: [['', i.titulo], [ia('objetivo'), i.objetivo], [ia('publico'), i.publico],
      [ia('verba'), `${eur(+i.verba_dia)}${ia('porDia')} · ${dur} ${ia('dias')} · ${ia('total')} ${eur(+i.verba_dia * dur)}`]],
      fazer: () => { const a = { id: uid(), criado: hojeIso(), titulo: i.titulo, objetivo: i.objetivo, publico: i.publico, verba_dia: +i.verba_dia, duracao_dias: dur,
        datas_alvo: i.datas_alvo || '', passeio_id: i.passeio_id || null, textos: i.textos || [], fotoRef: i.foto || '', porque: i.porque || '', situacao: 'rascunho' };
        m.anuncios.unshift(a); Mkt.salva(); return { ok: true, anuncio_id: a.id }; } };
  }
  if (nome === 'apagar_anuncio') {
    const a = m.anuncios.find(a => a.id === i.anuncio_id); if (!a) return E_('anúncio não encontrado');
    return { titulo: ia('apagar'), assumiu: [], linhas: [['', a.titulo]], fazer: () => { m.anuncios = m.anuncios.filter(x => x !== a); Mkt.salva(); return { ok: true }; } };
  }
  if (nome === 'criar_criativo' || nome === 'mudar_criativo') {
    const antes = nome === 'mudar_criativo' ? m.criativos.find(c => c.id === i.criativo_id) : null;
    if (nome === 'mudar_criativo' && !antes) return E_('criativo não encontrado');
    const c = Object.assign({ formato: 'story', cor: 'principal', titulo: '', texto: '', rodape: '', fotoRef: 'nenhuma' }, antes || {});
    for (const k of ['formato', 'titulo', 'texto', 'rodape', 'cor']) if (i[k] !== undefined && i[k] !== null) c[k] = i[k];
    if (i.foto) c.fotoRef = i.foto;
    if (!FORMATOS_CRIATIVO[c.formato]) return E_('formato: story, post ou flyer');
    if (!CORES_NOMES.includes(c.cor)) c.cor = 'principal';
    if (c.fotoRef !== 'nenhuma' && !fotoSrc(c.fotoRef)) return E_('foto não encontrada — use ver_fotos, ou "nenhuma"');
    if (!c.titulo) return E_('faltou o título');
    const [w, h] = FORMATOS_CRIATIVO[c.formato];
    return { titulo: ia('subCriativos'), assumiu: [], linhas: [['', `${c.formato} ${w}×${h}`], [ia('fotoRot'), c.fotoRef === 'nenhuma' ? '—' : c.fotoRef], ['', c.titulo]],
      fazer: () => { if (antes) Object.assign(antes, c); else { c.id = uid(); c.criado = hojeIso(); m.criativos.unshift(c); } Mkt.salva(); return { ok: true, criativo_id: c.id }; } };
  }
  if (nome === 'apagar_criativo') {
    const c = m.criativos.find(c => c.id === i.criativo_id); if (!c) return E_('criativo não encontrado');
    return { titulo: ia('apagar'), assumiu: [], linhas: [['', c.titulo]], fazer: () => { m.criativos = m.criativos.filter(x => x !== c); Mkt.salva(); return { ok: true }; } };
  }
  if (nome === 'gerar_imagem') {
    if (!imgChave()) return E_(ia('imgSemChave'));
    const desc = String(i.descricao || '').trim(); if (!desc) return E_('faltou a descrição');
    const formato = FORMATOS_CRIATIVO[i.formato] ? i.formato : 'post';
    return { titulo: ia('imgTit'), assumiu: [], linhas: [['', desc], ['', `${formato} · ${PROPORCAO[formato]}`], ['Gemini', '≈ US$ 0,04']],
      fazer: async () => { const f = await geraEGuarda(desc, formato); return { ok: true, ref: f.id, aviso: 'use esta ref em criar_criativo' }; } };
  }
  if (nome === 'guardar_memoria') {
    const t = String(i.texto || '').trim(); if (!t) return E_('texto vazio');
    return { titulo: ia('subMemoria'), assumiu: [], linhas: [['', t]], fazer: () => { const x = { id: uid(), texto: t, criado: hojeIso() }; m.memoria.push(x); Mkt.salva(); return { ok: true, memoria_id: x.id }; } };
  }
  if (nome === 'apagar_memoria') {
    const x = m.memoria.find(x => x.id === i.memoria_id); if (!x) return E_('item não encontrado');
    return { titulo: ia('apagar'), assumiu: [], linhas: [['', x.texto]], fazer: () => { m.memoria = m.memoria.filter(y => y !== x); Mkt.salva(); return { ok: true }; } };
  }
  return E_('ferramenta desconhecida');
}
IA_TXT.xPasseio = { pt: 'Passeio', en: 'Tour', fr: 'Visite', it: 'Tour', de: 'Tour', es: 'Tour' };
/* rótulos dos cartões de confirmação, nas seis línguas */
IA_TXT.cCriarPasseio = { pt: "Criar passeio (rascunho)", en: "Create tour (draft)", fr: "Créer une visite (brouillon)", it: "Crea tour (bozza)", de: "Tour anlegen (Entwurf)", es: "Crear tour (borrador)" };
IA_TXT.cNome = { pt: "Nome", en: "Name", fr: "Nom", it: "Nome", de: "Name", es: "Nombre" };
IA_TXT.cPreco = { pt: "Preço", en: "Price", fr: "Prix", it: "Prezzo", de: "Preis", es: "Precio" };
IA_TXT.cGrupo = { pt: "Grupo", en: "Group", fr: "Groupe", it: "Gruppo", de: "Gruppe", es: "Grupo" };
IA_TXT.cPorPessoa = { pt: "/ pessoa", en: "/ person", fr: "/ personne", it: "/ persona", de: "/ Person", es: "/ persona" };
IA_TXT.cPorSessao = { pt: "/ sessão", en: "/ session", fr: "/ séance", it: "/ sessione", de: "/ Termin", es: "/ sesión" };
IA_TXT.cAlterarPasseio = { pt: "Alterar passeio", en: "Edit tour", fr: "Modifier la visite", it: "Modifica tour", de: "Tour bearbeiten", es: "Editar tour" };
IA_TXT.cDescricao = { pt: "Descrição", en: "Description", fr: "Description", it: "Descrizione", de: "Beschreibung", es: "Descripción" };
IA_TXT.cEncontro = { pt: "Encontro", en: "Meeting point", fr: "Point de rendez-vous", it: "Punto d’incontro", de: "Treffpunkt", es: "Punto de encuentro" };
IA_TXT.cDuracao = { pt: "Duração", en: "Duration", fr: "Durée", it: "Durata", de: "Dauer", es: "Duración" };
IA_TXT.cSite = { pt: "No site", en: "On the site", fr: "Sur le site", it: "Sul sito", de: "Auf der Website", es: "En el sitio" };
IA_TXT.cMudarPreco = { pt: "Mudar preço", en: "Change price", fr: "Modifier le prix", it: "Cambia prezzo", de: "Preis ändern", es: "Cambiar precio" };
IA_TXT.cCrianca = { pt: "Criança", en: "Child", fr: "Enfant", it: "Bambino", de: "Kind", es: "Niño" };
IA_TXT.cAddHorario = { pt: "Adicionar horário", en: "Add a time slot", fr: "Ajouter un horaire", it: "Aggiungi orario", de: "Termin hinzufügen", es: "Añadir horario" };
IA_TXT.cDias = { pt: "Dias", en: "Days", fr: "Jours", it: "Giorni", de: "Tage", es: "Días" };
IA_TXT.cHora = { pt: "Hora", en: "Time", fr: "Heure", it: "Ora", de: "Uhrzeit", es: "Hora" };
IA_TXT.cVagas = { pt: "Vagas", en: "Seats", fr: "Places", it: "Posti", de: "Plätze", es: "Plazas" };
IA_TXT.cPeriodo = { pt: "Período", en: "Period", fr: "Période", it: "Periodo", de: "Zeitraum", es: "Periodo" };
IA_TXT.cRemHorario = { pt: "Remover horário", en: "Remove time slot", fr: "Supprimer l’horaire", it: "Rimuovi orario", de: "Termin entfernen", es: "Quitar horario" };
IA_TXT.cHorario = { pt: "Horário", en: "Time slot", fr: "Horaire", it: "Orario", de: "Termin", es: "Horario" };
IA_TXT.cBloquear = { pt: "Bloquear agenda", en: "Block dates", fr: "Bloquer des dates", it: "Blocca date", de: "Tage sperren", es: "Bloquear fechas" };
IA_TXT.cMotivo = { pt: "Motivo", en: "Reason", fr: "Motif", it: "Motivo", de: "Grund", es: "Motivo" };
IA_TXT.cReservasValem = { pt: "{n} reserva(s) nessas datas continuam valendo", en: "{n} booking(s) on these dates remain valid", fr: "{n} réservation(s) à ces dates restent valables", it: "{n} prenotazione/i in queste date restano valide", de: "{n} Buchung(en) an diesen Tagen bleiben gültig", es: "{n} reserva(s) en esas fechas siguen válidas" };
IA_TXT.cLiberar = { pt: "Liberar agenda", en: "Unblock dates", fr: "Débloquer des dates", it: "Sblocca date", de: "Tage freigeben", es: "Desbloquear fechas" };
IA_TXT.cCriarCupom = { pt: "Criar cupom", en: "Create coupon", fr: "Créer un code promo", it: "Crea coupon", de: "Gutschein anlegen", es: "Crear cupón" };
IA_TXT.cCodigo = { pt: "Código", en: "Code", fr: "Code", it: "Codice", de: "Code", es: "Código" };
IA_TXT.cDesconto = { pt: "Desconto", en: "Discount", fr: "Réduction", it: "Sconto", de: "Rabatt", es: "Descuento" };
IA_TXT.cValidade = { pt: "Validade", en: "Valid until", fr: "Valable jusqu’au", it: "Valido fino al", de: "Gültig bis", es: "Válido hasta" };
IA_TXT.cApagarCupom = { pt: "Apagar cupom", en: "Delete coupon", fr: "Supprimer le code", it: "Elimina coupon", de: "Gutschein löschen", es: "Borrar cupón" };
IA_TXT.cMudarPost = { pt: "Mudar item do plano", en: "Edit plan item", fr: "Modifier l’élément du plan", it: "Modifica elemento del piano", de: "Planeintrag ändern", es: "Cambiar elemento del plan" };
IA_TXT.cItem = { pt: "Item", en: "Item", fr: "Élément", it: "Elemento", de: "Eintrag", es: "Elemento" };

/* o que é extra: o app de reservas é a base; os agentes são módulos à parte */
IA_TXT.aDispSem = { pt: 'Oi, {nome}! No sábado não tem saída. A próxima com lugar é "{tour}", {data}, às {hora} ({livres} lugares). Serve?',
  en: 'Hi {nome}! There’s no departure on Saturday. The next one with space is "{tour}", {data} at {hora} ({livres} seats). Would that work?',
  fr: 'Bonjour {nome} ! Il n’y a pas de départ samedi. Le prochain avec de la place : « {tour} », {data} à {hora} ({livres} places). Cela vous convient ?',
  it: 'Ciao {nome}! Sabato non ci sono partenze. La prossima con posti liberi è "{tour}", {data} alle {hora} ({livres} posti). Ti va bene?',
  de: 'Hallo {nome}! Am Samstag gibt es keinen Termin. Der nächste mit freien Plätzen: „{tour}“, {data} um {hora} ({livres} Plätze). Passt das?',
  es: '¡Hola, {nome}! El sábado no hay salida. La próxima con plazas es "{tour}", {data} a las {hora} ({livres} plazas). ¿Te va bien?' };
/* imagem por IA (Gemini, com a chave do próprio guia) */
IA_TXT.imgTit = { pt: 'Imagem por IA', en: 'AI image', fr: 'Image par IA', it: 'Immagine con IA', de: 'KI-Bild', es: 'Imagen con IA' };
IA_TXT.imgTxt = { pt: 'Para fundo, ilustração e conceito. Para mostrar lugar e passeio, use foto de verdade.', en: 'For backgrounds, illustrations and concepts. To show places and tours, use real photos.',
  fr: 'Pour les fonds, illustrations et concepts. Pour montrer un lieu ou une visite, utilisez une vraie photo.', it: 'Per sfondi, illustrazioni e concetti. Per mostrare luoghi e tour, usate foto vere.',
  de: 'Für Hintergründe, Illustrationen und Ideen. Für Orte und Touren echte Fotos verwenden.', es: 'Para fondos, ilustraciones y conceptos. Para mostrar lugares y tours, usa fotos reales.' };
IA_TXT.imgPh = { pt: 'ex.: vinhedos no outono em aquarela, sem pessoas', en: 'e.g. autumn vineyards in watercolour, no people', fr: 'ex. : vignes en automne à l’aquarelle, sans personnages',
  it: 'es.: vigneti in autunno ad acquerello, senza persone', de: 'z. B. Weinberge im Herbst als Aquarell, ohne Menschen', es: 'ej.: viñedos en otoño en acuarela, sin personas' };
IA_TXT.imgGerar = { pt: '✦ Gerar', en: '✦ Generate', fr: '✦ Générer', it: '✦ Genera', de: '✦ Erzeugen', es: '✦ Generar' };
IA_TXT.imgGerando = { pt: 'Gerando a imagem…', en: 'Generating the image…', fr: 'Génération de l’image…', it: 'Sto generando l’immagine…', de: 'Bild wird erzeugt…', es: 'Generando la imagen…' };
IA_TXT.imgPronta = { pt: 'Imagem pronta — está em Suas fotos.', en: 'Image ready — it’s in Your photos.', fr: 'Image prête — elle est dans Vos photos.', it: 'Immagine pronta — è in Le vostre foto.', de: 'Bild fertig — es ist unter Ihre Fotos.', es: 'Imagen lista — está en Tus fotos.' };
IA_TXT.imgConectaTxt = { pt: 'Para gerar imagens, conecte o Gemini (Google): entre em aistudio.google.com, toque em "Get API key", crie a chave e cole aqui. Ela fica só neste aparelho. Cada imagem custa alguns centavos na sua conta Google.',
  en: 'To generate images, connect Gemini (Google): go to aistudio.google.com, tap "Get API key", create a key and paste it here. It stays on this device only. Each image costs a few cents on your Google account.',
  fr: 'Pour générer des images, connectez Gemini (Google) : allez sur aistudio.google.com, touchez « Get API key », créez la clé et collez-la ici. Elle reste sur cet appareil. Chaque image coûte quelques centimes sur votre compte Google.',
  it: 'Per generare immagini, collegate Gemini (Google): andate su aistudio.google.com, toccate "Get API key", create la chiave e incollatela qui. Resta solo su questo dispositivo. Ogni immagine costa pochi centesimi sul vostro account Google.',
  de: 'Um Bilder zu erzeugen, verbinden Sie Gemini (Google): aistudio.google.com öffnen, auf „Get API key“ tippen, Schlüssel erstellen und hier einfügen. Er bleibt nur auf diesem Gerät. Jedes Bild kostet ein paar Cent auf Ihrem Google-Konto.',
  es: 'Para generar imágenes, conecta Gemini (Google): entra en aistudio.google.com, toca "Get API key", crea la clave y pégala aquí. Se queda solo en este dispositivo. Cada imagen cuesta unos céntimos en tu cuenta de Google.' };
IA_TXT.imgConectar = { pt: 'Conectar', en: 'Connect', fr: 'Connecter', it: 'Collega', de: 'Verbinden', es: 'Conectar' };
IA_TXT.imgTrocar = { pt: 'Trocar a chave do Gemini', en: 'Change the Gemini key', fr: 'Changer la clé Gemini', it: 'Cambia la chiave Gemini', de: 'Gemini-Schlüssel ändern', es: 'Cambiar la clave de Gemini' };
IA_TXT.imgSemChave = { pt: 'O gerador de imagem ainda não está conectado (Marketing → Criativos → Imagem por IA).', en: 'The image generator isn’t connected yet (Marketing → Creatives → AI image).',
  fr: 'Le générateur d’images n’est pas encore connecté (Marketing → Créations → Image par IA).', it: 'Il generatore di immagini non è ancora collegato (Marketing → Creatività → Immagine con IA).',
  de: 'Der Bildgenerator ist noch nicht verbunden (Marketing → Creatives → KI-Bild).', es: 'El generador de imágenes aún no está conectado (Marketing → Creatividades → Imagen con IA).' };
IA_TXT.imgChaveRuim = { pt: 'O Google não aceitou a chave. Confira se colou inteira.', en: 'Google did not accept the key. Check you pasted all of it.', fr: 'Google n’a pas accepté la clé. Vérifiez qu’elle est complète.',
  it: 'Google non ha accettato la chiave. Controllate di averla incollata tutta.', de: 'Google hat den Schlüssel nicht akzeptiert. Bitte vollständig einfügen.', es: 'Google no aceptó la clave. Comprueba que la pegaste entera.' };
IA_TXT.imgCota = { pt: 'A cota do Gemini acabou por agora. Tente mais tarde ou ative o faturamento na conta Google.', en: 'The Gemini quota is used up for now. Try later or enable billing on the Google account.',
  fr: 'Le quota Gemini est épuisé pour l’instant. Réessayez plus tard ou activez la facturation Google.', it: 'La quota Gemini è esaurita per ora. Riprovate più tardi o attivate la fatturazione Google.',
  de: 'Das Gemini-Kontingent ist vorerst aufgebraucht. Später erneut versuchen oder Abrechnung bei Google aktivieren.', es: 'La cuota de Gemini se agotó por ahora. Prueba más tarde o activa la facturación en Google.' };
IA_TXT.imgRecusou = { pt: 'O Gemini não gerou a imagem. Tente descrever de outro jeito.', en: 'Gemini didn’t generate the image. Try describing it differently.', fr: 'Gemini n’a pas généré l’image. Essayez une autre description.',
  it: 'Gemini non ha generato l’immagine. Provate a descriverla diversamente.', de: 'Gemini hat kein Bild erzeugt. Beschreiben Sie es anders.', es: 'Gemini no generó la imagen. Prueba a describirla de otra forma.' };
IA_TXT.dImgPede = { pt: 'Gera uma imagem de fundo para um post de outono', en: 'Generate a background image for an autumn post', fr: 'Génère une image de fond pour un post d’automne',
  it: 'Genera un’immagine di sfondo per un post d’autunno', de: 'Erzeuge ein Hintergrundbild für einen Herbst-Post', es: 'Genera una imagen de fondo para un post de otoño' };
IA_TXT.dImgTit = { pt: 'O outono chegou', en: 'Autumn is here', fr: 'L’automne est là', it: 'È arrivato l’autunno', de: 'Der Herbst ist da', es: 'Llegó el otoño' };
IA_TXT.dImgTexto = { pt: 'Menos gente, luz mais baixa, ruas mais calmas. A melhor época para andar sem pressa.', en: 'Fewer people, lower light, quieter streets. A good season to walk without hurry.',
  fr: 'Moins de monde, une lumière plus basse, des rues plus calmes. Une belle saison pour flâner.', it: 'Meno gente, luce più bassa, strade più tranquille. Una bella stagione per camminare senza fretta.',
  de: 'Weniger Leute, tieferes Licht, ruhigere Straßen. Eine gute Zeit, um ohne Eile zu gehen.', es: 'Menos gente, luz más baja, calles más tranquilas. Buena época para caminar sin prisa.' };
IA_TXT.dImgResp = { pt: 'Gerei a imagem com IA (está em Suas fotos, marcada "IA") e montei um post com ela em Marketing → Criativos.', en: 'I generated the image with AI (it’s in Your photos, tagged "AI") and made a post with it in Marketing → Creatives.',
  fr: 'J’ai généré l’image par IA (dans Vos photos, marquée « IA ») et créé un post avec elle dans Marketing → Créations.', it: 'Ho generato l’immagine con l’IA (è in Le vostre foto, con l’etichetta "IA") e ho creato un post in Marketing → Creatività.',
  de: 'Ich habe das Bild mit KI erzeugt (unter Ihre Fotos, markiert „KI“) und damit einen Post unter Marketing → Creatives erstellt.', es: 'Generé la imagen con IA (está en Tus fotos, marcada "IA") y armé un post con ella en Marketing → Creatividades.' };
IA_TXT.imgSelo = { pt: 'IA', en: 'AI', fr: 'IA', it: 'IA', de: 'KI', es: 'IA' };
IA_TXT.extra = { pt: 'extra', en: 'add-on', fr: 'option', it: 'extra', de: 'Zusatz', es: 'extra' };
IA_TXT.extraAviso = { pt: 'Módulo extra — contratado à parte do app de reservas.', en: 'Add-on module — purchased separately from the booking app.',
  fr: 'Module en option — acheté séparément de l’app de réservation.', it: 'Modulo extra — si acquista a parte rispetto all’app di prenotazione.',
  de: 'Zusatzmodul — separat zur Buchungs-App erhältlich.', es: 'Módulo extra — se contrata aparte de la app de reservas.' };

async function iaRodaFerramenta(nome, input) {
  input = input || {};
  try {
    if (IA_LEITURA.has(nome)) return iaLeitura(nome, input);
    const plano = iaPlano(nome, input);
    if (plano.erro) return plano;
    if (iaPerguntaAntes()) {
      if (!(await iaPedeConfirmacao(plano))) return { cancelado: true, aviso: 'cancelou; não grave nada e não insista' };
    } else iaCartaoFeito(plano);
    const r = await plano.fazer();
    iaRedesenhaTela();
    return r;
  } catch (e) { return E_(String(e && e.message || e)); }
}
function iaRedesenhaTela() {
  if (typeof route !== 'function') return;
  if (typeof isBusyEditing === 'function' && isBusyEditing()) return;
  const y = window.scrollY || 0; route(); scrollTo(0, y);
}

/* ---------- instruções do Claude de verdade ---------- */
function iaSistema() {
  const k = Mkt.get().kit, mem = Mkt.get().memoria;
  const lingua = (LANGS.find(l => l[0] === LANG) || [0, 0, 'Português'])[2];
  return [
    { type: 'text', cache_control: { type: 'ephemeral' }, text: `Você é o assistente de ${guiaNome()} (${guiaNegocio()}), guia de turismo baseado em ${guiaBase()}. Trabalha dentro do app de reservas: conhece os passeios, a agenda, as vagas e as reservas, e escreve como a equipe de marketing da casa.

## Regra absoluta
Você nunca fala com ninguém de fora: não contata cliente, não publica, não manda mensagem nem e-mail, não liga nem paga anúncio. Você escreve; quem envia e publica é o guia. Não existe ferramenta para mandar nada para fora — é de propósito.

## Gravar no app
Para criar ou mudar algo, chame a ferramenta direto: o app mostra o cartão de confirmação sozinho. Se cancelarem, não grave e não insista. Ler é livre. Vários itens do mesmo tipo: uma chamada só. Datas nas ferramentas em AAAA-MM-DD.

## Qualidade
Nunca invente data, preço, história, tradição ou regra. O que falta vira [colchete] e uma linha dizendo o que falta. Separe fato de lenda. Frases curtas, concretas; nada de texto turístico genérico. Se o texto poderia ter sido escrito por qualquer outro guia, não está pronto.
Palavras proibidas: ${k.proibidas || '—'}.
${k.voz ? 'A voz do guia, nas palavras dele: ' + k.voz : ''}
${k.frases ? 'Frases do guia (use com parcimônia, no máximo uma por peça):\n' + k.frases : ''}
${k.hashtags ? 'Hashtags fixas: ' + k.hashtags : ''}

## Peças
Legenda: primeira linha é gancho, nunca o nome do passeio; 2 a 4 parágrafos curtos; o prático numa linha; chamada simples; 3 a 5 hashtags.
Reel: cena por cena com tempo, imagem, fala literal e direção; gancho nos 3 primeiros segundos; 15 a 30 s.
Story: uma frase e uma imagem; urgência só com fato e data verdadeiros.
Resposta a cliente: na língua do cliente, começando pela resposta; concreta (data, hora, preço); termina com uma pergunta que facilita o próximo passo; junto, a versão no idioma do guia.
Plano de postagem: olhe a agenda; saída com vaga sobrando e data chegando puxa post antes; sem frequência pedida, três por semana. Salve com salvar_posts, legenda pronta.
Criativo: foto do app num molde (ver_fotos; a fotografia do próprio guia tem prioridade) ou "nenhuma" para fundo na cor da marca com texto explicativo.
Imagem por IA (gerar_imagem): permitida para fundo, ilustração, conceito ou textura. Nunca para representar um lugar real, o passeio ou pessoas como se fosse foto — isso engana o cliente. Quando usar, diga que a imagem foi gerada por IA.
Anúncio (Meta): objetivo, público, verba diária e duração com o porquê em uma linha, 2 a 3 versões de texto, qual foto. Ligue à agenda. Nunca prometa resultado. Salve com salvar_anuncio.

## Formato
Responda em ${lingua}, curto. Texto para copiar vem pronto, sem comentário em volta. Negrito com parcimônia; nada de tabelas.` },
    { type: 'text', text: `Hoje é ${hojeIso()}. Moeda: euro.` + (iaContexto() ? ` Tela aberta: ${iaContexto().txt}.` : '') +
      (mem.length ? '\n\n## Memória (o que o guia ensinou)\n' + mem.map(x => `- [${x.id}] ${x.texto}`).join('\n') : '') },
  ];
}

function iaTraduzErro(status, corpo) {
  const msg = (corpo && corpo.error && corpo.error.message) || '';
  if (status === 401) return ia('e401');
  if (status === 400 && /credit balance/i.test(msg)) return ia('eCredito');
  if (status === 429) return ia('e429');
  if (status === 529 || status === 503) return ia('eCheio');
  if (!status) return ia('eRede');
  return `Erro ${status}. ${msg}`.trim();
}
async function iaChamar(mensagens) {
  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': iaChave(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: IA_MODELO, max_tokens: 4000, system: iaSistema(), tools: IA_FERRAMENTAS, messages: mensagens }) });
  } catch (e) { throw new Error(iaTraduzErro(0)); }
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(iaTraduzErro(r.status, corpo));
  iaSomaGasto(corpo.usage);
  return corpo;
}
function iaSomaGasto(u) {
  if (!u) return;
  const p = IA_PRECO;
  iaGrava(IA_GASTO, (iaLe(IA_GASTO, 0) || 0) + ((u.input_tokens || 0) * p.in + (u.output_tokens || 0) * p.out
    + (u.cache_creation_input_tokens || 0) * p.in * p.cacheW + (u.cache_read_input_tokens || 0) * p.in * p.cacheR) / 1e6);
  iaMostraGasto();
}
const ehPergunta = (m) => m.role === 'user' && (typeof m.content === 'string' || (Array.isArray(m.content) && m.content.some(b => b.type === 'text') && !m.content.some(b => b.type === 'tool_result')));
function iaAparaHist(h) {
  let x = h.slice(-40);
  while (x.length && !ehPergunta(x[0])) x.shift();
  return x.map(m => Array.isArray(m.content) && m.content.some(b => b.type === 'image')
    ? { ...m, content: m.content.map(b => b.type === 'image' ? { type: 'text', text: '[foto]' } : b) } : m);
}

let iaOcupado = false;
async function iaConversa(texto, foto) {
  if (iaOcupado) return;
  iaOcupado = true; iaTravado(true);
  const hist = iaAparaHist(iaLe(IA_HIST, []));
  let nota = '';
  if (foto) { const f = guardaFoto(foto); if (f) nota = `\n\n[foto guardada; ref para criativo: ${f.id}]`; }
  const pergunta = texto || 'Escreva uma legenda para esta foto.';
  hist.push({ role: 'user', content: foto ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: foto.split(',')[1] } }, { type: 'text', text: pergunta + nota }] : pergunta });
  iaBolha('user', pergunta, null, false, foto);
  const pensando = iaBolha('pensa', ia('pensando'));
  try {
    for (let volta = 0; volta < IA_MAX_VOLTAS; volta++) {
      const resp = await iaChamar(hist);
      hist.push({ role: 'assistant', content: resp.content });
      const txt = resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      if (txt) iaBolha('assistant', txt, pensando);
      if (resp.stop_reason !== 'tool_use') break;
      const res = [];
      for (const b of resp.content.filter(b => b.type === 'tool_use')) res.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(await iaRodaFerramenta(b.name, b.input)) });
      hist.push({ role: 'user', content: res });
    }
    if (hist[hist.length - 1].role === 'user') { hist.pop(); hist.pop(); }
    iaGrava(IA_HIST, iaAparaHist(hist));
  } catch (e) { iaBolha('erro', e.message); }
  finally { pensando.remove(); iaOcupado = false; iaTravado(false); }
}

function iaReduzFoto(file, lado) {
  lado = lado || 1280;
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => falha(new Error(ia('eFoto')));
    img.src = URL.createObjectURL(file);
  });
}

/* =====================================================
   MODO DEMONSTRAÇÃO — pedidos prontos que rodam as ferramentas de verdade
===================================================== */
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
function iaCenarios() {
  /* as mais vazias, uma por passeio primeiro — lista com o mesmo passeio três vezes não diz nada */
  const primeiras = [], resto = [], vistos = new Set();
  for (const s of saidasVazias(30)) { if (vistos.has(s.x.id)) resto.push(s); else { vistos.add(s.x.id); primeiras.push(s); } }
  const vaz = [...primeiras, ...resto], top = vaz[0];
  const t1 = Tours.live()[0];
  const v = top ? { tour: nomeTour(top.x), data: dataLonga(top.date), hora: top.time, livres: top.livres, preco: top.x.price,
    dur: top.x.duration || '—', encontro: tl(top.x.meeting) || '—' } : null;
  const lista = [];
  lista.push({ id: 'vagas', pede: ia('dVagasPede'), passos: [['ver_agenda', {}]],
    resposta: () => vaz.length ? ia('dVagasResp', { lista: vaz.slice(0, 3).map(s => `• ${nomeTour(s.x)} — ${dataLonga(s.date)}, ${s.time}: ${ia('livres', { l: s.livres, c: s.capacity })}`).join('\n') }) : ia('dVagasNada') });
  if (t1) {
    const novo = Math.round((+t1.price || 30) * 1.1 / 5) * 5 || (+t1.price + 5);
    lista.push({ id: 'preco', pede: ia('dPrecoPede', { tour: nomeTour(t1), preco: novo }), passos: [['mudar_preco', { passeio_id: t1.id, preco: novo }]],
      resposta: () => ia('dPrecoResp', { tour: nomeTour(t1), preco: novo }) });
  }
  if (v) {
    const s2 = vaz[1] || top, s3 = vaz[2] || top;
    const d1 = addDays(hojeIso(), 2), d2 = addDays(hojeIso(), 5), d3 = addDays(hojeIso(), 9);
    lista.push({ id: 'plano', pede: ia('dPlanoPede'), passos: [['ver_agenda', {}], ['salvar_posts', { itens: [
      { data: d1, formato: 'reel', passeio_id: top.x.id, tema: ia('dP1Tema', v), legenda: ia('dP1Leg', v), roteiro: ia('dP1Rot', v) },
      { data: d2, formato: 'story', passeio_id: s2.x.id, tema: ia('dP2Tema', { data: dataCurta(s2.date), livres: s2.livres }),
        legenda: ia('dP2Leg', { data: dataLonga(s2.date), hora: s2.time, livres: s2.livres, tour: nomeTour(s2.x) }) },
      { data: d3, formato: 'carrossel', passeio_id: s3.x.id, tema: ia('dP3Tema', { tour: nomeTour(s3.x) }),
        legenda: ia('dP3Leg', { dur: s3.x.duration || '—', encontro: tl(s3.x.meeting) || '—', data: dataLonga(s3.date), hora: s3.time }) } ] }]],
      resposta: () => ia('dPlanoResp', { n: 3 }) });
    lista.push({ id: 'story', pede: ia('dStoryPede'), passos: [['ver_fotos', {}], ['criar_criativo', { formato: 'story', foto: top.x.id + '-capa',
      titulo: nomeTour(top.x), texto: ia('dStoryTexto', v), rodape: ia('dStoryRod', v), cor: 'principal' }]], resposta: () => ia('dStoryResp') });
    lista.push({ id: 'anuncio', pede: ia('dAnuncioPede', { data: dataCurta(top.date) }), passos: [['salvar_anuncio', {
      titulo: `${nomeTour(top.x)} — ${dataCurta(top.date)}`, objetivo: ia('dAnObj'), publico: ia('dAnPub', { cidade: guiaBase() || '—' }), verba_dia: 6, duracao_dias: 7,
      datas_alvo: `${dataLonga(top.date)}, ${top.time}`, passeio_id: top.x.id, foto: top.x.id + '-capa', porque: ia('dAnPorque'),
      textos: [{ titulo: ia('dAnT1'), texto: ia('dAnX1', v), chamada: ia('dAnBot') }, { titulo: ia('dAnT2'), texto: ia('dAnX2', v), chamada: ia('dAnBot') }] }]],
      resposta: () => ia('dAnuncioResp', { verba: 6 }) });
  }
  lista.push({ id: 'texto', pede: ia('dTextoPede'), passos: [['criar_criativo', { formato: 'post', foto: 'nenhuma', titulo: ia('dTextoTit'), texto: ia('dTextoTexto'), rodape: '@' + (DB.settings.insta || GUIA_CFG.insta || ''), cor: 'escura' }]],
    resposta: () => ia('dTextoResp') });
  if (imgChave()) lista.push({ id: 'imagem', pede: ia('dImgPede'), passos: [
    ['gerar_imagem', { descricao: 'soft watercolor autumn landscape, warm ochre and burgundy tones, gentle hills and vineyards, calm mood, no people', formato: 'post' }],
    ['criar_criativo', (ant) => ({ formato: 'post', foto: ant && ant.ref, titulo: ia('dImgTit'), texto: ia('dImgTexto'), cor: 'escura' })]],
    resposta: () => ia('dImgResp') });
  const natal = `${hojeIso().slice(0, 4)}-12-25`;
  if (!DB.blocks.some(b => natal >= b.from && natal <= b.until))
    lista.push({ id: 'bloq', pede: ia('dBloqPede'), passos: [['bloquear_datas', { de: natal, ate: natal }]], resposta: () => ia('dBloqResp') });
  lista.push({ id: 'mem', pede: ia('dMemPede'), passos: [['guardar_memoria', { texto: ia('dMemPede').replace(/^[^:]+:\s*/, '') }]], resposta: () => ia('dMemResp') });
  return lista;
}

async function iaRodaCenario(c) {
  if (iaOcupado) return;
  iaOcupado = true; iaTravado(true);
  iaBolha('user', c.pede);
  const pensando = iaBolha('pensa', ia('pensando'));
  try {
    await esperar(700);
    let anterior = null;
    for (const [nome, input] of c.passos) {
      const r = await iaRodaFerramenta(nome, typeof input === 'function' ? input(anterior) : input);
      anterior = r;
      if (r && r.cancelado) { pensando.remove(); iaBolha('assistant', ia('cancelado')); return; }
      if (r && r.erro) { pensando.remove(); iaBolha('erro', r.erro); return; }
      await esperar(350);
    }
    await esperar(400);
    iaBolha('assistant', c.resposta(), pensando, true);
  } finally { pensando.remove(); iaOcupado = false; iaTravado(false); iaMostraSugestoes(); }
}

/* =====================================================
   CRIATIVOS — foto + molde da marca → PNG (nunca IA de imagem)
===================================================== */
let fontesProntas = null;
function carregaFontes() {
  if (!fontesProntas) {
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=League+Spartan:wght@700;800&family=Montserrat:wght@500;600;700&display=swap';
    document.head.appendChild(l);
    fontesProntas = new Promise(ok => { l.onload = ok; l.onerror = ok; setTimeout(ok, 3000); })
      .then(() => Promise.all([document.fonts.load('800 80px "League Spartan"'), document.fonts.load('500 40px Montserrat'), document.fonts.load('700 40px Montserrat')])).catch(() => {});
  }
  return fontesProntas;
}
const imgCache = {};
const carregaImg = (src) => imgCache[src] || (imgCache[src] = new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('foto')); i.src = src; }));
function quebra(ctx, texto, largura) {
  const out = []; let linha = '';
  for (const p of String(texto || '').split(/\s+/).filter(Boolean)) {
    const tenta = linha ? linha + ' ' + p : p;
    if (ctx.measureText(tenta).width > largura && linha) { out.push(linha); linha = p; } else linha = tenta;
  }
  if (linha) out.push(linha);
  return out;
}
function cobre(ctx, img, x, y, w, h) {
  const k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
/* a assinatura no lugar do logo: o nome do negócio, espaçado */
function assinatura(ctx, x, y, cor, tam) {
  ctx.save(); ctx.fillStyle = cor; ctx.font = `700 ${tam}px Montserrat`;
  const nome = guiaNegocio().toUpperCase(); let px = x;
  for (const ch of nome) { ctx.fillText(ch, px, y); px += ctx.measureText(ch).width + tam * 0.12; }
  ctx.restore();
}
function pilula(ctx, texto, x, y, fundo, tinta) {
  ctx.font = '700 34px Montserrat';
  const w = ctx.measureText(texto).width + 56, h = 64, r = 30;
  ctx.fillStyle = fundo; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill();
  ctx.fillStyle = tinta; ctx.fillText(texto, x + 28, y + 44);
}

async function desenhaCriativo(c, canvas) {
  const [W, H] = FORMATOS_CRIATIVO[c.formato] || FORMATOS_CRIATIVO.story;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  await carregaFontes();
  const cor = corDe(c.cor), tinta = tintaSobre(cor), M = 80;
  const semFoto = !c.fotoRef || c.fotoRef === 'nenhuma';
  const foto = semFoto ? null : await carregaImg(fotoSrc(c.fotoRef) || 'capa.jpg').catch(() => null);

  if (!foto) {
    /* fundo na cor da marca com arcos finos, sempre iguais para o mesmo criativo */
    let semente = [...(c.id || c.titulo || 'x')].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = cor; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * .85, H * .1, 0, W * .85, H * .1, Math.max(W, H));
    g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = tinta === '#ffffff' ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.13)'; ctx.lineWidth = 3;
    const cx = W * (0.6 + rnd() * 0.4), cy = H * (0.05 + rnd() * 0.25);
    for (let r = 120; r < Math.max(W, H) * 1.2; r += 70 + rnd() * 40) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    assinatura(ctx, M, M + 30, tinta, 30);
    const tamT = c.formato === 'story' ? 96 : 76, tamX = c.formato === 'story' ? 44 : 36;
    ctx.font = `800 ${tamT}px "League Spartan"`; const lt = quebra(ctx, c.titulo, W - 2 * M).slice(0, 5);
    ctx.font = `500 ${tamX}px Montserrat`; const lx = c.texto ? quebra(ctx, c.texto, W - 2 * M).slice(0, c.formato === 'story' ? 12 : 8) : [];
    let y = Math.max(M + 220, (H - (lt.length * tamT + (lx.length ? 40 + lx.length * tamX * 1.4 : 0))) / 2 + tamT * .8);
    ctx.fillStyle = tinta; ctx.font = `800 ${tamT}px "League Spartan"`;
    for (const l of lt) { ctx.fillText(l, M, y); y += tamT; }
    if (lx.length) { y += 20; ctx.fillRect(M, y - 10, 90, 8); y += 50; ctx.font = `500 ${tamX}px Montserrat`; for (const l of lx) { ctx.fillText(l, M, y); y += tamX * 1.4; } }
    if (c.rodape) { ctx.font = '700 34px Montserrat'; ctx.fillText(c.rodape, M, H - M); }
    return canvas;
  }

  if (c.formato === 'flyer') {
    const fh = Math.round(H * 0.6);
    ctx.fillStyle = cor; ctx.fillRect(0, 0, W, H); cobre(ctx, foto, 0, 0, W, fh);
    let y = fh + 90; ctx.fillStyle = tinta; ctx.font = '800 84px "League Spartan"';
    for (const l of quebra(ctx, c.titulo, W - 2 * M).slice(0, 3)) { ctx.fillText(l, M, y); y += 84; }
    if (c.texto) { y += 14; ctx.font = '500 38px Montserrat'; for (const l of quebra(ctx, c.texto, W - 2 * M).slice(0, 3)) { ctx.fillText(l, M, y); y += 50; } }
    if (c.rodape) { ctx.font = '700 32px Montserrat'; ctx.fillText(c.rodape, M, H - 60); }
    assinatura(ctx, W - M - 420, H - 60, tinta, 24);
    return canvas;
  }

  cobre(ctx, foto, 0, 0, W, H);
  const g = ctx.createLinearGradient(0, H * .35, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.8)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const gt = ctx.createLinearGradient(0, 0, 0, 260); gt.addColorStop(0, 'rgba(0,0,0,.45)'); gt.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gt; ctx.fillRect(0, 0, W, 260);
  assinatura(ctx, M, M + 30, '#ffffff', c.formato === 'story' ? 32 : 26);
  const tamT = c.formato === 'story' ? 104 : 84;
  ctx.font = `800 ${tamT}px "League Spartan"`; const lt = quebra(ctx, c.titulo, W - 2 * M - 30).slice(0, 4);
  ctx.font = '500 40px Montserrat'; const lx = c.texto ? quebra(ctx, c.texto, W - 2 * M).slice(0, 4) : [];
  let y = H - (c.formato === 'story' ? 220 : 90) - (c.rodape ? 110 : 0) - lx.length * 54 - (lx.length ? 20 : 0) - (lt.length - 1) * tamT;
  ctx.fillStyle = cor; ctx.fillRect(M, y - tamT + 12, 14, lt.length * tamT);
  ctx.fillStyle = '#fff'; ctx.font = `800 ${tamT}px "League Spartan"`;
  for (const l of lt) { ctx.fillText(l, M + 36, y); y += tamT; }
  if (lx.length) { y += 10; ctx.font = '500 40px Montserrat'; ctx.fillStyle = 'rgba(255,255,255,.92)'; for (const l of lx) { ctx.fillText(l, M, y); y += 54; } }
  if (c.rodape) pilula(ctx, c.rodape, M, y + 26, cor, tinta);
  return canvas;
}
function baixaCriativo(c) {
  const cv = document.createElement('canvas');
  desenhaCriativo(c, cv).then(() => cv.toBlob(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = `${c.formato}-${(c.titulo || 'criativo').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png'));
}

/* =====================================================
   ABA MARKETING
===================================================== */
const MKT_SUB = ['plano', 'criativos', 'anuncios', 'kit', 'memoria'];
const MKT_ROT = { plano: 'subPlano', criativos: 'subCriativos', anuncios: 'subAnuncios', kit: 'subKit', memoria: 'subMemoria' };
function pedeAoAssistente(texto) {
  iaAbre();
  if (!iaDemo()) return iaConversa(texto);
  /* sem chave: roda o pedido pronto que mais se parece */
  const c = iaCenarios(), mapa = { [ia('pedidoCriativo')]: 'story', [ia('pedidoTexto')]: 'texto', [ia('pedidoAnuncio')]: 'anuncio' };
  const achado = c.find(x => x.id === mapa[texto]) || (/plano|plan/i.test(texto) ? c.find(x => x.id === 'plano') : null);
  if (achado) iaRodaCenario(achado);
}

function admMarketing(arg) {
  const [sub, ...resto] = String(arg || 'plano').split('-');
  const aba = MKT_SUB.includes(sub) ? sub : 'plano';
  const corpo = aba === 'plano' ? mktPlano(resto.join('-')) : aba === 'criativos' ? mktCriativos() : aba === 'anuncios' ? mktAnuncios() : aba === 'kit' ? mktKit() : mktMemoria();
  admShell('marketing', `
    <div class="pagehead"><h1 class="pageh">${ia('marketing')}</h1></div>
    <p class="mkExtra">✦ ${ia('extraAviso')}</p>
    <div class="chips">${MKT_SUB.map(k => `<button class="chip ${k === aba ? 'on' : ''}" data-mk="${k}">${ia(MKT_ROT[k])}</button>`).join('')}</div>
    ${corpo}`);
  $$('[data-mk]').forEach(b => b.onclick = () => go('/adm/marketing/' + b.dataset.mk));
  $$('[data-pede]').forEach(b => b.onclick = () => pedeAoAssistente(b.dataset.pede));
  mktLiga();
}
function mktPlano(mesArg) {
  const mes = /^\d{4}-\d{2}$/.test(mesArg) ? mesArg : hojeIso().slice(0, 7);
  const [a, mm] = mes.split('-').map(Number);
  const nomeMes = new Date(a, mm - 1, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  const nomeMesCap = nomeMes[0].toUpperCase() + nomeMes.slice(1);
  const ant = mm === 1 ? `${a - 1}-12` : `${a}-${String(mm - 1).padStart(2, '0')}`, prox = mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`;
  const ini = mes + '-01', fim = addDays(prox + '-01', -1);
  const posts = Mkt.get().posts.filter(p => p.data.startsWith(mes)), vazias = [];
  for (const x of Tours.live()) for (const d of Cal.departures(x.id, ini, fim)) {
    if (d.date < hojeIso()) continue;
    const livres = Cal.seatsLeft(x.id, d.date, d.time, d.capacity);
    if (livres >= d.capacity / 2) vazias.push({ data: d.date, txt: `${nomeTour(x)} ${d.time} · ${ia('livres', { l: livres, c: d.capacity })}` });
  }
  const dias = [...new Set([...posts.map(p => p.data), ...vazias.map(v => v.data)])].sort();
  return `
    <section class="card mkHead"><div class="mkNav"><button class="mini" data-mes="${ant}">‹</button><b>${esc(nomeMesCap)}</b><button class="mini" data-mes="${prox}">›</button></div>
      <button class="cta sm" data-pede="${esc(ia('pedidoPlano', { mes: nomeMes }))}">${ia('pedirPlano')}</button></section>
    ${dias.length ? `<div class="mkDias">${dias.map(d => {
      const ps = posts.filter(p => p.data === d), vs = vazias.filter(v => v.data === d), dt = new Date(d + 'T12:00:00');
      return `<div class="card mkDia"><div class="mkData"><b>${d.slice(8)}</b><small>${nomeDia(dt.getDay())}</small></div><div class="mkItens">
        ${vs.map(v => `<div class="mkVaga">● ${esc(v.txt)}</div>`).join('')}
        ${ps.map(p => `<details class="mkPost ${p.situacao}"><summary><span class="mkFmt">${esc(p.formato)}</span> ${esc(p.tema)}<span class="mkSit">${ia(p.situacao)}</span></summary>
          ${p.legenda ? `<pre class="mkTxt">${esc(p.legenda)}</pre>` : ''}${p.roteiro ? `<pre class="mkTxt">${esc(p.roteiro)}</pre>` : ''}
          <div class="mkBts">${p.legenda ? `<button class="mini" data-copia="${p.id}">${ia('copiarLegenda')}</button>` : ''}
            ${p.situacao !== 'postado' ? `<button class="mini" data-postado="${p.id}">${ia('marcarPostado')}</button>` : ''}
            <button class="mini" data-pede="${esc(ia('pedidoReescrever', { id: p.id, tema: p.tema }))}">${ia('reescrever')}</button>
            <button class="mini danger" data-apagapost="${p.id}">${ia('apagar')}</button></div></details>`).join('')}
      </div></div>`;
    }).join('')}</div>` : `<div class="emptybox"><p>${esc(ia('mesVazio', { mes: nomeMes }))}</p></div>`}`;
}
function mktCriativos() {
  const m = Mkt.get();
  return `
    <section class="card mkHead"><p class="mkLead">${ia('criativosTxt')}</p>
      <button class="cta sm" data-pede="${esc(ia('pedidoCriativo'))}">${ia('pedirCriativo')}</button>
      <button class="mini" data-pede="${esc(ia('pedidoTexto'))}">${ia('pedirTexto')}</button></section>
    <section class="card"><h3 class="mkH">✦ ${ia('imgTit')}</h3><p class="mkNota">${ia('imgTxt')}</p>
      ${imgChave() ? `<div class="mkGera"><textarea id="imgDesc" rows="2" placeholder="${esc(ia('imgPh'))}"></textarea>
        <select id="imgFmt">${Object.keys(FORMATOS_CRIATIVO).map(f => `<option value="${f}">${f}</option>`).join('')}</select>
        <button class="cta sm" id="imgGera">${ia('imgGerar')}</button></div>
        <p class="mkNota" id="imgMsg"></p><button class="mini" id="imgTroca">${ia('imgTrocar')}</button>`
      : `<p style="margin:0 0 8px">${ia('imgConectaTxt')}</p><div class="mkGera"><input id="imgChaveIn" type="password" autocomplete="off" placeholder="AIza…">
        <button class="cta sm" id="imgChaveOk">${ia('imgConectar')}</button></div><p class="mkNota" id="imgMsg"></p>`}</section>
    <section class="card"><div class="mkHead" style="margin-bottom:10px"><h3 class="mkH" style="margin:0;flex:1">${ia('suasFotos')}</h3>
      <button class="cta sm" id="mkFotoAdd">${ia('enviarFotos')}</button><input type="file" id="mkFotoArq" accept="image/*" multiple hidden></div>
      <p class="mkNota">${ia('fotosTxt')}</p>
      ${m.fotos.length ? `<div class="mkFotos">${m.fotos.map(f => `<div><img src="${f.src}" alt="">${f.ia ? `<span class="mkSeloIA">${ia('imgSelo')}</span>` : ''}<button class="mini danger" data-tirafoto="${f.id}">×</button></div>`).join('')}</div>` : ''}</section>
    ${m.criativos.length ? `<div class="mkGrade">${m.criativos.map(c => `
      <div class="card mkCriativo"><canvas data-cv="${c.id}"></canvas>
        <div class="mkBts"><button class="mini" data-baixa="${c.id}">${ia('baixar')}</button>
          ${iaDemo() ? '' : `<button class="mini" data-pede="${esc(ia('pedidoTitulo', { id: c.id }))}">${ia('outroTitulo')}</button>`}
          <button class="mini danger" data-apagacv="${c.id}">${ia('apagar')}</button></div>
        <small>${esc(c.formato)} · ${esc(c.titulo)}${(m.fotos.find(f => f.id === c.fotoRef) || {}).ia ? ' · ' + ia('imgSelo') : ''}</small></div>`).join('')}</div>`
    : `<div class="emptybox"><p>${esc(ia('semCriativo'))}</p></div>`}`;
}
function mktAnuncios() {
  const as = Mkt.get().anuncios;
  return `
    <section class="card mkHead"><p class="mkLead">${ia('anunciosTxt')}</p>
      <button class="cta sm" data-pede="${esc(ia('pedidoAnuncio'))}">${ia('pedirAnuncio')}</button></section>
    ${as.length ? as.map(a => `
      <section class="card"><div class="mkAnTopo"><b>${esc(a.titulo)}</b><span class="mkSit">${a.situacao === 'no ar' ? ia('noAr') : ia('rascunho')}</span></div>
        <dl class="mkDl"><dt>${ia('objetivo')}</dt><dd>${esc(a.objetivo)}</dd><dt>${ia('publico')}</dt><dd>${esc(a.publico)}</dd>
          <dt>${ia('verba')}</dt><dd>${eur(a.verba_dia)}${ia('porDia')} · ${a.duracao_dias} ${ia('dias')} · ${ia('total')} ${eur(a.verba_dia * a.duracao_dias)}</dd>
          ${a.datas_alvo ? `<dt>${ia('paraEncher')}</dt><dd>${esc(a.datas_alvo)}</dd>` : ''}${a.fotoRef ? `<dt>${ia('fotoRot')}</dt><dd>${esc(a.fotoRef)}</dd>` : ''}
          ${a.porque ? `<dt>${ia('porque')}</dt><dd>${esc(a.porque)}</dd>` : ''}</dl>
        ${(a.textos || []).map((t, n) => `<div class="mkVersao"><small>${ia('versao')} ${n + 1}</small><b>${esc(t.titulo || '')}</b><pre class="mkTxt">${esc(t.texto || '')}</pre>${t.chamada ? `<small>${ia('botaoRot')}: ${esc(t.chamada)}</small>` : ''}</div>`).join('')}
        <div class="mkBts">${a.situacao !== 'no ar' ? `<button class="mini" data-noar="${a.id}">${ia('subiMeta')}</button>` : ''}<button class="mini danger" data-apagaan="${a.id}">${ia('apagar')}</button></div>
      </section>`).join('') : `<div class="emptybox"><p>${ia('semAnuncio')}</p></div>`}`;
}
function mktKit() {
  const k = Mkt.get().kit;
  const rot = { principal: 'corPrincipal', destaque: 'corDestaque', escura: 'corEscura', neutra: 'corNeutra' };
  return `
    <section class="card"><h3 class="mkH">${ia('coresTit')}</h3><div class="mkCores">${CORES_NOMES.map(n =>
      `<label><input type="color" data-cor="${n}" value="${esc(k.cores[n])}"><b>${ia(rot[n])}</b><small>${esc(k.cores[n])}</small></label>`).join('')}</div></section>
    <section class="card"><h3 class="mkH">${ia('fontesTit')}</h3>
      <p style="font:800 30px 'League Spartan',sans-serif;margin:6px 0">${ia('fonteImpacto')}</p><p style="font:600 20px Montserrat,sans-serif;margin:6px 0">${ia('fonteTexto')}</p></section>
    <section class="card mkForm">
      <label class="fld">${ia('vozTit')}<textarea id="kVoz" rows="4" placeholder="${esc(ia('vozPh'))}">${esc(k.voz)}</textarea></label>
      <label class="fld">${ia('frasesTit')}<textarea id="kFrases" rows="3">${esc(k.frases)}</textarea></label>
      <label class="fld">${ia('proibidasTit')}<input id="kProib" value="${esc(k.proibidas)}"></label>
      <label class="fld">${ia('hashtagsTit')}<input id="kHash" value="${esc(k.hashtags)}"></label>
      <button class="cta sm" id="kSalva">${ia('salvar')}</button></section>`;
}
function mktMemoria() {
  const mem = Mkt.get().memoria;
  return `
    <section class="card"><p style="margin-top:0">${ia('memoriaTxt')}</p>
      <div class="frow"><label class="fld" style="flex:1">${ia('ensinar')}<input id="mkMemIn" placeholder="${esc(ia('ensinarPh'))}"></label>
      <button class="cta sm" id="mkMemAdd">${ia('guardar')}</button></div></section>
    ${mem.length ? `<div class="tlist">${mem.map(x => `<div class="trow"><div class="tinfo"><b>${esc(x.texto)}</b><small>${dataCurta(x.criado)}</small></div>
      <button class="mini danger" data-esquece="${x.id}">×</button></div>`).join('')}</div>` : `<div class="emptybox"><p>${ia('nadaGuardado')}</p></div>`}`;
}
function mktLiga() {
  const m = Mkt.get(), re = () => { const y = scrollY; route(); scrollTo(0, y); };
  $$('[data-mes]').forEach(b => b.onclick = () => go('/adm/marketing/plano-' + b.dataset.mes));
  $$('[data-copia]').forEach(b => b.onclick = () => { const p = m.posts.find(p => p.id === b.dataset.copia); navigator.clipboard && navigator.clipboard.writeText(p.legenda).then(() => toast(ia('legendaCopiada'))); });
  $$('[data-postado]').forEach(b => b.onclick = () => { m.posts.find(p => p.id === b.dataset.postado).situacao = 'postado'; Mkt.salva(); re(); });
  $$('[data-apagapost]').forEach(b => b.onclick = () => { if (!confirm(ia('apagarItem'))) return; m.posts = m.posts.filter(p => p.id !== b.dataset.apagapost); Mkt.salva(); re(); });
  $$('[data-noar]').forEach(b => b.onclick = () => { m.anuncios.find(a => a.id === b.dataset.noar).situacao = 'no ar'; Mkt.salva(); re(); });
  $$('[data-apagaan]').forEach(b => b.onclick = () => { if (!confirm(ia('apagarItem'))) return; m.anuncios = m.anuncios.filter(a => a.id !== b.dataset.apagaan); Mkt.salva(); re(); });
  $$('[data-apagacv]').forEach(b => b.onclick = () => { if (!confirm(ia('apagarItem'))) return; m.criativos = m.criativos.filter(c => c.id !== b.dataset.apagacv); Mkt.salva(); re(); });
  $$('[data-baixa]').forEach(b => b.onclick = () => baixaCriativo(m.criativos.find(c => c.id === b.dataset.baixa)));
  $$('[data-cv]').forEach(cv => { const c = m.criativos.find(c => c.id === cv.dataset.cv); if (c) desenhaCriativo(c, cv).catch(() => {}); });
  $$('[data-esquece]').forEach(b => b.onclick = () => { m.memoria = m.memoria.filter(x => x.id !== b.dataset.esquece); Mkt.salva(); re(); });
  const fa = $('#mkFotoAdd'), farq = $('#mkFotoArq');
  if (fa) fa.onclick = () => farq.click();
  if (farq) farq.onchange = async () => { for (const f of [...farq.files]) { try { if (!guardaFoto(await iaReduzFoto(f, 1600), f.name.replace(/\.[^.]+$/, ''))) break; } catch (e) { toast(e.message); } } re(); };
  $$('[data-tirafoto]').forEach(b => b.onclick = () => {
    if (!confirm(m.criativos.some(c => c.fotoRef === b.dataset.tirafoto) ? ia('fotoEmUso') : ia('apagarItem'))) return;
    m.fotos = m.fotos.filter(f => f.id !== b.dataset.tirafoto); Mkt.salva(); re();
  });
  const ig = $('#imgGera');
  if (ig) ig.onclick = async () => {
    const d = $('#imgDesc').value.trim(); if (!d) return;
    ig.disabled = true; $('#imgMsg').textContent = ia('imgGerando');
    try { await geraEGuarda(d, $('#imgFmt').value); toast(ia('imgPronta')); re(); }
    catch (e) { $('#imgMsg').textContent = e.message; ig.disabled = false; }
  };
  const ik = $('#imgChaveOk');
  if (ik) ik.onclick = () => {
    const v = $('#imgChaveIn').value.trim();
    if (!/^AIza[\w-]{20,}$/.test(v)) { $('#imgMsg').textContent = ia('imgChaveRuim'); return; }
    try { localStorage.setItem(IMG_CHAVE, v); } catch (e) {}
    re();
  };
  const it = $('#imgTroca');
  if (it) it.onclick = () => { try { localStorage.removeItem(IMG_CHAVE); } catch (e) {} re(); };
  $$('[data-cor]').forEach(inp => inp.onchange = () => { m.kit.cores[inp.dataset.cor] = inp.value; Mkt.salva(); re(); });
  const ks = $('#kSalva');
  if (ks) ks.onclick = () => { Object.assign(m.kit, { voz: $('#kVoz').value.trim(), frases: $('#kFrases').value.trim(), proibidas: $('#kProib').value.trim(), hashtags: $('#kHash').value.trim() }); Mkt.salva(); toast(ia('salvo')); };
  const add = $('#mkMemAdd');
  if (add) add.onclick = () => { const v = $('#mkMemIn').value.trim(); if (!v) return; m.memoria.push({ id: uid(), texto: v, criado: hojeIso() }); Mkt.salva(); re(); };
}

/* =====================================================
   ABA ATENDIMENTO — WhatsApp e Instagram (demonstração)
   A resposta é montada NA HORA a partir das vagas reais do app: mude um
   preço ou lote uma data e a resposta muda junto.
===================================================== */
const CLIENTES = [
  { id: 'c1', nome: 'Claire', lang: 'fr', canal: 'whats', tipo: 'disp', pessoas: 3, msg: 'Bonjour ! Vous avez encore de la place samedi pour 3 personnes ?' },
  { id: 'c2', nome: 'Marco', lang: 'it', canal: 'insta', tipo: 'preco', msg: 'Ciao! Quanto costa il servizio fotografico? E quando siete liberi?' },
  { id: 'c3', nome: 'Jonas', lang: 'de', canal: 'whats', tipo: 'semana', pessoas: 2, msg: 'Hallo! Gibt es nächste Woche noch Plätze für 2 Personen?' },
  { id: 'c4', nome: 'Emily', lang: 'en', canal: 'insta', tipo: 'crianca', msg: 'Hi! Is the full day trip OK for kids? We have a 7 year old.' },
  { id: 'c5', nome: 'Lucía', lang: 'es', canal: 'whats', tipo: 'pagar', msg: 'Hola, ¿se puede pagar con tarjeta?' },
  { id: 'c6', nome: 'Mariana', lang: 'pt', canal: 'insta', tipo: 'disp', pessoas: 4, msg: 'Oi! Tem vaga no sábado pra 4 pessoas?' },
];
const tourPorTipo = (tipo) => {
  const ts = Tours.live();
  if (tipo === 'preco') return ts.find(x => x.priceMode === 'session') || ts[0];
  if (tipo === 'crianca') return ts.find(x => /dia|day/i.test(tl(x.name) + (x.name.en || ''))) || ts[1] || ts[0];
  return ts[0];
};
function proximoSabado() { let d = hojeIso(); for (let i = 0; i < 8; i++) { if (new Date(d + 'T12:00:00').getDay() === 6 && i > 0) return d; d = addDays(d, 1); } return d; }
function datasComLugar(x, n, pessoas, de) {
  const out = [];
  for (const d of Cal.departures(x.id, de || hojeIso(), addDays(hojeIso(), 60))) {
    const livres = Cal.seatsLeft(x.id, d.date, d.time, d.capacity);
    if (livres >= (pessoas || 1)) out.push({ ...d, livres });
    if (out.length >= n) break;
  }
  return out;
}
/* a resposta, no idioma pedido (o do cliente ou o do guia) */
function respostaPara(c, lang) {
  return naLingua(lang, () => {
    const x = tourPorTipo(c.tipo); if (!x) return { txt: '—', falta: null };
    const preco = +x.price || 0, fmt = (d) => `${dataLonga(d.date)} ${d.time}`;
    if (c.tipo === 'disp') {
      /* sábado que vem: qualquer passeio com saída nesse dia e lugar para o grupo */
      const sab = proximoSabado();
      const noSab = Tours.live().flatMap(t => Cal.departures(t.id, sab, sab).map(d => ({ ...d, t, livres: Cal.seatsLeft(t.id, d.date, d.time, d.capacity) })));
      const cabe = noSab.find(d => d.livres >= c.pessoas);
      if (cabe) return { txt: ia('aDisp', { nome: c.nome, data: dataLonga(cabe.date), hora: cabe.time, livres: cabe.livres, tour: nomeTour(cabe.t), preco: +cabe.t.price || 0 }) };
      const prox = datasComLugar(x, 1, c.pessoas, addDays(hojeIso(), 1))[0];
      if (!prox) return { txt: '—' };
      return { txt: ia(noSab.length ? 'aDispNao' : 'aDispSem', { nome: c.nome, tour: nomeTour(x), data: dataLonga(prox.date), hora: prox.time, livres: prox.livres }) };
    }
    if (c.tipo === 'preco') return { txt: ia('aPreco', { nome: c.nome, tour: nomeTour(x), preco, modo: ia(x.priceMode === 'session' ? 'porSessao' : 'porPessoa'), datas: datasComLugar(x, 3, 1, addDays(hojeIso(), 1)).map(fmt).join('; ') || '—' }) };
    if (c.tipo === 'semana') {
      const ds = Tours.live().flatMap(t => datasComLugar(t, 2, c.pessoas, addDays(hojeIso(), 1)).filter(d => d.date <= addDays(hojeIso(), 10)).map(d => ({ ...d, t })))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);
      return { txt: ia('aSemana', { nome: c.nome, n: c.pessoas, datas: ds.map(d => `${nomeTour(d.t)}, ${dataLonga(d.date)} ${d.time}`).join('; ') || '—' }) };
    }
    if (c.tipo === 'crianca') return { txt: ia('aCrianca', { nome: c.nome, tour: nomeTour(x), datas: datasComLugar(x, 2, 1, addDays(hojeIso(), 1)).map(fmt).join('; ') || '—' }), falta: ia('aCriancaFalta') };
    if (c.tipo === 'pagar') return { txt: ia('aPagar', { nome: c.nome, politica: ia(x.payPolicy === 'full' ? 'polTudo' : 'polMetade') }) };
    return { txt: '—' };
  });
}
function conversas() {
  const m = Mkt.get();
  if (!m.conversas) { m.conversas = CLIENTES.slice(0, 5).map(c => ({ id: c.id, estado: 'pendente', hora: null })); Mkt.salva(); }
  return m.conversas;
}
let inboxAberta = null;
function admAtendimento(arg) {
  const m = Mkt.get(), cs = conversas();
  if (arg) inboxAberta = arg;
  const aberta = cs.find(c => c.id === inboxAberta);
  const cli = (id) => CLIENTES.find(c => c.id === id);
  const canal = (c) => c.canal === 'whats' ? '<span class="ibCanal wa">WhatsApp</span>' : '<span class="ibCanal ig">Instagram</span>';
  const lista = cs.map(v => { const c = cli(v.id); return `<button class="ibItem ${v.id === inboxAberta ? 'on' : ''}" data-conv="${v.id}">
    <b>${esc(c.nome)} <small class="ibLang">${c.lang.toUpperCase()}</small></b>${canal(c)}
    <span class="ibPrev">${esc(c.msg)}</span>
    <span class="ibEstado ${v.estado}">${v.estado === 'pendente' ? ia('aguardando') : v.estado === 'auto' ? ia('enviadaAuto') : v.estado === 'descartada' ? ia('descartada') : ia('enviada')}</span></button>`; }).join('');
  let detalhe = `<div class="emptybox"><p>${ia('escolha')}</p></div>`;
  if (aberta) {
    const c = cli(aberta.id), r = respostaPara(c, c.lang), trad = c.lang !== LANG ? respostaPara(c, LANG) : null;
    const texto = aberta.texto || r.txt;
    detalhe = `<div class="ibConv">
      <button class="mini ibVolta" data-voltar>${ia('voltar')}</button>
      <div class="ibTopo"><b>${esc(c.nome)}</b> ${canal(c)} <small class="ibLang">${c.lang.toUpperCase()}</small></div>
      <div class="ibMsg dele">${esc(c.msg)}</div>
      ${aberta.estado === 'pendente' ? `
        <div class="ibRasc"><small>${ia('rascunhoIA')}</small><textarea id="ibTxt" rows="4">${esc(texto)}</textarea>
          ${r.falta ? `<p class="ibFalta">⚠ ${ia('falta')}: ${esc((trad || r).falta)}</p>` : ''}
          ${trad ? `<details class="ibTrad"><summary>${ia('paraVoce')}</summary><p>${esc(trad.txt)}</p></details>` : ''}
          <div class="mkBts"><button class="cta sm" data-aprova="${c.id}">${ia('aprovar')}</button><button class="mini" data-descarta="${c.id}">${ia('descartar')}</button></div></div>`
      : aberta.estado === 'descartada' ? `<p class="mkNota">${ia('descartada')}</p>`
      : `<div class="ibMsg minha">${esc(texto)}</div><p class="mkNota" style="text-align:right">${aberta.estado === 'auto' ? '⚡ ' + ia('enviadaAuto') : '✓ ' + ia('enviada')} · ${esc(aberta.hora || '')}</p>`}
    </div>`;
  }
  admShell('inbox', `
    <div class="pagehead"><h1 class="pageh">${ia('atendimento')}</h1></div>
    <p class="mkExtra">✦ ${ia('extraAviso')}</p>
    <section class="card mkHead"><p class="mkLead">${ia('inboxTxt')}</p>
      <div class="ibModo"><button class="${m.modoAuto ? '' : 'on'}" data-modo="0">${ia('modoAprovar')}</button><button class="${m.modoAuto ? 'on' : ''}" data-modo="1">⚡ ${ia('modoAuto')}</button></div></section>
    <p class="mkNota">${ia('inboxDemo')}</p>
    <div class="ibGrade ${aberta ? 'comConversa' : ''}"><div class="ibLista">${lista}<button class="mini" id="ibSimula">${ia('simular')}</button></div><div class="ibDetalhe">${detalhe}</div></div>`);
  const agora = () => new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
  const re = () => admAtendimento();
  $$('[data-conv]').forEach(b => b.onclick = () => { inboxAberta = b.dataset.conv; re(); });
  const vb = $('[data-voltar]'); if (vb) vb.onclick = () => { inboxAberta = null; re(); };
  $$('[data-aprova]').forEach(b => b.onclick = () => { const v = cs.find(x => x.id === b.dataset.aprova); v.texto = $('#ibTxt').value; v.estado = 'enviada'; v.hora = agora(); Mkt.salva(); re(); });
  $$('[data-descarta]').forEach(b => b.onclick = () => { const v = cs.find(x => x.id === b.dataset.descarta); v.estado = 'descartada'; Mkt.salva(); re(); });
  $$('[data-modo]').forEach(b => b.onclick = () => {
    m.modoAuto = b.dataset.modo === '1';
    /* no automático, o que estava esperando sai sozinho — exceto resposta com dado faltando */
    if (m.modoAuto) cs.forEach(v => { if (v.estado === 'pendente' && !respostaPara(cli(v.id), cli(v.id).lang).falta) { v.estado = 'auto'; v.hora = agora(); } });
    Mkt.salva(); re();
  });
  const sim = $('#ibSimula');
  if (sim) sim.onclick = () => {
    const livre = CLIENTES.find(c => !cs.some(v => v.id === c.id));
    const c = livre || CLIENTES[Math.floor(Math.random() * CLIENTES.length)];
    const v = { id: c.id, estado: 'pendente', hora: null };
    const i = cs.findIndex(x => x.id === c.id); if (i >= 0) cs.splice(i, 1);
    if (m.modoAuto && !respostaPara(c, c.lang).falta) { v.estado = 'auto'; v.hora = agora(); }
    cs.unshift(v); inboxAberta = c.id; Mkt.salva(); re();
  };
}

/* =====================================================
   GAVETA DO ASSISTENTE
===================================================== */
const IA_CSS = `
#iaFab{position:fixed;right:18px;bottom:18px;z-index:900;display:none;align-items:center;gap:8px;padding:12px 18px;border:0;border-radius:999px;
  background:var(--accent,#064c3f);color:#fff;font:600 15px var(--f-ui,system-ui);box-shadow:0 6px 20px rgba(0,0,0,.22);cursor:pointer}
#iaFab.on{display:flex}
.iaExtra{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:var(--highlight,#FFD23F);color:#1b1b1b;margin-left:4px;vertical-align:middle}
.iaDemoExtra{display:block;margin-top:8px;font-weight:600;color:var(--ink,#222)}
.mkExtra{margin:-4px 0 14px;font-size:13px;font-weight:600;color:var(--ink-2)} #iaFab .dot{width:9px;height:9px;border-radius:50%;background:var(--highlight,#FFD23F)}
#iaGaveta{position:fixed;top:0;right:0;bottom:0;width:min(440px,100vw);z-index:950;display:flex;flex-direction:column;background:var(--surface,#fff);color:var(--ink,#222);
  box-shadow:-8px 0 30px rgba(0,0,0,.18);transform:translateX(105%);transition:transform .22s ease;font-family:var(--f-ui,system-ui)}
#iaGaveta.aberta{transform:none}
#iaGaveta header{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-bottom:1px solid var(--line,#e5e5e5)}
#iaGaveta header b{flex:1;font-size:16px}
#iaGaveta .x{border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:inherit;min-width:44px;min-height:44px}
#iaCtx{padding:6px 16px;font-size:12.5px;color:var(--ink-3,#777);border-bottom:1px solid var(--line,#eee)}
#iaMsgs{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.iaB{max-width:92%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
.iaB img{display:block;max-width:100%;border-radius:10px;margin-bottom:6px}
.iaB.user{align-self:flex-end;background:var(--accent,#064c3f);color:#fff;border-bottom-right-radius:4px}
.iaB.assistant{align-self:flex-start;background:var(--surface-2,#f4f2ef);border-bottom-left-radius:4px}
.iaB.pensa{align-self:flex-start;color:var(--ink-3,#888);font-style:italic;background:none;padding:4px 2px}
.iaB.erro{align-self:stretch;background:var(--danger-wash,#fde8e8);color:var(--danger,#a00)}
.iaB .cp{display:block;margin-top:8px;border:0;background:none;color:var(--accent,#064c3f);font:600 12.5px inherit;cursor:pointer;padding:6px 0}
.iaDemo{align-self:stretch;border:1px dashed var(--line-2,#ccc);border-radius:14px;padding:12px 14px;font-size:13.5px;line-height:1.45;color:var(--ink-2,#555)}
.iaDemo b{display:block;margin-bottom:4px;color:var(--ink,#222)}
.iaSug{align-self:stretch;display:flex;flex-direction:column;gap:6px}
.iaSug small{color:var(--ink-3,#888)}
.iaSug button{text-align:left;min-height:44px;padding:10px 12px;border-radius:12px;border:1px solid var(--line,#ddd);background:var(--surface,#fff);color:inherit;font:14px inherit;cursor:pointer}
.iaSug button:hover{border-color:var(--accent,#064c3f)}
.iaCard{align-self:stretch;border:2px solid var(--highlight,#FFD23F);border-radius:14px;padding:12px 14px;background:var(--surface,#fff)}
.iaCard h4{margin:0 0 8px;font-size:15px}
.iaCard dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:14px}
.iaCard dt{color:var(--ink-3,#777)} .iaCard dd{margin:0;font-weight:600;white-space:pre-wrap}
.iaCard .ass{margin:8px 0 0;font-size:12.5px;color:var(--ink-3,#777)}
.iaCard .bts{display:flex;gap:8px;margin-top:12px}
.iaCard .bts button,.iaChave button{flex:1;min-height:44px;border-radius:10px;border:1px solid var(--line,#ddd);background:var(--surface,#fff);font:600 14.5px inherit;cursor:pointer;color:inherit}
.iaCard .bts .sim,.iaChave .sim{background:var(--accent,#064c3f);color:#fff;border-color:transparent}
.iaCard.feito{border-color:var(--line,#ddd);opacity:.75}
#iaForm{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line,#e5e5e5);align-items:flex-end}
#iaTxt{flex:1;resize:none;min-height:44px;max-height:140px;padding:10px 12px;border:1px solid var(--line,#ddd);border-radius:12px;font:15px inherit;background:var(--surface,#fff);color:inherit}
#iaEnviar{min-width:64px;min-height:44px;border:0;border-radius:12px;background:var(--accent,#064c3f);color:#fff;font:600 14.5px inherit;cursor:pointer}
#iaEnviar:disabled{opacity:.5}
#iaClip{min-width:44px;min-height:44px;border:1px solid var(--line,#ddd);border-radius:12px;background:none;color:inherit;font-size:18px;cursor:pointer}
#iaAnexo{display:none;padding:0 12px 6px;font-size:12.5px;color:var(--ink-3,#888)} #iaAnexo.on{display:flex;gap:8px;align-items:center}
#iaAnexo img{height:44px;border-radius:6px} #iaAnexo button{border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer;font:inherit}
#iaPe{display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:space-between;align-items:center;padding:0 16px 10px;font-size:12px;color:var(--ink-3,#888)}
#iaPe button{border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer;font:inherit;padding:6px 0}
#iaPe label{display:flex;gap:6px;align-items:center;cursor:pointer}
.iaChave{padding:18px 16px;display:flex;flex-direction:column;gap:10px;font-size:14.5px;line-height:1.45;overflow-y:auto}
.iaChave input{min-height:44px;padding:10px 12px;border:1px solid var(--line,#ddd);border-radius:10px;font:14px var(--f-mono,monospace);background:var(--surface,#fff);color:inherit}
.iaChave ol{margin:0;padding-left:20px} .iaChave .volta{background:none;border:0;text-decoration:underline;flex:none}
@media (max-width:640px){#iaGaveta{width:100vw}}
.mkHead{display:flex;gap:12px;align-items:center;flex-wrap:wrap} .mkLead{margin:0;flex:1 1 240px}
.mkNav{display:flex;gap:10px;align-items:center;flex:1} .mkNav b{min-width:170px;text-align:center}
.mkDia{display:flex;gap:16px;align-items:flex-start}
.mkData{display:flex;flex-direction:column;align-items:center;min-width:44px} .mkData b{font-size:22px;line-height:1} .mkData small{color:var(--ink-3)}
.mkItens{flex:1;display:flex;flex-direction:column;gap:8px;min-width:0}
.mkVaga{font-size:13.5px;color:var(--warn,#b7791f)}
.mkPost{border:1px solid var(--line);border-radius:10px;padding:8px 12px}
.mkPost summary{cursor:pointer;display:flex;gap:8px;align-items:center;flex-wrap:wrap;list-style:none}
.mkPost.postado{opacity:.6}
.mkFmt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:99px;background:var(--surface-2)}
.mkSit{margin-left:auto;font-size:12px;color:var(--ink-3)}
.mkTxt{white-space:pre-wrap;font:14px/1.5 var(--f-ui);background:var(--surface-2);padding:10px 12px;border-radius:8px;margin:8px 0}
.mkBts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.mkNota{margin:0 0 10px;color:var(--ink-3);font-size:13.5px}
.mkGrade{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.mkCriativo canvas{width:100%;height:auto;border-radius:10px;display:block;background:var(--surface-2)}
.mkCriativo small{display:block;margin-top:6px;color:var(--ink-3)}
.mkAnTopo{display:flex;gap:10px;align-items:center;margin-bottom:8px}
.mkDl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0 0 10px;font-size:14px} .mkDl dt{color:var(--ink-3)} .mkDl dd{margin:0}
.mkVersao{border-top:1px solid var(--line);padding-top:8px;margin-top:8px} .mkVersao small{display:block;color:var(--ink-3)}
.mkH{margin:0 0 10px;font-size:16px}
.mkCores{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
.mkCores label{display:flex;flex-direction:column;gap:4px;cursor:pointer} .mkCores input{width:100%;height:56px;border:0;border-radius:10px;padding:0;background:none;cursor:pointer}
.mkCores small{color:var(--ink-3)}
.mkForm{display:flex;flex-direction:column;gap:12px} .mkForm textarea,.mkForm input{width:100%}
.mkFotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.mkGera{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;margin-bottom:6px}
.mkGera textarea,.mkGera input{flex:1 1 240px;min-height:44px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:inherit;font:14px var(--f-ui)}
.mkGera select{min-height:44px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:inherit;padding:0 10px}
.mkSeloIA{position:absolute;left:4px;bottom:4px;font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;background:rgba(0,0,0,.7);color:#fff}
.mkFotos div{position:relative} .mkFotos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block} .mkFotos button{position:absolute;top:4px;right:4px}
.ibModo{display:flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.ibModo button{padding:9px 14px;border:0;background:none;color:inherit;font:600 13.5px var(--f-ui);cursor:pointer;min-height:40px}
.ibModo button.on{background:var(--accent);color:#fff}
.ibGrade{display:grid;grid-template-columns:minmax(240px,340px) 1fr;gap:14px;align-items:start}
.ibLista{display:flex;flex-direction:column;gap:8px}
.ibItem{display:grid;grid-template-columns:1fr auto;gap:2px 8px;text-align:left;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer;font:14px var(--f-ui)}
.ibItem.on{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.ibPrev{grid-column:1/-1;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}
.ibEstado{grid-column:1/-1;font-size:12px;color:var(--ink-3)} .ibEstado.pendente{color:var(--warn,#b7791f);font-weight:600}
.ibLang{font-size:10.5px;padding:1px 6px;border-radius:99px;background:var(--surface-2);color:var(--ink-2);font-weight:600;letter-spacing:.04em}
.ibCanal{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;color:#fff;align-self:center}
.ibCanal.wa{background:#1f9d55} .ibCanal.ig{background:linear-gradient(45deg,#f09433,#dc2743,#bc1888)}
.ibDetalhe{background:var(--surface);border-radius:var(--r-lg,14px);padding:16px;box-shadow:var(--sh-1);min-height:200px}
.ibTopo{display:flex;gap:8px;align-items:center;margin-bottom:12px}
.ibMsg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;margin-bottom:10px}
.ibMsg.dele{background:var(--surface-2)} .ibMsg.minha{margin-left:auto;background:var(--accent);color:#fff}
.ibRasc{border:2px solid var(--highlight,#FFD23F);border-radius:14px;padding:12px}
.ibRasc small{color:var(--ink-3)} .ibRasc textarea{width:100%;margin-top:6px;min-height:110px;font:14.5px/1.45 var(--f-ui);padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:inherit;resize:vertical}
.ibFalta{margin:8px 0 0;font-size:13px;color:var(--warn,#b7791f)}
.ibTrad{margin-top:8px;font-size:13.5px} .ibTrad summary{cursor:pointer;color:var(--ink-3)} .ibTrad p{margin:6px 0 0;color:var(--ink-2)}
.ibVolta{display:none;margin-bottom:10px}
#ibSimula{align-self:flex-start}
@media (max-width:760px){.ibGrade{grid-template-columns:1fr} .ibGrade.comConversa .ibLista{display:none} .ibGrade:not(.comConversa) .ibDetalhe{display:none} .ibVolta{display:inline-block}}
`;

let iaEl = null, iaFoto = null;
function iaMonta() {
  if (iaEl) return;
  const st = document.createElement('style'); st.textContent = IA_CSS; document.head.appendChild(st);
  const fab = document.createElement('button'); fab.id = 'iaFab'; fab.type = 'button'; fab.onclick = iaAbre;
  const g = document.createElement('aside'); g.id = 'iaGaveta';
  g.innerHTML = `<header><b id="iaTit"></b><button class="x" id="iaFecha">×</button></header><div id="iaCtx"></div>
    <div id="iaCorpo" style="flex:1;display:flex;flex-direction:column;min-height:0"></div>`;
  document.body.append(fab, g);
  g.querySelector('#iaFecha').onclick = iaFecha;
  iaEl = { fab, g };
  iaAtualizaFab();
}
function iaContexto() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] !== 'adm') return null;
  const aba = p[1] || 'today';
  const tab = (ADM_TABS.find(([id]) => id === aba) || [aba, aba])[1];
  let txt = STR[tab] ? t(tab) : aba;
  if (aba === 'tours' && p[2] && p[2] !== 'new' && Tours.get(p[2])) txt += ' · ' + nomeTour(Tours.get(p[2]));
  return { aba, arg: p[2] || null, txt };
}
const iaPodeVer = () => location.hash.startsWith('#/adm') && (!temNuvem() || isLoggedIn());
function iaAtualizaFab() {
  if (!iaEl) return;
  const mostra = iaPodeVer();
  if (!mostra) iaEl.g.classList.remove('aberta');
  iaEl.fab.classList.toggle('on', mostra && !iaEl.g.classList.contains('aberta'));
  iaEl.fab.innerHTML = `<span class="dot"></span>${ia('assistente')}<small class="iaExtra">${ia('extra')}</small>`;
  iaEl.g.querySelector('#iaTit').textContent = ia('assistente') + (iaDemo() ? ' · ' + ia('demoTit') : '');
  iaEl.g.querySelector('#iaFecha').setAttribute('aria-label', ia('fechar'));
  const c = iaContexto();
  iaEl.g.querySelector('#iaCtx').textContent = c ? ia('vendo') + ': ' + c.txt : '';
  /* o botão fica acima da faixa de proposta e da barra de abas do celular */
  let base = 18;
  const rail = document.querySelector('.rail'), faixa = document.querySelector('.protobar');
  if (rail && getComputedStyle(rail).position === 'fixed' && rail.getBoundingClientRect().top > innerHeight / 2) base += rail.offsetHeight;
  if (faixa && faixa.offsetHeight) base = Math.max(base, innerHeight - faixa.getBoundingClientRect().top + 12);
  iaEl.fab.style.bottom = base + 'px';
}
function iaAbre() { iaEl.g.classList.add('aberta'); iaEl.fab.classList.remove('on'); iaAtualizaFab(); iaDesenha(); }
function iaFecha() { if (!iaEl) return; iaEl.g.classList.remove('aberta'); iaAtualizaFab(); }

let iaMostrandoChave = false;
function iaDesenha() {
  const corpo = iaEl.g.querySelector('#iaCorpo');
  if (iaMostrandoChave) {
    corpo.innerHTML = `<div class="iaChave"><p>${ia('chaveTit')}</p>
      <ol><li>${ia('chave1')}</li><li>${ia('chave2')}</li><li>${ia('chave3')}</li><li>${ia('chave4')}</li></ol>
      <input id="iaChaveIn" type="password" autocomplete="off" placeholder="sk-ant-…">
      <button class="sim" id="iaChaveOk">${ia('chaveOk')}</button><p id="iaChaveMsg" style="margin:0;font-size:13.5px"></p>
      <button class="volta" id="iaChaveVolta">${ia('chaveVolta')}</button></div>`;
    corpo.querySelector('#iaChaveOk').onclick = iaTestaChave;
    corpo.querySelector('#iaChaveVolta').onclick = () => { iaMostrandoChave = false; iaDesenha(); };
    return;
  }
  const demo = iaDemo();
  corpo.innerHTML = `<div id="iaMsgs"></div><div id="iaAnexo"></div>
    ${demo ? '' : `<form id="iaForm"><button type="button" id="iaClip" title="${esc(ia('foto'))}" aria-label="${esc(ia('foto'))}">📷</button>
      <input type="file" id="iaArq" accept="image/*" hidden><textarea id="iaTxt" rows="1" placeholder="${esc(ia('ph'))}"></textarea>
      <button id="iaEnviar" type="submit">${ia('enviar')}</button></form>`}
    <div id="iaPe"><label><input type="checkbox" id="iaConf" ${iaPerguntaAntes() ? 'checked' : ''}> ${ia('perguntar')}</label>
      ${demo ? `<button type="button" id="iaConecta">${ia('conectar')}</button>` : `<span id="iaGasto"></span>`}
      <span><button type="button" id="iaLimpa">${ia('nova')}</button>${demo ? '' : ` · <button type="button" id="iaTiraChave">${ia('trocarChave')}</button>`}</span></div>`;
  const msgs = corpo.querySelector('#iaMsgs');
  iaBolha('assistant', ia('oi'), null, true);
  if (demo) {
    const d = document.createElement('div'); d.className = 'iaDemo'; d.innerHTML = `<b>${ia('demoTit')}</b>${esc(ia('demoTxt'))}<span class="iaDemoExtra">✦ ${esc(ia('extraAviso'))}</span>`; msgs.appendChild(d);
    iaMostraSugestoes();
  } else {
    for (const m of iaLe(IA_HIST, [])) {
      if (typeof m.content === 'string') iaBolha(m.role, m.content);
      else if (m.role === 'assistant' || ehPergunta(m)) { const t2 = m.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim(); if (t2) iaBolha(m.role, t2); }
    }
    const f = corpo.querySelector('#iaForm'), ta = corpo.querySelector('#iaTxt'), arq = corpo.querySelector('#iaArq');
    f.onsubmit = (e) => { e.preventDefault(); const v = ta.value.trim(); if (!v && !iaFoto) return; const foto = iaFoto; iaFoto = null; iaMostraAnexo(); ta.value = ''; ta.style.height = ''; iaConversa(v, foto); };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); f.requestSubmit(); } };
    ta.oninput = () => { ta.style.height = ''; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
    corpo.querySelector('#iaClip').onclick = () => arq.click();
    arq.onchange = async () => { const file = arq.files[0]; arq.value = ''; if (!file) return; try { iaFoto = await iaReduzFoto(file); iaMostraAnexo(); } catch (e) { iaBolha('erro', e.message); } };
    corpo.querySelector('#iaTiraChave').onclick = () => { if (!confirm(ia('tirarChave'))) return; localStorage.removeItem(IA_CHAVE); iaAtualizaFab(); iaDesenha(); };
    iaMostraGasto();
    if (!('ontouchstart' in window)) ta.focus();
  }
  corpo.querySelector('#iaConf').onchange = (e) => iaGrava(IA_CONFIRMA, e.target.checked);
  corpo.querySelector('#iaLimpa').onclick = () => { iaGrava(IA_HIST, []); iaDesenha(); };
  const cn = corpo.querySelector('#iaConecta'); if (cn) cn.onclick = () => { iaMostrandoChave = true; iaDesenha(); };
  msgs.scrollTop = msgs.scrollHeight;
}
function iaMostraSugestoes() {
  const msgs = iaEl && iaEl.g.querySelector('#iaMsgs');
  if (!msgs || !iaDemo()) return;
  msgs.querySelectorAll('.iaSug').forEach(x => x.remove());
  const box = document.createElement('div'); box.className = 'iaSug';
  box.innerHTML = `<small>${ia('experimente')}</small>`;
  for (const c of iaCenarios()) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = c.pede;
    b.onclick = () => { box.remove(); iaRodaCenario(c); };
    box.appendChild(b);
  }
  msgs.appendChild(box); msgs.scrollTop = msgs.scrollHeight;
}
function iaMostraAnexo() {
  const el = iaEl && iaEl.g.querySelector('#iaAnexo'); if (!el) return;
  el.classList.toggle('on', !!iaFoto);
  el.innerHTML = iaFoto ? `<img src="${iaFoto}" alt=""> ${ia('fotoPronta')} <button type="button" id="iaTiraFoto">${ia('tirar')}</button>` : '';
  const b = el.querySelector('#iaTiraFoto'); if (b) b.onclick = () => { iaFoto = null; iaMostraAnexo(); };
}
async function iaTestaChave() {
  const inp = iaEl.g.querySelector('#iaChaveIn'), msg = iaEl.g.querySelector('#iaChaveMsg'), v = inp.value.trim();
  if (!/^sk-ant-/.test(v)) { msg.textContent = ia('chaveRuim'); return; }
  msg.textContent = ia('testando');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': v, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: IA_MODELO, max_tokens: 5, messages: [{ role: 'user', content: 'oi' }] }) });
    const corpo = await r.json().catch(() => null);
    if (!r.ok) throw new Error(iaTraduzErro(r.status, corpo));
    localStorage.setItem(IA_CHAVE, v); iaSomaGasto(corpo.usage);
    iaMostrandoChave = false; iaAtualizaFab(); iaDesenha();
  } catch (e) { msg.textContent = e.message; }
}
function iaMostraGasto() {
  const el = iaEl && iaEl.g.querySelector('#iaGasto'); if (!el) return;
  const us = iaLe(IA_GASTO, 0) || 0;
  el.textContent = ia('gasto') + ' ' + us.toFixed(us < 1 ? 3 : 2);
}
const iaHtml = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function iaBolha(tipo, texto, antesDe, semCopiar, foto) {
  const msgs = iaEl && iaEl.g.querySelector('#iaMsgs');
  if (!msgs) return document.createElement('div');
  const d = document.createElement('div'); d.className = 'iaB ' + tipo;
  d.innerHTML = (foto ? `<img src="${foto}" alt="">` : '') + iaHtml(texto);
  if (tipo === 'assistant' && texto.length > 80 && !semCopiar) {
    const b = document.createElement('button'); b.className = 'cp'; b.type = 'button'; b.textContent = ia('copiar');
    b.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(texto.replace(/\*\*/g, '')).then(() => { b.textContent = ia('copiado'); }); };
    d.appendChild(b);
  }
  if (antesDe && antesDe.parentNode === msgs) msgs.insertBefore(d, antesDe); else msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}
function iaTravado(sim) {
  const b = iaEl && iaEl.g.querySelector('#iaEnviar'); if (b) b.disabled = sim;
  if (iaEl) iaEl.g.querySelectorAll('.iaSug button').forEach(x => x.disabled = sim);
}
function iaCartao(plano) {
  const c = document.createElement('div'); c.className = 'iaCard';
  c.innerHTML = `<h4>${esc(plano.titulo)} — ${ia('confirma')}</h4>
    <dl>${plano.linhas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${plano.assumiu.length ? `<p class="ass">${ia('assumi')}: ${esc(plano.assumiu.join('; '))}</p>` : ''}
    <div class="bts"><button type="button" class="nao">${ia('cancelar')}</button><button type="button" class="sim">${ia('confirmar')}</button></div>`;
  const msgs = iaEl.g.querySelector('#iaMsgs'), pensa = msgs.querySelector('.iaB.pensa');
  if (pensa) msgs.insertBefore(c, pensa); else msgs.appendChild(c);
  msgs.scrollTop = msgs.scrollHeight;
  return c;
}
function iaFechaCartao(c, sim) {
  c.classList.add('feito');
  const h = c.querySelector('h4'); h.textContent = h.textContent.replace(' — ' + ia('confirma'), '');
  c.querySelector('.bts').outerHTML = `<p class="ass">${sim ? ia('feito') : ia('cancelado')}</p>`;
}
function iaPedeConfirmacao(plano) {
  return new Promise((ok) => {
    const c = iaCartao(plano);
    c.querySelector('.sim').onclick = () => { iaFechaCartao(c, true); ok(true); };
    c.querySelector('.nao').onclick = () => { iaFechaCartao(c, false); ok(false); };
  });
}
function iaCartaoFeito(plano) { iaFechaCartao(iaCartao(plano), true); }

/* =====================================================
   LIGAR — acrescenta as abas e as rotas por fora do app.js
===================================================== */
STR.admMarketing = IA_TXT.marketing;
STR.admInbox = IA_TXT.atendimento;
if (!ADM_TABS.some(([id]) => id === 'inbox')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'bookings');
  ADM_TABS.splice(i < 0 ? 1 : i + 1, 0, ['inbox', 'admInbox']);
}
if (!ADM_TABS.some(([id]) => id === 'marketing')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'coupons');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['marketing', 'admMarketing']);
}
const _viewAdmOriginal = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'marketing') admMarketing(arg);
  else if (tab === 'inbox') admAtendimento(arg);
  else _viewAdmOriginal(tab, arg);
  marcaExtras();
};
function marcaExtras() {
  for (const id of ['nb-inbox', 'nb-marketing']) {
    const b = document.getElementById(id);
    if (b && !b.querySelector('.iaExtra')) b.insertAdjacentHTML('beforeend', ` <small class="iaExtra">${ia('extra')}</small>`);
  }
}
/* francês, italiano, alemão e espanhol dos textos do assistente */
if (typeof IA_TR !== 'undefined') for (const l in IA_TR) for (const k in IA_TR[l]) if (IA_TXT[k] && !(l in IA_TXT[k])) IA_TXT[k][l] = IA_TR[l][k];

iaMonta();
addEventListener('hashchange', () => setTimeout(iaAtualizaFab, 30));
addEventListener('resize', iaAtualizaFab);
setInterval(iaAtualizaFab, 1500);
if (location.hash.startsWith('#/adm')) route();
