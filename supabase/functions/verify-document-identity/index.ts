import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalise a name string for fuzzy comparison:
// lowercase, strip titles (Mr/Mrs/Ms/Dr), collapse whitespace
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof)\.?\s*/g, "")
    .replace(/[.,\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Compute word-overlap similarity (Jaccard on first/last name tokens)
function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = new Set(normaliseName(a).split(" ").filter(Boolean));
  const setB = new Set(normaliseName(b).split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return Math.round((intersection / union) * 100);
}

// Normalise ID number: strip spaces, dashes, uppercase
function normaliseId(id: string): string {
  return id.replace(/[\s\-]/g, "").toUpperCase().trim();
}

// Normalise phone: strip non-digits, handle Zimbabwe +263 / 0 prefix
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Zimbabwe: +2637XXXXXXXX → 07XXXXXXXX
  if (digits.startsWith("2637") || digits.startsWith("2638")) {
    return "0" + digits.slice(3);
  }
  return digits;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      imageBase64,
      fileType,
      // Profile fields from the DB — passed by the frontend
      profileName,        // e.g. "Tendai Moyo"
      profileIdNumber,    // e.g. "63-123456-P-75"
      profilePhone,       // e.g. "0771234567"
      profileDob,         // e.g. "1990-05-15" (optional)
    } = await req.json();

    if (!imageBase64 || !profileName) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and profileName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ─── AI: Extract identity fields from document ──────────────────────────
    const systemPrompt = `You are an identity extraction AI specialising in Zimbabwean financial and identity documents.

Your task is to carefully read the uploaded document and extract ALL identity-related fields present, including:
- Full name / account holder name (exactly as printed)
- National ID number (Zimbabwean format: XX-XXXXXX-X-XX, e.g. "63-123456-P-75")
- Phone number / mobile number (EcoCash/Econet format)
- Date of birth (if present)
- Address (if present)

Be precise. Extract text exactly as it appears. If a field is not visible or legible, return null for that field.

You MUST call the extract_identity function with your findings.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                text: `Extract all identity fields from this document. File type: ${fileType || "image"}. Be precise — extract text exactly as it appears on the document.`,
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
              name: "extract_identity",
              description: "Return extracted identity fields from the document",
              parameters: {
                type: "object",
                properties: {
                  full_name: {
                    type: "string",
                    description: "Full name exactly as it appears on the document. Null if not found.",
                  },
                  national_id_number: {
                    type: "string",
                    description: "National ID number exactly as printed (e.g. 63-123456-P-75). Null if not found.",
                  },
                  phone_number: {
                    type: "string",
                    description: "Phone/mobile number as printed. Null if not found.",
                  },
                  date_of_birth: {
                    type: "string",
                    description: "Date of birth in any format as printed. Null if not found.",
                  },
                  address: {
                    type: "string",
                    description: "Residential address if present. Null if not found.",
                  },
                  document_type: {
                    type: "string",
                    description: "Type of document detected (e.g. EcoCash Statement, Bank Statement, National ID, Payslip).",
                  },
                  extraction_confidence: {
                    type: "number",
                    description: "0–100: how clear/legible the document is for extraction",
                  },
                  extraction_notes: {
                    type: "string",
                    description: "Any notes about extraction quality, unclear text, or partial data.",
                  },
                },
                required: ["document_type", "extraction_confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_identity" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({
          overall_match: false,
          error: "Identity verification service temporarily unavailable. Please try again.",
          fields: [],
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({
          overall_match: false,
          error: "Could not extract identity information from document.",
          fields: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // ─── Cross-check extracted fields against profile ────────────────────────

    const fields: {
      field: string;
      profileValue: string;
      documentValue: string | null;
      match: "match" | "mismatch" | "not_found" | "partial";
      similarity?: number;
      note?: string;
    }[] = [];

    // 1. Name check
    const nameFromDoc = extracted.full_name ?? null;
    const nameSim = nameFromDoc ? nameSimilarity(profileName, nameFromDoc) : 0;
    let nameMatch: "match" | "mismatch" | "not_found" | "partial";
    if (!nameFromDoc) {
      nameMatch = "not_found";
    } else if (nameSim >= 80) {
      nameMatch = "match";
    } else if (nameSim >= 50) {
      nameMatch = "partial";
    } else {
      nameMatch = "mismatch";
    }
    fields.push({
      field: "Full Name",
      profileValue: profileName,
      documentValue: nameFromDoc,
      match: nameMatch,
      similarity: nameSim,
      note: nameFromDoc
        ? `${nameSim}% name similarity`
        : "Name not found in document",
    });

    // 2. National ID check (if profile has it)
    if (profileIdNumber) {
      const idFromDoc = extracted.national_id_number ?? null;
      let idMatch: "match" | "mismatch" | "not_found";
      if (!idFromDoc) {
        idMatch = "not_found";
      } else {
        idMatch =
          normaliseId(profileIdNumber) === normaliseId(idFromDoc)
            ? "match"
            : "mismatch";
      }
      fields.push({
        field: "National ID Number",
        profileValue: profileIdNumber,
        documentValue: idFromDoc,
        match: idMatch,
        note: idFromDoc
          ? idMatch === "match"
            ? "ID numbers match exactly"
            : "ID numbers do not match"
          : "ID number not found in document",
      });
    }

    // 3. Phone number check (if profile has it)
    if (profilePhone) {
      const phoneFromDoc = extracted.phone_number ?? null;
      let phoneMatch: "match" | "mismatch" | "not_found";
      if (!phoneFromDoc) {
        phoneMatch = "not_found";
      } else {
        phoneMatch =
          normalisePhone(profilePhone) === normalisePhone(phoneFromDoc)
            ? "match"
            : "mismatch";
      }
      fields.push({
        field: "Phone Number",
        profileValue: profilePhone,
        documentValue: phoneFromDoc,
        match: phoneMatch,
        note: phoneFromDoc
          ? phoneMatch === "match"
            ? "Phone numbers match"
            : "Phone numbers do not match"
          : "Phone number not found in document",
      });
    }

    // 4. Date of birth check (if both available)
    if (profileDob && extracted.date_of_birth) {
      // Basic: just compare normalised date strings containing the same 4-digit year
      const profileYear = String(profileDob).match(/\d{4}/)?.[0] ?? "";
      const docYear = String(extracted.date_of_birth).match(/\d{4}/)?.[0] ?? "";
      const dobMatch =
        profileYear && docYear && profileYear === docYear ? "match" : "mismatch";
      fields.push({
        field: "Date of Birth",
        profileValue: profileDob,
        documentValue: extracted.date_of_birth,
        match: dobMatch,
        note:
          dobMatch === "match"
            ? "Birth year matches"
            : "Date of birth does not match",
      });
    }

    // ─── Overall decision ───────────────────────────────────────────────────
    const mismatches = fields.filter((f) => f.match === "mismatch");
    const matches = fields.filter((f) => f.match === "match" || f.match === "partial");

    // Flag as overall mismatch if: name mismatch, or ID mismatch (critical fields)
    const criticalMismatch =
      nameMatch === "mismatch" ||
      fields.some((f) => f.field === "National ID Number" && f.match === "mismatch");

    const overallMatch = mismatches.length === 0 && !criticalMismatch;
    const overallScore = fields.length > 0
      ? Math.round(
          (matches.length / fields.length) * 100 *
            (nameMatch === "match" ? 1 : nameMatch === "partial" ? 0.8 : 0.5)
        )
      : 0;

    return new Response(
      JSON.stringify({
        overall_match: overallMatch,
        match_score: overallScore,
        critical_mismatch: criticalMismatch,
        document_type: extracted.document_type,
        extraction_confidence: extracted.extraction_confidence,
        extraction_notes: extracted.extraction_notes ?? null,
        fields,
        extracted: {
          full_name: extracted.full_name ?? null,
          national_id_number: extracted.national_id_number ?? null,
          phone_number: extracted.phone_number ?? null,
          date_of_birth: extracted.date_of_birth ?? null,
          address: extracted.address ?? null,
        },
        summary:
          overallMatch
            ? "✅ Document identity matches your registered profile."
            : criticalMismatch
            ? "❌ Critical mismatch: document does not match your registered identity. Contact support if this is incorrect."
            : `⚠️ Partial match: ${mismatches.length} field(s) could not be confirmed.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-document-identity error:", e);
    return new Response(
      JSON.stringify({
        overall_match: false,
        error: "Identity verification failed. Please try again.",
        fields: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
