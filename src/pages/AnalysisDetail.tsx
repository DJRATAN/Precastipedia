import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Send, Loader2, FileText, Lightbulb, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";

type ChatMsg = { role: "user" | "assistant"; content: string };
const ESTIMATED_SECONDS = 25;

const AnalyzingProgress = ({ createdAt }: { createdAt: string }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const progress = Math.min((elapsed / ESTIMATED_SECONDS) * 100, 95);
  const remaining = Math.max(ESTIMATED_SECONDS - elapsed, 0);

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">AI is analyzing your document...</p>
      <div className="w-full max-w-xs space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-center text-muted-foreground">
          {remaining > 0
            ? `~${remaining}s remaining`
            : "Almost done, finishing up..."}
        </p>
      </div>
    </div>
  );
};

const AnalysisDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const retryAnalysis = async () => {
    if (!analysis) return;
    setIsRetrying(true);
    try {
      await supabase.from("user_analyses").update({ status: "analyzing" }).eq("id", id!);
      const { data: session } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({
          action: "analyze",
          analysisId: id,
          fileName: analysis.file_name,
        }),
      });
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setIsRetrying(false);
    }
  };

  const prevStatusRef = useRef<string | null>(null);

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_analyses")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;

      // Show toast when status transitions to completed or failed
      const prevStatus = prevStatusRef.current;
      if (prevStatus && prevStatus !== data.status) {
        if (data.status === "completed") {
          toast({ title: "Analysis Complete ✓", description: `"${data.file_name}" has been analyzed successfully.` });
        } else if (data.status === "failed") {
          toast({ title: "Analysis Failed", description: "Something went wrong. You can retry the analysis.", variant: "destructive" });
        }
      }
      prevStatusRef.current = data.status;

      return data;
    },
    enabled: !!id && !!user,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 3000;
      return status === "completed" || status === "failed" ? false : 3000;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  // Load chat history
  useQuery({
    queryKey: ["analysis-messages", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("analysis_messages")
        .select("role, content")
        .eq("analysis_id", id!)
        .order("created_at", { ascending: true });
      if (data) setChatMessages(data as ChatMsg[]);
      return data;
    },
    enabled: !!id && !!user,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || isStreaming) return;

    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsStreaming(true);

    let assistantContent = "";
    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setChatMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const { data: session } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "chat",
            analysisId: id,
            message: userMsg.content,
          }),
        }
      );

      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { /* partial */ }
        }
      }

      // Save assistant message to DB
      await supabase.from("analysis_messages").insert({
        analysis_id: id,
        user_id: user!.id,
        role: "assistant",
        content: assistantContent,
      });
    } catch (err) {
      console.error(err);
      upsertAssistant("\n\n*Error: Failed to get response. Please try again.*");
    } finally {
      setIsStreaming(false);
    }
  };

  if (!user) {
    return <main className="flex-1 container py-12 text-center"><p className="text-muted-foreground">Please log in.</p></main>;
  }

  if (isLoading) {
    return <main className="flex-1 container py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  }

  if (!analysis) {
    return <main className="flex-1 container py-12 text-center"><p>Analysis not found.</p></main>;
  }

  const keyPoints = Array.isArray(analysis.key_points) ? analysis.key_points as string[] : [];

  return (
    <main className="flex-1 container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/analyze">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-serif">{analysis.file_name}</h1>
            <p className="text-sm text-muted-foreground">Uploaded {new Date(analysis.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" className="gap-2"><FileText className="h-4 w-4" />Summary</TabsTrigger>
            <TabsTrigger value="keypoints" className="gap-2"><Lightbulb className="h-4 w-4" />Key Points</TabsTrigger>
            <TabsTrigger value="chat" className="gap-2"><MessageSquare className="h-4 w-4" />Q&A Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader><CardTitle>Document Summary</CardTitle></CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                {analysis.status === "completed" ? (
                  <ReactMarkdown>{analysis.summary || "No summary available."}</ReactMarkdown>
                ) : analysis.status === "failed" ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                    <p className="text-sm font-medium text-destructive">Analysis failed.</p>
                    <Button onClick={retryAnalysis} disabled={isRetrying} className="gap-2">
                      {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Retry Analysis
                    </Button>
                  </div>
                ) : (
                  <AnalyzingProgress createdAt={analysis.created_at} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keypoints">
            <Card>
              <CardHeader><CardTitle>Key Points</CardTitle></CardHeader>
              <CardContent>
                {keyPoints.length > 0 ? (
                  <ul className="space-y-3">
                    {keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Badge variant="secondary" className="shrink-0 mt-0.5">{i + 1}</Badge>
                        <span className="text-sm">{String(point)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No key points extracted yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card className="flex flex-col h-[500px]">
              <CardHeader className="pb-3"><CardTitle>Ask Questions About This Document</CardTitle></CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4 pb-0">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Ask any question about this document and AI will answer based on its content.
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </CardContent>
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Ask about this document..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={isStreaming || analysis.status !== "completed"}
                />
                <Button onClick={sendMessage} disabled={isStreaming || !chatInput.trim()} size="icon">
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default AnalysisDetail;
