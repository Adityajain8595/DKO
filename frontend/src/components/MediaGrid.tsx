"use client";

import React, { useState } from "react";
import { X, MessageSquare, Sprout, Maximize2 } from "lucide-react";
import type { MediaItem } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface MediaGridProps {
  items: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onShowInChat?: (sessionId?: string, messageId?: string) => void;
}

function SeverityBadge({ severity }: { severity: MediaItem["severity"] }) {
  const classes: Record<string, string> = {
    healthy: "severity-healthy",
    mild: "severity-mild",
    moderate: "severity-moderate",
    severe: "severity-severe",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${classes[severity] || "severity-mild"}`}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

export default function MediaGrid({ items, isOpen, onClose, onShowInChat }: MediaGridProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-card z-50 shadow-2xl flex flex-col border-l border-border"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-light">
                <div>
                  <h2 className="font-heading font-bold text-lg text-foreground">
                    Field Media
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {items.length} {items.length === 1 ? "specimen" : "specimens"} cataloged
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                {items.length === 0 ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sprout className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">No Field Media Yet</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                        Attach or paste crop photographs in the AI Krishi Advisory chat to trigger instant optical pathology diagnosis and build your farm catalog.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5">
                    {items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: index * 0.04,
                          duration: 0.3,
                        }}
                        className="glass-card-solid rounded-xl overflow-hidden group border border-border/80 hover:border-primary/50 transition-all shadow-xs flex flex-col"
                      >
                        {/* Uncropped full image preview tile */}
                        <div
                          onClick={() => setSelectedItem(item)}
                          className="aspect-square bg-muted/40 relative overflow-hidden flex items-center justify-center p-2 border-b border-border-light cursor-pointer group"
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={`${item.cropName} sample`}
                              className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-102"
                            />
                          ) : (
                            <div className="text-center flex flex-col items-center justify-center">
                              <Sprout className="w-8 h-8 text-primary/60 mb-1" />
                              <span className="text-[11px] font-semibold text-foreground">
                                {item.cropName}
                              </span>
                            </div>
                          )}

                          {/* Hover Action to expand full resolution */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="p-2 rounded-full bg-white/20 backdrop-blur-xs text-white">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className="absolute top-2 right-2 z-10">
                            <SeverityBadge severity={item.severity} />
                          </div>
                        </div>

                        {/* Card metadata */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            <p className="text-xs font-bold text-foreground truncate" title={item.diagnosisTag}>
                              {item.diagnosisTag}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {item.cropName}
                            </p>
                          </div>

                          {/* Footer with date and Show in Chat link */}
                          <div className="flex items-center justify-between pt-2 border-t border-border-light/80 text-[11px]">
                            <span className="text-muted-foreground text-[10px]">
                              {new Date(item.uploadDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>

                            {item.sessionId && onShowInChat && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onShowInChat(item.sessionId, item.messageId);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark cursor-pointer transition-colors"
                                title="Open exact chat message"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Show in chat</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox for exact resolution image with blurred background */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[92vh] w-full flex flex-col bg-card border border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm sm:text-base text-foreground">
                    {selectedItem.cropName} Specimen
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedItem.uploadDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedItem.sessionId && onShowInChat && (
                    <button
                      onClick={() => {
                        const sId = selectedItem.sessionId;
                        const mId = selectedItem.messageId;
                        setSelectedItem(null);
                        onClose();
                        onShowInChat(sId, mId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dark cursor-pointer transition-colors shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Show in chat</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Exact resolution image */}
              <div className="flex-1 min-h-0 p-3 sm:p-5 flex items-center justify-center overflow-auto bg-black/10 dark:bg-black/40">
                <img
                  src={selectedItem.thumbnailUrl}
                  alt={selectedItem.cropName}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl select-none"
                />
              </div>

              {/* Diagnosis info footer */}
              {selectedItem.diagnosisTag && (
                <div className="px-4 sm:px-6 py-3 bg-muted/40 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-foreground">
                    <span className="text-muted-foreground">Diagnosis: </span>
                    <span className="font-semibold">{selectedItem.diagnosisTag}</span>
                  </span>
                  <span className="text-[11px] uppercase font-bold text-primary tracking-wider">
                    {selectedItem.status}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
