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
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Settings, AlertCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAsyncLoading } from "@/contexts/loading-context";
import { ButtonLoading } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/empty-state";
import { Layout } from "@/components/layout";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

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

const mapSystemSettingsToForm = (settings: SystemSetting[]) => {
  const getValue = (key: string, defaultValue: any = "") => {
    const setting = Array.isArray(settings) ? settings.find(s => s.settingKey === key) : undefined;
    if (!setting || !setting.settingValue) return defaultValue;
    try {
      // Attempt to parse JSON for complex objects (like propertyManagers)
      return JSON.parse(setting.settingValue);
    } catch (e) {
      // Return string value if not JSON
      return setting.settingValue;
    }
  };

  return {
    strataName: getValue('strata_name', ''),
    propertyAddress: {
      streetLine1: getValue('property_address_street1', ''),
      streetLine2: getValue('property_address_street2', ''),
      city: getValue('property_address_city', ''),
      province: getValue('property_address_province', ''),
      postalCode: getValue('property_address_postal_code', ''),
      country: getValue('property_address_country', 'Canada'),
    },
    adminFirstName: getValue('admin_first_name', ''),
    adminLastName: getValue('admin_last_name', ''),
    adminEmail: getValue('admin_email', ''),
    adminPhone: getValue('admin_phone', ''),
    propertyManagers: getValue('property_managers', []),
    caretakers: getValue('caretakers', []),
    councilMembers: getValue('council_members', []),
    defaultTimezone: getValue('default_timezone', 'America/Vancouver'),
    defaultLanguage: getValue('default_language', 'en'),
    strataLogo: getValue('strata_logo_url', ''),
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
  const [location, navigate] = useLocation();
  const queryClientHook = useQueryClient();

  // Determine active tab based on URL
  const getActiveTabFromUrl = (path: string): string => {
    if (path.includes('/settings/email')) return 'email';
    if (path.includes('/settings/system')) return 'system';
    if (path.includes('/settings/smtp')) return 'smtp';
    if (path.includes('/settings/users')) return 'users';
    return 'email'; // default
  };

  const [activeTab, setActiveTab] = useState<string>(() => getActiveTabFromUrl(location));

  const systemForm = useForm<z.infer<typeof systemSettingsSchema>>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
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
    }
  });

  const propertyManagersArray = useFieldArray({
    control: systemForm.control,
    name: "propertyManagers"
  });

  const caretakersArray = useFieldArray({
    control: systemForm.control,
    name: "caretakers"
  });

  const councilMembersArray = useFieldArray({
    control: systemForm.control,
    name: "councilMembers"
  });

  const strataLogoValue = systemForm.watch('strataLogo');

  // Update activeTab when location changes
  useEffect(() => {
    const newTab = getActiveTabFromUrl(location);
    setActiveTab(newTab);
  }, [location]);

  // Use the new loading system
  const emailSaveLoading = useAsyncLoading('settings-email-save');
  const smtpSaveLoading = useAsyncLoading('settings-smtp-save');
  const systemSaveLoading = useAsyncLoading('settings-system-save');
  const testEmailLoading = useAsyncLoading('settings-test-email');

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
      
      const systemFormValues = mapSystemSettingsToForm(settings);
      systemForm.reset(systemFormValues);
    }
  }, [settings, emailForm, systemForm]);

  // Update logoUrl when settings or the logo value in the form change
  useEffect(() => {
    if (settingsResponse?.logoUrl) {
      systemForm.setValue('strataLogo', settingsResponse.logoUrl);
    } else if (strataLogoValue) {
      systemForm.setValue('strataLogo', strataLogoValue.startsWith('http') || strataLogoValue.startsWith('/') ? strataLogoValue : `/api/uploads/${strataLogoValue}`);
    } else {
      systemForm.setValue('strataLogo', null);
    }
  }, [settingsResponse, strataLogoValue]);

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

  const updateSystemSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof systemSettingsSchema>) => {
      const updates = [
        { settingKey: 'strata_name', settingValue: data.strataName },
        { settingKey: 'property_address_street1', settingValue: data.propertyAddress.streetLine1 },
        { settingKey: 'property_address_street2', settingValue: data.propertyAddress.streetLine2 || '' },
        { settingKey: 'property_address_city', settingValue: data.propertyAddress.city },
        { settingKey: 'property_address_province', settingValue: data.propertyAddress.province },
        { settingKey: 'property_address_postal_code', settingValue: data.propertyAddress.postalCode },
        { settingKey: 'property_address_country', settingValue: data.propertyAddress.country },
        { settingKey: 'admin_first_name', settingValue: data.adminFirstName },
        { settingKey: 'admin_last_name', settingValue: data.adminLastName },
        { settingKey: 'admin_email', settingValue: data.adminEmail },
        { settingKey: 'admin_phone', settingValue: data.adminPhone },
        { settingKey: 'property_managers', settingValue: JSON.stringify(data.propertyManagers || []) },
        { settingKey: 'caretakers', settingValue: JSON.stringify(data.caretakers || []) },
        { settingKey: 'council_members', settingValue: JSON.stringify(data.councilMembers || []) },
        { settingKey: 'default_timezone', settingValue: data.defaultTimezone },
        { settingKey: 'default_language', settingValue: data.defaultLanguage },
        { settingKey: 'strata_logo_url', settingValue: data.strataLogo || '' },
      ];

      for (const update of updates) {
        await apiRequest("POST", `/api/settings/${update.settingKey}`, { value: update.settingValue });
      }

      return true;
    },
    onSuccess: () => {
      toast({
        title: "System Settings Updated",
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

  const onEmailFormSubmit = async (data: EmailSettingsFormValues) => {
    await emailSaveLoading.executeWithLoading(
      () => updateSettingsMutation.mutateAsync(data),
      "Saving email settings..."
    );
  };

  const onSystemFormSubmit = async (data: z.infer<typeof systemSettingsSchema>) => {
    await systemSaveLoading.executeWithLoading(
      () => updateSystemSettingsMutation.mutateAsync(data),
      "Saving system settings..."
    );
  };

  const onSmtpConfigSubmit = async (data: SmtpConfigFormData) => {
    // If password is still the masked value, don't send it (let backend keep existing)
    const submitData = { ...data };
    if (data.authPass === '********') {
      // Don't include the password in the payload if it's still masked
      submitData.authPass = '********';
    }
    await smtpSaveLoading.executeWithLoading(
      () => saveSmtpConfigMutation.mutateAsync(submitData),
      "Saving SMTP configuration..."
    );
  };

  // Add handler for logo upload
  const handleLogoUpload = async (files: File[]) => {
    const file = files[0];
    if (file) {
      const formData = new FormData();
      formData.append('logo', file);
      
      const res = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.filename) {
        systemForm.setValue('strataLogo', data.filename);
      }
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
        {activeTab === 'email' && (
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
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <FormLabel>Violation Approval Subject</FormLabel>
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
                    <Button type="submit" disabled={emailSaveLoading.isLoading} className="w-full md:w-auto">
                      {emailSaveLoading.isLoading ? (
                        <ButtonLoading message="Saving Settings" showMessage={true} />
                      ) : (
                        "Save Settings"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'system' && (
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure system-wide settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...systemForm}>
                <form onSubmit={systemForm.handleSubmit(onSystemFormSubmit)} className="space-y-8">
                  <CardContent className="space-y-6">
                    <label className="font-medium">Strata Name</label>
                    <Input {...systemForm.register('strataName')} />
                    
                    {/* Property Address Section */}
                    <div>
                      <label className="font-medium block mb-1">Property Address (Canada)</label>
                      <div className="space-y-2">
                        <div>
                          <label htmlFor="streetLine1" className="text-sm font-medium">Street Address Line 1</label>
                          <Input id="streetLine1" placeholder="e.g., 123 Main St" {...systemForm.register('propertyAddress.streetLine1')} />
                        </div>
                        <div>
                          <label htmlFor="streetLine2" className="text-sm font-medium">Street Address Line 2 (Optional)</label>
                          <Input id="streetLine2" placeholder="e.g., Apt/Suite 100" {...systemForm.register('propertyAddress.streetLine2')} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="city" className="text-sm font-medium">City</label>
                            <Input id="city" placeholder="e.g., Vancouver" {...systemForm.register('propertyAddress.city')} />
                          </div>
                          <div>
                            <label htmlFor="province" className="text-sm font-medium">Province</label>
                            <select id="province" {...systemForm.register('propertyAddress.province')} className="w-full border rounded-md px-2 py-2 h-[38px] bg-transparent text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
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
                            <Input id="postalCode" placeholder="e.g., A1B 2C3" {...systemForm.register('propertyAddress.postalCode')} />
                          </div>
                          <div>
                            <label htmlFor="country" className="text-sm font-medium">Country</label>
                            <Input id="country" {...systemForm.register('propertyAddress.country')} readOnly disabled className="bg-neutral-100" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium">Admin First Name</label>
                        <Input {...systemForm.register('adminFirstName')} />
                      </div>
                      <div>
                        <label className="font-medium">Admin Last Name</label>
                        <Input {...systemForm.register('adminLastName')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium">Admin Email</label>
                        <Input {...systemForm.register('adminEmail')} />
                      </div>
                      <div>
                        <label className="font-medium">Admin Phone</label>
                        <Input {...systemForm.register('adminPhone')} />
                      </div>
                    </div>

                    {/* Property Managers Section */}
                    <div className="space-y-3 pt-4 border-t mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-base font-semibold">Property Managers</h4>
                        <Button type="button" variant="outline" size="sm" onClick={() => propertyManagersArray.append({ name: "", email: "", phone: "", receiveAllViolationEmails: false })}>
                          Add Manager
                        </Button>
                      </div>
                      {propertyManagersArray.fields.length > 0 ? propertyManagersArray.fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md space-y-3 bg-neutral-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label htmlFor={`pm-name-${index}`} className="text-xs font-medium text-neutral-700">Name *</label>
                              <Input id={`pm-name-${index}`} placeholder="Full Name" {...systemForm.register(`propertyManagers.${index}.name` as const)} />
                            </div>
                            <div>
                              <label htmlFor={`pm-email-${index}`} className="text-xs font-medium text-neutral-700">Email *</label>
                              <Input id={`pm-email-${index}`} type="email" placeholder="Email Address" {...systemForm.register(`propertyManagers.${index}.email` as const)} />
                            </div>
                            <div>
                              <label htmlFor={`pm-phone-${index}`} className="text-xs font-medium text-neutral-700">Phone</label>
                              <Input id={`pm-phone-${index}`} placeholder="Phone Number" {...systemForm.register(`propertyManagers.${index}.phone` as const)} />
                            </div>
                          </div>
                                                      <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-2">
                              <FormField
                                control={systemForm.control}
                                name={`propertyManagers.${index}.receiveAllViolationEmails`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-xs font-medium text-neutral-700 cursor-pointer">Receive All Violation Emails</FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => propertyManagersArray.remove(index)}>
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
                        <Button type="button" variant="outline" size="sm" onClick={() => caretakersArray.append({ name: "", email: "", phone: "", receiveAllViolationEmails: false })}>
                          Add Caretaker
                        </Button>
                      </div>
                      {caretakersArray.fields.length > 0 ? caretakersArray.fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md space-y-3 bg-neutral-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                             <div>
                              <label htmlFor={`ct-name-${index}`} className="text-xs font-medium text-neutral-700">Name *</label>
                              <Input id={`ct-name-${index}`} placeholder="Full Name" {...systemForm.register(`caretakers.${index}.name` as const)} />
                            </div>
                            <div>
                              <label htmlFor={`ct-email-${index}`} className="text-xs font-medium text-neutral-700">Email *</label>
                              <Input id={`ct-email-${index}`} type="email" placeholder="Email Address" {...systemForm.register(`caretakers.${index}.email` as const)} />
                            </div>
                            <div>
                              <label htmlFor={`ct-phone-${index}`} className="text-xs font-medium text-neutral-700">Phone</label>
                              <Input id={`ct-phone-${index}`} placeholder="Phone Number" {...systemForm.register(`caretakers.${index}.phone` as const)} />
                            </div>
                          </div>
                                                      <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-2">
                              <FormField
                                control={systemForm.control}
                                name={`caretakers.${index}.receiveAllViolationEmails`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-xs font-medium text-neutral-700 cursor-pointer">Receive All Violation Emails</FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => caretakersArray.remove(index)}>
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
                        <Button type="button" variant="outline" size="sm" onClick={() => councilMembersArray.append({ name: "", email: "", phone: "", receiveAllViolationEmails: false })}>
                          Add Council Member
                        </Button>
                      </div>
                      {councilMembersArray.fields.length > 0 ? councilMembersArray.fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md space-y-3 bg-neutral-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label htmlFor={`cm-name-${index}`} className="text-xs font-medium text-neutral-700">Name *</label>
                              <Input id={`cm-name-${index}`} placeholder="Full Name" {...systemForm.register(`councilMembers.${index}.name` as const)} />
                            </div>
                            <div>
                              <label htmlFor={`cm-email-${index}`} className="text-xs font-medium text-neutral-700">Email *</label>
                              <Input id={`cm-email-${index}`} type="email" placeholder="Email Address" {...systemForm.register(`councilMembers.${index}.email` as const)} />
                            </div>
                            <div>
                              <label htmlFor={`cm-phone-${index}`} className="text-xs font-medium text-neutral-700">Phone</label>
                              <Input id={`cm-phone-${index}`} placeholder="Phone Number" {...systemForm.register(`councilMembers.${index}.phone` as const)} />
                            </div>
                          </div>
                                                      <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-2">
                              <FormField
                                control={systemForm.control}
                                name={`councilMembers.${index}.receiveAllViolationEmails`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-xs font-medium text-neutral-700 cursor-pointer">Receive All Violation Emails</FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => councilMembersArray.remove(index)}>
                              <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                            </Button>
                          </div>
                        </div>
                      )) : <p className="text-xs text-neutral-500 italic">No council members added.</p>}
                    </div>

                    <div>
                      <label className="font-medium">Strata Logo</label>
                      <FileUpload maxFiles={1} acceptedTypes={["image/png", "image/jpeg", "image/svg+xml"]} onChange={handleLogoUpload} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium">Default Timezone</label>
                        <select {...systemForm.register('defaultTimezone')} className="w-full border rounded-md px-2 py-2">
                          <option value="America/Vancouver">America/Vancouver</option>
                          <option value="America/Toronto">America/Toronto</option>
                          {/* ...more... */}
                        </select>
                      </div>
                      <div>
                        <label className="font-medium">Default Language</label>
                        <select {...systemForm.register('defaultLanguage')} className="w-full border rounded-md px-2 py-2">
                          <option value="en">English</option>
                          <option value="fr">French</option>
                          {/* ...more... */}
                        </select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={systemSaveLoading.isLoading}>
                      {systemSaveLoading.isLoading ? "Saving..." : "Save System Settings"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'smtp' && (
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
                  <CardFooter className="flex flex-col md:flex-row md:justify-end gap-4 px-0 pt-6 border-t">
                    <Button type="submit" disabled={smtpSaveLoading.isLoading} className="w-full md:w-auto">
                      {smtpSaveLoading.isLoading ? (
                        <ButtonLoading message="Saving SMTP Settings" showMessage={true} />
                      ) : (
                        "Save SMTP Settings"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <UserManagementTabContent />
        )}

      </div>
    </Layout>
  );
}