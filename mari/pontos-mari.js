/* =====================================================
   O BANCO DE LUGARES DA MARI (06/10/2026)

   A base do "Roteiro personalizado": cada lugar já vem com a frase em
   itálico, o textinho, a foto e a coordenada — ela monta o dia do cliente
   tocando nos lugares, sem escrever do zero.
   - Os textos das paradas do "bike em família" são OS DELA (PDF
     "Roteiro-bike-familia"), separados em frase + texto como no PDF.
   - Os dos passeios dela (store.js) e das ideias para crianças (app.js)
     também foram reaproveitados.
   - Coordenadas conferidas na Wikipédia e no OpenStreetMap (06/10/2026),
     com erro de até ~100 m; as do bike em família são as dela.
   - Os lugares que ELA acrescenta ficam em DB.pontosMari (privado, id
     'm-…', mesmo formato). pontosTodos() junta os dois.
   Formato: { id, nome, area ('Copenhague'|'Arredores'|'Suécia'|'Dinamarca'),
     lat, lng, foto (caminho do app ou ''), frase, texto, tags [...] }
   ===================================================== */
'use strict';

const PONTOS_TAGS = [
  ['criancas', 'crianças'], ['bike', 'bicicleta'], ['historia', 'história'], ['realeza', 'realeza'],
  ['arte', 'arte'], ['arquitetura', 'arquitetura'], ['natureza', 'natureza'], ['comida', 'comida'],
  ['gratis', 'grátis'], ['chuva', 'dia de chuva'], ['compras', 'compras'], ['vida-local', 'vida local'],
  ['dia-inteiro', 'dia inteiro'],
];
const PONTOS_AREAS = ['Copenhague', 'Arredores', 'Suécia', 'Dinamarca'];

