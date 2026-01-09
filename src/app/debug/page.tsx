
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebase } from '@/lib/firebase/provider';
import { httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function DebugPage() {
  const { user } = useAuth();
  const { functions } = useFirebase();
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const runDiagnostics = async () => {
    setLogs([]);
    setStatus('RUNNING');
    addLog("🚀 Starting System Diagnostics...");

    try {
      // 1. Check Auth
      if (!user) {
        addLog("⚠️ User is NOT logged in. Some tests might fail.");
      } else {
        addLog(`✅ User Logged In: ${user.uid}`);
      }

      // 2. Check Functions Connection
      if (!functions) {
        throw new Error("Firebase Functions SDK not initialized on client.");
      }
      addLog("✅ Firebase Functions SDK Ready.");

      // 3. Test AI Connection (The Critical Part)
      addLog("🤖 Testing AI Brain (Cloud Function)...");
      
      // We will try to call the flow. If it fails, we catch the EXACT error.
      // Note: We use 'niaActionFlow' as corrected previously.
      const niaAction = httpsCallable(functions, 'niaActionFlow');
      
      const startTime = Date.now();
      // Sending a simple "Hello" to see if AI responds
      const result = await niaAction({ prompt: "Hello, are you online?" });
      const endTime = Date.now();

      addLog(`✅ AI Responded in ${endTime - startTime}ms`);
      addLog(`🗣️ AI Reply: ${JSON.stringify(result.data)}`);

      setStatus('SUCCESS');
      addLog("🎉 SYSTEM IS HEALTHY!");

    } catch (error: any) {
      console.error(error);
      setStatus('ERROR');
      addLog(`❌ CRITICAL FAILURE: ${error.message}`);
      
      if (error.message.includes("internal")) {
        addLog("💡 HINT: 'Internal' usually means the API Key is missing on the server or the Server code crashed.");
      }
      if (error.message.includes("Failed to fetch")) {
        addLog("💡 HINT: The Local Emulator might be stopped. Check if the server is running.");
      }
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🩺 NIA System Doctor
            {status === 'RUNNING' && <Loader2 className="animate-spin" />}
            {status === 'SUCCESS' && <CheckCircle className="text-green-500" />}
            {status === 'ERROR' && <XCircle className="text-red-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto border">
            {logs.length === 0 ? "Ready to test. Click button below." : logs.map((log, i) => (
              <div key={i} className={log.includes("❌") ? "text-red-600 font-bold" : log.includes("✅") ? "text-green-600" : ""}>
                {log}
              </div>
            ))}
          </div>

          <Button onClick={runDiagnostics} disabled={status === 'RUNNING'} className="w-full text-lg h-12">
            {status === 'RUNNING' ? "Running Tests..." : "Run Full System Check"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
