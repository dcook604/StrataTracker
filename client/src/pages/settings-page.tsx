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
import { Loader2, Settings, MailIcon, CheckCircle2, AlertCircle, Users as UsersIconLucide } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { Layout } from "@/components/layout";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserManagementTabContent } from "@/components/user-management-tab";

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

// SMTP Configuration Schema
const smtpConfigSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.coerce.number().int().positive("Port must be a positive integer"),
  secure: z.boolean().default(false),
  authUser: z.string().optional(),
  authPass: z.string().optional(),
  from: z.string().email("From address must be a valid email")
});

// Test Email Schema for SMTP
const smtpTestEmailSchema = z.object({
  testEmail: z.string().email("Please enter a valid email address")
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;
type SmtpConfigFormData = z.infer<typeof smtpConfigSchema>;
type SmtpTestEmailFormData = z.infer<typeof smtpTestEmailSchema>;

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
  const [, navigate] = useLocation();
  const queryClientHook = useQueryClient();

  // State for SMTP Test
  const [isSmtpTestDialogOpen, setIsSmtpTestDialogOpen] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [smtpTestMessage, setSmtpTestMessage] = useState('');

  const { data: settings, isLoading: isLoadingEmailNotificationSettings } = useQuery<SystemSetting[]>({
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

  // Fetch SMTP configuration
  const { data: smtpConfig, isLoading: isLoadingSmtpConfig, error: smtpConfigError } = useQuery({
    queryKey: ['/api/email-config'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/email-config');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch SMTP configuration' }));
        throw new Error(errorData.message || 'Failed to fetch SMTP configuration');
      }
      return response.json();
    }
  });

  const smtpForm = useForm<SmtpConfigFormData>({
    resolver: zodResolver(smtpConfigSchema),
    defaultValues: {
      host: '',
      port: 587, // Common default
      secure: false,
      authUser: '',
      authPass: '',
      from: ''
    },
  });

  // Update SMTP form values when smtpConfig is loaded
  useEffect(() => {
    if (smtpConfig) {
      smtpForm.reset({
        host: smtpConfig.host || '',
        port: smtpConfig.port || 587,
        secure: !!smtpConfig.secure,
        authUser: smtpConfig.auth?.user || '',
        authPass: '', // Do not populate password
        from: smtpConfig.from || ''
      });
    }
  }, [smtpConfig, smtpForm]);
  
  const smtpTestForm = useForm<SmtpTestEmailFormData>({
    resolver: zodResolver(smtpTestEmailSchema),
    defaultValues: {
      testEmail: user?.email || ''
    }
  });

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

  // Mutation for saving SMTP configuration
  const saveSmtpConfigMutation = useMutation({
    mutationFn: async (data: SmtpConfigFormData) => {
      // Construct payload, ensuring authPass is only included if provided
      const payload: any = {
        host: data.host,
        port: data.port,
        secure: data.secure,
        from: data.from,
        auth: {
          user: data.authUser,
        },
      };
      if (data.authPass) {
        payload.auth.pass = data.authPass;
      }

      const response = await apiRequest('POST', '/api/email-config', payload);
      if (!response.ok) {
        const error = await response.json().catch(() => ({message: 'Failed to save SMTP configuration'}));
        throw new Error(error.message || 'Failed to save SMTP configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClientHook.invalidateQueries({ queryKey: ['/api/email-config'] });
      toast({
        title: 'Success',
        description: 'SMTP configuration saved successfully.',
      });
      smtpForm.setValue('authPass', ''); // Clear password field after save
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Saving SMTP Config',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Mutation for testing SMTP email configuration
  const testSmtpEmailMutation = useMutation({
    mutationFn: async (data: { testEmail: string; config: SmtpConfigFormData }) => {
      setSmtpTestStatus('loading');
      setSmtpTestMessage('');

      // Construct payload, ensuring authPass is only included if provided
      const payload: any = {
        host: data.config.host,
        port: data.config.port,
        secure: data.config.secure,
        from: data.config.from,
        auth: {
          user: data.config.authUser,
        },
        testEmail: data.testEmail,
      };
      if (data.config.authPass && data.config.authPass !== '********') { // only send if not placeholder
        payload.auth.pass = data.config.authPass;
      } else {
         // If password is placeholder or empty, try to use existing stored password logic (if BE supports it)
         // For now, we rely on the user re-entering it if they want to test with a password change.
         // Or, the backend could use the currently stored password if an empty one is sent for test.
      }


      const response = await apiRequest('POST', '/api/email-config/test', payload);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send test email');
      }
      return result;
    },
    onSuccess: () => {
      setSmtpTestStatus('success');
      setSmtpTestMessage('Test email sent successfully! Please check your inbox.');
    },
    onError: (error: Error) => {
      setSmtpTestStatus('error');
      setSmtpTestMessage(error.message || 'Failed to send test email');
    }
  });

  const onEmailFormSubmit = (data: EmailSettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  const onSmtpConfigSubmit = (data: SmtpConfigFormData) => {
    // Mask password in form data if not changed, to avoid sending '********'
    const currentValues = smtpForm.getValues();
    if (data.authPass === '' && smtpConfig?.auth?.user === data.authUser) {
      // If password field is empty and user hasn't changed, don't send password
      // This relies on backend to keep existing password if not provided.
      // Or, make authPass truly optional in payload if user doesn't want to change it.
      // For now, we'll let the mutationFn handle empty authPass.
    }
    saveSmtpConfigMutation.mutate(data);
  };

  const onSmtpTestSubmit = (data: SmtpTestEmailFormData) => {
    const configData = smtpForm.getValues(); // Get current SMTP form values
    testSmtpEmailMutation.mutate({ testEmail: data.testEmail, config: configData });
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
    <Layout title="System Settings">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <TabsTrigger value="email">
                <MailIcon className="mr-2 h-4 w-4" /> Email Settings
              </TabsTrigger>
              <TabsTrigger value="system">
                <Settings className="mr-2 h-4 w-4" /> System Settings
              </TabsTrigger>
              <TabsTrigger value="smtp">
                <MailIcon className="mr-2 h-4 w-4" /> SMTP Settings
              </TabsTrigger>
              <TabsTrigger value="users">
                <UsersIconLucide className="mr-2 h-4 w-4" /> User Management
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="email">
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
                          onClick={() => setIsSmtpTestDialogOpen(true)}
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

          <TabsContent value="smtp">
            <Card>
              <CardHeader>
                <CardTitle>SMTP Configuration</CardTitle>
                <CardDescription>
                  Configure your SMTP server settings for sending system emails.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {smtpConfigError ? (
                   <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Error Loading SMTP Config</AlertTitle>
                     <AlertDescription>
                       {(smtpConfigError as Error).message || "Could not load SMTP configuration. Please try again."}
                       <Button 
                         variant="link" 
                         className="p-0 h-auto ml-2" 
                         onClick={() => queryClientHook.invalidateQueries({ queryKey: ['/api/email-config'] })}
                       >
                         Retry
                       </Button>
                     </AlertDescription>
                   </Alert>
                ) : (
                <Form {...smtpForm}>
                  <form onSubmit={smtpForm.handleSubmit(onSmtpConfigSubmit)} className="space-y-4">
                    <FormField
                      control={smtpForm.control}
                      name="host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Host</FormLabel>
                          <FormControl>
                            <Input placeholder="smtp.example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={smtpForm.control}
                        name="port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Port</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="587" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={smtpForm.control}
                        name="secure"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-2 sm:mt-0 sm:pt-[2.1rem] sm:pb-[2.1rem]">
                            <div className="space-y-0.5">
                              <FormLabel>Use SSL/TLS</FormLabel>
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
                      control={smtpForm.control}
                      name="authUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={smtpForm.control}
                      name="authPass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Leave blank to keep existing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={smtpForm.control}
                      name="from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="noreply@example.com" {...field} />
                          </FormControl>
                          <FormDescription>This email will be used as the sender for system notifications.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <CardFooter className="flex justify-end px-0 pt-6 border-t">
                      <Button type="submit" disabled={saveSmtpConfigMutation.isPending}>
                        {saveSmtpConfigMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving SMTP...</>
                        ) : "Save SMTP Settings"}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
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

          <TabsContent value="users">
            <UserManagementTabContent />
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}