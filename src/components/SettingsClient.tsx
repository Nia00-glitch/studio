"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from 'uuid';
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import type { Contact } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, PlusCircle, Save } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
        
        <div className="flex justify-between items-start">
            <Card>
                <CardHeader>
                <CardTitle>Test Mode</CardTitle>
                <CardDescription>Simulate an emergency to test your settings.</CardDescription>
                </CardHeader>
                <CardContent>
                <Button variant="destructive" type="button" onClick={handleTestMode}>
                    Test Emergency Mode
                </Button>
                </CardContent>
            </Card>

            <Button type="submit" size="lg">
                <Save className="mr-2 h-4 w-4" />
                Save All Settings
            </Button>
        </div>
      </form>
    </Form>
  );
}
