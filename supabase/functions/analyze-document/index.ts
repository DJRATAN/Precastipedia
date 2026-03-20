import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, analysisId, message, fileName } = body;
    // Handle both relative paths and full URLs
    let filePath = body.filePath || body.fileUrl || "";
    if (filePath.includes("/object/public/user-analyses/")) {
      filePath = filePath.split("/object/public/user-analyses/")[1];
    } else if (filePath.includes("/user-analyses/")) {
      filePath = filePath.split("/user-analyses/")[1];
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (action === "analyze") {
      // Get the storage path - either from request or from DB
      let storagePath = filePath;
      if (!storagePath && analysisId) {
        const { data: analysisRecord } = await supabase
          .from("user_analyses")
          .select("file_url")
          .eq("id", analysisId)
          .single();
        if (analysisRecord) {
          storagePath = analysisRecord.file_url;
        }
      }
      
      // Extract the relative path from various URL formats
      if (storagePath) {
        // Handle full URLs with /object/public/ or /object/sign/ or just /storage/
        if (storagePath.includes("/object/public/user-analyses/")) {
          storagePath = storagePath.split("/object/public/user-analyses/")[1];
        } else if (storagePath.includes("/object/sign/user-analyses/")) {
          storagePath = storagePath.split("/object/sign/user-analyses/")[1].split("?")[0];
        } else if (storagePath.includes("/user-analyses/")) {
          storagePath = storagePath.split("/user-analyses/")[1];
        }
        // Remove any query params
        if (storagePath.includes("?")) {
          storagePath = storagePath.split("?")[0];
        }
      }
      
      if (!storagePath) throw new Error("No file path available");
      console.log("Downloading from storage path:", storagePath);

      // Download the file from private storage using service role
      const { data: fileData, error: dlError } = await supabase.storage
        .from("user-analyses")
        .download(storagePath);

      if (dlError || !fileData) {
        console.error("Download error:", dlError);
        throw new Error("Failed to download file: " + (dlError?.message || "Unknown error"));
      }

      // Convert PDF to base64 for Gemini's native PDF understanding
      const arrayBuffer = await fileData.arrayBuffer();
      const base64Data = base64Encode(new Uint8Array(arrayBuffer));
      const mimeType = fileData.type || "application/pdf";

      // Use Gemini with native PDF support (sends file as inline_data)
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Analyze this document. Return JSON only:
{"summary":"2-3 sentence summary","key_points":["point1","point2"],"extracted_text":"key text excerpts"}`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze "${fileName}".`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await aiResponse.text();
        console.error("AI gateway error:", status, errText);
        throw new Error("AI gateway error: " + status);
      }

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "";

      let summary = rawContent;
      let keyPoints: string[] = [];
      let extractedText = "";

      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          summary = parsed.summary || rawContent;
          keyPoints = parsed.key_points || [];
          extractedText = parsed.extracted_text || "";
        }
      } catch {
        // If JSON parsing fails, use raw content as summary
      }

      // Update the analysis record
      await supabase.from("user_analyses").update({
        summary,
        key_points: keyPoints,
        extracted_text: extractedText || summary,
        status: "completed",
      }).eq("id", analysisId).eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true, summary, key_points: keyPoints }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "chat") {
      // Get the analysis with extracted text
      const { data: analysis } = await supabase
        .from("user_analyses")
        .select("extracted_text, summary, file_name")
        .eq("id", analysisId)
        .eq("user_id", user.id)
        .single();

      if (!analysis) throw new Error("Analysis not found");

      // Get chat history
      const { data: history } = await supabase
        .from("analysis_messages")
        .select("role, content")
        .eq("analysis_id", analysisId)
        .order("created_at", { ascending: true })
        .limit(20);

      // Save user message
      await supabase.from("analysis_messages").insert({
        analysis_id: analysisId,
        user_id: user.id,
        role: "user",
        content: message,
      });

      // Stream AI response
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a helpful document analysis assistant. The user has uploaded a document titled "${analysis.file_name}". Here is the document content for context:\n\n${(analysis.extracted_text || "").slice(0, 25000)}\n\nSummary: ${analysis.summary}\n\nAnswer questions about this document accurately and helpfully. If the answer is not in the document, say so.`
            },
            ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
            { role: "user", content: message },
          ],
          stream: true,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI error: " + status);
      }

      // Return streaming response
      return new Response(aiResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-document error:", e);
    // Mark analysis as failed if we have context
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.analysisId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase.from("user_analyses").update({ status: "failed" }).eq("id", body.analysisId);
      }
    } catch { /* ignore cleanup errors */ }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
