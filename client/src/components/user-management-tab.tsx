import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, Trash2Icon, UserIcon, UserPlusIcon, ShieldIcon, UserCheckIcon, LockIcon, UnlockIcon, Settings, Users as UsersIconLucide, Loader2 } from "lucide-react"; // Added Loader2, UsersIconLucide, Settings
import { useAuth } from "@/hooks/use-auth";
// import { Layout } from "@/components/layout"; // Removed Layout import
import zxcvbn from "zxcvbn";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added Card components


/**
 * UserManagementTabContent - User Management
 *
 * This component allows administrators to view, add, edit, and delete users.
 * It's designed to be used as a tab within the Settings page.
 *
 * - Uses two Zod schemas:
 *   - createUserSchema: for creating users (password required)
 *   - editUserSchema: for editing users (password optional, min 6 chars if present)
 * - The form dynamically switches schema based on whether editingUser is set.
 * - Handles password strength, role assignment, and user status.
 * - Table displays all user roles with icons.
 */

// --- Zod Schemas ---
/**
 * createUserSchema: Used when creating a new user. Password is required.
 */
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email format"),
  roles: z.object({
    isAdmin: z.boolean().default(false),
    isCouncilMember: z.boolean().default(false),
    isUser: z.boolean().default(true),
  }),
});

/**
 * editUserSchema: Used when editing a user. Password is optional, but must be at least 6 characters if provided.
 */
const editUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Password must be at least 6 characters",
  }),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email format"),
  roles: z.object({
    isAdmin: z.boolean().default(false),
    isCouncilMember: z.boolean().default(false),
    isUser: z.boolean().default(true),
  }),
});

// Use a union type for form values
/**
 * UserFormValues: Used for both create and edit user forms.
 */
type UserFormValues = z.infer<typeof createUserSchema> | z.infer<typeof editUserSchema>;

type InviteFormValues = {
  email: string;
  fullName: string;
  isAdmin: boolean;
  isCouncilMember: boolean;
  isUser: boolean;
};

