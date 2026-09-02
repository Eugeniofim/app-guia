/* Cobrança por cartão, via Stripe.
   Roda no servidor do Supabase, não no navegador — a chave secreta do Stripe
   não pode existir dentro do app: quem abrisse o código-fonte da página
   poderia emitir cobranças e reembolsos em nome dela.

   REGRA QUE NÃO PODE SER QUEBRADA: o VALOR NUNCA VEM DO NAVEGADOR.
   O app manda só o id da reserva. Esta função lê a reserva no banco e
   calcula quanto é devido. Se o valor viesse do cliente, bastaria ele
   trocar 390 por 1 no formulário para fazer o passeio por um euro.

   Dois caminhos:
     POST {reservaId}          -> cria a cobrança e devolve o link do Stripe
     POST {verificar: sessao}  -> confere no Stripe se foi pago e, se foi,
                                  grava o pagamento na reserva

   Por que gravar aqui e não no app: o navegador não pode ser a autoridade
   sobre "isto foi pago". Aqui a gente pergunta ao Stripe e escreve no banco
   com a chave de serviço. */

const STRIPE = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SUPA_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/* Só o app do guia fala com esta função. Sem isto, qualquer site poderia
   chamá-la do navegador de terceiros. O endereço vem do segredo APP_ORIGEM
   (ex.: https://app.exemplo.com), definido no painel do Supabase ao lado de
   STRIPE_SECRET_KEY — o código não sabe de nenhum domínio. */
const ORIGENS = [Deno.env.get('APP_ORIGEM') ?? '', 'http://localhost:8899'].filter(Boolean);

function cors(origem: string | null) {
  const ok = origem && ORIGENS.includes(origem) ? origem : ORIGENS[0];
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(corpo: unknown, status: number, origem: string | null) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors(origem), 'Content-Type': 'application/json' },
  });
}

/* O Stripe aceita form-urlencoded; assim não precisamos de biblioteca
   nenhuma, e a função não depende de pacote que possa sumir. */
function form(obj: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) p.set(k, String(v));
  return p;
}

async function stripe(caminho: string, corpo?: URLSearchParams, metodo = 'POST') {
  const r = await fetch('https://api.stripe.com/v1/' + caminho, {
    method: metodo,
    headers: {
      'Authorization': 'Bearer ' + STRIPE,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20',
    },
    body: metodo === 'POST' ? corpo : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || ('Stripe HTTP ' + r.status));
  return j;
}

async function supa(caminho: string, init: RequestInit = {}) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + caminho, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: 'Bearer ' + SERVICE,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error('Supabase HTTP ' + r.status + ' — ' + (await r.text()).slice(0, 200));
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

/* Quanto falta receber nesta reserva, em centavos.
   Mesma conta da tela: sinal de 50% quando a política é "split".
   Desconta o que já foi pago — se ela já registrou metade na mão, o cartão
   cobra só o resto, em vez de cobrar duas vezes. */
function centavosDevidos(b: any) {
  const total = Number(b?.total) || 0;
  const agora = b?.policy === 'split' ? Math.round(total / 2) : total;
  const pago = (b?.payments || []).reduce((s: number, p: any) => s + (Number(p?.amount) || 0), 0);
  const falta = Math.max(0, agora - pago);
  return Math.round(falta * 100);
}

Deno.serve(async (req) => {
  const origem = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origem) });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405, origem);

  if (!STRIPE) return json({ erro: 'falta o segredo STRIPE_SECRET_KEY' }, 500, origem);

  let corpo: any = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }

  try {
    /* ---------- conferir um pagamento e gravar ---------- */
    if (corpo.verificar) {
      const s = await stripe('checkout/sessions/' + encodeURIComponent(corpo.verificar), undefined, 'GET');
      if (s.payment_status !== 'paid') return json({ pago: false }, 200, origem);

      const reservaId = s.metadata?.reservaId;
      if (!reservaId) return json({ pago: true, gravado: false, erro: 'sessao sem reserva' }, 200, origem);

      const linhas = await supa('bookings?id=eq.' + encodeURIComponent(reservaId) + '&select=data');
      const b = linhas?.[0]?.data;
      if (!b) return json({ pago: true, gravado: false, erro: 'reserva nao encontrada' }, 200, origem);

      /* Idempotência: se este pagamento já foi gravado, não grava de novo.
         O cliente pode recarregar a página de sucesso à vontade, e o robô
         pode conferir a mesma sessão — não pode virar dinheiro em dobro. */
      const jaTem = (b.payments || []).some((p: any) => p.stripe === s.id);
      if (!jaTem) {
        b.payments = b.payments || [];
        b.payments.push({
          amount: (s.amount_total || 0) / 100,
          date: new Date().toISOString().slice(0, 10),
          method: 'card',
          kind: (s.amount_total || 0) / 100 >= (b.total || 0) ? 'full' : 'deposit',
          stripe: s.id,
        });
        await supa('bookings?id=eq.' + encodeURIComponent(reservaId), {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ data: b }),
        });
      }
      return json({ pago: true, gravado: true, jaEstava: jaTem, valor: (s.amount_total || 0) / 100 }, 200, origem);
    }

    /* ---------- criar a cobrança ---------- */
    const reservaId = String(corpo.reservaId || '');
    if (!reservaId) return json({ erro: 'falta reservaId' }, 400, origem);

    const linhas = await supa('bookings?id=eq.' + encodeURIComponent(reservaId) + '&select=data');
    const b = linhas?.[0]?.data;
    if (!b) return json({ erro: 'reserva nao encontrada' }, 404, origem);
    if (b.status === 'cancelled') return json({ erro: 'reserva cancelada' }, 400, origem);

    const centavos = centavosDevidos(b);
    /* O Stripe recusa valores minúsculos, e cobrar zero não faz sentido. */
    if (centavos < 100) return json({ erro: 'nada a cobrar' }, 400, origem);

    /* O nome do passeio vem do banco, não do navegador: é o que o cliente
       vai ler na fatura do cartão dele. */
    const estado = await supa('appstate?id=eq.1&select=data');
    const passeios = estado?.[0]?.data?.tours || [];
    const x = passeios.find((t: any) => t.id === b.tourId);
    const lang = b.lang === 'en' ? 'en' : 'pt';
    const nome = (x?.name && (x.name[lang] || x.name.pt)) || 'Passeio';

    const base = origem && ORIGENS.includes(origem) ? origem : ORIGENS[0];
    const s = await stripe('checkout/sessions', form({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': centavos,
      'line_items[0][price_data][product_data][name]': nome,
      'line_items[0][price_data][product_data][description]':
        `${b.date} · ${b.time} · ${b.pax} ${lang === 'en' ? 'people' : 'pessoa(s)'} · ${b.code}`,
      'line_items[0][quantity]': 1,
      'metadata[reservaId]': b.id,
      'metadata[codigo]': b.code,
      customer_email: b.email || undefined,
      locale: lang === 'en' ? 'en' : 'pt-BR',
      success_url: `${base}/#/pago/${encodeURIComponent(b.code)}?s={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#/tour/${encodeURIComponent(b.tourId)}`,
    }));

    return json({ url: s.url, valor: centavos / 100 }, 200, origem);
  } catch (e) {
    /* A mensagem crua do Stripe pode conter detalhe interno; o cliente vê
       algo genérico e o detalhe fica no log da função. */
    console.error('pagar:', e instanceof Error ? e.message : e);
    return json({ erro: 'nao consegui iniciar o pagamento' }, 500, origem);
  }
});
