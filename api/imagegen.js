// api/imagegen.js — busca imagem do prato via Unsplash (gratuito)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { dish } = req.body;
  if (!dish) return res.status(400).json({ error: "Nome do prato obrigatório" });

  // Use Unsplash Source API - free, no key needed
  // Returns a random food photo based on search term
  const query = encodeURIComponent(dish + " food dish");
  
  // Unsplash Source API - redirects to actual image
  const unsplashUrl = `https://source.unsplash.com/400x300/?${query}`;
  
  // Return the URL directly - browser will follow redirect
  return res.status(200).json({ 
    url: unsplashUrl,
    source: "unsplash"
  });
}
