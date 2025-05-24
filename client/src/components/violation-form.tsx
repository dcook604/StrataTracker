import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { insertViolationSchema, insertPropertyUnitSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

const violationFormSchema = z.object({
  unitId: z.string().or(z.number()).refine(val => Number(val) > 0, {
    message: "Please select a unit",
  }),
  categoryId: z.string().or(z.number()).refine(val => Number(val) > 0, {
    message: "Please select a category",
  }),
  violationType: z.string().min(1, "Please select a violation type"),
  violationDate: z.string().min(1, "Date is required"),
  violationTime: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  bylawReference: z.string().optional(),
  status: z.string().default("pending_approval"),
  attachments: z.array(z.any()).optional(),
  unitNumber: z.string().optional(),
  floor: z.string().optional(),
});

export function ViolationForm() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [unitUpdateDialog, setUnitUpdateDialog] = useState<null | { existing: any; newUnit: any; changedFields: { field: string; oldValue: any; newValue: any }[] }>(null);
  const [pendingUnitUpdatePayload, setPendingUnitUpdatePayload] = useState<any>(null);
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  
  // Load property units
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/property-units"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Load categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/violation-categories"],
    staleTime: 1000 * 60 * 5,
  });

  // Fix linter errors for .map on units and categories
  const safeUnits = Array.isArray(units) ? units : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Filtered units based on search term
  const filteredUnits = useMemo(() => {
    if (!unitSearchTerm) return safeUnits;
    return safeUnits.filter((unit: any) =>
      unit.unitNumber.toLowerCase().includes(unitSearchTerm.toLowerCase())
    );
  }, [safeUnits, unitSearchTerm]);

  // Auto-select unit if search term leads to a single partial match
  const form = useForm<z.infer<typeof violationFormSchema>>({
    resolver: zodResolver(violationFormSchema),
    defaultValues: {
      unitId: "",
      categoryId: "",
      violationType: "",
      violationDate: new Date().toISOString().split("T")[0],
      violationTime: "",
      description: "",
      bylawReference: "",
      status: "pending_approval",
      attachments: [],
      unitNumber: '',
      floor: '',
    },
  });

  useEffect(() => {
    if (unitSearchTerm.trim() && filteredUnits.length === 1) {
      const singleUnit = filteredUnits[0];
      if (String(form.getValues("unitId")) !== String(singleUnit.id)) {
        form.setValue("unitId", String(singleUnit.id));
      }
    }
  }, [unitSearchTerm, filteredUnits, form]);

  const watchUnitId = form.watch("unitId");

  // Submit violation mutation
  const submitViolationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof violationFormSchema>) => {
      // Create FormData object for file upload
      const formData = new FormData();
      
      // Add regular fields
      formData.append("unitId", Number(data.unitId).toString());
      formData.append("categoryId", Number(data.categoryId).toString());
      formData.append("violationType", data.violationType);
      formData.append("violationDate", data.violationDate);
      formData.append("violationTime", data.violationTime || "");
      formData.append("description", data.description);
      formData.append("bylawReference", data.bylawReference || "");
      formData.append("status", data.status);
      
      // Add attachments
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });
      
      const res = await fetch("/api/violations", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Violation submitted",
        description: "The violation has been submitted successfully",
      });
      navigate("/violations");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit violation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof violationFormSchema>) => {
    // Submit the violation directly
    console.log("Attempting to submit violation with values:", values);
    console.log("Current form validation state (errors):", form.formState.errors);
    submitViolationMutation.mutate(values);
  };

  const handleFileChange = (files: File[]) => {
    setAttachments(files);
  };

  const isSubmitting = submitViolationMutation.isPending;

  return (
    <Card className="max-w-4xl mx-auto bg-white shadow">
      <CardHeader>
        <CardTitle className="text-2xl">Report a Violation</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error("Form validation failed:", errors);
            toast({
              title: "Validation Error",
              description: "Please check the form for errors and fill all required fields.",
              variant: "destructive",
            });
          })} className="space-y-6">
            {/* Unit Information */}
            <div>
              <h3 className="text-lg font-medium text-neutral-800 mb-4">Unit Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Unit *</FormLabel>
                        <Select
                          disabled={unitsLoading}
                          onValueChange={field.onChange}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredUnits.map((unit: any) => (
                              <SelectItem key={unit.id} value={unit.id.toString()}>
                                Unit #{unit.unitNumber}
                              </SelectItem>
                            ))}
                            {filteredUnits.length === 0 && unitSearchTerm && (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No units found for "{unitSearchTerm}".
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Input
                    placeholder="Search unit by number..."
                    value={unitSearchTerm}
                    onChange={(e) => setUnitSearchTerm(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Violation Details */}
            <div>
              <h3 className="text-lg font-medium text-neutral-800 mb-4">Violation Details</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="violationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Violation Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select violation type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="noise">Noise Complaint</SelectItem>
                          <SelectItem value="parking">Parking Violation</SelectItem>
                          <SelectItem value="garbage">Improper Garbage Disposal</SelectItem>
                          <SelectItem value="pet">Unauthorized Pet</SelectItem>
                          <SelectItem value="property">Property Damage</SelectItem>
                          <SelectItem value="balcony">Balcony Misuse</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="violationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Violation *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="violationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time of Violation (approximate)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a detailed description of the violation"
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Please provide specific details about the violation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bylawReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bylaw Reference (if known)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Section 3.2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Evidence Upload */}
            <div>
              <h3 className="text-lg font-medium text-neutral-800 mb-4">Evidence</h3>
              <FileUpload onChange={handleFileChange} />
            </div>

            <div className="pt-4 border-t border-neutral-200">
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/violations")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Submitting..." : "Submit Violation"}
                </Button>
              </div>
            </div>
          </form>
        </Form>

        {/* Unit Update Confirmation Dialog */}
        <Dialog open={!!unitUpdateDialog} onOpenChange={open => { if (!open) setUnitUpdateDialog(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Unit Update</DialogTitle>
              <DialogDescription>
                This unit already exists. The following fields will be updated:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {unitUpdateDialog?.changedFields.map(f => (
                <div key={f.field} className="text-sm">
                  <strong>{f.field}:</strong>
                  <div className="ml-2">
                    <span className="text-muted-foreground">Old:</span> {f.oldValue || <em>(empty)</em>}<br />
                    <span className="text-muted-foreground">New:</span> {f.newValue || <em>(empty)</em>}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnitUpdateDialog(null)}>Cancel</Button>
              <Button
                variant="default"
                onClick={() => {
                  if (pendingUnitUpdatePayload) {
                    apiRequest("PUT", `/api/property-units/${pendingUnitUpdatePayload.id}`, pendingUnitUpdatePayload.payload)
                      .then(res => res.json())
                      .then(data => {
                        queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
                        form.setValue("unitId", data.id);
                        setUnitUpdateDialog(null);
                        setPendingUnitUpdatePayload(null);
                        toast({
                          title: "Unit updated",
                          description: `Unit ${data.unitNumber} has been updated. Please proceed with violation details.`,
                        });
                      })
                      .catch(err => {
                        toast({
                          title: "Failed to update unit",
                          description: err.message,
                          variant: "destructive",
                        });
                      });
                  }
                }}
              >
                Accept Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
