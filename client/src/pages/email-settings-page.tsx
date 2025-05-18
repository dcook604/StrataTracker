import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

// Form schema
const emailConfigSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.coerce.number().int().positive("Port must be a positive integer"),
  secure: z.boolean().default(false),
  authUser: z.string().optional(),
  authPass: z.string().optional(),
  from: z.string().email("From address must be a valid email")
});

// Test email schema
const testEmailSchema = z.object({
  testEmail: z.string().email("Please enter a valid email address")
});

type EmailConfigFormData = z.infer<typeof emailConfigSchema>;
type TestEmailFormData = z.infer<typeof testEmailSchema>;

export function EmailSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access email settings. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fetch existing configuration
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['/api/email-config'],
    queryFn: async () => {
      const response = await fetch('/api/email-config');
      if (!response.ok) {
        throw new Error('Failed to fetch email configuration');
      }
      return response.json();
    }
  });

  // Form for email configuration
  const form = useForm<EmailConfigFormData>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      host: '',
      port: 25,
      secure: false,
      authUser: '',
      authPass: '',
      from: ''
    },
    values: config ? {
      host: config.host || '',
      port: config.port || 25,
      secure: !!config.secure,
      authUser: config.auth?.user || '',
      authPass: '********', // Mask password for security
      from: config.from || ''
    } : undefined
  });

  // Form for test email
  const testForm = useForm<TestEmailFormData>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      testEmail: user?.email || ''
    }
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: EmailConfigFormData) => {
      const response = await fetch('/api/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host: data.host,
          port: data.port,
          secure: data.secure,
          auth: {
            user: data.authUser,
            pass: data.authPass
          },
          from: data.from
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save email configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-config'] });
      toast({
        title: 'Success',
        description: 'Email configuration saved successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  });

  // Test email configuration mutation
  const testEmailMutation = useMutation({
    mutationFn: async (data: { testEmail: string; config: EmailConfigFormData }) => {
      setTestStatus('loading');
      const response = await fetch('/api/email-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host: data.config.host,
          port: data.config.port,
          secure: data.config.secure,
          auth: {
            user: data.config.authUser,
            pass: data.config.authPass
          },
          from: data.config.from,
          testEmail: data.testEmail
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send test email');
      }
      
      return result;
    },
    onSuccess: () => {
      setTestStatus('success');
      setTestMessage('Test email sent successfully! Please check your inbox.');
    },
    onError: (error) => {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : 'Failed to send test email');
    }
  });

  // Handler for saving configuration
  const onSubmitConfig = (data: EmailConfigFormData) => {
    saveConfigMutation.mutate(data);
  };

  // Handler for testing configuration
  const onSubmitTest = (data: TestEmailFormData) => {
    const configData = form.getValues();
    testEmailMutation.mutate({ testEmail: data.testEmail, config: configData });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load email configuration. Please try again.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/email-config'] })}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Email Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SMTP Configuration</CardTitle>
            <CardDescription>
              Configure your SMTP server settings for sending system emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitConfig)} className="space-y-4">
                <FormField
                  control={form.control}
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

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Use SSL/TLS
                        </FormLabel>
                        <FormDescription>
                          Enable for secure SMTP connection (usually port 465)
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
                  control={form.control}
                  name="authUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional if no auth required" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authPass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Optional if no auth required" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="noreply@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="submit" disabled={saveConfigMutation.isPending}>
                    {saveConfigMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Email Configuration</CardTitle>
            <CardDescription>
              Send a test email to verify your SMTP settings are working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...testForm}>
              <form onSubmit={testForm.handleSubmit(onSubmitTest)} className="space-y-4">
                <FormField
                  control={testForm.control}
                  name="testEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter recipient email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {testStatus === 'success' && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{testMessage}</AlertDescription>
                  </Alert>
                )}

                {testStatus === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{testMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={testEmailMutation.isPending || saveConfigMutation.isPending}
                  >
                    {testEmailMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : 'Send Test Email'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Alert className="bg-blue-50 text-blue-800 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle>Email Configuration Tips</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>For local development with postfix, use host: "localhost" and port: 25</li>
              <li>Gmail SMTP requires "Less secure app access" to be enabled</li>
              <li>Office 365: smtp.office365.com (port 587, TLS enabled)</li>
              <li>Make sure your SMTP server allows connections from this server's IP address</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

export default EmailSettingsPage;