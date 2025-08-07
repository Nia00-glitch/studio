
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsClient from "@/components/SettingsClient";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { userProfile } = useAuth();
  const router = useRouter();

  // Determine the correct back navigation path based on the current role.
  const homePath = userProfile?.role === 'driver' ? '/driver-home' : '/rider-home';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button variant="ghost" size="icon" className="mr-4" onClick={() => router.replace(homePath)}>
              <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold font-headline">Settings</h1>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <SettingsClient />
      </main>
    </div>
  );
}