const _pontoMari = (id, nome, area, lat, lng, foto, frase, texto, tags) => ({ id, nome, area, lat, lng, foto, frase, texto, tags });
window.PONTOS_MARI = [
  /* ---------- o dia de bicicleta com crianças (os textos dela) ---------- */
  _pontoMari('kongens-have', 'Kongens Have (Jardim do Rei)', 'Copenhague', 55.6855, 12.5797, 'fotos/bikefam/kongenshave.jpg',
    'O jardim mais real da cidade — considere assistir também à troca da guarda às 12h.',
    'O jardim abriga o Castelo Rosenborg e uma estátua do escritor H.C. Andersen.', ['criancas', 'natureza', 'realeza', 'historia', 'gratis', 'bike']),
  _pontoMari('botanisk-have', 'Botanisk Have (Jardim Botânico)', 'Copenhague', 55.6869, 12.5737, 'fotos/bikefam/botanisk.jpg',
    'Quase uma floresta mágica no meio da cidade, perfeita para explorar com os pequenos.',
    'Entrada gratuita, estufas com plantas tropicais, trilhas tranquilas e um lago com peixes.', ['criancas', 'natureza', 'gratis', 'bike', 'chuva']),
  _pontoMari('torvehallerne', 'Torvehallerne', 'Copenhague', 55.6839, 12.5696, 'fotos/bikefam/torvehallerne.jpg',
    'Parada para um lanche ou almoço com gostinho local.',
    'Mercado com comidas dinamarquesas, cafés e opções para crianças. Mesas ao ar livre.', ['comida', 'criancas', 'vida-local', 'chuva', 'bike']),
  _pontoMari('assistens', 'Assistens Kirkegård', 'Copenhague', 55.6909, 12.5494, '',
    'Onde o silêncio conta histórias.',
    'Mais do que um cemitério, um parque urbano tranquilo com trilhas arborizadas — aqui descansam H.C. Andersen e Søren Kierkegaard.', ['historia', 'natureza', 'gratis', 'bike']),
  _pontoMari('norrebroparken', 'Nørrebroparken', 'Copenhague', 55.6984, 12.5404, 'fotos/bikefam/norrebroparken.jpg',
    'Playground criativo num dos bairros mais vibrantes de Copenhague.',
    'Não deixe de visitar o playground com aviões.', ['criancas', 'gratis', 'bike', 'vida-local']),
  _pontoMari('rode-plads', 'Den Røde Plads', 'Copenhague', 55.6997, 12.5424, 'fotos/bikefam/rodeplads.jpg',
    'Cor, cultura e arquitetura moderna num só lugar.',
    'O ícone de Nørrebro, parte do Superkilen Park.', ['arquitetura', 'arte', 'gratis', 'bike', 'vida-local']),
  _pontoMari('superkilen', 'Superkilen Park', 'Copenhague', 55.7008, 12.5418, 'fotos/bikefam/superkilen.jpg',
    'Parque urbano com escorregadores, fontes, bancos e arte de diversas culturas.',
    'Objetos de mais de 60 países, como um ringue de boxe da Tailândia e bancos do Brasil.', ['criancas', 'arte', 'arquitetura', 'gratis', 'bike']),
  _pontoMari('faelledparken', 'Fælledparken', 'Copenhague', 55.7003, 12.5718, 'fotos/bikefam/faelledparken.jpg',
    'O maior parque da cidade.',
    'Aproveite os três playgrounds temáticos: Store Legeplads, Tårnlegepladsen e Trafiklegepladsen.', ['criancas', 'natureza', 'gratis', 'bike']),
  _pontoMari('konditaget', 'Konditaget Lüders (Nordhavn)', 'Copenhague', 55.7077, 12.5981, 'fotos/bikefam/konditaget.jpg',
    'Um playground nas alturas com vista para o mar.',
    'Rooftop com brinquedos, trampolins, escorregadores e vista do porto. Acesso gratuito por elevador ou escada.', ['criancas', 'gratis', 'arquitetura', 'bike']),
  _pontoMari('kastellet', 'Kastellet', 'Copenhague', 55.6911, 12.5947, 'fotos/bikefam/kastellet.jpg',
    'A fortaleza em forma de estrela, cercada de água.',
    'Caminhe pelas muralhas da fortaleza do século XVII.', ['historia', 'natureza', 'gratis', 'bike', 'criancas']),
  _pontoMari('sereia', 'A Pequena Sereia', 'Copenhague', 55.6929, 12.5993, 'fotos/sereia.jpg',
    'Menor do que se espera e cheia de história.',
    'Encontre a famosa estátua da pequena sereia, inspirada no conto de H.C. Andersen.', ['criancas', 'historia', 'gratis', 'bike']),
  _pontoMari('havnebus', 'Harbour Bus (barco do porto)', 'Copenhague', 55.6889, 12.5987, 'fotos/bikefam/havnebus.jpg',
    'Quase um mini cruzeiro!',
    'Leve as bicicletas a bordo do barco 991 ou 992 e cruze o canal.', ['criancas', 'bike']),
  _pontoMari('opera', 'Ópera de Copenhague (Opera House)', 'Copenhague', 55.6818, 12.6007, '',
    'Um símbolo da cidade, à beira do canal.',
    'Chega-se pelo barco do porto ou pela ponte. Atrás do edifício fica o Opera Parken, que também vale a visita.', ['arquitetura', 'gratis', 'bike']),
  _pontoMari('copenhill', 'CopenHill', 'Copenhague', 55.6838, 12.6203, 'fotos/bikefam/copenhill.jpg',
    'A montanha mais sustentável do mundo, em cima de uma usina de energia.',
    'Pista de esqui no topo, trilha com mirante, playground e café no térreo. Além de esquiar, dá para descer deslizando de “pneu”.', ['criancas', 'arquitetura', 'natureza', 'bike']),
  _pontoMari('reffen', 'Reffen', 'Copenhague', 55.6932, 12.6095, '',
    'Comida de rua com vista para o canal.',
    'Mercado com espaço para crianças e food trucks com pratos do mundo todo.', ['comida', 'criancas', 'vida-local', 'bike']),
  _pontoMari('nyhavn', 'Nyhavn', 'Copenhague', 55.6798, 12.5910, 'fotos/nyhavn.jpg',
    'O porto colorido do século XVII, o cartão-postal da cidade.',
    'Casas coloridas, barcos de madeira e restaurantes à beira do canal. H.C. Andersen morou em três destas casas.', ['historia', 'arquitetura', 'comida', 'gratis', 'vida-local', 'bike']),

  /* ---------- o centro, os palácios e os museus ---------- */
  _pontoMari('amalienborg', 'Amalienborg', 'Copenhague', 55.6840, 12.5932, 'fotos/amalienborg.jpg',
    'O palácio onde a família real mora.',
    'Quatro palácios iguais em volta da praça, com a troca da guarda todos os dias ao meio-dia.', ['realeza', 'historia', 'arquitetura', 'gratis', 'criancas']),
  _pontoMari('frederiks-kirke', 'Igreja de Mármore (Frederiks Kirke)', 'Copenhague', 55.6850, 12.5894, '',
    'A cúpula verde que se vê da praça de Amalienborg.',
    'Uma das maiores cúpulas da Escandinávia. A entrada é gratuita e, em horários marcados, dá para subir até a cúpula.', ['historia', 'arquitetura', 'gratis', 'chuva']),
  _pontoMari('rosenborg', 'Castelo de Rosenborg', 'Copenhague', 55.6857, 12.5773, 'fotos/rosenborg-int.jpg',
    'As joias da coroa num castelo de conto de fadas.',
    'Quatro séculos de história dos reis dinamarqueses, sala por sala — e, no subsolo, a coroa e as joias reais.', ['realeza', 'historia', 'arquitetura', 'chuva']),
  _pontoMari('christiansborg', 'Palácio de Christiansborg', 'Copenhague', 55.6759, 12.5797, 'fotos/christiansborg.jpg',
    'O Parlamento e mil anos de história.',
    'Os salões reais, o Parlamento e, embaixo do palácio, as ruínas do castelo do bispo Absalon. A torre tem mirante gratuito.', ['realeza', 'historia', 'arquitetura', 'chuva']),
  _pontoMari('rundetaarn', 'Rundetaarn (Torre Redonda)', 'Copenhague', 55.6814, 12.5758, '',
    'Uma torre sem degraus: sobe-se por uma rampa em espiral.',
    'Observatório do século XVII no coração da cidade, com a vista dos telhados de Copenhague lá de cima.', ['historia', 'arquitetura', 'criancas', 'chuva']),
  _pontoMari('stroget', 'Strøget e Amagertorv', 'Copenhague', 55.6786, 12.5790, '',
    'Uma das ruas de pedestres mais longas da Europa.',
    'Lojas, cafés e artistas de rua da Rådhuspladsen até Kongens Nytorv. Em Amagertorv fica a Fonte das Cegonhas.', ['compras', 'vida-local', 'gratis']),
  _pontoMari('grabrodretorv', 'Gråbrødretorv', 'Copenhague', 55.6797, 12.5758, '',
    'Uma das praças mais charmosas do centro.',
    'Casinhas coloridas e mesas ao ar livre, a poucos passos do Strøget — onde o dinamarquês realmente passa o dia.', ['vida-local', 'comida', 'gratis']),
  _pontoMari('radhuspladsen', 'Rådhuspladsen (Praça da Prefeitura)', 'Copenhague', 55.6758, 12.5690, '',
    'A praça central da cidade, ao lado da Prefeitura.',
    'Ponto de encontro de Copenhague, com a estátua de H.C. Andersen olhando para o Tivoli.', ['historia', 'arquitetura', 'gratis', 'vida-local']),
  _pontoMari('tivoli', 'Tivoli Gardens', 'Copenhague', 55.6736, 12.5681, 'fotos/kids/tivoli.jpg',
    'Um dos parques de diversões mais antigos do mundo.',
    'Brinquedos, jardins, luzes e restaurantes no centro de Copenhague, aberto desde 1843.', ['criancas', 'comida']),
  _pontoMari('christianshavn', 'Christianshavn e os canais', 'Copenhague', 55.6737, 12.5929, '',
    'O bairro dos canais e das casas-barco.',
    'O bairro holandês de Copenhague, com casas-barco e cafés à beira d’água.', ['vida-local', 'comida', 'gratis', 'bike']),
  _pontoMari('vor-frelsers', 'Igreja do Salvador (Vor Frelsers Kirke)', 'Copenhague', 55.6728, 12.5939, 'fotos/salvador.jpg',
    'A torre com a escada em espiral por fora.',
    'Os últimos degraus ficam do lado de fora da torre — e a vista lá de cima paga a subida.', ['historia', 'arquitetura']),
  _pontoMari('christiania', 'Christiania', 'Copenhague', 55.6736, 12.5980, '',
    'A cidade livre desde 1971.',
    'Arte, autogestão e regras próprias, com casas feitas à mão à beira do lago. Fotos só onde é permitido.', ['vida-local', 'arte', 'historia', 'gratis']),
  _pontoMari('gefion', 'Fonte de Gefion', 'Copenhague', 55.6894, 12.5975, '',
    'A deusa que, segundo a lenda, criou a ilha da Zelândia.',
    'Fonte monumental ao lado da igreja de St. Alban, no caminho para a Pequena Sereia.', ['historia', 'arte', 'gratis', 'bike']),
  _pontoMari('biblioteca-real', 'Biblioteca Real (Diamante Negro)', 'Copenhague', 55.6734, 12.5827, '',
    'O Diamante Negro, de granito e vidro, à beira do porto.',
    'A biblioteca nacional, com entrada livre no saguão e vista para o canal. Ótima parada para um café.', ['arquitetura', 'gratis', 'chuva']),
  _pontoMari('glyptotek', 'Ny Carlsberg Glyptotek', 'Copenhague', 55.6727, 12.5722, '',
    'Esculturas antigas em volta de um jardim de inverno.',
    'O museu criado pelo dono da Carlsberg: arte grega, romana e egípcia e impressionistas franceses.', ['arte', 'historia', 'chuva']),
  _pontoMari('nationalmuseet', 'Museu Nacional (Nationalmuseet)', 'Copenhague', 55.6747, 12.5748, '',
    'A história da Dinamarca, dos vikings até hoje.',
    'O maior museu de história do país, com um espaço só para as crianças brincarem.', ['historia', 'criancas', 'chuva']),
  _pontoMari('smk', 'SMK — Galeria Nacional de Arte', 'Copenhague', 55.6886, 12.5784, '',
    'Arte dinamarquesa e europeia, dos mestres antigos aos dias de hoje.',
    'O museu nacional de arte, ao lado do parque Østre Anlæg. A coleção permanente tem entrada gratuita.', ['arte', 'gratis', 'chuva']),
  _pontoMari('designmuseum', 'Designmuseum Danmark', 'Copenhague', 55.6866, 12.5929, '',
    'O design dinamarquês contado pelas cadeiras.',
    'Num antigo hospital do século XVIII em Bredgade, com móveis, objetos e moda que ganharam o mundo.', ['arte', 'arquitetura', 'chuva']),
  _pontoMari('magasin', 'Magasin du Nord', 'Copenhague', 55.6793, 12.5847, '',
    'A loja de departamentos mais antiga da Dinamarca.',
    'Na Kongens Nytorv: moda, design e uma praça de alimentação no subsolo para um lanche em dia de chuva.', ['compras', 'chuva', 'comida']),
  _pontoMari('jaegersborggade', 'Jægersborggade', 'Copenhague', 55.6927, 12.5439, '',
    'A ruazinha mais charmosa de Nørrebro.',
    'Cafés, padarias, cerâmica e lojinhas de designers locais, ao lado do cemitério Assistens.', ['compras', 'comida', 'vida-local']),
  _pontoMari('kodbyen', 'Kødbyen (o antigo bairro dos açougues)', 'Copenhague', 55.6685, 12.5616, '',
    'Os galpões dos açougues viraram point de restaurantes.',
    'Prédios brancos dos anos 1930 com restaurantes, bares e galerias — animado à noite.', ['comida', 'vida-local']),
  _pontoMari('carlsberg', 'Home of Carlsberg', 'Copenhague', 55.6646, 12.5303, 'fotos/carlsberg.jpg',
    'A cervejaria que virou museu.',
    'A história da Carlsberg desde 1847, o Portão dos Elefantes e, no fim, a degustação.', ['historia', 'comida', 'chuva']),
  _pontoMari('parken', 'Parken (estádio do FC København)', 'Copenhague', 55.7025, 12.5722, 'fotos/futebol.jpg',
    'Os bastidores do estádio de Copenhague.',
    'Casa do FC København e da seleção dinamarquesa: vestiário, túnel e gramado, o caminho que o jogador faz (visita combinada antes).', ['vida-local', 'criancas']),
  _pontoMari('nordhavn', 'Nordhavn e o The Silo', 'Copenhague', 55.7082, 12.5979, '',
    'O porto industrial que virou bairro modelo.',
    'Silos de grãos transformados em prédios — o The Silo tem restaurante e mirante no último andar.', ['arquitetura', 'bike', 'vida-local']),
  _pontoMari('islands-brygge', 'Havnebadet Islands Brygge', 'Copenhague', 55.6685, 12.5775, '',
    'Nadar no porto, no meio da cidade.',
    'A piscina pública dentro do canal, gratuita no verão, com o gramado de Islands Brygge em volta.', ['natureza', 'gratis', 'vida-local', 'criancas', 'bike']),
  _pontoMari('cykelslangen', 'Cykelslangen (a serpente das bicicletas)', 'Copenhague', 55.6626, 12.5637, '',
    'Uma ciclovia suspensa que serpenteia sobre o porto.',
    'A ponte só para bicicletas que leva à Bryggebroen, rumo a Islands Brygge — o jeito mais dinamarquês de cruzar o canal.', ['bike', 'arquitetura', 'gratis']),
  _pontoMari('orestad', 'Ørestad e o 8 Tallet', 'Copenhague', 55.6174, 12.5718, 'fotos/arquitetura.jpg',
    'A Montanha, o 8 Tallet e prédios premiados no mundo inteiro.',
    'O bairro novo de Copenhague, com os projetos de Bjarke Ingels — dá para pedalar até o alto do 8 Tallet.', ['arquitetura', 'bike']),
  _pontoMari('grundtvig', 'Igreja de Grundtvig', 'Copenhague', 55.7166, 12.5336, '',
    'Uma igreja que parece um órgão gigante.',
    'Tijolo amarelo e linhas verticais em Bispebjerg: imponente por fora, luminosa por dentro.', ['arquitetura', 'historia', 'gratis']),
  _pontoMari('frederiksberg-have', 'Frederiksberg Have', 'Copenhague', 55.6743, 12.5253, '',
    'Jardim romântico com canais, pontes e um palácio.',
    'Ótimo para um piquenique; de lá se vê o recinto dos elefantes do Zoológico.', ['natureza', 'criancas', 'gratis', 'realeza']),
  _pontoMari('cisternerne', 'Cisternerne', 'Copenhague', 55.6695, 12.5245, '',
    'Um antigo reservatório de água, debaixo da terra.',
    'Galerias escuras e úmidas que viram cenário de exposições de arte — programa diferente para um dia de chuva.', ['arte', 'chuva']),

  /* ---------- as ideias dela para as crianças ---------- */
  _pontoMari('zoo', 'Zoológico de Copenhague', 'Copenhague', 55.6725, 12.5213, 'fotos/kids/zoo.jpg',
    'Um dos zoológicos mais antigos da Europa (1859).',
    'Em Frederiksberg, com animais em espaços modernos — os pandas são as estrelas.', ['criancas', 'natureza']),
  _pontoMari('planetario', 'Planetário (Tycho Brahe)', 'Copenhague', 55.6746, 12.5582, 'fotos/kids/planetario.jpg',
    'Espaço, ciência e cinema imersivo.',
    'Perto dos lagos. Ótimo para crianças de 6+ e para dias de chuva.', ['criancas', 'chuva']),
  _pontoMari('ilusoes', 'Museum of Illusions', 'Copenhague', 55.6772, 12.5707, 'fotos/kids/ilusoes.jpg',
    'Ilusões de ótica, salas “malucas” e fotos divertidas.',
    'No começo do Strøget, perto da Rådhuspladsen. Uma hora de risadas em família.', ['criancas', 'chuva']),
  _pontoMari('ikono', 'IKONO Copenhagen', 'Copenhague', 55.6830, 12.5730, 'fotos/kids/ikono.jpg',
    'Salas temáticas de cores e luzes — perfeito para fotos.',
    'Museu imersivo perto de Torvehallerne, com piscina de bolinhas e salas para brincar.', ['criancas', 'chuva', 'arte']),
  _pontoMari('experimentarium', 'Experimentarium', 'Copenhague', 55.7265, 12.5800, 'fotos/kids/experimentarium.jpg',
    'Museu de ciência onde tudo é feito para tocar.',
    'Em Hellerup, ao norte do centro: testar, experimentar e descobrir. Perfeito para dias de chuva.', ['criancas', 'chuva']),
  _pontoMari('blaa-planet', 'Den Blå Planet (Aquário Nacional)', 'Copenhague', 55.6381, 12.6556, 'fotos/kids/blaaplanet.jpg',
    'O Aquário Nacional da Dinamarca.',
    'Tubarões e um túnel debaixo d’água, perto do aeroporto, a 20 minutos do centro.', ['criancas', 'chuva', 'natureza']),
  _pontoMari('bakken', 'Bakken (Dyrehavsbakken)', 'Arredores', 55.7759, 12.5748, 'fotos/kids/bakken.jpg',
    'O parque de diversões mais antigo do mundo ainda funcionando (1583).',
    'Dentro da floresta de Dyrehaven, com cervos soltos. A entrada é gratuita; paga-se por brinquedo.', ['criancas', 'natureza']),
  _pontoMari('dyrehaven', 'Dyrehaven e o Eremitage', 'Arredores', 55.7953, 12.5711, '',
    'A floresta real dos cervos.',
    'Centenas de cervos soltos em volta do palácio de caça Eremitage. Lindo de bicicleta.', ['natureza', 'realeza', 'gratis', 'bike', 'criancas']),
  _pontoMari('gigantes', 'Gigantes de Thomas Dambo', 'Arredores', 55.6474, 12.3430, 'fotos/gigante.jpg',
    'Gigantes de madeira reciclada escondidos na natureza.',
    'Uma caça ao tesouro pelas florestas ao redor de Copenhague — este é o Thomas, no alto de uma colina em Albertslund.', ['criancas', 'natureza', 'arte', 'gratis']),
  _pontoMari('vikingeskib', 'Museu dos Navios Vikings', 'Arredores', 55.6501, 12.0789, 'fotos/kids/vikingeskib.jpg',
    'Cinco navios vikings originais, resgatados do fiorde.',
    'Em Roskilde, com réplicas em tamanho real; no verão dá para navegar num barco viking.', ['historia', 'criancas', 'chuva']),
  _pontoMari('roskilde-domkirke', 'Catedral de Roskilde', 'Arredores', 55.6427, 12.0803, '',
    'Onde estão enterrados os reis da Dinamarca.',
    'Quarenta reis e rainhas na mesma igreja, do século XII até hoje. Patrimônio da UNESCO.', ['historia', 'realeza', 'arquitetura', 'chuva']),
  _pontoMari('kronborg', 'Castelo de Kronborg', 'Arredores', 56.0389, 12.6213, 'fotos/kronborg.jpg',
    'O castelo de Hamlet, à beira do mar.',
    'Patrimônio da UNESCO em Helsingør — do pátio se vê a Suécia, a quatro quilômetros.', ['historia', 'realeza', 'arquitetura']),
  _pontoMari('louisiana', 'Louisiana Museum of Modern Art', 'Arredores', 55.9690, 12.5430, '',
    'Arte moderna num jardim de frente para o mar.',
    'Em Humlebæk: esculturas no gramado, vista para a Suécia e um café com terraço.', ['arte', 'natureza', 'chuva']),
  _pontoMari('frederiksborg', 'Castelo de Frederiksborg', 'Arredores', 55.9344, 12.3006, 'fotos/frederiksborg.jpg',
    'O maior castelo renascentista da Escandinávia.',
    'Em Hillerød, construído sobre ilhas num lago, com o Museu de História Nacional e jardins barrocos.', ['historia', 'realeza', 'arquitetura', 'chuva']),
  _pontoMari('forest-tower', 'Forest Tower (Camp Adventure)', 'Arredores', 55.2587, 11.9802, 'fotos/foresttower.jpg',
    'Um mirante em espiral acima das copas das árvores.',
    'Em Gisselfeld Klosters Skove: 45 metros de rampa sem degrau — dá para subir com carrinho de bebê.', ['natureza', 'criancas', 'arquitetura']),

  /* ---------- Suécia ---------- */
  _pontoMari('malmo', 'Malmö: Lilla Torg e o centro histórico', 'Suécia', 55.6051, 12.9988, '',
    'Outro país, pela ponte do Øresund.',
    'Stortorget, Lilla Torg e as casas de enxaimel suecas, a uns 35 minutos de trem de Copenhague.', ['historia', 'comida', 'compras', 'vida-local']),
  _pontoMari('turning-torso', 'Turning Torso (Malmö)', 'Suécia', 55.6131, 12.9763, 'fotos/malmo.jpg',
    'O arranha-céu torcido de Calatrava.',
    'Símbolo de Västra Hamnen, o bairro novo de Malmö, com calçadão à beira-mar.', ['arquitetura', 'bike']),

  /* ---------- Dinamarca (mais longe: dia inteiro) ---------- */
  _pontoMari('legoland', 'LEGOLAND Billund', 'Dinamarca', 55.7356, 9.1261, 'fotos/kids/legoland.jpg',
    'O primeiro LEGOLAND do mundo (1968).',
    'Em Billund, ao lado da fábrica original da LEGO — cerca de 3 horas de Copenhague.', ['criancas', 'dia-inteiro']),
  _pontoMari('legohouse', 'LEGO House', 'Dinamarca', 55.7309, 9.1147, 'fotos/kids/legohouse.jpg',
    'A casa da LEGO, na cidade onde ela nasceu.',
    'Criar, explorar e aprender brincando, no centro de Billund. Reserve o horário com antecedência.', ['criancas', 'chuva', 'arquitetura']),
  _pontoMari('hcandersen', 'Museu H.C. Andersen (Odense)', 'Dinamarca', 55.3987, 10.3909, 'fotos/kids/hcandersen.jpg',
    'Uma viagem para dentro dos contos de Andersen.',
    'Em Odense, a cidade natal do escritor: arquitetura, luz e som, com um espaço para as crianças brincarem.', ['criancas', 'historia', 'arte', 'chuva']),
];

