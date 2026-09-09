"use client";

import { useRouter } from "next/navigation";
import { User, ArrowRight, ShieldCheck } from "lucide-react";
import { useFarmer, demoProfile } from "@/context/FarmerContext";

interface DemoLoginButtonProps {
  className?: string;
}

export default function DemoLoginButton({ className = "" }: DemoLoginButtonProps) {
  const router = useRouter();
  const { resetToDemoProfile } = useFarmer();

  const handleDemoLogin = () => {
    resetToDemoProfile();
    router.push("/dashboard");
  };

  return (
    <button
      onClick={handleDemoLogin}
      type="button"
      className={`w-full group relative overflow-hidden rounded-2xl border-2 border-primary bg-primary/5 p-4 text-left transition-all duration-300 hover:bg-primary/10 hover:border-primary hover:shadow-md cursor-pointer ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform duration-200">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Quick Demo Access
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-primary/15 text-primary-dark font-medium px-1.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> One-Click
              </span>
            </div>
            <p className="font-heading text-base font-bold text-foreground">
              Continue as {demoProfile.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified Farmer • {demoProfile.district}, {demoProfile.state}
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-primary group-hover:translate-x-1 transition-transform duration-200 shadow-xs">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}
