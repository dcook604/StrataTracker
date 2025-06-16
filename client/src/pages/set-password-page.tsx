import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import zxcvbn from "zxcvbn";
import { Progress } from "@/components/ui/progress";

const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

export default function SetPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordLabel, setPasswordLabel] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [setSuccess, setSetSuccess] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('No invitation token found. Please request a new invitation.');
    }
  }, []);

  const form = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  function handlePasswordChange(value: string) {
    if (!value) {
      setPasswordStrength(0);
      setPasswordLabel("");
      setPasswordFeedback("");
      return;
    }
    const result = zxcvbn(value);
    setPasswordStrength((result.score + 1) * 20);
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    setPasswordLabel(labels[result.score] || "");
    setPasswordFeedback(result.feedback.suggestions[0] || "");
  }

  async function onSubmit(data: SetPasswordFormData) {
    if (!token) {
      setError('Invitation token is missing');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setSetSuccess(true);
        toast({
          title: 'Password Set Successfully',
          description: 'Your password has been set. You will be redirected to the login page shortly.',
        });
        setTimeout(() => {
          navigate('/auth');
        }, 2000); // 2-second delay before redirecting
      } else {
        setError(result.message || 'Failed to set password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Welcome! Set Your Password</CardTitle>
          <CardDescription>To activate your account, please set your password below.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          {!token ? (
            <div className="text-center py-4">
              <p className="mb-4">Invitation token is missing or invalid.</p>
              <Button onClick={() => navigate('/forgot-password')}>
                Request New Invitation
              </Button>
            </div>
          ) : setSuccess ? (
            <div className="text-center py-8">
              <div className="text-green-600 text-lg font-semibold mb-2">Your password has been set!</div>
              <div className="mb-6">You can now log in and start using the system. You will be redirected shortly.</div>
              <Button className="w-full" onClick={() => navigate('/auth')}>Go to Login</Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          {...field}
                          onChange={e => {
                            field.onChange(e);
                            handlePasswordChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      {field.value && (
                        <div className="mt-2">
                          <Progress value={passwordStrength} className={
                            passwordStrength < 40 ? "bg-red-200" :
                            passwordStrength < 60 ? "bg-yellow-200" :
                            passwordStrength < 80 ? "bg-blue-200" :
                            "bg-green-200"
                          } />
                          <div className="text-xs mt-1 font-medium" style={{ color: passwordStrength < 40 ? '#dc2626' : passwordStrength < 60 ? '#ca8a04' : passwordStrength < 80 ? '#2563eb' : '#16a34a' }}>{passwordLabel}</div>
                          {passwordFeedback && <div className="text-xs text-muted-foreground mt-1">{passwordFeedback}</div>}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Setting Password...' : 'Set Password'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 