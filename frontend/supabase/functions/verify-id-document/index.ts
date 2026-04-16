import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, side } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ valid: false, reason: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const sideLabel = side === "back" ? "back" : "front";

    const systemPrompt = `You are a document verification AI specializing in Zimbabwean National Identity Cards (National ID / Green ID).

A valid Zimbabwean National ID card has these characteristics:

FRONT SIDE:
- Green colored card with the Zimbabwe coat of arms (bird)
- Title: "NATIONAL REGISTRATION" or "REPUBLIC OF ZIMBABWE"
- Contains fields: Surname, Forenames, National Registration Number (format: XX-XXXXXXX AXX XX), Date of Birth, Sex, District of Birth
- Has a passport-style photo of the holder
- Has a signature area

BACK SIDE:
- Green colored card
- Contains address details / District
- May contain additional registration information
- Has official stamps or markings

Your task: Analyze the uploaded image and determine if it is a valid Zimbabwean National ID card (${sideLabel} side).

You must call the verify_document function with your analysis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Is this image the ${sideLabel} side of a valid Zimbabwean National Identity Card? Analyze carefully.`,
              },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "verify_document",
              description: "Return verification result for the uploaded document image",
              parameters: {
                type: "object",
                properties: {
                  is_valid_id: {
                    type: "boolean",
                    description: "True if the image is a valid Zimbabwean National ID card for the specified side",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score 0-100",
                  },
                  reason: {
                    type: "string",
                    description: "Brief explanation of why the document is or is not a valid Zimbabwean National ID",
                  },
                  detected_document_type: {
                    type: "string",
                    description: "What type of document was detected (e.g. 'Zimbabwean National ID', 'Passport', 'Driver License', 'Unknown document', 'Not a document')",
                  },
                },
                required: ["is_valid_id", "confidence", "reason", "detected_document_type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "verify_document" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Verification service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Verification service unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      // On AI error, allow upload (don't block registration)
      return new Response(
        JSON.stringify({ valid: true, reason: "Verification temporarily unavailable, proceeding.", confidence: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ valid: true, reason: "Could not verify, proceeding.", confidence: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        valid: result.is_valid_id,
        confidence: result.confidence,
        reason: result.reason,
        detected_type: result.detected_document_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-id-document error:", e);
    // On error, don't block registration
    return new Response(
      JSON.stringify({ valid: true, reason: "Verification unavailable.", confidence: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
