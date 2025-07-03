"use client";

import { useContext, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { EmergencyContext } from "@/contexts/EmergencyContext";
import type { Contact } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Trash2, PlusCircle, Save } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().regex(phoneRegex, { message: "Invalid phone number." }),
});

const settingsSchema = z.object({
  contacts: z.array(contactSchema).max(3),
});

export default function SettingsClient() {
  const { settings, updateSettings, addContact, updateContact, deleteContact, activateEmergency } = useContext(EmergencyContext);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      contacts: settings.contacts,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "contacts",
  });
  
  const onSubmit = (data: z.infer<typeof settingsSchema>) => {
    data.contacts.forEach((contactData, index) => {
      const existingContact = settings.contacts[index];
      if(existingContact) {
        if(existingContact.name !== contactData.name || existingContact.phone !== contactData.phone) {
          updateContact({ ...existingContact, ...contactData });
        }
      } else {
        addContact(contactData);
      }
    });
    // Handle deletions that might have occurred
    if (data.contacts.length < settings.contacts.length) {
        settings.contacts.forEach(c => {
            if (!data.contacts.find(dc => dc.name === c.name && dc.phone === c.phone)) { // simplistic check
                 const deletedContact = settings.contacts.find(sc => !data.contacts.some(formContact => sc.id === formContact.id));
                 if(deletedContact) deleteContact(deletedContact.id);
            }
        });
    }

    toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
  };
  
  const handleTestMode = () => {
    toast({
        title: "Test Mode Activated",
        description: "Simulating emergency scenario..."
    });
    activateEmergency();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contacts</CardTitle>
          <CardDescription>Add up to 3 contacts who will be notified in an emergency.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Button type="button" variant="outline" onClick={() => append({ name: '', phone: '' })}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              )}
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Contacts
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Settings</CardTitle>
          <CardDescription>Configure how NIA responds during an emergency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="autoSendLocation" className="font-semibold">Auto-send Location</Label>
              <p className="text-sm text-muted-foreground">Automatically broadcast your location to contacts.</p>
            </div>
            <Switch
              id="autoSendLocation"
              checked={settings.autoSendLocation}
              onCheckedChange={(checked) => updateSettings({ autoSendLocation: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="enableRecording" className="font-semibold">Hidden Recording</Label>
              <p className="text-sm text-muted-foreground">Enable background audio/video recording.</p>
            </div>
            <Switch
              id="enableRecording"
              checked={settings.enableRecording}
              onCheckedChange={(checked) => updateSettings({ enableRecording: checked })}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Mode</CardTitle>
          <CardDescription>Simulate an emergency to test your settings. This will not alert contacts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleTestMode}>
            Test Emergency Mode
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
