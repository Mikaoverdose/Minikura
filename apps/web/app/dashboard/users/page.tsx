"use client";

import { Ban, CheckCircle, Edit, ShieldCheck, Trash2, UserRoundCheck, Users } from "lucide-react";
import { getErrorMessage } from "@minikura/shared/errors";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader, PageShell, StatePanel } from "@/components/page-layout";
import { SectionCard, TableActions } from "@/components/section-card";
import { StatStrip } from "@/components/stat-strip";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { getUserApi } from "@/lib/api-helpers";
import { useSession } from "@/lib/auth-client";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date | string;
  emailVerified: boolean;
  isSuspended: boolean;
  banned: boolean;
  suspendedUntil: Date | string | null;
};

function formatDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "short",
  }).format(new Date(value));
}

function localDateTimeMinimum(): string {
  const now = new Date(Date.now() + 60_000);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const fetchSequence = useRef(0);

  const fetchUsers = useCallback(async () => {
    const sequence = ++fetchSequence.current;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await api.api.users.get();
      if (error) throw error;
      if (!data) throw new Error("The user directory returned no data");
      if (sequence === fetchSequence.current) setUsers(data);
    } catch (requestError) {
      if (sequence === fetchSequence.current) setError(getErrorMessage(requestError));
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const role =
      editingUser.id === session?.user?.id
        ? editingUser.role
        : String(formData.get("role") || editingUser.role);

    if (editingUser.id === session?.user?.id && role !== "admin") {
      setError("You cannot remove your own administrator access.");
      return;
    }

    setPendingAction(`edit:${editingUser.id}`);
    setError(null);
    try {
      const { error } = await api.api.users({ id: editingUser.id }).patch({
        name,
        role: role as "admin" | "user",
      });

      if (error) throw error;
      setEditingUser(null);
      await fetchUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPendingAction(null);
    }
  };

  const handleSuspend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!suspendingUser) return;

    const formData = new FormData(e.currentTarget);
    const suspendedUntil = formData.get("suspendedUntil") as string;

    if (suspendingUser.id === session?.user?.id) {
      setError("You cannot suspend your own account.");
      return;
    }

    const suspensionDate = suspendedUntil ? new Date(suspendedUntil) : null;
    if (
      suspensionDate &&
      (Number.isNaN(suspensionDate.getTime()) || suspensionDate <= new Date())
    ) {
      setError("Suspension end time must be in the future.");
      return;
    }

    setPendingAction(`suspend:${suspendingUser.id}`);
    setError(null);
    try {
      const { error } = await getUserApi(suspendingUser.id).suspension.patch({
        isSuspended: true,
        suspendedUntil: suspensionDate?.toISOString() || null,
      });

      if (error) throw error;
      setSuspendingUser(null);
      await fetchUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPendingAction(null);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    setPendingAction(`unsuspend:${userId}`);
    setError(null);
    try {
      const { error } = await getUserApi(userId).suspension.patch({
        isSuspended: false,
        suspendedUntil: null,
      });

      if (error) throw error;
      await fetchUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    if (deleteUser.id === session?.user?.id) {
      setError("You cannot delete your own account.");
      setDeleteUser(null);
      return;
    }

    setPendingAction(`delete:${deleteUser.id}`);
    setError(null);
    try {
      const { error } = await api.api.users({ id: deleteUser.id }).delete();

      if (error) throw error;
      setDeleteUser(null);
      await fetchUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPendingAction(null);
    }
  };

  const isUserSuspended = (user: User): boolean => {
    if (user.banned) return true;
    if (!user.isSuspended) return false;
    if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
      return false;
    }
    return true;
  };

  const columns: readonly DataTableColumn<User>[] = [
    { id: "name", header: "Name", cell: (user) => user.name, className: "font-bold" },
    {
      id: "email",
      header: "Email",
      cell: (user) => user.email,
      className: "font-mono text-xs text-muted-foreground",
    },
    {
      id: "role",
      header: "Role",
      cell: (user) => (
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (user) =>
        isUserSuspended(user) ? (
          <StatusBadge tone="error">
            {user.banned ? "Banned" : "Suspended"}
            {!user.banned && user.suspendedUntil && ` until ${formatDateTime(user.suspendedUntil)}`}
          </StatusBadge>
        ) : (
          <StatusBadge tone={user.emailVerified ? "success" : "warning"}>
            {user.emailVerified ? "Active" : "Unverified"}
          </StatusBadge>
        ),
    },
    {
      id: "created",
      header: "Created",
      cell: (user) => new Date(user.createdAt).toLocaleDateString(),
      className: "text-muted-foreground",
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (user) => (
        <TableActions>
          <Button
            variant="ghost"
            size="icon"
            disabled={pendingAction !== null}
            onClick={() => setEditingUser(user)}
            aria-label={`Edit ${user.name}`}
          >
            <Edit />
          </Button>
          {user.banned ? null : isUserSuspended(user) ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={pendingAction !== null}
              onClick={() => handleUnsuspend(user.id)}
              aria-label={`Restore ${user.name}`}
            >
              <CheckCircle />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              disabled={user.id === session?.user?.id || pendingAction !== null}
              onClick={() => setSuspendingUser(user)}
              aria-label={`Suspend ${user.name}`}
            >
              <Ban />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            disabled={user.id === session?.user?.id || pendingAction !== null}
            onClick={() => setDeleteUser(user)}
            aria-label={`Delete ${user.name}`}
          >
            <Trash2 />
          </Button>
        </TableActions>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Directory"
        title="Users"
        description="Control operator access, roles, and account status."
        actions={
          !loading && (
            <StatStrip
              items={[
                { label: "Total", value: users.length, icon: Users },
                {
                  label: "Admins",
                  value: users.filter((user) => user.role === "admin").length,
                  icon: ShieldCheck,
                },
                {
                  label: "Active",
                  value: users.filter((user) => !isUserSuspended(user)).length,
                  icon: UserRoundCheck,
                  tone: "positive",
                },
              ]}
            />
          )
        }
      />

      {error && !loading && (
        <div
          role="alert"
          className="flex flex-col gap-3 border border-destructive/50 bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchUsers()}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <StatePanel loading title="Loading directory..." className="h-64" />
      ) : (
        <SectionCard
          title="Access Registry"
          description="All identities authorized in this control plane."
        >
          <DataTable data={users} columns={columns} getRowKey={(user) => user.id} />
        </SectionCard>
      )}

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editingUser?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  name="role"
                  defaultValue={editingUser?.role}
                  disabled={editingUser?.id === session?.user?.id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pendingAction !== null}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!suspendingUser} onOpenChange={() => setSuspendingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend {suspendingUser?.name} from accessing the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSuspend}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="suspendedUntil">Suspend Until (Optional)</Label>
                <Input
                  id="suspendedUntil"
                  name="suspendedUntil"
                  type="datetime-local"
                  min={localDateTimeMinimum()}
                  placeholder="Leave empty for indefinite suspension"
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty for indefinite suspension
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSuspendingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pendingAction !== null}>
                Suspend User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteUser}
        title="Delete User"
        description={
          <>Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.</>
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onOpenChange={(open) => !open && setDeleteUser(null)}
      />
    </PageShell>
  );
}
