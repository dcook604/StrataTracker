import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SystemSetting } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Settings, MailIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";

const emailSettingsSchema = z.object({
  emailSenderName: z.string().min(1, "Sender name is required"),
  emailSenderAddress: z.string().email("Invalid email format").min(1, "Sender email is required"),
  emailNotificationsEnabled: z.boolean().default(true),
  emailLogoEnabled: z.boolean().default(true),
  emailFooterText: z.string().optional(),
  violationSubmittedSubject: z.string().min(1, "Subject is required"),
  violationApprovedSubject: z.string().min(1, "Subject is required"),
  violationDisputedSubject: z.string().min(1, "Subject is required"),
  violationRejectedSubject: z.string().min(1, "Subject is required"),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

const mapSettingsToForm = (settings: SystemSetting[]): EmailSettingsFormValues => {
  const getValue = (key: string, defaultValue: string = "") => {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  };

  const getBoolValue = (key: string, defaultValue: boolean = false) => {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value === 'true' : defaultValue;
  };

  return {
    emailSenderName: getValue('email_sender_name', 'Strata Management'),
    emailSenderAddress: getValue('email_sender_address', 'violations@example.com'),
    emailNotificationsEnabled: getBoolValue('email_notifications_enabled', true),
    emailLogoEnabled: getBoolValue('email_logo_enabled', true),
    emailFooterText: getValue('email_footer_text', '© Strata Management System'),
    violationSubmittedSubject: getValue('violation_submitted_subject', 'New Violation Report'),
    violationApprovedSubject: getValue('violation_approved_subject', 'Violation Approved - Action Required'),
    violationDisputedSubject: getValue('violation_disputed_subject', 'Violation Disputed'),
    violationRejectedSubject: getValue('violation_rejected_subject', 'Violation Rejected'),
  };
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("email");
  const [testEmailAddress, setTestEmailAddress] = useState<string>("");
  const [sendingTestEmail, setSendingTestEmail] = useState<boolean>(false);

  const { data: settings, isLoading } = useQuery<SystemSetting[]>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      return res.json();
    },
  });

  const emailForm = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailSenderName: "Strata Management",
      emailSenderAddress: "violations@example.com",
      emailNotificationsEnabled: true,
      emailLogoEnabled: true,
      emailFooterText: "© Strata Management System",
      violationSubmittedSubject: "New Violation Report",
      violationApprovedSubject: "Violation Approved - Action Required",
      violationDisputedSubject: "Violation Disputed",
      violationRejectedSubject: "Violation Rejected",
    }
  });

  // Update form values when settings are loaded
  useState(() => {
    if (settings) {
      const formValues = mapSettingsToForm(settings);
      emailForm.reset(formValues);
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettingsFormValues) => {
      const updates = [
        { key: 'email_sender_name', value: data.emailSenderName },
        { key: 'email_sender_address', value: data.emailSenderAddress },
        { key: 'email_notifications_enabled', value: data.emailNotificationsEnabled.toString() },
        { key: 'email_logo_enabled', value: data.emailLogoEnabled.toString() },
        { key: 'email_footer_text', value: data.emailFooterText || "" },
        { key: 'violation_submitted_subject', value: data.violationSubmittedSubject },
        { key: 'violation_approved_subject', value: data.violationApprovedSubject },
        { key: 'violation_disputed_subject', value: data.violationDisputedSubject },
        { key: 'violation_rejected_subject', value: data.violationRejectedSubject },
      ];

      for (const update of updates) {
        await apiRequest("PUT", `/api/settings/${update.key}`, { value: update.value });
      }

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "The system settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/settings/test-email", { email });
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "A test email has been sent to the specified address.",
      });
      setSendingTestEmail(false);
      setTestEmailAddress("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSendingTestEmail(false);
    }
  });

  const onEmailFormSubmit = (data: EmailSettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  const sendTestEmail = () => {
    if (!testEmailAddress) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    setSendingTestEmail(true);
    sendTestEmailMutation.mutate(testEmailAddress);
  };

  // Check if user is admin or council member
  if (user && !user.isAdmin && !user.isCouncilMember) {
    return (
      <div className="container py-10">
        <EmptyState
          icon={<Settings className="h-10 w-10" />}
          title="Access Denied"
          description="You don't have permission to access system settings."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">System Settings</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="email">Email Settings</TabsTrigger>
            <TabsTrigger value="system">System Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Notification Settings</CardTitle>
                <CardDescription>
                  Configure how email notifications are sent to residents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailFormSubmit)} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={emailForm.control}
                        name="emailSenderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sender Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Strata Management" {...field} />
                            </FormControl>
                            <FormDescription>
                              This name will appear as the sender of all notification emails
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={emailForm.control}
                        name="emailSenderAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sender Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="violations@example.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              The email address that will be used to send all notifications
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={emailForm.control}
                        name="emailNotificationsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Email Notifications</FormLabel>
                              <FormDescription>
                                Enable or disable all email notifications
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={emailForm.control}
                        name="emailLogoEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Include Logo in Emails</FormLabel>
                              <FormDescription>
                                Show the strata logo in notification emails
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={emailForm.control}
                      name="emailFooterText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Footer Text</FormLabel>
                          <FormControl>
                            <Input placeholder="© Strata Management System" {...field} />
                          </FormControl>
                          <FormDescription>
                            Text to appear at the bottom of all notification emails
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={emailForm.control}
                        name="violationSubmittedSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Violation Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="New Violation Report" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={emailForm.control}
                        name="violationApprovedSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Violation Approved Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="Violation Approved - Action Required" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={emailForm.control}
                        name="violationDisputedSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Violation Disputed Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="Violation Disputed" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={emailForm.control}
                        name="violationRejectedSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Violation Rejected Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="Violation Rejected" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <CardFooter className="flex justify-between border-t pt-6 px-0">
                      <div className="flex items-center space-x-2">
                        <Input
                          className="w-64"
                          placeholder="Enter email for test"
                          value={testEmailAddress}
                          onChange={(e) => setTestEmailAddress(e.target.value)}
                        />
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={sendTestEmail}
                          disabled={sendingTestEmail}
                        >
                          {sendingTestEmail ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <MailIcon className="mr-2 h-4 w-4" />
                              Send Test Email
                            </>
                          )}
                        </Button>
                      </div>
                      <Button 
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                      >
                        {updateSettingsMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : "Save Settings"}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Manage general system settings and configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground py-12 text-center">
                  Additional system settings will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}