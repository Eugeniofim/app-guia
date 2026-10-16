/* =====================================================
   BANCO DE PONTOS — Ailton Guia Viena (16/10/2026)
   Só os lugares que o site dele cita nos passeios e em "Além de Viena",
   com as frases do site. Fotos dos lugares: Pexels (licença livre, alta
   resolução — as do site dele são pequenas e pixelizam no laptop); as fotos
   do Aílton com os clientes aparecem inteiras em ailton.js. A aba "Pontos turísticos" saiu
   do painel a pedido; este banco só alimenta as paradas dos passeios.
   ===================================================== */
'use strict';

const PONTOS = [
  {"id":"centro","n":"Centro histórico de Viena","area":"centro","lat":48.2085,"lng":16.3731,"d":"Passeio pelo centro histórico de Viena, com informações históricas e culturais.","ph":"fotos/v-stephansdom.jpg","cr":"Foto: Irina Nesterenko · Pexels","fonte":"ailton"},
  {"id":"hofburg","n":"Palácio Hofburg","area":"centro","lat":48.2066,"lng":16.3655,"d":"O palácio de inverno de Viena.","ph":"fotos/v-burgtor.jpg","cr":"Foto: Pexels","fonte":"ailton"},
  {"id":"ring","n":"Anel da cidade (Ring Boulevard)","area":"ring","lat":48.2104,"lng":16.3571,"d":"O Anel da cidade, com todos os monumentos.","ph":"fotos/v-ring.jpg","cr":"Foto: Pexels","fonte":"ailton"},
  {"id":"belvedere","n":"Palácio Belvedere","area":"belvedere","lat":48.1915,"lng":16.3809,"d":"","ph":"fotos/v-belvedere.jpg","cr":"Foto: Vish Pix · Pexels","fonte":"ailton"},
  {"id":"schonbrunn","n":"Palácio Schönbrunn","area":"schonbrunn","lat":48.1849,"lng":16.3122,"d":"O palácio de verão de Viena.","ph":"fotos/v-schonbrunn.jpg","cr":"Foto: Minsu B · Pexels","fonte":"ailton"},
  {"id":"salzburg","n":"Salzburgo","area":"austria","lat":47.8095,"lng":13.055,"d":"Cidade natal de Mozart, nos pés dos Alpes.","ph":"fotos/d-salzburg.jpg","cr":"Foto: Laura Chouette · Pexels","fonte":"ailton"},
  {"id":"hallstatt","n":"Hallstatt","area":"austria","lat":47.5622,"lng":13.6493,"d":"Um dos cenários mais belos da Áustria.","ph":"fotos/d-hallstatt.jpg","cr":"Foto: Aravind Sreekumar Nair · Pexels","fonte":"ailton"},
  {"id":"innsbruck","n":"Innsbruck","area":"austria","lat":47.2692,"lng":11.4041,"d":"Capital do Tirol, rodeada pelos Alpes.","ph":"fotos/d-innsbruck.jpg","cr":"Foto: Eduardo Ortiz · Pexels","fonte":"ailton"},
  {"id":"linz","n":"Linz","area":"austria","lat":48.3069,"lng":14.2858,"d":"Capital Europeia da Cultura em 2009, onde Kepler descobriu as leis do movimento planetário.","ph":"fotos/d-linz.jpg","cr":"Foto: Ailton Guia Viena","fonte":"ailton"},
  {"id":"graz","n":"Graz","area":"austria","lat":47.0707,"lng":15.4395,"d":"A segunda maior cidade da Áustria e cidade natal de Arnold Schwarzenegger. O Kunsthaus é o icônico museu de arte contemporânea.","ph":"fotos/d-graz.jpg","cr":"Foto: Ahmet Yüksek · Pexels","fonte":"ailton"}
];

const AREAS = {
  centro: 'Centro histórico', ring: 'Ring', belvedere: 'Belvedere', schonbrunn: 'Schönbrunn', austria: 'Além de Viena',
};
function ponto(id) { return (typeof DB !== 'undefined' && DB && Array.isArray(DB.pontos) && DB.pontos.find(p => p.id === id)) || PONTOS.find(p => p.id === id) || null; }

if (typeof module !== 'undefined') module.exports = { PONTOS, AREAS, ponto };
