import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PublicSidebar } from "@/components/public-sidebar";

interface ViolationDetails {
  id: number;
  uuid: string;
  violationType: string;
  description: string;
  unitNumber: string;
  persons: Array<{
    personId: number;
    fullName: string;
    email: string;
    role: string;
    receiveEmailNotifications: boolean;
  }>;
}

export default function EnhancedPublicViolationPage() {
  const [, params] = useRoute("/violation/comment/:token");
  const [, setLocation] = useLocation();
  const token = params?.token;
  const { toast } = useToast();
  const { user, session } = useAuth();

  // Pre-authentication state
  const [loading, setLoading] = useState(true);
  const [linkStatus, setLinkStatus] = useState<"valid" | "expired" | "used" | "invalid">("valid");
  const [violation, setViolation] = useState<ViolationDetails | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  
  // Authentication state
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Post-authentication state
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Helper function for authenticated API requests
  const makeAuthenticatedRequest = async (method: string, url: string, body?: Record<string, unknown>) => {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }
    
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  };

  // Check token status on mount
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/public/violation/${token}/status`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 410) setLinkStatus("expired");
          else if (res.status === 404) setLinkStatus("invalid");
          else setLinkStatus("invalid");
          setViolation(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.status === "used") setLinkStatus("used");
        else setLinkStatus("valid");
        setViolation(data.violation);
        setLoading(false);
      })
      .catch(() => {
        setLinkStatus("invalid");
        setViolation(null);
        setLoading(false);
      });
  }, [token]);

  // Send verification code when person is selected
  useEffect(() => {
    if (selectedPersonId && violation && violation.persons) {
      setSendingCode(true);
      fetch(`/public/violation/${token}/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: selectedPersonId }),
      })
        .then(async (res) => {
          setSendingCode(false);
          if (!res.ok) {
            setCodeError("Failed to send verification code. Please try again or contact support.");
            setSelectedPersonId(null);
            return;
          }
          setCodeSent(true);
        })
        .catch(() => {
          setSendingCode(false);
          setCodeError("Failed to send verification code. Please try again.");
          setSelectedPersonId(null);
        });
    }
  }, [selectedPersonId, token, violation]);

  const handleVerifyCode = async () => {
    setVerifying(true);
    setCodeError(null);
    try {
      const res = await fetch(`/public/violation/${token}/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: selectedPersonId, code }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Invalid code");
      }

      await res.json();
      // Note: With Supabase auth, we'd handle this differently
      // For now, just navigate to the violations page
      
      toast({ 
        title: "Verified", 
        description: "Email code verified. You can now view all violations for your unit." 
      });

      // Navigate to violations overview
      setLocation("/public/violations");
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!violation) return;

    setSubmitting(true);
    try {
      await makeAuthenticatedRequest("POST", `/public/violations/${violation.id}/dispute`, {
        comment,
      });

      setSuccess(true);
      toast({ 
        title: "Dispute Submitted", 
        description: "Your dispute has been submitted successfully." 
      });
    } catch (err: unknown) {
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to submit dispute", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to obfuscate email
  function obfuscateEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return name[0] + '***' + name[name.length - 1] + '@' + domain;
  }

  // Render different states based on authentication and link status
  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow text-center">
        <div className="text-lg">Loading violation details...</div>
      </div>
    );
  }

  if (linkStatus === "expired") {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow text-center">
        <h2 className="text-xl font-bold mb-4">Link Expired</h2>
        <p>This link has expired. Please contact your strata council for further assistance.</p>
      </div>
    );
  }

  if (linkStatus === "used") {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow text-center">
        <h2 className="text-xl font-bold mb-4">Link Already Used</h2>
        <p>This link has already been used to submit a response.</p>
      </div>
    );
  }

  if (linkStatus === "invalid") {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow text-center">
        <h2 className="text-xl font-bold mb-4">Invalid Link</h2>
        <p>This link is invalid. Please check the URL or contact your strata council.</p>
      </div>
    );
  }

  // If authenticated, show full interface with sidebar
  if (user) {
    return (
      <div className="h-screen flex">
        <PublicSidebar className="w-64 flex-shrink-0" />
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Dispute This Violation</h2>
              {violation && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Violation Details</h3>
                  <div className="bg-muted p-4 rounded">
                    <p><strong>Type:</strong> {violation.violationType}</p>
                    <p><strong>Unit:</strong> {violation.unitNumber}</p>
                    <p><strong>Description:</strong> {violation.description}</p>
                  </div>
                </div>
              )}

              {success ? (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-green-600 mb-2">Dispute Submitted!</h3>
                  <p>Your dispute has been submitted successfully and will be reviewed by the strata council.</p>
                  <Button className="mt-4" onClick={() => setLocation("/public/violations")}>
                    View All Violations
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitDispute} className="space-y-4">
                  <div>
                    <label htmlFor="comment" className="block text-sm font-medium mb-2">
                      Comments and Evidence
                    </label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Please provide details about why you are disputing this violation..."
                      rows={6}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                    Submit Dispute
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Pre-authentication flow
  if (violation && violation.persons && !selectedPersonId) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Identify Yourself</h2>
        <p className="mb-4">Please select your name to continue. Only owners and tenants with notifications enabled can dispute this violation.</p>
        <ul className="mb-6">
          {violation.persons.map(person => (
            <li key={person.personId} className="mb-2">
              <button
                className="w-full p-3 rounded border hover:bg-neutral-100 text-left"
                onClick={() => setSelectedPersonId(person.personId)}
              >
                <span className="font-medium">{person.fullName}</span> 
                <span className="text-xs text-gray-500"> ({obfuscateEmail(person.email)})</span> 
                <span className="ml-2 text-xs text-gray-400">[{person.role}]</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Code verification step
  if (selectedPersonId && codeSent) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Verify Your Email</h2>
        <p className="mb-4">We've sent a 6-digit verification code to your email. Please enter it below:</p>
        
        <Input
          type="text"
          placeholder="Enter 6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="mb-4"
          maxLength={6}
        />
        
        <Button
          className="w-full mb-2"
          onClick={handleVerifyCode}
          disabled={verifying || sendingCode || code.length !== 6}
        >
          {verifying ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
          Verify Code & Continue
        </Button>
        
        {codeError && <div className="text-destructive text-sm mb-2">{codeError}</div>}
        
        <Button 
          variant="ghost" 
          className="w-full" 
          onClick={() => setSelectedPersonId(null)} 
          disabled={verifying || sendingCode}
        >
          Choose a different name
        </Button>
      </div>
    );
  }

  return null;
} 