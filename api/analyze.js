export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try {
    body = req.body;
  } catch(e) {
    return res.status(400).json({ error: "Body inválido: " + e.message });
  }

  const { imageData, mediaType, profile, locationCtx, comboPrompt, isCombo } = body || {};

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_KEY não configurada no servidor." });

  let model, messages;

  if (isCombo) {
    model = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
    const textPrompt = comboPrompt || "Crie 3 receitas combinando ingredientes diversos.";
    messages = [{
      role: "user",
      content: textPrompt + " Responda SOMENTE com JSON valido sem markdown nem texto extra. Estrutura obrigatoria: {\"titulo\":\"string\",\"receitas\":[{\"n\":\"nome\",\"tipo\":\"tipo\",\"tempo\":\"Xmin\",\"desc\":\"desc\",\"ingredientes\":[\"item1\",\"item2\"],\"passos\":[\"passo1\",\"passo2\"],\"dica\":\"dica\"}],\"nutri\":\"string\",\"harmonizacao\":\"string\"}"
    }];
  } else {
    if (!imageData || !mediaType) {
      return res.status(400).json({ error: "imageData e mediaType são obrigatórios para análise de foto." });
    }
    model = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
    const locationInfo = locationCtx || "Use precos medios do Brasil.";
    const prompt = "Voce e um chef especialista em culinaria brasileira. Identifique o alimento na imagem. Nivel: " + (profile || "iniciante") + ". " + locationInfo + " Responda SOMENTE com JSON valido sem markdown. Campos: nome, emoji, categoria, confianca (Alta|Media|Baixa), tags (array 3), desc (2 frases), grid (array 4 pares [[chave,valor]]), preco ({valor,referencia,dica,melhorEpoca}), nutri (array 4 pares [[nutriente,numero]]), curiosidades (array 3), tecnicas (array 3), receitas (array 3 com {n,tipo,tempo}), receita_detalhada ({n,tempo,rend,ing,steps,tip,emplatamento}).";
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
        model: model,
        max_tokens: 3000,
        messages: messages
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("OpenRouter error:", response.status, responseText.slice(0, 300));
      return res.status(502).json({ error: "Erro OpenRouter " + response.status + ": " + responseText.slice(0, 100) });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch(e) {
      return res.status(500).json({ error: "Resposta não é JSON: " + responseText.slice(0, 100) });
    }

    if (data.error) {
      return res.status(500).json({ error: "Erro da IA: " + (data.error.message || JSON.stringify(data.error)) });
    }

    let text = (data.choices?.[0]?.message?.content || "").trim();
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "JSON não encontrado. Resposta: " + text.slice(0, 150) });
    }

    let jsonStr = jsonMatch[0];
    jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    try {
      return res.status(200).json(JSON.parse(jsonStr));
    } catch(parseErr) {
      return res.status(500).json({ error: "Parse error: " + parseErr.message + " | " + jsonStr.slice(0, 150) });
    }

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Erro interno: " + err.message });
  }
}
