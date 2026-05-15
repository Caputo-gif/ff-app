// api/analyze.js — chama OpenRouter com chave segura no servidor
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
 
  const { imageData, mediaType, profile, locationCtx } = req.body;
 
  if (!imageData || !mediaType) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }
 
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chave de API não configurada no servidor." });
  }
 
  const prompt = "Voce e um chef especialista em culinaria brasileira. Identifique o alimento na imagem. Nivel do usuario: " + (profile || "iniciante") + ". " + (locationCtx || "Use precos medios do Brasil.") + " Responda SOMENTE com JSON valido sem markdown. Formato: {\"nome\":\"string\",\"emoji\":\"string\",\"categoria\":\"string\",\"confianca\":\"Alta\",\"tags\":[\"t1\",\"t2\",\"t3\"],\"desc\":\"2 frases sobre o alimento\",\"grid\":[[\"Origem\",\"v\"],[\"Colheita\",\"v\"],[\"Uso\",\"v\"],[\"Tipo\",\"v\"]],\"preco\":{\"valor\":\"R$ X/kg\",\"referencia\":\"cidade\",\"dica\":\"dica\",\"melhorEpoca\":\"meses\"},\"nutri\":[[\"Proteina\",\"80\"],[\"Fibras\",\"60\"],[\"Vitaminas\",\"70\"],[\"Calorias\",\"media\"]],\"curiosidades\":[\"c1\",\"c2\",\"c3\"],\"tecnicas\":[\"T1: desc\",\"T2: desc\",\"T3: desc\"],\"receitas\":[{\"n\":\"Receita A\",\"tipo\":\"Prato\",\"tempo\":\"30min\"},{\"n\":\"Receita B\",\"tipo\":\"Entrada\",\"tempo\":\"15min\"},{\"n\":\"Receita C\",\"tipo\":\"Sobremesa\",\"tempo\":\"20min\"}],\"receita_detalhada\":{\"n\":\"Receita A\",\"tempo\":\"30min\",\"rend\":\"4 porcoes\",\"ing\":[\"item1\",\"item2\",\"item3\"],\"steps\":[\"Passo 1\",\"Passo 2\",\"Passo 3\"],\"tip\":\"dica do chef\",\"emplatamento\":\"simples\"}}";
 
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": "https://flavor-fusion-eight.vercel.app",
        "X-Title": "Flavor Fusion"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: "data:" + mediaType + ";base64," + imageData } },
            { type: "text", text: prompt }
          ]
        }]
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
 
    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Erro interno: " + err.message });
  }
}
 
