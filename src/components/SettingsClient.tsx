
"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from 'uuid';
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Contact } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, PlusCircle, Save, UploadCloud, AlertTriangle, User, Car, Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { uploadRecordingToFirebase } from "@/lib/storage";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useState } from "react";
import { useRouter } from "next/navigation";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const contactSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().regex(phoneRegex, { message: "Invalid phone number." }),
});

const settingsSchema = z.object({
  contacts: z.array(contactSchema).max(3, { message: "You can add a maximum of 3 contacts." }),
  autoSendLocation: z.boolean(),
  enableRecording: z.boolean(),
});

export default function SettingsClient() {
  const { settings, updateSettings, triggerEmergency } = useEmergencyContext();
  const { userProfile, updateRole } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);


  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      contacts: settings.contacts,
      autoSendLocation: settings.autoSendLocation,
      enableRecording: settings.enableRecording,
    },
    values: settings,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });
  
  const onSubmit = (data: z.infer<typeof settingsSchema>) => {
    updateSettings(data);
    toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
  };
  
  const handleTestMode = () => {
    toast({
        title: "Test Mode Activated",
        description: "Simulating emergency scenario..."
    });
    triggerEmergency();
  }

  const handleTestUpload = async () => {
    toast({ title: "Running Storage Test...", description: "Attempting to upload a test file." });
    const testContent = "This is a test file from NIA Safety Assistant.";
    const blob = new Blob([testContent], { type: 'text/plain' });
    const report = await uploadRecordingToFirebase(blob);
    
    console.log("Firebase Storage Test Report:", JSON.stringify(report, null, 2));

    if (report.status === '✅ Upload Successful') {
      toast({
        title: "🟢 Upload complete and verified.",
        description: `File uploaded to: ${report.filePath}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "🔴 Upload failed. Please check config.",
        description: report.reason,
      });
    }
  };

  const handleRoleChange = async (newRole: 'rider' | 'driver') => {
    if (!userProfile || userProfile.role === newRole) return;
    setIsSwitchingRole(true);
    try {
      await updateRole(newRole);
      toast({
        title: "Role Switched!",
        description: `You are now in ${newRole} mode.`,
      });
      // Redirect to the correct dashboard after switching
      router.replace(newRole === 'driver' ? '/driver-home' : '/rider-home');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error switching role",
        description: error.message,
      });
    } finally {
      setIsSwitchingRole(false);
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <Card>
          <CardHeader>
            <CardTitle>Operating Mode</CardTitle>
            <CardDescription>Switch between Rider and Driver modes.</CardDescription>
          </CardHeader>
          <CardContent>
            {isSwitchingRole ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span>Switching mode...</span>
              </div>
            ) : (
              <RadioGroup
                defaultValue={userProfile?.role}
                onValueChange={(value: 'rider' | 'driver') => handleRoleChange(value)}
                className="grid grid-cols-2 gap-4"
                disabled={isSwitchingRole}
              >
                <div>
                  <RadioGroupItem value="rider" id="rider" className="peer sr-only" />
                  <FormLabel
                    htmlFor="rider"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <User className="mb-3 h-6 w-6" />
                    Rider
                  </FormLabel>
                </div>
                <div>
                  <RadioGroupItem value="driver" id="driver" className="peer sr-only" />
                  <FormLabel
                    htmlFor="driver"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Car className="mb-3 h-6 w-6" />
                    Driver
                  </FormLabel>
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contacts</CardTitle>
            <CardDescription>Add up to 3 contacts who will be notified in an emergency.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
                    <FormField
                      control={form.control}
                      name={`contacts.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`contacts.${index}.phone`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 123 456 7890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            {fields.length < 3 && (
              <Button type="button" variant="outline" onClick={() => append({ id: uuidv4(), name: '', phone: '' })} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            )}
             <FormField
                control={form.control}
                name="contacts"
                render={() => ( <FormMessage /> )}
              />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Settings</CardTitle>
            <CardDescription>Configure how NIA responds during an emergency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="autoSendLocation"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FormLabel htmlFor="autoSendLocation">Auto-send Location</FormLabel>
                    <p className="text-sm text-muted-foreground">Automatically broadcast your location to contacts.</p>
                  </div>
                  <FormControl>
                    <Switch id="autoSendLocation" checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enableRecording"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FormLabel htmlFor="enableRecording">Hidden Recording</FormLabel>
                    <p className="text-sm text-muted-foreground">Enable background audio/video recording.</p>
                  </div>
                  <FormControl>
                    <Switch id="enableRecording" checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card>
              <CardHeader>
              <CardTitle>Test Emergency Mode</CardTitle>
              <CardDescription>Simulate an emergency to test your settings.</CardDescription>
              </CardHeader>
              <CardContent>
              <Button variant="destructive" type="button" onClick={handleTestMode}>
                  Test Emergency
              </Button>
              </CardContent>
          </Card>
          
          <Card>
              <CardHeader>
              <CardTitle>Test Firebase Storage</CardTitle>
              <CardDescription>Verify connection by uploading a small test file.</CardDescription>
              </CardHeader>
              <CardContent>
              <Button variant="outline" type="button" onClick={handleTestUpload}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Test Upload
              </Button>
              </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end pt-4">
            <Button type="submit" size="lg">
                <Save className="mr-2 h-4 w-4" />
                Save All Settings
            </Button>
        </div>
      </form>
    </Form>
  );
}
