import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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
  const { user, loginMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      await loginMutation.mutateAsync({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe
    });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle register submission
  const onRegisterSubmit = (values: RegisterFormValues) => {
    // Implementation of register submission
  };

  // Redirect if the user is logged in
  if (user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-md">
        {/* Logo Placement */}
        <div className="pt-8 pb-4">
          <img 
            src="/spectrum4-small.jpeg" 
            alt="Spectrum 4 Logo" 
            className="h-16 w-auto mx-auto" // Height 64px, auto width, centered
          />
        </div>
        <CardHeader className="space-y-1 text-center pt-0"> {/* Adjusted pt-0 as logo div has padding */}
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      disabled={isLoading}
                      {...field} 
                    />
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
                    <Input 
                      type="password" 
                      placeholder="Enter your password" 
                      disabled={isLoading}
                      {...field} 
                    />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                    disabled={isLoading}
                          />
                        </FormControl>
                <FormLabel className="text-sm font-normal">Remember me</FormLabel>
                      </FormItem>
                    )}
                  />
                
                <Button 
                  type="submit" 
                  className="w-full" 
          disabled={isLoading}
                >
                {isLoading ? (
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
        </CardContent>
      </Card>
    </div>
  );
}
