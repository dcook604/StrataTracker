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
import { Loader2, Settings, MailIcon, CheckCircle2, AlertCircle, Users as UsersIconLucide, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { Layout } from "@/components/layout";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserManagementTabContent } from "@/components/user-management-tab";
import { FileUpload } from "@/components/file-upload";

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
    const setting = Array.isArray(settings) ? settings.find(s => s.settingKey === key) : undefined;
    return setting ? setting.settingValue || defaultValue : defaultValue;
  };

  const getBoolValue = (key: string, defaultValue: boolean = false) => {
    const setting = Array.isArray(settings) ? settings.find(s => s.settingKey === key) : undefined;
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

const systemSettingsSchema = z.object({
  strataName: z.string().min(1, "Strata name is required"),
  propertyAddress: z.object({
    streetLine1: z.string().min(1, "Street address is required"),
    streetLine2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postalCode: z.string().min(1, "Postal code is required").regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, "Invalid Canadian postal code format"),
    country: z.string().default("Canada"),
  }),
  adminFirstName: z.string().min(1, "First name required"),
  adminLastName: z.string().min(1, "Last name required"),
  adminEmail: z.string().email("Invalid email").min(1, "Email required"),
  adminPhone: z.string().min(1, "Phone required"),
  propertyManagers: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    receiveAllViolationEmails: z.boolean().default(false),
  })).optional(),
  caretakers: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    receiveAllViolationEmails: z.boolean().default(false),
  })).optional(),
  councilMembers: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    receiveAllViolationEmails: z.boolean().default(false),
  })).optional(),
  defaultTimezone: z.string().min(1),
  defaultLanguage: z.string().min(1),
  strataLogo: z.string().optional(),
});

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
  const [isSavingSystemSettings, setIsSavingSystemSettings] = useState<boolean>(false);

  const { data: settingsResponse, isLoading: isLoadingEmailNotificationSettings } = useQuery<{settings: SystemSetting[], logoUrl?: string}>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      return res.json();
    },
  });

  const settings = settingsResponse?.settings;

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
    if (settings && Array.isArray(settings)) {
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
        authPass: smtpConfig.auth?.pass === '********' ? '********' : '', // Show masked password if exists
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
        await apiRequest("POST", `/api/settings/${update.settingKey}`, { value: update.settingValue });
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
    // If password is still the masked value, don't send it (let backend keep existing)
    const submitData = { ...data };
    if (data.authPass === '********') {
      // Don't include the password in the payload if it's still masked
      submitData.authPass = '********';
    }
    saveSmtpConfigMutation.mutate(submitData);
  };

  const onSmtpTestSubmit = (data: SmtpTestEmailFormData) => {
    const configData = smtpForm.getValues(); // Get current SMTP form values
    testSmtpEmailMutation.mutate({ testEmail: data.testEmail, config: configData });
  };

  // Add state for system settings form and logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [systemForm, setSystemForm] = useState<any>({
    strataName: "",
    propertyAddress: {
      streetLine1: "",
      streetLine2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Canada",
    },
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPhone: "",
    propertyManagers: [],
    caretakers: [],
    councilMembers: [],
    defaultTimezone: "America/Vancouver",
    defaultLanguage: "en",
    strataLogo: "",
  });

  // In useEffect, when settings are loaded, populate systemForm and logoUrl
  useEffect(() => {
    if (settings && Array.isArray(settings)) {
      const defaultSysValues = {
        strataName: "",
        propertyAddress: { streetLine1: "", streetLine2: "", city: "", province: "", postalCode: "", country: "Canada" },
        adminFirstName: "",
        adminLastName: "",
        adminEmail: "",
        adminPhone: "",
        propertyManagers: [],
        caretakers: [],
        councilMembers: [],
        defaultTimezone: "America/Vancouver",
        defaultLanguage: "en",
        strataLogo: "",
      };

      const loadedSys = settings.reduce((acc, s) => {
        const assignValue = (key: keyof typeof defaultSysValues, value: string | null) => {
          if (value === null) { // Explicitly handle null from DB
            (acc as any)[key] = (defaultSysValues as any)[key]; // Assign default for this key
            return;
          }
          if (key === 'propertyAddress' || key === 'propertyManagers' || key === 'caretakers' || key === 'councilMembers') {
            try {
              const jsonString = value && value.trim() !== "" ? value : (key === 'propertyAddress' ? '{}' : '[]');
              (acc as any)[key] = JSON.parse(jsonString);
              if (key === 'propertyManagers' || key === 'caretakers' || key === 'councilMembers') {
                (acc as any)[key] = ((acc as any)[key] || []).map((item: any) => ({ ...item, receiveAllViolationEmails: !!item.receiveAllViolationEmails }));
              }
            } catch (e) {
              console.error(`Failed to parse ${key}:`, e, "Raw value:", value);
              (acc as any)[key] = (defaultSysValues as any)[key]; 
            }
          } else {
            (acc as any)[key] = value;
          }
        };

        if (s.settingKey === 'strata_name') acc.strataName = s.settingValue || '';
        else if (s.settingKey === 'property_address') assignValue('propertyAddress', s.settingValue);
        else if (s.settingKey === 'admin_first_name') acc.adminFirstName = s.settingValue || '';
        else if (s.settingKey === 'admin_last_name') acc.adminLastName = s.settingValue || '';
        else if (s.settingKey === 'admin_email') acc.adminEmail = s.settingValue || '';
        else if (s.settingKey === 'admin_phone') acc.adminPhone = s.settingValue || '';
        else if (s.settingKey === 'property_managers') assignValue('propertyManagers', s.settingValue);
        else if (s.settingKey === 'caretakers') assignValue('caretakers', s.settingValue);
        else if (s.settingKey === 'council_members') assignValue('councilMembers', s.settingValue);
        else if (s.settingKey === 'default_timezone') acc.defaultTimezone = s.settingValue || 'America/Vancouver';
        else if (s.settingKey === 'default_language') acc.defaultLanguage = s.settingValue || 'en';
        else if (s.settingKey === 'strata_logo') {
          acc.strataLogo = s.settingValue || ""; // Ensure strataLogo is string
          // setLogoUrl is handled below to avoid race condition with acc.strataLogo update
        }
        return acc;
      }, { ...defaultSysValues });

      setSystemForm(loadedSys);

      // Update logoUrl based on the backend response or the final loadedSys.strataLogo
      if (settingsResponse?.logoUrl) {
        setLogoUrl(settingsResponse.logoUrl);
      } else if (loadedSys.strataLogo) {
        setLogoUrl(loadedSys.strataLogo.startsWith('http') || loadedSys.strataLogo.startsWith('/') ? loadedSys.strataLogo : `/api/uploads/${loadedSys.strataLogo}`);
      } else {
        setLogoUrl(null);
      }
      // Also update emailForm which depends on settings
      const emailFormValues = mapSettingsToForm(settings);
      emailForm.reset(emailFormValues);

    } else if (!isLoadingEmailNotificationSettings && !settingsResponse) {
        setSystemForm({
            strataName: "",
            propertyAddress: { streetLine1: "", streetLine2: "", city: "", province: "", postalCode: "", country: "Canada" },
            adminFirstName: "",
            adminLastName: "",
            adminEmail: "",
            adminPhone: "",
            propertyManagers: [],
            caretakers: [],
            councilMembers: [],
            defaultTimezone: "America/Vancouver",
            defaultLanguage: "en",
            strataLogo: "",
        });
        setLogoUrl(null);
        // Also reset emailForm if settings failed to load
        emailForm.reset(mapSettingsToForm([]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [settingsResponse, isLoadingEmailNotificationSettings]); // Updated to use settingsResponse instead of settings

  // Add handler for logo upload
  const handleLogoUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    formData.append("logo", files[0]);
    const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok && data.filename) {
      setLogoUrl(data.url);
      setSystemForm((prev: any) => ({ ...prev, strataLogo: data.filename }));
    }
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
      <div className="space-y-6 px-2 sm:px-4 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between overflow-x-auto">
            <TabsList className="flex gap-2 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-neutral-300">
              <TabsTrigger value="email" className="min-w-[140px]"> <MailIcon className="mr-2 h-4 w-4" /> Email Settings </TabsTrigger>
              <TabsTrigger value="system" className="min-w-[140px]"> <Settings className="mr-2 h-4 w-4" /> System Settings </TabsTrigger>
              <TabsTrigger value="smtp" className="min-w-[140px]"> <MailIcon className="mr-2 h-4 w-4" /> SMTP Settings </TabsTrigger>
              <TabsTrigger value="users" className="min-w-[140px]"> <UsersIconLucide className="mr-2 h-4 w-4" /> User Management </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Notification Settings</CardTitle>
                <CardDescription>Configure how email notifications are sent to residents</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailFormSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <Input className="w-full" placeholder="© Strata Management System" {...field} />
                          </FormControl>
                          <FormDescription>Text to appear at the bottom of all notification emails</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    
                    <CardFooter className="flex flex-col md:flex-row md:justify-between gap-4 border-t pt-6 px-0">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                        <Input className="w-full sm:w-64" placeholder="Enter email for test" value={testEmailAddress} onChange={(e) => setTestEmailAddress(e.target.value)} />
                        <Button type="button" variant="outline" onClick={() => setIsSmtpTestDialogOpen(true)} disabled={sendingTestEmail} className="w-full sm:w-auto">
                          {sendingTestEmail ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>) : "Test Email"}
                        </Button>
                      </div>
                      <Button type="submit" disabled={updateSettingsMutation.isPending} className="w-full md:w-auto">
                        {updateSettingsMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : "Save Settings"}
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
                <CardDescription>Configure your SMTP server settings for sending system emails.</CardDescription>
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
                            <Input className="w-full" placeholder="smtp.example.com" {...field} />
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
                            <Input 
                              type="password" 
                              placeholder={field.value === '********' ? 'Password saved (leave unchanged or enter new password)' : 'Enter password'} 
                              {...field} 
                            />
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
                    <CardFooter className="flex flex-col md:flex-row md:justify-end gap-4 px-0 pt-6 border-t">
                      <Button type="submit" disabled={saveSmtpConfigMutation.isPending} className="w-full md:w-auto">
                        {saveSmtpConfigMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving SMTP...</>) : "Save SMTP Settings"}
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
                <CardDescription>Configure system-wide settings and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <label className="font-medium">Strata Name</label>
                  <Input value={systemForm.strataName} onChange={e => setSystemForm((prev: any) => ({ ...prev, strataName: e.target.value }))} />
                  
                  {/* Property Address Section */}
                  <div>
                    <label className="font-medium block mb-1">Property Address (Canada)</label>
                    <div className="space-y-2">
                      <div>
                        <label htmlFor="streetLine1" className="text-sm font-medium">Street Address Line 1</label>
                        <Input id="streetLine1" placeholder="e.g., 123 Main St" value={systemForm.propertyAddress.streetLine1} onChange={e => setSystemForm((prev: any) => ({ ...prev, propertyAddress: { ...prev.propertyAddress, streetLine1: e.target.value } }))} />
                      </div>
                      <div>
                        <label htmlFor="streetLine2" className="text-sm font-medium">Street Address Line 2 (Optional)</label>
                        <Input id="streetLine2" placeholder="e.g., Apt/Suite 100" value={systemForm.propertyAddress.streetLine2} onChange={e => setSystemForm((prev: any) => ({ ...prev, propertyAddress: { ...prev.propertyAddress, streetLine2: e.target.value } }))} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="city" className="text-sm font-medium">City</label>
                          <Input id="city" placeholder="e.g., Vancouver" value={systemForm.propertyAddress.city} onChange={e => setSystemForm((prev: any) => ({ ...prev, propertyAddress: { ...prev.propertyAddress, city: e.target.value } }))} />
                        </div>
                        <div>
                          <label htmlFor="province" className="text-sm font-medium">Province</label>
                          <select id="province" value={systemForm.propertyAddress.province} onChange={e => setSystemForm((prev: any) => ({ ...prev, propertyAddress: { ...prev.propertyAddress, province: e.target.value } }))} className="w-full border rounded-md px-2 py-2 h-[38px] bg-transparent text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">Select Province</option>
                            <option value="AB">Alberta</option>
                            <option value="BC">British Columbia</option>
                            <option value="MB">Manitoba</option>
                            <option value="NB">New Brunswick</option>
                            <option value="NL">Newfoundland and Labrador</option>
                            <option value="NS">Nova Scotia</option>
                            <option value="ON">Ontario</option>
                            <option value="PE">Prince Edward Island</option>
                            <option value="QC">Quebec</option>
                            <option value="SK">Saskatchewan</option>
                            <option value="NT">Northwest Territories</option>
                            <option value="NU">Nunavut</option>
                            <option value="YT">Yukon</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="postalCode" className="text-sm font-medium">Postal Code</label>
                          <Input id="postalCode" placeholder="e.g., A1B 2C3" value={systemForm.propertyAddress.postalCode} onChange={e => setSystemForm((prev: any) => ({ ...prev, propertyAddress: { ...prev.propertyAddress, postalCode: e.target.value } }))} />
                        </div>
                        <div>
                          <label htmlFor="country" className="text-sm font-medium">Country</label>
                          <Input id="country" value={systemForm.propertyAddress.country} readOnly disabled className="bg-neutral-100" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium">Admin First Name</label>
                      <Input value={systemForm.adminFirstName} onChange={e => setSystemForm((prev: any) => ({ ...prev, adminFirstName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="font-medium">Admin Last Name</label>
                      <Input value={systemForm.adminLastName} onChange={e => setSystemForm((prev: any) => ({ ...prev, adminLastName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium">Admin Email</label>
                      <Input value={systemForm.adminEmail} onChange={e => setSystemForm((prev: any) => ({ ...prev, adminEmail: e.target.value }))} />
                    </div>
                    <div>
                      <label className="font-medium">Admin Phone</label>
                      <Input value={systemForm.adminPhone} onChange={e => setSystemForm((prev: any) => ({ ...prev, adminPhone: e.target.value }))} />
                    </div>
                  </div>

                  {/* Property Managers Section */}
                  <div className="space-y-3 pt-4 border-t mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-base font-semibold">Property Managers</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSystemForm((prev: any) => ({ ...prev, propertyManagers: [...(prev.propertyManagers || []), { name: "", email: "", phone: "", receiveAllViolationEmails: false }] }))}>
                        Add Manager
                      </Button>
                    </div>
                    {(systemForm.propertyManagers && systemForm.propertyManagers.length > 0) ? systemForm.propertyManagers.map((pm: any, index: number) => (
                      <div key={`pm-${index}`} className="p-3 border rounded-md space-y-3 bg-neutral-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label htmlFor={`pm-name-${index}`} className="text-xs font-medium text-neutral-700">Name *</label>
                            <Input id={`pm-name-${index}`} placeholder="Full Name" value={pm.name} onChange={e => {
                              const updated = [...systemForm.propertyManagers];
                              updated[index].name = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, propertyManagers: updated }));
                            }} />
                          </div>
                          <div>
                            <label htmlFor={`pm-email-${index}`} className="text-xs font-medium text-neutral-700">Email *</label>
                            <Input id={`pm-email-${index}`} type="email" placeholder="Email Address" value={pm.email} onChange={e => {
                              const updated = [...systemForm.propertyManagers];
                              updated[index].email = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, propertyManagers: updated }));
                            }} />
                          </div>
                          <div>
                            <label htmlFor={`pm-phone-${index}`} className="text-xs font-medium text-neutral-700">Phone</label>
                            <Input id={`pm-phone-${index}`} placeholder="Phone Number" value={pm.phone} onChange={e => {
                              const updated = [...systemForm.propertyManagers];
                              updated[index].phone = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, propertyManagers: updated }));
                            }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <Switch id={`pm-notify-${index}`} checked={pm.receiveAllViolationEmails} onCheckedChange={checked => {
                              const updated = [...systemForm.propertyManagers];
                              updated[index].receiveAllViolationEmails = Boolean(checked); // Ensure boolean
                              setSystemForm((prev: any) => ({ ...prev, propertyManagers: updated }));
                            }} />
                            <label htmlFor={`pm-notify-${index}`} className="text-xs font-medium text-neutral-700 cursor-pointer">Receive All Violation Emails</label>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            const updated = systemForm.propertyManagers.filter((_: any, i: number) => i !== index);
                            setSystemForm((prev: any) => ({ ...prev, propertyManagers: updated }));
                          }}>
                            <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                          </Button>
                        </div>
                      </div>
                    )) : <p className="text-xs text-neutral-500 italic">No property managers added.</p>}
                  </div>

                  {/* Caretakers Section */}
                  <div className="space-y-3 pt-4 border-t mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-base font-semibold">Caretakers</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSystemForm((prev: any) => ({ ...prev, caretakers: [...(prev.caretakers || []), { name: "", email: "", phone: "", receiveAllViolationEmails: false }] }))}>
                        Add Caretaker
                      </Button>
                    </div>
                    {(systemForm.caretakers && systemForm.caretakers.length > 0) ? systemForm.caretakers.map((ct: any, index: number) => (
                      <div key={`ct-${index}`} className="p-3 border rounded-md space-y-3 bg-neutral-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           <div>
                            <label htmlFor={`ct-name-${index}`} className="text-xs font-medium text-neutral-700">Name *</label>
                            <Input id={`ct-name-${index}`} placeholder="Full Name" value={ct.name} onChange={e => {
                              const updated = [...systemForm.caretakers];
                              updated[index].name = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, caretakers: updated }));
                            }} />
                          </div>
                          <div>
                            <label htmlFor={`ct-email-${index}`} className="text-xs font-medium text-neutral-700">Email *</label>
                            <Input id={`ct-email-${index}`} type="email" placeholder="Email Address" value={ct.email} onChange={e => {
                              const updated = [...systemForm.caretakers];
                              updated[index].email = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, caretakers: updated }));
                            }} />
                          </div>
                          <div>
                            <label htmlFor={`ct-phone-${index}`} className="text-xs font-medium text-neutral-700">Phone</label>
                            <Input id={`ct-phone-${index}`} placeholder="Phone Number" value={ct.phone} onChange={e => {
                              const updated = [...systemForm.caretakers];
                              updated[index].phone = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, caretakers: updated }));
                            }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <Switch id={`ct-notify-${index}`} checked={ct.receiveAllViolationEmails} onCheckedChange={checked => {
                              const updated = [...systemForm.caretakers];
                              updated[index].receiveAllViolationEmails = Boolean(checked); // Ensure boolean
                              setSystemForm((prev: any) => ({ ...prev, caretakers: updated }));
                            }} />
                            <label htmlFor={`ct-notify-${index}`} className="text-xs font-medium text-neutral-700 cursor-pointer">Receive All Violation Emails</label>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            const updated = systemForm.caretakers.filter((_: any, i: number) => i !== index);
                            setSystemForm((prev: any) => ({ ...prev, caretakers: updated }));
                          }}>
                            <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                          </Button>
                        </div>
                      </div>
                    )) : <p className="text-xs text-neutral-500 italic">No caretakers added.</p>}
                  </div>

                  {/* Council Members Section */}
                  <div className="space-y-3 pt-4 border-t mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-base font-semibold">Council Members</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSystemForm((prev: any) => ({ ...prev, councilMembers: [...(prev.councilMembers || []), { name: "", email: "", phone: "", receiveAllViolationEmails: false }] }))}>
                        Add Council Member
                      </Button>
                    </div>
                    {(systemForm.councilMembers && systemForm.councilMembers.length > 0) ? systemForm.councilMembers.map((cm: any, index: number) => (
                      <div key={`cm-${index}`} className="p-3 border rounded-md space-y-3 bg-neutral-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label htmlFor={`cm-name-${index}`} className="text-xs font-medium text-neutral-700">Name *</label>
                            <Input id={`cm-name-${index}`} placeholder="Full Name" value={cm.name} onChange={e => {
                              const updated = [...systemForm.councilMembers];
                              updated[index].name = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, councilMembers: updated }));
                            }} />
                          </div>
                          <div>
                            <label htmlFor={`cm-email-${index}`} className="text-xs font-medium text-neutral-700">Email *</label>
                            <Input id={`cm-email-${index}`} type="email" placeholder="Email Address" value={cm.email} onChange={e => {
                              const updated = [...systemForm.councilMembers];
                              updated[index].email = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, councilMembers: updated }));
                            }} />
                          </div>
                          <div>
                            <label htmlFor={`cm-phone-${index}`} className="text-xs font-medium text-neutral-700">Phone</label>
                            <Input id={`cm-phone-${index}`} placeholder="Phone Number" value={cm.phone} onChange={e => {
                              const updated = [...systemForm.councilMembers];
                              updated[index].phone = e.target.value;
                              setSystemForm((prev: any) => ({ ...prev, councilMembers: updated }));
                            }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <Switch id={`cm-notify-${index}`} checked={cm.receiveAllViolationEmails} onCheckedChange={checked => {
                              const updated = [...systemForm.councilMembers];
                              updated[index].receiveAllViolationEmails = Boolean(checked); // Ensure boolean
                              setSystemForm((prev: any) => ({ ...prev, councilMembers: updated }));
                            }} />
                            <label htmlFor={`cm-notify-${index}`} className="text-xs font-medium text-neutral-700 cursor-pointer">Receive All Violation Emails</label>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            const updated = systemForm.councilMembers.filter((_: any, i: number) => i !== index);
                            setSystemForm((prev: any) => ({ ...prev, councilMembers: updated }));
                          }}>
                            <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                          </Button>
                        </div>
                      </div>
                    )) : <p className="text-xs text-neutral-500 italic">No council members added.</p>}
                  </div>

                  <div>
                    <label className="font-medium">Strata Logo</label>
                    <FileUpload maxFiles={1} acceptedTypes={["image/png", "image/jpeg", "image/svg+xml"]} onChange={handleLogoUpload} />
                    {logoUrl && <img src={logoUrl} alt="Strata Logo" className="mt-2 h-24" />}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium">Default Timezone</label>
                      <select value={systemForm.defaultTimezone} onChange={e => setSystemForm((prev: any) => ({ ...prev, defaultTimezone: e.target.value }))} className="w-full border rounded-md px-2 py-2">
                        <option value="America/Vancouver">America/Vancouver</option>
                        <option value="America/Toronto">America/Toronto</option>
                        {/* ...more... */}
                      </select>
                    </div>
                    <div>
                      <label className="font-medium">Default Language</label>
                      <select value={systemForm.defaultLanguage} onChange={e => setSystemForm((prev: any) => ({ ...prev, defaultLanguage: e.target.value }))} className="w-full border rounded-md px-2 py-2">
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        {/* ...more... */}
                      </select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={isSavingSystemSettings}
                    onClick={async () => {
                      setIsSavingSystemSettings(true);
                      try {
                        // Save all system settings fields
                        const updates = [
                          { settingKey: 'strata_name', settingValue: systemForm.strataName },
                          { settingKey: 'property_address', settingValue: JSON.stringify(systemForm.propertyAddress) },
                          { settingKey: 'admin_first_name', settingValue: systemForm.adminFirstName },
                          { settingKey: 'admin_last_name', settingValue: systemForm.adminLastName },
                          { settingKey: 'admin_email', settingValue: systemForm.adminEmail },
                          { settingKey: 'admin_phone', settingValue: systemForm.adminPhone },
                          { settingKey: 'property_managers', settingValue: JSON.stringify(systemForm.propertyManagers) },
                          { settingKey: 'caretakers', settingValue: JSON.stringify(systemForm.caretakers) },
                          { settingKey: 'council_members', settingValue: JSON.stringify(systemForm.councilMembers) },
                          { settingKey: 'default_timezone', settingValue: systemForm.defaultTimezone },
                          { settingKey: 'default_language', settingValue: systemForm.defaultLanguage },
                          { settingKey: 'strata_logo', settingValue: systemForm.strataLogo || "" },
                        ];
                        for (const update of updates) {
                          await apiRequest("POST", `/api/settings/${update.settingKey}`, { value: update.settingValue });
                        }
                        toast({ title: "Settings Updated", description: "General system settings updated." });
                        queryClientHook.invalidateQueries({ queryKey: ["/api/settings"] });
                      } catch (error) {
                        console.error("Failed to save system settings:", error);
                        toast({
                          title: "Error",
                          description: "Failed to save system settings. Please try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSavingSystemSettings(false);
                      }
                    }}
                  >
                    {isSavingSystemSettings ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save General Settings"
                    )}
                  </Button>
                </form>
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