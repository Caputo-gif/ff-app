// api/notify.js — envia notificação de gorjeta por email via Resend
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { msg, nome, tel, valor } = req.body;
  const resendKey = process.env.RESEND_API_KEY;

  // Log always
  console.log("GORJETA:", msg);

  if (!resendKey) {
    // No email key configured - just log
    return res.status(200).json({ ok: true, note: "logged only" });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + resendKey
      },
      body: JSON.stringify({
        from: "Flavor Fusion <notificacoes@flavorfusion.app>",
        to: ["diego_caputto@hotmail.com"],
        subject: "💚 Nova gorjeta no Flavor Fusion — R$" + valor,
        html: "<h2>💚 Nova gorjeta recebida!</h2><p><strong>Nome:</strong> " + (nome||"Anônimo") + "</p><p><strong>Telefone:</strong> " + (tel||"-") + "</p><p><strong>Valor:</strong> R$" + valor + "</p><p><strong>Horário:</strong> " + new Date().toLocaleString("pt-BR") + "</p>"
      })
    });

    if (!response.ok) {
      console.error("Resend error:", await response.text());
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Notify error:", err);
    return res.status(200).json({ ok: true }); // Don't fail silently
  }
}
