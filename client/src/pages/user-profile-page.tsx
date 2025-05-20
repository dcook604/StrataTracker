import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import zxcvbn from "zxcvbn";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export default function UserProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordLabel, setPasswordLabel] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      username: user?.username || "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
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

  async function onSubmitProfile(values: any) {
    setIsSaving(true);
    try {
      const res = await apiRequest("PUT", "/api/user/profile", values);
      if (!res.ok) throw new Error((await res.json()).message || "Failed to update profile");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated", description: "Your profile was updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function onSubmitPassword(values: any) {
    setIsChangingPassword(true);
    try {
      const res = await apiRequest("POST", "/api/users/change-password", values);
      if (!res.ok) throw new Error((await res.json()).message || "Failed to change password");
      passwordForm.reset();
      toast({ title: "Password changed", description: "Your password was changed successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-lg font-semibold mb-2">Change Password</h2>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
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
                <Button type="submit" disabled={isChangingPassword} className="w-full">
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 