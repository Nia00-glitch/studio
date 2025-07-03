import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsClient from "@/components/SettingsClient";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" passHref>
            <Button variant="ghost" size="icon" className="mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold font-headline">Settings</h1>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <SettingsClient />
      </main>
    </div>
  );
}
