import { useState, useEffect } from "react";
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
    const setting = settings.find(s => s.settingKey === key);
    return setting ? setting.settingValue || defaultValue : defaultValue;
  };

  const getBoolValue = (key: string, defaultValue: boolean = false) => {
    const setting = settings.find(s => s.settingKey === key);
    return setting ? setting.settingValue === 'true' : defaultValue;
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
  useEffect(() => {
    if (settings) {
      const formValues = mapSettingsToForm(settings);
      emailForm.reset(formValues);
    }
  }, [settings, emailForm]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettingsFormValues) => {
      const updates = [
        { settingKey: 'email_sender_name', settingValue: data.emailSenderName },
        { settingKey: 'email_sender_address', settingValue: data.emailSenderAddress },
        { settingKey: 'email_notifications_enabled', settingValue: data.emailNotificationsEnabled.toString() },
        { settingKey: 'email_logo_enabled', settingValue: data.emailLogoEnabled.toString() },
        { settingKey: 'email_footer_text', settingValue: data.emailFooterText || "" },
        { settingKey: 'violation_submitted_subject', settingValue: data.violationSubmittedSubject },
        { settingKey: 'violation_approved_subject', settingValue: data.violationApprovedSubject },
        { settingKey: 'violation_disputed_subject', settingValue: data.violationDisputedSubject },
        { settingKey: 'violation_rejected_subject', settingValue: data.violationRejectedSubject },
      ];

      for (const update of updates) {
        await apiRequest("PUT", `/api/settings/${update.settingKey}`, { settingValue: update.settingValue });
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
    <>
      {/* Page Title */}
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-neutral-800">Settings</h2>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-50">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">System Settings</h1>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => window.location.href = "/email-settings"}>
                <MailIcon className="mr-2 h-4 w-4" />
                SMTP Settings
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/users"}>
                <Settings className="mr-2 h-4 w-4" />
                User Management
              </Button>
            </div>
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
                              ) : "Test Email"}
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
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>
                      Configure system-wide settings and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">General system settings will be added in a future update.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </>
  );
}