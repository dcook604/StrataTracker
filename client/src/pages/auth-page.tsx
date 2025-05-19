import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

// Registration is now admin-only and handled in the users page
// This schema is kept for reference but not actively used on the auth page
const registerSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
  isCouncilMember: z.boolean().default(false),
  isAdmin: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  // Only login is available as registration is restricted to administrators
  const [activeTab] = useState<"login">("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register form not actively used on auth page
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      isCouncilMember: false,
      isAdmin: false,
    },
  });

  // Handle login submission
  const onLoginSubmit = (values: LoginFormValues) => {
    // Pass the remember me value to the login endpoint
    loginMutation.mutate({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe
    });
  };

  // Handle register submission
  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  // Redirect if the user is logged in
  if (user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="grid w-full max-w-6xl grid-cols-1 md:grid-cols-2 gap-8">
        {/* Auth Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <img 
                  src="/logo.jpeg" 
                  alt="Spectrum 4 Logo" 
                  className="h-20" 
                />
              </div>
              <CardDescription>
                Spectrum 4 Violation System
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full">
                <h3 className="text-xl font-medium text-center mb-4">Sign In</h3>
                
                {/* Login Form */}
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center justify-between mb-4">
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                id="rememberMe"
                              />
                            </FormControl>
                            <FormLabel htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                              Remember me
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate("/forgot-password")}>
                        Forgot password?
                      </Button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <p>Only administrators can add new users to the system.</p>
                  <p>Contact your administrator if you need access.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Hero Section */}
        <div className="hidden md:flex items-center justify-center">
          <div className="max-w-md mx-auto">
            <div className="flex justify-center mb-8">
              <img 
                src="/images/spectrum4-logo.png" 
                alt="Spectrum 4 Logo" 
                className="h-40" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
