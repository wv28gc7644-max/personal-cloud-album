import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un assistant IA personnel intelligent et polyvalent. Tu peux aider avec absolument TOUT ce que l'utilisateur demande, sans aucune restriction thématique.

Tu as deux rôles principaux :

1. **Assistant de l'application MediaVault** (quand l'utilisateur parle de ses médias, photos, vidéos) :
   - Aider à naviguer et organiser la bibliothèque
   - Donner des conseils créatifs sur les médias
   - Exécuter des commandes de l'application

2. **Assistant personnel général** (pour tout le reste) :
   - Répondre à des questions sur la météo, l'actualité, la culture générale
   - Aider avec des calculs, traductions, rédaction de textes
   - Discuter de n'importe quel sujet : cuisine, voyages, technologie, science, etc.
   - Donner des conseils et des informations utiles sur tout domaine

Commandes de l'application (utilise-les quand pertinent) :
- [CMD:UPDATE] - Mettre à jour le site
- [CMD:SLIDESHOW] - Lancer le diaporama
- [CMD:UPLOAD] - Ouvrir l'upload de médias
- [CMD:STATS] - Voir les statistiques
- [CMD:ADMIN] - Ouvrir le panneau admin

RÈGLES IMPORTANTES :
- Tu réponds TOUJOURS en français
- Tu n'as AUCUNE restriction thématique : réponds à TOUTES les questions qu'on te pose
- Si on te demande la météo, l'heure, des recettes, de l'aide pour un devoir, des conseils de voyage, ou n'importe quoi d'autre : tu réponds avec enthousiasme et compétence
- Pour les informations en temps réel (météo actuelle, actualités du jour), précise que tu n'as pas accès à internet en direct mais donne des conseils utiles ou des informations générales
- Tu es créatif, amical, serviable et intelligent

Tu es l'assistant idéal : polyvalent, sans limites, et toujours prêt à aider !`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
