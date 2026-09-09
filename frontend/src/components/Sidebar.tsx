"use client";

import React from "react";
import {
  LayoutDashboard,
  MessageSquare,
  CloudSun,
  Coins,
  FileCheck,
  ImageIcon,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wheat,
  Sprout,
  FileText,
  Trash2,
} from "lucide-react";
import { useFarmer } from "@/context/FarmerContext";
import DkoLogo from "./DkoLogo";
import type { Session, DashboardModule } from "@/lib/types";

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onNewSession: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  isOpen,
  onToggle,
}: SidebarProps) {
  const { profile, activeModule, setActiveModule, setIsProfileModalOpen } = useFarmer();

  const navItems: { id: DashboardModule; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "advisory", label: "AI Krishi Advisory", icon: MessageSquare },
    { id: "weather", label: "Weather Intelligence", icon: CloudSun },
    { id: "market", label: "Market Intelligence", icon: Coins },
    { id: "media", label: "Field Media", icon: ImageIcon },
  ];


  const getCropIcon = (cat: Session["cropCategory"]) => {
    switch (cat) {
      case "wheat":
        return Wheat;
      case "rice":
        return Sprout;
      case "cotton":
        return Sprout;
      default:
        return FileText;
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-2xs z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header with Custom Logo */}
        <div className="p-4 border-b border-border-light flex items-center justify-between">
          <DkoLogo size="sm" />
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer lg:hidden"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Primary Enterprise Navigation Modules */}
        <div className="p-3 border-b border-border-light space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
            Intelligence Modules
          </span>

          <div className="space-y-0.5 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id);
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-on-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Advisory Session History (Shown dynamically when in Advisory mode or for quick access) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Recent Inquiries
            </span>
            <button
              onClick={() => {
                setActiveModule("advisory");
                onNewSession();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-dark cursor-pointer"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          <div className="space-y-1">
            {sessions.length === 0 ? (
              <div className="py-5 px-3 text-center border border-dashed border-border-light rounded-xl bg-muted/10">
                <p className="text-xs font-semibold text-foreground/80">No active inquiries</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Start a consultation below or click New</p>
              </div>
            ) : (
              sessions.map((session) => {
                const CropIcon = getCropIcon(session.cropCategory);
                const isSelected =
                  activeSessionId === session.id && activeModule === "advisory";
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setActiveModule("advisory");
                      onSelectSession(session.id);
                      if (window.innerWidth < 1024) onToggle();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setActiveModule("advisory");
                        onSelectSession(session.id);
                        if (window.innerWidth < 1024) onToggle();
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer group border ${
                      isSelected
                        ? "bg-primary/10 border-primary/20 text-foreground"
                        : "hover:bg-muted border-transparent text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <CropIcon className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {session.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {session.preview}
                        </p>
                      </div>
                      {onDeleteSession && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/15 text-muted-foreground hover:text-destructive rounded transition-all cursor-pointer"
                          title="Delete inquiry session"
                          aria-label="Delete session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Farmer Profile Footer */}
        <div className="p-3 border-t border-border-light bg-muted/20">
          <div className="p-2.5 rounded-xl border border-border-light bg-card flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-foreground truncate">
                  {profile.name}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {profile.district}, {profile.state}
              </p>
            </div>

            <button
              onClick={() => setIsProfileModalOpen(true)}
              title="Edit Profile & Alert Preferences"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
