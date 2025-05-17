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
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { insertViolationSchema, insertPropertyUnitSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { FileUpload } from "@/components/file-upload";

const newUnitSchema = insertPropertyUnitSchema.pick({
  unitNumber: true,
  floor: true,
  ownerName: true,
  ownerEmail: true,
  tenantName: true,
  tenantEmail: true,
});

const violationFormSchema = z.object({
  unitId: z.string().or(z.number()).refine(val => Number(val) > 0, {
    message: "Please select a unit",
  }),
  newUnit: z.object({
    unitNumber: z.string().optional(),
    floor: z.string().optional(),
    ownerName: z.string().optional(),
    ownerEmail: z.string().email().optional(),
    tenantName: z.string().optional(),
    tenantEmail: z.string().email().optional(),
  }).optional(),
  violationType: z.string().min(1, "Please select a violation type"),
  violationDate: z.string().min(1, "Date is required"),
  violationTime: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  bylawReference: z.string().optional(),
  status: z.string().default("new"),
  attachments: z.array(z.any()).optional(),
});

export function ViolationForm() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Load property units
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/property-units"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Form setup
  const form = useForm<z.infer<typeof violationFormSchema>>({
    resolver: zodResolver(violationFormSchema),
    defaultValues: {
      unitId: "",
      violationType: "",
      violationDate: new Date().toISOString().split("T")[0],
      violationTime: "",
      description: "",
      bylawReference: "",
      status: "new",
      attachments: [],
    },
  });

  // Create new unit mutation
  const createUnitMutation = useMutation({
    mutationFn: async (unitData: z.infer<typeof newUnitSchema>) => {
      const res = await apiRequest("POST", "/api/property-units", unitData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-units"] });
      form.setValue("unitId", data.id);
      setShowNewUnitForm(false);
      toast({
        title: "Unit created",
        description: `Unit ${data.unitNumber} has been created`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create unit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit violation mutation
  const submitViolationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof violationFormSchema>) => {
      // Create FormData object for file upload
      const formData = new FormData();
      
      // Add regular fields
      formData.append("unitId", data.unitId.toString());
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
    if (showNewUnitForm && values.newUnit) {
      // First create the unit, then the violation will be created in the success callback
      const requiredFields = ["unitNumber", "ownerName", "ownerEmail"];
      const missingFields = requiredFields.filter(field => !values.newUnit?.[field as keyof typeof values.newUnit]);
      
      if (missingFields.length > 0) {
        toast({
          title: "Missing required fields",
          description: `Please fill in: ${missingFields.join(", ")}`,
          variant: "destructive",
        });
        return;
      }
      
      createUnitMutation.mutate(values.newUnit as z.infer<typeof newUnitSchema>);
    } else {
      // Submit the violation directly
      submitViolationMutation.mutate(values);
    }
  };

  const handleFileChange = (files: File[]) => {
    setAttachments(files);
  };

  const isSubmitting = submitViolationMutation.isPending || createUnitMutation.isPending;

  return (
    <Card className="max-w-4xl mx-auto bg-white shadow">
      <CardHeader>
        <CardTitle className="text-2xl">Report a Violation</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Unit Information */}
            <div>
              <h3 className="text-lg font-medium text-neutral-800 mb-4">Unit Information</h3>
              <div className="space-y-4">
                {!showNewUnitForm ? (
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
                              {units?.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id.toString()}>
                                  Unit #{unit.unitNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewUnitForm(true)}
                    >
                      Add New Unit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-neutral-700">Add New Unit</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="newUnit.unitNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 203" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newUnit.floor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Floor</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newUnit.ownerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newUnit.ownerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner Email *</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newUnit.tenantName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tenant Name (if applicable)</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newUnit.tenantEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tenant Email (if applicable)</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewUnitForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
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
      </CardContent>
    </Card>
  );
}
