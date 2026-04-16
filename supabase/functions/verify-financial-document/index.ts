// @ts-nocheck
// This is a Deno Edge Function — it runs on Supabase's Deno runtime, not Node.js.
// The @ts-nocheck suppresses VS Code's Node TypeScript engine errors (URL imports,
// Deno globals, etc.). Install the "Deno" VS Code extension (denoland.vscode-deno)
// for full IntelliSense. The function deploys and runs correctly regardless.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Document-type specific knowledge base ───────────────────────────────────

const DOC_SPECS: Record<string, string> = {
  ecocash: `
DOCUMENT TYPE: EcoCash Mobile Money Statement (Econet Wireless Zimbabwe)

GENUINE CHARACTERISTICS:
- EcoCash / Econet Wireless Zimbabwe branding (green/yellow palette, logo)
- Account holder name and phone number (format: 077XXXXXXX or 078XXXXXXX)
- Statement period clearly shown (e.g. "01 Jan 2024 – 31 Jan 2024")
- Per-transaction rows containing: Date, Time, Transaction ID/Reference, Description, Amount (Debit/Credit), Running Balance
- Transaction IDs are alphanumeric Econet codes
- Common transaction types: "Transfer to", "Received from", "Merchant Payment", "Buy Airtime", "Cash In", "Cash Out", "Bill Payment", "ZESA Token Purchase"
- Currency in USD or ZWL

FRAUD INDICATORS:
- Running balances that don't reconcile with debits/credits
- Missing or randomly formatted transaction IDs
- Non-EcoCash branding or absence of Econet logo
- Generic spreadsheet layout with no official header
- Blurred, pixelated, or cut-and-paste sections
- Inconsistent fonts or column alignment
- Dates/times out of sequence

DATA TO EXTRACT (if genuine):
- account_holder, phone_number, statement_period, total_credits, total_debits, transaction_count, average_balance, currency
`,

  bank_statement: `
DOCUMENT TYPE: Zimbabwean Bank Statement

GENUINE CHARACTERISTICS:
- Official bank letterhead or branded header (e.g. ZB Bank, CBZ, Stanbic, NMB, Empower Bank, Steward Bank, BancABC, FBC Bank, Nedbank Zimbabwe, Standard Chartered Zimbabwe)
- Account holder full name and account number
- Branch name and address
- Statement period (e.g. "Statement Date", "Period: 01/01/2024 – 31/01/2024")
- Columns: Date, Description/Narrative, Debit, Credit, Balance
- Unique transaction reference numbers per row
- Official bank seal or footer with contact details
- Currency clearly indicated (USD or ZWL)

FRAUD INDICATORS:
- No bank logo or letterhead
- Account balance doesn't reconcile row by row
- Generic table without official formatting
- Missing branch/contact information
- Inconsistent number formatting
- Blurred bank logo or watermark
- Dates out of order or missing

DATA TO EXTRACT (if genuine):
- bank_name, account_holder, account_number, statement_period, opening_balance, closing_balance, total_credits, total_debits, transaction_count, currency
`,

  payslip: `
DOCUMENT TYPE: Employee Payslip / Pay Stub

GENUINE CHARACTERISTICS:
- Employer name, company logo or letterhead, and physical/postal address
- Employee name, employee ID or staff number
- Pay period (e.g. "Month: January 2024" or "Period Ending: 31/01/2024")
- Gross salary, deductions (PAYE, NSSA, Medical Aid, etc.), net pay
- Deduction breakdown table (tax, pension, levies)
- Bank account number or payment method
- Authorised signature or payroll stamp (sometimes)
- Employer's tax number (ZIMRA registration)

FRAUD INDICATORS:
- No employer name or address
- Net pay does not equal gross minus total deductions
- PAYE or NSSA figures inconsistent with Zimbabwean tax tables
- Generic template with no company identity
- Missing pay period or month
- Suspicious round numbers with no deduction breakdown
- Fonts/formatting inconsistent within the document

DATA TO EXTRACT (if genuine):
- employer_name, employee_name, pay_period, gross_salary, total_deductions, net_salary, currency, paye_amount, nssa_amount
`,

  utility: `
DOCUMENT TYPE: Utility Bill (Zimbabwean)

GENUINE CHARACTERISTICS:
- Issued by a recognised utility provider: ZESA Holdings / Zimbabwe Electricity Supply Authority, City of Bulawayo, City of Harare, Harare City Council, BCC (Bulawayo City Council), ZINWA, NetOne, Telecel, Liquid Intelligent Technologies
- Account holder / customer name and service address
- Account number or meter number
- Billing period (e.g. "For the period: January 2024")
- Itemised charges: units consumed, rate per unit, fixed charges, VAT
- Amount due and due date
- Official provider logo and contact details
- QR code or payment reference (modern bills)

FRAUD INDICATORS:
- No utility provider logo or contact information
- Missing account/meter number
- Billing period absent or inconsistent
- Amount due with no charge breakdown
- Generic layout not matching any known Zimbabwean utility format
- Non-Zimbabwean utility provider (e.g. Eskom, Kenya Power — wrong country)
- Blurred or missing provider branding

DATA TO EXTRACT (if genuine):
- provider_name, customer_name, account_number, billing_period, amount_due, due_date, currency, service_address
`,
};

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, fileType, documentType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ valid: false, reason: "No file provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validDocTypes = ["ecocash", "bank_statement", "payslip", "utility"];
    if (!documentType || !validDocTypes.includes(documentType)) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: `Unknown document type "${documentType}". Please upload one of: EcoCash Statement, Bank Statement, Payslip, or Utility Bill.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const docSpec = DOC_SPECS[documentType];
    const docLabelMap: Record<string, string> = {
      ecocash: "EcoCash Statement",
      bank_statement: "Bank Statement",
      payslip: "Payslip",
      utility: "Utility Bill",
    };
    const docLabel = docLabelMap[documentType as string];

    const systemPrompt = `You are a document verification AI for ZimScore, a Zimbabwean fintech credit scoring platform.