/* as ideias para crianças do Personalize (PERS_CRIANCAS) → o lugar no banco */
window.PONTOS_KIDS = { tivoli: 'tivoli', zoo: 'zoo', blaaplanet: 'blaa-planet', experimentarium: 'experimentarium', ilusoes: 'ilusoes', ikono: 'ikono',
  planetario: 'planetario', trolls: 'gigantes', bakken: 'bakken', vikingeskib: 'vikingeskib', legoland: 'legoland', legohouse: 'legohouse', hcandersen: 'hcandersen' };

/* ---------- a busca e os lugares dela ---------- */
const Pontos = (function () {
  const norm = (s) => String(s || '').toLowerCase().replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const meus = () => { if (typeof DB === 'undefined' || !DB) return []; if (!Array.isArray(DB.pontosMari)) DB.pontosMari = []; return DB.pontosMari; };
  const ehBanco = (id) => !!id && window.PONTOS_MARI.some(p => p.id === id);
  /* "crianças", "criança", "kids" → criancas; "chuva" → chuva … */
  const ALIAS = { crianca: 'criancas', criancas: 'criancas', kids: 'criancas', infantil: 'criancas', bicicleta: 'bike', bike: 'bike', pedalar: 'bike',
    historia: 'historia', castelo: 'historia', castelos: 'historia', realeza: 'realeza', rei: 'realeza', rainha: 'realeza', arte: 'arte', museu: 'arte', museus: 'arte',
    arquitetura: 'arquitetura', design: 'arquitetura', natureza: 'natureza', parque: 'natureza', parques: 'natureza', comida: 'comida', gastronomia: 'comida', cerveja: 'comida',
    gratis: 'gratis', gratuito: 'gratis', chuva: 'chuva', compras: 'compras', loja: 'compras', lojas: 'compras', 'vida local': 'vida-local', 'vida-local': 'vida-local', local: 'vida-local', hygge: 'vida-local',
    'dia inteiro': 'dia-inteiro', 'dia-inteiro': 'dia-inteiro' };
  const tag = (t) => { const n = norm(t); return ALIAS[n] || (PONTOS_TAGS.some(([k]) => k === n) ? n : (PONTOS_TAGS.find(([, l]) => norm(l) === n) || [])[0] || ''); };
  return {
    TAGS: PONTOS_TAGS, AREAS: PONTOS_AREAS, norm, tag, ehBanco,
    todos() { return window.PONTOS_MARI.concat(meus()); },
    meus,
    get(id) { return this.todos().find(p => p.id === id) || null; },
    /* banco embutido (o cliente também tem): só estes viajam no link como {p: id} */
    doBanco(id) { return window.PONTOS_MARI.find(p => p.id === id) || null; },
    rotuloTag(k) { return (PONTOS_TAGS.find(([t]) => t === k) || [k, k])[1]; },
    /* busca por nome, tag ou área; sem acento, ø = o, æ = ae */
    busca(q, opts) {
      opts = opts || {};
      const n = norm(q), termos = n ? n.split(' ') : [];
      const lista = this.todos().filter(p => !opts.area || p.area === opts.area);
      if (!termos.length) return lista.slice(0, opts.max || 12);
      const pontua = (p) => {
        const nome = norm(p.nome), resto = norm([p.area, p.frase, (p.tags || []).map(t => t + ' ' + this.rotuloTag(t)).join(' ')].join(' '));
        let s = 0;
        for (const t of termos) {
          if (nome.startsWith(t) || nome.includes(' ' + t)) s += 6; else if (nome.includes(t)) s += 4;
          else if ((p.tags || []).includes(tag(t))) s += 3; else if (resto.includes(t)) s += 1; else return 0;
        }
        return s;
      };
      return lista.map(p => [pontua(p), p]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, opts.max || 12).map(([, p]) => p);
    },
    /* guarda um lugar dela (novo ou mudado). Devolve o lugar. */
    salva(p) {
      const l = meus();
      const x = Object.assign({ nome: '', area: 'Copenhague', lat: null, lng: null, foto: '', frase: '', texto: '', tags: [] }, p || {});
      if (!x.id || !String(x.id).startsWith('m-')) x.id = 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      x.lat = x.lat === '' || x.lat === null || x.lat === undefined || isNaN(+x.lat) ? null : +x.lat;
      x.lng = x.lng === '' || x.lng === null || x.lng === undefined || isNaN(+x.lng) ? null : +x.lng;
      x.tags = (x.tags || []).map(tag).filter(Boolean);
      const i = l.findIndex(y => y.id === x.id);
      if (i < 0) l.push(x); else l[i] = Object.assign(l[i], x);
      if (typeof save === 'function') save();
      return i < 0 ? x : l[i];
    },
    remove(id) { if (!String(id || '').startsWith('m-')) return false; DB.pontosMari = meus().filter(p => p.id !== id); if (typeof save === 'function') save(); return true; },
    /* todas as fotos que ela pode escolher para uma parada */
    fotos() { return [...new Set(this.todos().map(p => p.foto).concat(['fotos/nyhavn2.jpg', 'fotos/nyhavn3.jpg', 'fotos/bikefam/nyhavn-noite.jpg', 'fotos/bike.jpg', 'fotos/mapa.jpg', 'fotos/kids/trolls.jpg', 'fotos/viking.jpg', 'fotos/carlsberg2.jpg', 'fotos/museu.jpg', 'fotos/arquitetura2.jpg', 'fotos/castelo.jpg', 'fotos/van.jpg']).filter(Boolean))]; },
  };
})();
window.Pontos = Pontos;
window.pontosTodos = function () { return Pontos.todos(); };
