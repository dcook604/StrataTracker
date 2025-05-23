import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ViolationDetails {
  unitNumber: string;
  violationType: string;
  description: string;
}

export default function PublicViolationCommentPage() {
  const [match, params] = useRoute("/violation/comment/:token");
  const token = params?.token;
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkStatus, setLinkStatus] = useState<"valid" | "expired" | "used" | "invalid">("valid");
  const [violation, setViolation] = useState<ViolationDetails | null>(null);

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
      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-medium">Comment</label>
        <Textarea
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
        <Button type="submit" disabled={submitting || !comment.trim()} className="w-full">
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </div>
  );
} 