Your job is to:
1. Determine whether the uploaded document is EXACTLY the type the user claims it is.
2. Check whether it appears to be a genuine, unaltered document (not edited, forged, or fake).
3. Extract key financial data if the document passes both checks.

The user says they are uploading: **${docLabel}**

Here are the verification criteria for this document type:
${docSpec}

IMPORTANT RULES:
- If the document is a DIFFERENT type than claimed (e.g. user says "payslip" but uploads a receipt), set is_correct_type=false and explain what was detected instead.
- If the document appears to have been tampered with or is a template/fake, set is_genuine=false.
- Both is_correct_type AND is_genuine must be true for the overall result to be valid.
- Be specific and informative in your "reason" field — users need to know exactly what to fix.
- Use plain, friendly English in the reason — no technical jargon.
- If the document is a blank/empty page, a photo of something unrelated (person, landscape, etc.), or clearly not a financial document at all, set is_correct_type=false with an appropriate message.

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
                text: `Please verify this document. The user claims it is a ${docLabel}. File type: ${fileType || "unknown"}. Analyze it carefully and call verify_document with your result.`,
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
              description: "Return the full verification result for the uploaded financial document",
              parameters: {
                type: "object",
                properties: {
                  is_correct_type: {
                    type: "boolean",
                    description: "True if the document matches the type the user declared (e.g. is actually a payslip if they said payslip)",
                  },
                  is_genuine: {
                    type: "boolean",
                    description: "True if the document appears to be unaltered and authentic",
                  },
                  confidence: {
                    type: "number",
                    description: "Overall confidence score 0–100",
                  },
                  detected_document_type: {
                    type: "string",
                    description: "What the document actually appears to be (e.g. 'EcoCash Statement', 'Bank Statement', 'Payslip', 'Utility Bill', 'Receipt', 'Photo', 'Unknown document', 'Blank page')",
                  },
                  reason: {
                    type: "string",
                    description: "Friendly, plain-English explanation of the verification result. If rejected, explain exactly why and what the user should upload instead.",
                  },
                  fraud_indicators: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of specific fraud or tampering indicators found (empty array if none)",
                  },
                  extracted_data: {
                    type: "object",
                    description: "Key financial data extracted from the document if valid. Fields vary by document type.",
                    additionalProperties: true,
                  },
                },
                required: ["is_correct_type", "is_genuine", "confidence", "detected_document_type", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "verify_document" } },
      }),
    });

    // Handle API-level errors
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Our verification service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Verification service is temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      // Fail open — don't block users when the AI is down
      return new Response(
        JSON.stringify({
          valid: true,
          reason: "Verification temporarily unavailable. Document flagged for manual review.",
          confidence: 0,
          manual_review: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({
          valid: true,
          reason: "Could not verify automatically. Flagged for manual review.",
          confidence: 0,
          manual_review: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Both checks must pass for the document to be accepted
    const overallValid = result.is_correct_type && result.is_genuine;

    // Build a clear, contextual rejection reason if needed
    let finalReason = result.reason;
    if (!result.is_correct_type) {
      const detected = result.detected_document_type || "an unrecognised document";
      const docLabels: Record<string, string> = {
        ecocash: "an EcoCash Statement",
        bank_statement: "a Bank Statement",
        payslip: "a Payslip",
        utility: "a Utility Bill",
      };
      finalReason = `We expected ${docLabels[documentType]} but this appears to be ${detected}. ${result.reason}`;
    } else if (!result.is_genuine) {
      finalReason = `This document does not appear to be genuine. ${result.reason}`;
    }

    return new Response(
      JSON.stringify({
        valid: overallValid,
        is_correct_type: result.is_correct_type,
        is_genuine: result.is_genuine,
        confidence: result.confidence,
        reason: finalReason,
        detected_type: result.detected_document_type,
        fraud_indicators: result.fraud_indicators || [],
        extracted_data: result.extracted_data || null,
        manual_review: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-financial-document error:", e);
    return new Response(
      JSON.stringify({
        valid: true,
        reason: "Verification unavailable. Document flagged for manual review.",
        confidence: 0,
        manual_review: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
