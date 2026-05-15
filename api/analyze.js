export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageData, mediaType, profile, locationCtx, comboPrompt, isCombo } = req.body;

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) return res.status(500).json({ error: "Chave de API não configurada." });

  let messages;

  if (isCombo) {
    // Combo mode - text only
    messages = [{
      role: "user",
      content: comboPrompt + " Responda SOMENTE com JSON valido sem markdown. Campos obrigatorios: titulo, receitas (array de 3 com n/tipo/tempo/desc), nutri (string), harmonizacao (string)."
    }];
  } else {
    if (!imageData || !mediaType) return res.status(400).json({ error: "Imagem obrigatória." });

    const locationInfo = locationCtx || "Use precos medios do Brasil.";
    const prompt = "Voce e um chef especialista em culinaria brasileira. Identifique o alimento na imagem. Nivel do usuario: " + (profile || "iniciante") + ". " + locationInfo + " Responda SOMENTE com JSON valido sem markdown. Campos obrigatorios: nome, emoji, categoria, confianca (Alta|Media|Baixa), tags (array 3), desc (2 frases), grid (array 4 pares [[chave,valor]]), preco ({valor,referencia,dica,melhorEpoca}), nutri (array 4 pares [[nutriente,numero]]), curiosidades (array 3), tecnicas (array 3 strings), receitas (array 3 com {n,tipo,tempo}), receita_detalhada ({n,tempo,rend,ing,steps,tip,emplatamento}).";

    messages = [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: "data:" + mediaType + ";base64," + imageData } },
        { type: "text", text: prompt }
      ]
    }];
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": "https://ff-app-cjw9.vercel.app",
        "X-Title": "Flavor Fusion"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        max_tokens: 3000,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", err);
      return res.status(502).json({ error: "Erro ao conectar com a IA." });
    }

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || "Erro da IA" });

    let text = data.choices[0].message.content || "";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Resposta da IA inválida." });

    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Erro interno: " + err.message });
  }
}
