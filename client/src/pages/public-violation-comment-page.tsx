import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ViolationDetails {
  unitNumber: string;
  violationType: string;
  description: string;
  persons?: Array<{
    personId: number;
    fullName: string;
    email: string;
    role: string;
    receiveEmailNotifications: boolean;
  }>;
}

export default function PublicViolationCommentPage() {
  const [, params] = useRoute("/violation/comment/:token");
  const token = params?.token;
  const { toast } = useToast();
  const [commenterName, setCommenterName] = useState("");
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkStatus, setLinkStatus] = useState<"valid" | "expired" | "used" | "invalid">("valid");
  const [violation, setViolation] = useState<ViolationDetails | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeVerified, setCodeVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("commenterName", commenterName);
      formData.append("comment", comment);
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });
      const res = await fetch(`/public/violation/${token}/comment`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit");
      }
      setSuccess(true);
      toast({ title: "Submitted", description: "Your comment and evidence have been submitted." });
    } catch (err: any) {
      setError(err.message || "Failed to submit");
      toast({ title: "Error", description: err.message || "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

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

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Thank you!</h2>
        <p>Your comment and evidence have been submitted successfully.</p>
      </div>
    );
  }

  // Helper to obfuscate email
  function obfuscateEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return name[0] + '***' + name[name.length - 1] + '@' + domain;
  }

  // Show identity selection if persons are available and not yet selected
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
                <span className="font-medium">{person.fullName}</span> <span className="text-xs text-gray-500">({obfuscateEmail(person.email)})</span> <span className="ml-2 text-xs text-gray-400">[{person.role}]</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Show code input if codeSent and not yet verified
  if (violation && violation.persons && selectedPersonId && !codeVerified) {
    const person = violation.persons.find(p => p.personId === selectedPersonId);
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Email Verification</h2>
        <p className="mb-4">A 6-digit code has been sent to <span className="font-semibold">{person ? obfuscateEmail(person.email) : "your email"}</span>. Please enter it below to continue.</p>
        {sendingCode && <div className="mb-4 flex items-center gap-2 text-blue-600"><Loader2 className="animate-spin h-4 w-4" /> Sending code...</div>}
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="Enter 6-digit code"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="mb-2"
          disabled={verifying || sendingCode}
        />
        <Button
          className="w-full mb-2"
          onClick={async () => {
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
              setCodeVerified(true);
              toast({ title: "Verified", description: "Email code verified. You may now submit your dispute." });
            } catch (err: any) {
              setCodeError(err.message || "Invalid code");
            } finally {
              setVerifying(false);
            }
          }}
          disabled={verifying || sendingCode || code.length !== 6}
        >
          {verifying ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
          Verify Code
        </Button>
        {codeError && <div className="text-destructive text-sm mb-2">{codeError}</div>}
        <Button variant="ghost" className="w-full" onClick={() => setSelectedPersonId(null)} disabled={verifying || sendingCode}>
          Choose a different name
        </Button>
      </div>
    );
  }

  // Only show form if identity is selected and code is verified
  if ((!violation?.persons || (selectedPersonId && codeVerified)) && <>
    <form onSubmit={handleSubmit}>
      <label htmlFor="commenterName" className="block mb-2 font-medium">Your Name *</label>
      <Input
        id="commenterName"
        type="text"
        placeholder="Enter your full name"
        value={commenterName}
        onChange={(e) => setCommenterName(e.target.value)}
        required
        className="mb-4"
      />
      <label htmlFor="comment" className="block mb-2 font-medium">Comment *</label>
      <Textarea
        id="comment"
        rows={4}
        placeholder="Add your comment or explanation"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
      />
      <label className="block mt-4 mb-2 font-medium">Attach Evidence (optional)</label>
      <input
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleFileChange}
        className="mb-4"
      />
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <Button type="submit" disabled={submitting || !comment.trim() || !commenterName.trim()} className="w-full">
        {submitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  </>)

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Respond to Violation</h2>
      {violation && (
        <div className="mb-6 p-4 bg-neutral-50 rounded">
          <div className="mb-2"><span className="font-medium">Unit:</span> {violation.unitNumber}</div>
          <div className="mb-2"><span className="font-medium">Type:</span> {violation.violationType}</div>
          <div className="mb-2"><span className="font-medium">Description:</span> {violation.description}</div>
        </div>
      )}
    </div>
  );
} 