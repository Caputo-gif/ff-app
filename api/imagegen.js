// api/imagegen.js — gera imagem do prato via OpenRouter (Recraft gratuito)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { dish } = req.body;
  if (!dish) return res.status(400).json({ error: "Nome do prato obrigatório" });

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) return res.status(500).json({ error: "Chave não configurada" });

  const prompt = "Professional food photography of " + dish + ", beautifully plated on a white plate, restaurant quality, overhead shot, natural lighting, appetizing, high resolution";

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
        model: "recraft/recraft-v4.1-vector",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Image gen error:", response.status, err);
      return res.status(200).json({ url: null });
    }

    const data = await response.json();
    
    // Extract image URL from response
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      // Try to find URL in content
      const urlMatch = content.match(/https?:\/\/[^\s"')]+/);
      if (urlMatch) return res.status(200).json({ url: urlMatch[0] });
      
      // Check if content itself is a URL
      if (content.startsWith("http")) return res.status(200).json({ url: content.trim() });
    }

    // Check for image in other formats
    const imgContent = data.choices?.[0]?.message?.content;
    if (Array.isArray(imgContent)) {
      const imgPart = imgContent.find(p => p.type === "image_url");
      if (imgPart?.image_url?.url) return res.status(200).json({ url: imgPart.image_url.url });
    }

    console.log("Image response:", JSON.stringify(data).slice(0, 300));
    return res.status(200).json({ url: null });
  } catch (err) {
    console.error("Imagegen error:", err);
    return res.status(200).json({ url: null }); // Fail gracefully
  }
}
