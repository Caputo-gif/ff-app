// api/payment.js
// Gerencia pagamentos via Stripe e controle de uso diário
// Integra com KV store do Vercel para persistir dados de uso

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Preços Stripe (criar no dashboard e colar os IDs aqui)
const PRICES = {
  photo: process.env.STRIPE_PRICE_PHOTO,       // R$1,00 por foto
  unlimited: process.env.STRIPE_PRICE_UNLIMITED // R$2,00 acesso ilimitado no dia
};

// Vercel KV — armazena uso por IP/usuário
async function getUsage(userId) {
  const today = new Date().toISOString().slice(0, 10); // "2025-05-14"
  const key = `usage:${userId}:${today}`;
  try {
    const res = await fetch(
      `${process.env.KV_REST_API_URL}/get/${key}`,
      { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } }
    );
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : { photos: 0, ingredients: 0, unlimitedIngredients: false };
  } catch {
    return { photos: 0, ingredients: 0, unlimitedIngredients: false };
  }
}

async function setUsage(userId, usage) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `usage:${userId}:${today}`;
  // Expira em 2 dias
  await fetch(
    `${process.env.KV_REST_API_URL}/set/${key}?ex=172800`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(JSON.stringify(usage))
    }
  );
}

export default async function handler(req, res) {
  const { action } = req.query;

  // Identificar usuário por IP (sem login para simplificar)
  const userId = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "anon";

  // GET /api/payment?action=status — retorna uso atual do dia
  if (req.method === "GET" && action === "status") {
    const usage = await getUsage(userId);
    return res.status(200).json({ userId, ...usage, today: new Date().toISOString().slice(0, 10) });
  }

  // POST /api/payment?action=increment-ingredient — registra uso de ingrediente
  if (req.method === "POST" && action === "increment-ingredient") {
    const usage = await getUsage(userId);
    usage.ingredients = (usage.ingredients || 0) + 1;
    await setUsage(userId, usage);
    return res.status(200).json({ ok: true, ingredients: usage.ingredients, unlimitedIngredients: usage.unlimitedIngredients });
  }

  // POST /api/payment?action=create-checkout — cria sessão de pagamento Stripe
  if (req.method === "POST" && action === "create-checkout") {
    const { type, successUrl, cancelUrl } = req.body;

    if (!PRICES[type]) {
      return res.status(400).json({ error: "Tipo de pagamento inválido" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: PRICES[type], quantity: 1 }],
        mode: "payment",
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&type=${type}&uid=${userId}`,
        cancel_url: cancelUrl,
        metadata: { userId, type },
        locale: "pt-BR",
        currency: "brl",
      });

      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error("Stripe error:", err);
      return res.status(500).json({ error: "Erro ao criar pagamento" });
    }
  }

  // POST /api/payment?action=confirm — confirma pagamento e libera uso
  if (req.method === "POST" && action === "confirm") {
    const { sessionId, type, uid } = req.body;

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Pagamento não confirmado" });
      }

      const targetUserId = uid || session.metadata.userId;
      const usage = await getUsage(targetUserId);

      if (type === "photo") {
        usage.photos = (usage.photos || 0) + 1;
      } else if (type === "unlimited") {
        usage.unlimitedIngredients = true;
      }

      await setUsage(targetUserId, usage);
      return res.status(200).json({ ok: true, ...usage });
    } catch (err) {
      console.error("Confirm error:", err);
      return res.status(500).json({ error: "Erro ao confirmar pagamento" });
    }
  }

  // Webhook Stripe (para confirmar pagamentos assíncronos)
  if (req.method === "POST" && action === "webhook") {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      const rawBody = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data));
      });
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        const { userId, type } = session.metadata;
        const usage = await getUsage(userId);
        if (type === "photo") usage.photos = (usage.photos || 0) + 1;
        if (type === "unlimited") usage.unlimitedIngredients = true;
        await setUsage(userId, usage);
      }
    }

    return res.status(200).json({ received: true });
  }

  return res.status(404).json({ error: "Rota não encontrada" });
}
