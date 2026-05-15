export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageData, mediaType, profile, locationCtx, comboPrompt, isCombo } = req.body || {};

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) return res.status(500).json({ error: "Chave nao configurada." });

  const model = "nvidia/nemotron-3-super-120b-a12b:free";
  let messages;

  if (isCombo) {
    const jsonTemplate = '{"titulo":"string","receitas":[{"n":"nome","tipo":"tipo","tempo":"Xmin","desc":"desc","ingredientes":["item1","item2"],"passos":["passo1","passo2"],"dica":"dica"}],"nutri":"string","harmonizacao":"string"}';
    const fullPrompt = (comboPrompt || "Crie 3 receitas.") + " Responda SOMENTE com JSON valido sem markdown. Estrutura: " + jsonTemplate;
    messages = [{ role: "user", content: [{ type: "text", text: fullPrompt }] }];
  } else {
    if (!imageData || !mediaType) return res.status(400).json({ error: "Imagem obrigatoria." });
    const locationInfo = locationCtx || "Use precos medios do Brasil.";
    const prompt = "Voce e um chef especialista. Identifique o alimento na imagem. Nivel: " + (profile || "iniciante") + ". " + locationInfo + " Responda SOMENTE com JSON valido sem markdown. Campos: nome, emoji, categoria, confianca, tags, desc, grid, preco, nutri, curiosidades, tecnicas, receitas, receita_detalhada.";
    messages = [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:" + mediaType + ";base64," + imageData } }, { type: "text", text: prompt }] }];
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
      body: JSON.stringify({ model, max_tokens: 3000, messages })
    });

    const responseText = await response.text();
    if (!response.ok) return res.status(502).json({ error: "Erro OpenRouter " + response.status });

    let data;
    try { data = JSON.parse(responseText); } catch(e) { return res.status(500).json({ error: "Resposta invalida da API" }); }

    if (data.error) return res.status(500).json({ error: data.error.message || "Erro da IA" });

let text = (data.choices?.[0]?.message?.content || "").trim();
text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
text = text.replace(/[\s\S]*?```json/, "").trim();
text = text.replace(/```[\s\S]*$/, "").trim();

const jsonMatch = text.match(/\{[\s\S]*\}/);
if (!jsonMatch) return res.status(500).json({ error: "JSON nao encontrado. Resposta: " + text.slice(0, 200) });

let jsonStr = jsonMatch[0];
jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, " ");

    try {
      return res.status(200).json(JSON.parse(jsonStr));
    } catch(e) {
      return res.status(500).json({ error: "Erro ao interpretar resposta. Tente novamente." });
    }
  } catch (err) {
    return res.status(500).json({ error: "Erro interno: " + err.message });
  }
}
