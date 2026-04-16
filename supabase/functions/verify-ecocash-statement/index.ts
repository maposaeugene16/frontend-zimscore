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
    const { imageBase64, fileType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ valid: false, reason: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a document verification AI specializing in EcoCash (Econet Wireless Zimbabwe) mobile money transaction statements.

A GENUINE EcoCash statement has these characteristics:

VISUAL FEATURES:
- EcoCash branding (green/yellow color scheme, EcoCash logo)
- Econet Wireless Zimbabwe branding
- Official header with "EcoCash" or "Econet" prominently displayed
- Statement period dates clearly shown
- Account holder name and phone number (format: 077XXXXXXX or 078XXXXXXX)

TRANSACTION STRUCTURE:
- Each transaction has: Date, Time, Transaction ID/Reference, Description, Amount (Debit/Credit), Running Balance
- Transaction IDs follow Econet's format (alphanumeric codes)
- Common transaction types: "Transfer to", "Received from", "Merchant Payment", "Buy Airtime", "Cash In", "Cash Out", "Bill Payment", "ZESA Token Purchase"
- Amounts in USD or ZWL with proper formatting
- Running balance after each transaction

FRAUD INDICATORS TO CHECK:
- Inconsistent fonts or formatting (suggests editing)
- Running balance doesn't add up with transactions (clear forgery sign)
- Missing or malformed transaction IDs
- Unrealistic transaction amounts or frequencies
- Blurry or pixelated sections (suggests image manipulation)
- Non-standard date/time formats
- Missing EcoCash/Econet branding
- Generic spreadsheet without official formatting
- Photocopied or screenshot of edited content

Your task: Analyze the uploaded document and determine if it is a genuine EcoCash statement. Also extract key financial data if the statement appears genuine.

You must call the verify_ecocash function with your analysis.`;

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
                text: `Analyze this document. Is it a genuine EcoCash mobile money statement? Check for fraud indicators and extract transaction data if valid. File type: ${fileType || "image"}`,
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
              name: "verify_ecocash",
              description: "Return verification result and extracted data from the EcoCash statement",
              parameters: {
                type: "object",
                properties: {
                  is_genuine: {
                    type: "boolean",
                    description: "True if the document appears to be a genuine EcoCash statement",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score 0-100",
                  },
                  reason: {
                    type: "string",
                    description: "Detailed explanation of why the document is or is not genuine",
                  },
                  fraud_indicators: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of any fraud indicators detected",
                  },
                  detected_document_type: {
                    type: "string",
                    description: "What type of document was detected (e.g. 'EcoCash Statement', 'Bank Statement', 'Unknown document')",
                  },
                  extracted_data: {
                    type: "object",
                    description: "Extracted financial data from the statement if genuine",
                    properties: {
                      account_holder: { type: "string" },
                      phone_number: { type: "string" },
                      statement_period: { type: "string" },
                      total_credits: { type: "number" },
                      total_debits: { type: "number" },
                      transaction_count: { type: "number" },
                      average_balance: { type: "number" },
                      currency: { type: "string" },
                    },
                  },
                },
                required: ["is_genuine", "confidence", "reason", "detected_document_type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "verify_ecocash" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Verification service is busy. Please try again." }),
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
      return new Response(
        JSON.stringify({ valid: true, reason: "Verification temporarily unavailable, proceeding with manual review.", confidence: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ valid: true, reason: "Could not verify, flagged for manual review.", confidence: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        valid: result.is_genuine,
        confidence: result.confidence,
        reason: result.reason,
        fraud_indicators: result.fraud_indicators || [],
        detected_type: result.detected_document_type,
        extracted_data: result.extracted_data || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-ecocash-statement error:", e);
    return new Response(
      JSON.stringify({ valid: true, reason: "Verification unavailable, flagged for manual review.", confidence: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
