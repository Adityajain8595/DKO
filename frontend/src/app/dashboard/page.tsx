"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  MapPin,
  Sprout,
  Settings,
  MessageSquare,
  Maximize2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import QuickChips from "@/components/QuickChips";
import TypingIndicator from "@/components/TypingIndicator";
import ReasoningSteps from "@/components/ReasoningSteps";
import OnboardingModal from "@/components/OnboardingModal";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import OverviewModule from "@/components/modules/OverviewModule";
import WeatherModule from "@/components/modules/WeatherModule";
import MarketModule from "@/components/modules/MarketModule";
import { useFarmer } from "@/context/FarmerContext";
import { API_BASE_URL } from "@/lib/api";
import { quickSuggestions } from "@/lib/constants";
import type { Session, Message, MediaItem } from "@/lib/types";

export default function DashboardPage() {
  const {
    profile,
    logActivity,
    activeModule,
    setActiveModule,
    setIsProfileModalOpen,
  } = useFarmer();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [liveReasoningSteps, setLiveReasoningSteps] = useState<{ tool: string; description: string; status: "complete" }[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore persisted sessions & ensure field media is properly loaded & synchronized
  useEffect(() => {
    try {
      let initialMedia: MediaItem[] = [];
      const savedMedia = localStorage.getItem("dko_media");
      if (savedMedia) {
        try {
          const parsedM = JSON.parse(savedMedia);
          if (Array.isArray(parsedM)) {
            initialMedia = parsedM.map((it: MediaItem) => ({
              ...it,
              cropName: "",
              diagnosisTag: "",
            }));
          }
        } catch {}
      }

      const savedSessions = localStorage.getItem("dko_sessions");
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (s: Session) => s.id !== "session-1" && s.title !== "New Agronomic Inquiry"
          );
          if (filtered.length > 0) {
            setSessions(filtered);
            setActiveSessionId(filtered[0].id);

            // Reconstruct/sync media from session history if not already present
            const extractedMedia: MediaItem[] = [];
            filtered.forEach((sess: Session) => {
              (sess.messages || []).forEach((m: Message) => {
                if (m.imageUrl && !initialMedia.some((it) => it.messageId === m.id || it.thumbnailUrl === m.imageUrl)) {
                  extractedMedia.push({
                    id: `media-${m.id}`,
                    thumbnailUrl: m.imageUrl,
                    uploadDate: new Date(m.timestamp),
                    cropName: "",
                    diagnosisTag: "",
                    severity: "moderate",
                    status: "diagnosed",
                    sessionId: sess.id,
                    messageId: m.id,
                  });
                }
              });
            });
            if (extractedMedia.length > 0) {
              initialMedia = [...initialMedia, ...extractedMedia];
            }
          } else {
            setSessions([]);
            setActiveSessionId(null);
            localStorage.removeItem("dko_sessions");
          }
        }
      }
      setMediaItems(initialMedia);
    } catch {}
    setIsLoaded(true);
  }, []);

  const handleShowInChat = (sessionId?: string, messageId?: string) => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
    setActiveModule("advisory");
    if (messageId) {
      setTimeout(() => {
        const el = document.getElementById(`chat-msg-${messageId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "rounded-2xl", "bg-primary/10");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary", "rounded-2xl", "bg-primary/10");
          }, 2500);
        } else {
          scrollToBottom();
        }
      }, 250);
    } else {
      setTimeout(scrollToBottom, 150);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("dko_sessions", JSON.stringify(sessions));
    } catch {}
  }, [sessions, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("dko_media", JSON.stringify(mediaItems));
    } catch {}
  }, [mediaItems, isLoaded]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeModule === "advisory") {
      scrollToBottom();
    }
  }, [activeSession?.messages, isThinking, liveReasoningSteps, activeModule]);

  // Handle creating a brand new session
  const handleNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const newS: Session = {
      id: newSessionId,
      title: "Crop Advisory",
      preview: "New consultation ready...",
      cropCategory: "general",
      date: new Date(),
      messages: [],
    };
    setSessions((prev) => [newS, ...prev]);
    setActiveSessionId(newSessionId);
    setActiveModule("advisory");
    setSidebarOpen(false);
  };

  // Handle deleting a session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem("dko_sessions", JSON.stringify(updated));
      } catch {}
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  // Main chat message dispatcher with deep streaming thoughts
  const handleSendMessage = (text: string, imageFile?: File | null) => {
    if (!text.trim() && !imageFile) return;

    let targetSessionId = activeSessionId;
    let isFirstTurn = false;

    if (!targetSessionId) {
      targetSessionId = `session-${Date.now()}`;
      isFirstTurn = true;
      const newS: Session = {
        id: targetSessionId,
        title: "Crop Advisory",
        preview: text ? text.slice(0, 45) + "..." : "Image diagnostic...",
        cropCategory: "general",
        date: new Date(),
        messages: [],
      };
      setSessions((prev) => [newS, ...prev]);
      setActiveSessionId(targetSessionId);
    } else {
      const currentSession = sessions.find((s) => s.id === targetSessionId);
      isFirstTurn = !currentSession || currentSession.messages.length === 0;
    }

    const userMessageId = `msg-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      role: "farmer",
      content: text,
      timestamp: new Date(),
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSessionId
          ? {
              ...s,
              preview: text ? text.slice(0, 45) + "..." : "Field Image Diagnosis",
              messages: [...s.messages, userMessage],
            }
          : s
      )
    );

    // AI Auto-titling in background on the first turn (Max 4 words)
    if (isFirstTurn) {
      const titlingQuery = text.trim() || (imageFile ? "Crop disease field photo diagnosis" : "Crop Advisory");
      fetch(`${API_BASE_URL}/session-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: titlingQuery }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.title) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === targetSessionId ? { ...s, title: data.title } : s
              )
            );
          }
        })
        .catch(() => {});
    }

    logActivity({
      type: "advisory",
      title: "Inquiry Dispatched",
      description: text.slice(0, 60),
      badge: "Autonomous Multi-Agent",
    });

    setLiveReasoningSteps([]);
    setIsThinking(true);

    const callBackend = async () => {
      let base64Image: string | undefined = undefined;
      if (imageFile) {
        base64Image = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });

        // Store permanent base64 image on the message so it persists permanently
        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === userMessageId ? { ...m, imageUrl: base64Image } : m
                  ),
                }
              : s
          )
        );

        // Link media item directly to this session and message
        const newMedia: MediaItem = {
          id: `media-${Date.now()}`,
          thumbnailUrl: base64Image,
          uploadDate: new Date(),
          cropName: "",
          diagnosisTag: "",
          severity: "moderate",
          status: "diagnosed",
          sessionId: targetSessionId,
          messageId: userMessageId,
        };
        setMediaItems((prev) => [newMedia, ...prev]);
      }

      try {
        const activeS = sessions.find((s) => s.id === targetSessionId);
        const historyTurns = (activeS?.messages || []).slice(-10).map((m) => ({
          role: m.role === "farmer" ? "user" : "assistant",
          content: m.content,
        }));

        const reqBody = {
          query: text || "Analyze this crop disease image.",
          image: base64Image,
          profile: {
            name: profile.name,
            state: profile.state,
            district: profile.district,
            crops: profile.primaryCrops.join(", "),
            land: `${profile.landSizeAcres} Acres`,
          },
          history: historyTurns,
        };

        const response = await fetch(`${API_BASE_URL}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        });

        const liveSteps: { tool: string; description: string; status: "complete" }[] = [];
        let finalData: { response?: string; session_title?: string; traces?: { tool: string; input?: Record<string, unknown> }[]; sources?: string[]; rewritten_query?: string } | null = null;

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
              const line = chunk.trim().replace(/^data:\s*/, "");
              if (!line) continue;
              try {
                const ev = JSON.parse(line);
                if (ev.type === "title" && ev.title) {
                  setSessions((prev) =>
                    prev.map((s) =>
                      s.id === targetSessionId ? { ...s, title: ev.title } : s
                    )
                  );
                } else if (ev.type === "thought" && ev.content) {
                  const thoughtStep = {
                    tool: "Reasoning",
                    description: ev.content,
                    status: "complete" as const,
                  };
                  liveSteps.push(thoughtStep);
                  setLiveReasoningSteps((prev) => [...prev, thoughtStep]);
                } else if (ev.type === "done") {
                  finalData = ev;
                  if (ev.session_title) {
                    setSessions((prev) =>
                      prev.map((s) =>
                        s.id === targetSessionId ? { ...s, title: ev.session_title } : s
                      )
                    );
                  }
                }
              } catch {}
            }
          }
        }

        // Fallback to standard /chat if streaming wasn't completed
        if (!finalData) {
          const stdRes = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBody),
          });
          if (!stdRes.ok) throw new Error(`HTTP error ${stdRes.status}`);
          finalData = await stdRes.json();
          if (finalData?.session_title) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === targetSessionId ? { ...s, title: finalData?.session_title || s.title || "Field Consultation" } : s
              )
            );
          }
        }

        const toolSteps = (finalData?.traces || []).map((t: { tool: string; input?: Record<string, unknown>; output?: string }) => ({
          tool: t.tool,
          description: typeof t.output === "string" && t.output ? t.output : `Executed ${t.tool} [${Object.keys(t.input || {}).join(", ")}]`,
          status: "complete" as const,
        }));

        const allSteps = liveSteps.length > 0 ? [...liveSteps] : toolSteps;

        if (finalData?.rewritten_query) {
          allSteps.unshift({
            tool: "Contextual Query Rewriter",
            description: `Contextualized query: "${finalData.rewritten_query}"`,
            status: "complete" as const,
          });
        }

        const sources = (finalData?.sources || []).map((s: string) => {
          let host = s;
          try {
            if (s.startsWith("http")) host = new URL(s).hostname.replace("www.", "");
          } catch {}
          return { label: host, color: "#15803D" };
        });

        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: finalData?.response || "Advisory could not be completed. Please verify backend connection.",
          timestamp: new Date(),
          sources: sources,
          reasoningSteps: allSteps,
          hasAudio: false,
        };

        if (imageFile) {
          setMediaItems((prev) =>
            prev.map((item) =>
              item.messageId === userMessageId
                ? {
                    ...item,
                    status: "diagnosed",
                    diagnosisTag: "Analyzed Pathology",
                    fullDiagnosis: finalData?.response,
                  }
                : item
            )
          );
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSessionId
              ? { ...s, messages: [...s.messages, aiMessage] }
              : s
          )
        );
      } catch (err: any) {
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          role: "ai",
          content: `Connection Notice: Unable to reach backend API (${err?.message || "Check port 8000"}). Please ensure the DKO backend server is running.`,
          timestamp: new Date(),
          sources: [],
          reasoningSteps: [
            { tool: "System Diagnostic", description: "Backend connection failed", status: "complete" },
          ],
          hasAudio: false,
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSessionId
              ? { ...s, messages: [...s.messages, errorMsg] }
              : s
          )
        );
      } finally {
        setIsThinking(false);
        setLiveReasoningSteps([]);
      }
    };

    void callBackend();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      {/* Sidebar Navigation */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        onNewSession={handleNewSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative">
        {/* Floating Top-Right Controls: Exact farmer location & Settings */}
        <div className="absolute top-3.5 right-4 z-20 flex items-center gap-2">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            title="Farmer location"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md hover:bg-card border border-border-light text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>
              {profile.district}, {profile.state}
            </span>
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            title="Farmer Profile & Settings"
            className="p-2 rounded-full bg-card/90 backdrop-blur-md hover:bg-card border border-border-light text-muted-foreground hover:text-foreground transition-all shadow-xs cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Top-Left Mobile Menu Toggle */}
        <div className="absolute top-3.5 left-4 z-20 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-full bg-card/90 backdrop-blur-md hover:bg-card border border-border-light text-foreground transition-all shadow-xs cursor-pointer"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Module Rendering */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeModule === "overview" && (
            <OverviewModule onNavigate={setActiveModule} />
          )}

          {activeModule === "weather" && <WeatherModule />}

          {activeModule === "market" && <MarketModule />}

          {activeModule === "media" && (
            <div className="flex-1 w-full overflow-y-auto pt-16 p-4 sm:p-6">
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Header: Your Media */}
                <div className="space-y-1">
                  <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                    Your Media
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Archived field photographs, crop leaf specimens, and diagnostic imagery.
                  </p>
                </div>

                {mediaItems.length === 0 ? (
                  <div className="min-h-[360px] flex flex-col items-center justify-center text-center p-8 space-y-3 bg-muted/20 border border-dashed border-border-light rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sprout className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">No Field Media Yet</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                        Attach or paste crop photographs in the AI Krishi Advisory chat to view them cataloged here.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveModule("advisory")}
                      className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dark cursor-pointer transition-colors"
                    >
                      Go to Advisory Chat
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {mediaItems.map((item) => (
                      <div
                        key={item.id}
                        className="glass-card-solid rounded-2xl p-2.5 space-y-2 flex flex-col justify-between border border-border/70 hover:border-primary/50 transition-all shadow-xs group"
                      >
                        {/* Full uncropped image container */}
                        <div
                          onClick={() => setLightboxItem(item)}
                          className="aspect-square bg-muted/30 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-border-light cursor-pointer group relative"
                          title="Click to view full image in original resolution"
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt="Field media"
                              className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-102"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center">
                              <Sprout className="w-8 h-8 text-primary/40 mb-1" />
                              <span className="text-[10px] text-muted-foreground">No Preview</span>
                            </div>
                          )}

                          {/* Hover expand overlay */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl">
                            <div className="p-2 rounded-full bg-white/20 backdrop-blur-xs text-white">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Date with timestamp */}
                        <div className="text-[11px] text-muted-foreground font-medium px-1">
                          {new Date(item.uploadDate).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>

                        {/* Show in chat button */}
                        {item.sessionId && item.messageId && (
                          <button
                            onClick={() => handleShowInChat(item.sessionId!, item.messageId!)}
                            className="w-full py-1.5 px-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Open exact chat message"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Show in chat</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Advisory RAG Workspace */}
          {activeModule === "advisory" && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto scrollbar-thin py-4">
                {!activeSession || activeSession.messages.length === 0 ? (
                  <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 text-center">
                    {/* Synchronized Hero Badge */}
                    <div className="relative inline-flex items-center justify-center mb-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
                        <Sprout className="w-7 h-7 text-primary" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary border-2 border-background"></span>
                      </span>
                    </div>

                    <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                      Welcome, {profile.name}
                    </h2>

                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-lg mx-auto leading-relaxed">
                      I am your <span className="font-medium text-foreground">Digital Krishi Officer</span>. Synchronized with your farm profile in{" "}
                      <span className="font-semibold text-foreground">
                        {profile.district}, {profile.state}
                      </span>.
                    </p>

                    {/* Synchronized farm profile tags */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3 mb-6 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                        <MapPin className="w-3 h-3" /> {profile.district}, {profile.state}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-card text-foreground font-medium border border-border">
                        {profile.landSizeAcres} Acres
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-card text-foreground font-medium border border-border">
                        {profile.primaryCrops.join(", ")}
                      </span>
                    </div>

                    <QuickChips
                      suggestions={quickSuggestions}
                      onSelect={(chip) => handleSendMessage(chip)}
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activeSession.messages.map((message) => (
                      <ChatBubble key={message.id} message={message} />
                    ))}

                    {isThinking && (
                      <div className="px-4 sm:px-6 py-2">
                        {liveReasoningSteps.length > 0 && (
                          <div className="max-w-[88%] sm:max-w-[80%] mb-2">
                            <ReasoningSteps steps={liveReasoningSteps} isLive={true} />
                          </div>
                        )}
                        <TypingIndicator />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Bottom Omnibar */}
              <ChatInput onSend={handleSendMessage} />
            </div>
          )}
        </div>
      </div>

      {/* Field Media Drawer */}
      {/* Lightbox for exact resolution image with blurred background */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxItem(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[92vh] w-full flex flex-col bg-card border border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Top bar: Date with timestamp and actions */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  {new Date(lightboxItem.uploadDate).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>

                <div className="flex items-center gap-2">
                  {lightboxItem.sessionId && (
                    <button
                      onClick={() => {
                        const sId = lightboxItem.sessionId;
                        const mId = lightboxItem.messageId;
                        setLightboxItem(null);
                        handleShowInChat(sId, mId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dark cursor-pointer transition-colors shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Show in chat</span>
                    </button>
                  )}
                  <button
                    onClick={() => setLightboxItem(null)}
                    className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Exact resolution image viewer */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-black/40 min-h-[300px]">
                {lightboxItem.thumbnailUrl ? (
                  <img
                    src={lightboxItem.thumbnailUrl}
                    alt="Original resolution view"
                    className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Sprout className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Image preview unavailable</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progressive Onboarding Modal */}
      <OnboardingModal />

      {/* Profile Settings Modal */}
      <ProfileSettingsModal />
    </div>
  );
}
