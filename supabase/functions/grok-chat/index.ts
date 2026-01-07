import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
    
    if (!XAI_API_KEY) {
      console.error("XAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Clé API Grok non configurée",
          code: "MISSING_API_KEY"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { messages, systemPrompt } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages requis" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedMessages = systemPrompt 
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    console.log("Calling Grok API with", formattedMessages.length, "messages");

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 2048
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grok API error:", response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: "Clé API Grok invalide",
            code: "INVALID_API_KEY"
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Limite de requêtes atteinte",
            code: "RATE_LIMITED"
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      throw new Error(`Grok API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("Grok response received, length:", content.length);

    return new Response(
      JSON.stringify({ 
        content,
        model: "grok-beta",
        usage: data.usage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in grok-chat function:', error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    return new Response(
      JSON.stringify({ 
        error: message,
        code: "INTERNAL_ERROR"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