export function UserManagementTabContent() { // Renamed from UsersPage, removed default export
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [lockUserId, setLockUserId] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState("");
  const lockReasonInputRef = useRef<HTMLInputElement>(null);
  // Password strength state for Add/Edit dialogs
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [passwordLabel, setPasswordLabel] = useState("");
  const editLockStatusRef = useRef<{ locked: boolean; reason: string }>({ locked: false, reason: "" });

  // Redirect if not an admin (This check might be handled by the parent SettingsPage now)
  // For now, keeping it to ensure component-level security if used elsewhere,
  // but SettingsPage itself should also enforce admin/council access.
  const isCurrentUserAdminOrCouncil = user && (user.isAdmin || user.isCouncilMember);
  if (user && !isCurrentUserAdminOrCouncil) { // Updated to allow Council Members as per SettingsPage
    return (
      <div className="container mx-auto py-8">
        <EmptyState
          icon={<ShieldIcon className="h-10 w-10" />}
          title="Access Denied"
          description="You don't have permission to manage users."
        />
      </div>
    );
  }

  const { data: usersData, isLoading, error } = useQuery<User[]>({ // Renamed data to usersData
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to fetch users" }));
        throw new Error(errorData.message || "Failed to fetch users");
      }
      return res.json();
    },
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(editingUser ? editUserSchema : createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      roles: {
        isAdmin: false,
        isCouncilMember: false,
        isUser: true,
      }
    }
  });
  
  const inviteForm = useForm<InviteFormValues>({
    defaultValues: {
      email: "",
      fullName: "",
      isAdmin: false,
      isCouncilMember: false,
      isUser: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      // Flatten roles object for API
      const apiData = {
        ...data,
        isAdmin: data.roles.isAdmin,
        isCouncilMember: data.roles.isCouncilMember,
        isUser: data.roles.isUser,
      };
      delete (apiData as any).roles;

      const res = await apiRequest("POST", "/api/register", apiData);
      if (!res.ok) {
        const error = await res.json().catch(() => ({message: 'Failed to create user'}));
        throw new Error(error.message || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      setIsAddDialogOpen(false);
      form.reset();
      setPasswordStrength(0);
      setPasswordFeedback("");
      setPasswordLabel("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating User",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UserFormValues & { id: number }) => {
      const { id, ...userData } = data;
      const apiData: any = {
        ...userData,
        isAdmin: !!userData.roles.isAdmin,
        isCouncilMember: !!userData.roles.isCouncilMember,
        isUser: !!userData.roles.isUser,
      };
      delete apiData.roles;
      apiData.accountLocked = editLockStatusRef.current.locked;
      apiData.lockReason = editLockStatusRef.current.locked ? editLockStatusRef.current.reason : null;
      
      // Ensure password is not sent if empty, to prevent accidental overwrite with empty string
      if (apiData.password === "") {
        delete apiData.password;
      }

      const res = await apiRequest("PUT", `/api/users/${id}`, apiData);
      if (!res.ok) {
        const error = await res.json().catch(() => ({message: 'Failed to update user'}));
        throw new Error(error.message || 'Failed to update user');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      setEditingUser(null);
      form.reset();
      setPasswordStrength(0);
      setPasswordFeedback("");
      setPasswordLabel("");
      editLockStatusRef.current = { locked: false, reason: "" };
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating User",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({message: 'Failed to delete user'}));
        throw new Error(error.message || 'Failed to delete user');
      }
      // No JSON to return for DELETE typically, or handle as needed
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting User",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const lockMutation = useMutation({
    mutationFn: async ({ id, reason, lock }: { id: number; reason: string; lock: boolean }) => {
      const res = await apiRequest('POST', `/api/users/${id}/lock`, { lock, reason });
      if (!res.ok) {
        const error = await res.json().catch(() => ({message: `Failed to ${lock ? 'lock' : 'unlock'} user`}));
        throw new Error(error.message || `Failed to ${lock ? 'lock' : 'unlock'} user`);
      }
      // No JSON to return usually
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Success',
        description: `User ${variables.lock ? 'locked' : 'unlocked'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      setIsLockDialogOpen(false);
      setLockUserId(null);
      setLockReason('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });


  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const res = await apiRequest("POST", "/api/users/invite", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({message: 'Failed to invite user'}));
        throw new Error(error.message || 'Failed to invite user');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User invited successfully. They will receive an email to set their password.",
      });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error Inviting User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateMutation.mutate({ ...values, id: editingUser.id });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    form.reset({ // Use form.reset to update values and validation state
      username: userToEdit.username,
      password: "", // Password should be empty for edit, or handled specifically
      fullName: userToEdit.fullName,
      email: userToEdit.email,
      roles: {
        isAdmin: !!userToEdit.isAdmin || !!userToEdit.is_admin, // Handle both possible casing from DB
        isCouncilMember: !!userToEdit.isCouncilMember || !!userToEdit.is_council_member,
        isUser: !!userToEdit.isUser || !!userToEdit.is_user, // Default to true if other roles are false
      }
    });
    // Set initial lock status for edit dialog
    editLockStatusRef.current = { locked: !!userToEdit.accountLocked, reason: userToEdit.lockReason || "" };
    setPasswordStrength(0); // Reset password strength on edit
    setPasswordFeedback("");
    setPasswordLabel("");
    setIsAddDialogOpen(true); // Open the same dialog, but in "edit" mode
  };
  
  const handleOpenLockDialog = (userId: number, currentStatus: boolean, currentReason?: string) => {
    setLockUserId(userId);
    setLockReason(currentStatus ? (currentReason || '') : ''); // If unlocking, clear reason
    setIsLockDialogOpen(true);
  };

  const handleLockSubmit = () => {
    if (lockUserId !== null) {
      const userToLock = usersData?.find(u => u.id === lockUserId);
      if (userToLock) {
        lockMutation.mutate({ id: lockUserId, reason: lockReason, lock: !userToLock.accountLocked });
      }
    }
  };


  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  function handlePasswordChange(value: string) {
    if (!value) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      setPasswordLabel("");
      return;
    }
    const result = zxcvbn(value);
    setPasswordStrength((result.score / 4) * 100); // Score is 0-4
    setPasswordFeedback(result.feedback.warning || "");

    switch (result.score) {
      case 0: setPasswordLabel("Very Weak"); break;
      case 1: setPasswordLabel("Weak"); break;
      case 2: setPasswordLabel("Okay"); break;
      case 3: setPasswordLabel("Good"); break;
      case 4: setPasswordLabel("Strong"); break;
      default: setPasswordLabel("");
    }
  }
  
  const onInviteSubmit = (data: InviteFormValues) => {
    inviteMutation.mutate(data);
  };


  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "fullName",
      header: "Full Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const user = row.original;
        const roles = [];
        if (user.isAdmin || user.is_admin) roles.push({ name: "Admin", icon: <ShieldIcon className="w-4 h-4 text-red-600" /> });
        if (user.isCouncilMember || user.is_council_member) roles.push({ name: "Council", icon: <UserCheckIcon className="w-4 h-4 text-blue-600" /> });
        if (user.isUser || user.is_user) roles.push({ name: "User", icon: <UserIcon className="w-4 h-4 text-green-600" /> });
        if (roles.length === 0 && !user.is_admin && !user.is_council_member && !user.is_user) { // Fallback for older data potentially
            if ((user as any).roles?.isUser) roles.push({ name: "User", icon: <UserIcon className="w-4 h-4 text-green-600" /> });
        }


        return (
          <div className="flex items-center space-x-2">
            {roles.map(role => (
              <span key={role.name} title={role.name} className="flex items-center">
                {role.icon}
                <span className="sr-only">{role.name}</span>
              </span>
            ))}
            {roles.length === 0 && <span className="text-neutral-500">N/A</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "accountLocked",
      header: "Status",
      cell: ({ row }) => {
        const user = row.original;
        return user.accountLocked ? (
          <span className="flex items-center text-orange-600" title={user.lockReason || 'Account Locked'}>
            <LockIcon className="w-4 h-4 mr-1" /> Locked
          </span>
        ) : (
          <span className="flex items-center text-green-600">
            <UnlockIcon className="w-4 h-4 mr-1" /> Active
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        const currentLoggedInUser = useAuth().user;

        return (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
              <PencilIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenLockDialog(user.id, !!user.accountLocked, user.lockReason || undefined)}
              title={user.accountLocked ? "Unlock User" : "Lock User"}
            >
              {user.accountLocked ? <UnlockIcon className="w-4 h-4" /> : <LockIcon className="w-4 h-4" />}
            </Button>
            {currentLoggedInUser?.id !== user.id && ( // Prevent deleting self
              <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}>
                <Trash2Icon className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{(error as Error).message || "An unexpected error occurred."}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['users', 'list'] })} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    )
  }
  
  const usersList = usersData || [];


  // Removed Layout wrapper
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">User Management</h2>
          <p className="text-muted-foreground">
            Manage system users, roles, and permissions.
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={() => { setEditingUser(null); form.reset(); setIsAddDialogOpen(true); setPasswordStrength(0); setPasswordFeedback(''); setPasswordLabel(''); }}>
            <UserPlusIcon className="mr-2 h-4 w-4" /> Add User
          </Button>
          <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
             Invite User
          </Button>
        </div>
      </div>

      {usersList.length > 0 ? (
        <DataTable columns={columns} data={usersList} searchColumn="fullName" />
      ) : (
        <EmptyState
          icon={<UsersIconLucide className="h-12 w-12" />}
          title="No Users Found"
          description="No users have been added to the system yet."
          actionLabel="Add User"
          onAction={() => { setEditingUser(null); form.reset(); setIsAddDialogOpen(true); setPasswordStrength(0); setPasswordFeedback(''); setPasswordLabel(''); }}
        />
      )}

      {/* Add/Edit User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
        setIsAddDialogOpen(isOpen);
        if (!isOpen) {
          setEditingUser(null);
          form.reset();
          setPasswordStrength(0);
          setPasswordFeedback("");
          setPasswordLabel("");
          editLockStatusRef.current = { locked: false, reason: "" };
        }
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update the user's details below." : "Fill in the details to create a new user account."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                      <Input type="email" placeholder="user@example.com" {...field} />
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
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password {editingUser && "(Leave blank to keep current)"}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          handlePasswordChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    {field.value && (passwordStrength > 0 || passwordFeedback) && (
                       <div className="mt-2">
                         <Progress value={passwordStrength} className="w-full h-2" />
                         <p className={`text-sm mt-1 ${
                            passwordStrength < 25 ? 'text-red-500' :
                            passwordStrength < 50 ? 'text-orange-500' :
                            passwordStrength < 75 ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                           Strength: {passwordLabel} {passwordFeedback && `- ${passwordFeedback}`}
                         </p>
                       </div>
                     )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormLabel>Roles</FormLabel>
              <div className="space-y-2 p-3 border rounded-md">
                 <FormField
                  control={form.control}
                  name="roles.isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="font-normal">Administrator</FormLabel>
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
                  name="roles.isCouncilMember"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="font-normal">Council Member</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField // Assuming isUser is always true or based on other roles
                  control={form.control}
                  name="roles.isUser"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                       <FormLabel className="font-normal">Regular User (Default)</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.getValues('roles.isAdmin') && !form.getValues('roles.isCouncilMember')} // A user must have at least one role, default to user
                        />
                      </FormControl>
                       <FormDescription className="text-xs">
                         If no other roles, user is default.
                       </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
               {editingUser && (
                <div className="space-y-2 p-3 border rounded-md">
                  <FormLabel>Account Status</FormLabel>
                  <FormField
                    control={form.control} // This doesn't directly control a form field but triggers UI update
                    name="username" // Dummy field to make RHF re-render, not ideal.
                    render={() => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <FormLabel className="font-normal">
                          {editLockStatusRef.current.locked ? `Locked: ${editLockStatusRef.current.reason || 'No reason provided'}` : "Active"}
                        </FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentStatus = editLockStatusRef.current.locked;
                            const reason = currentStatus ? '' : (prompt("Enter reason for locking account:", editLockStatusRef.current.reason) || "Locked by administrator");
                            if (!currentStatus && reason === null) return; // User cancelled prompt for locking
                            
                            editLockStatusRef.current = { locked: !currentStatus, reason: !currentStatus ? reason : '' };
                            form.setValue('username', form.getValues('username') + ' '); // Force re-render, hacky
                            form.setValue('username', form.getValues('username').trim()); 
                          }}
                        >
                          {editLockStatusRef.current.locked ? "Unlock Account" : "Lock Account"}
                        </Button>
                      </FormItem>
                    )}
                  />
                </div>
              )}


              <DialogFooter>
                <Button variant="ghost" type="button" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingUser ? "Save Changes" : "Add User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Lock/Unlock User Dialog */}
      <Dialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Account Lock/Unlock</DialogTitle>
            <DialogDescription>
              {usersData?.find(u => u.id === lockUserId)?.accountLocked 
                ? "Unlocking this account will allow the user to log in again." 
                : "Locking this account will prevent the user from logging in. You can provide an optional reason."}
            </DialogDescription>
          </DialogHeader>
          {!usersData?.find(u => u.id === lockUserId)?.accountLocked && (
            <div className="grid gap-4 py-4">
              <FormItem>
                <FormLabel htmlFor="lockReason">Reason for Locking</FormLabel>
                <Input
                  id="lockReason"
                  ref={lockReasonInputRef}
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="e.g., Suspicious activity"
                />
              </FormItem>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLockDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleLockSubmit} 
              disabled={lockMutation.isPending || (!usersData?.find(u => u.id === lockUserId)?.accountLocked && !lockReason.trim())}
              variant={usersData?.find(u => u.id === lockUserId)?.accountLocked ? "default" : "destructive"}
            >
              {lockMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {usersData?.find(u => u.id === lockUserId)?.accountLocked ? "Unlock Account" : "Lock Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Enter the details of the user you want to invite. They will receive an email to set up their account.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormLabel>Assign Roles</FormLabel>
              <div className="space-y-2 p-3 border rounded-md">
                 <FormField
                  control={inviteForm.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="font-normal">Administrator</FormLabel>
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
                  control={inviteForm.control}
                  name="isCouncilMember"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="font-normal">Council Member</FormLabel>
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
                  control={inviteForm.control}
                  name="isUser"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="font-normal">Regular User</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!inviteForm.getValues('isAdmin') && !inviteForm.getValues('isCouncilMember')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" type="button" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 