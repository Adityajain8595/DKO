"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Camera, X, Image as ImageIcon } from "lucide-react";
import type { RecordingState } from "@/lib/types";

interface ChatInputProps {
  onSend: (message: string, imageFile?: File | null) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState<RecordingState>("idle");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea as text wraps to multiple lines
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(newHeight, 38)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setRecording("recording");
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setSpeechError(`Voice input: ${event.error}`);
        }
        setRecording("idle");
      };

      recognition.onend = () => {
        setRecording("idle");
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Clipboard paste handler for images (e.g. screenshots, copied web photos)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleImageFile(file);
          return;
        }
      }
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageFile(files[0]);
    }
  };

  const handleSubmit = () => {
    if (!text.trim() && !selectedImage) return;
    onSend(text, selectedImage);
    setText("");
    setSelectedImage(null);
    setImagePreview(null);
    setSpeechError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setSpeechError("Voice dictation is not supported by your current browser. Please use Chrome or Edge.");
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (recording === "idle") {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Recognition start error:", err);
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch {}
      setRecording("idle");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 pb-3 sm:pb-4 pt-1 pointer-events-auto">
      {/* Speech error notification */}
      {speechError && (
        <div className="mb-2 p-2 px-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center justify-between shadow-xs">
          <span>{speechError}</span>
          <button
            onClick={() => setSpeechError(null)}
            className="p-1 hover:bg-destructive/20 rounded-md transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main floating pill container */}
      <div
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col rounded-2xl sm:rounded-3xl bg-card/95 backdrop-blur-xl border transition-all duration-200 shadow-lg shadow-black/5 dark:shadow-black/20 ${
          isDragging
            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
            : "border-border/80 hover:border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20"
        }`}
      >
        {/* Attached image preview banner */}
        {imagePreview && (
          <div className="flex items-center gap-2.5 mx-3 sm:mx-4 mt-3 p-2 rounded-xl bg-muted/70 border border-border-light">
            <div className="w-12 h-12 rounded-lg bg-background overflow-hidden flex items-center justify-center flex-shrink-0 border border-border shadow-2xs">
              <img
                src={imagePreview}
                alt="Pasted/Uploaded crop specimen"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <p className="text-xs font-semibold text-foreground truncate">
                  {selectedImage?.name || "Pasted Crop Image"}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Ready for AI Optical Pathology & Pest Diagnosis
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Remove image"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Voice recording live status */}
        {recording === "recording" && (
          <div className="flex items-center gap-2.5 mx-3 sm:mx-4 mt-3 p-2 px-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <span className="text-xs text-destructive font-medium">
              Listening... Speak your crop query in English
            </span>
            <button
              onClick={toggleRecording}
              className="ml-auto text-xs font-semibold text-destructive hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {/* Multi-line auto-wrapping text area */}
        <div className="px-3 sm:px-4 pt-2.5 pb-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedImage
                ? "Describe this specimen, or press Enter to analyze..."
                : "Ask about crops, mandi prices, pests, or paste an image..."
            }
            rows={1}
            className="w-full resize-none bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed whitespace-pre-wrap break-words overflow-y-auto scrollbar-thin"
            style={{ maxHeight: "160px" }}
          />
        </div>

        {/* Floating actions & controls toolbar */}
        <div className="flex items-center justify-between px-2.5 sm:px-3 pb-2 pt-0.5">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Camera / Photo Picker */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              aria-label="Upload crop photo"
              title="Upload or paste crop photo (Ctrl+V supported)"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Voice Dictation */}
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                recording === "recording"
                  ? "bg-destructive text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
              aria-label={recording === "recording" ? "Stop voice recording" : "Voice dictation"}
              title="Voice dictation (English)"
            >
              {recording === "recording" ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

          </div>

          <div className="flex items-center gap-1.5">
            {/* Submit / Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() && !selectedImage}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-dark transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs active:scale-95 flex-shrink-0"
              aria-label="Send message"
              title="Send inquiry (Enter)"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
