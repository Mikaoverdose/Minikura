"use client";

import { Ban, CheckCircle, Edit, ShieldCheck, Trash2, UserRoundCheck, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  createdAt: Date;
  emailVerified: boolean;
  isSuspended: boolean;
  suspendedUntil: Date | null;
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await api.api.users.get();
      if (!error && data) {
        setUsers(data);
      }
    } catch (_error) {
    } finally {
      setLoading(false);
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
    const role = formData.get("role") as string;

    try {
      const { error } = await api.api.users({ id: editingUser.id }).patch({
        name,
        role: role as "admin" | "user",
      });

      if (!error) {
        await fetchUsers();
        setEditingUser(null);
      }
    } catch (_error) {}
  };

  const handleSuspend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!suspendingUser) return;

    const formData = new FormData(e.currentTarget);
    const suspendedUntil = formData.get("suspendedUntil") as string;

    try {
      const { error } = await getUserApi(suspendingUser.id).suspension.patch({
        isSuspended: true,
        suspendedUntil: suspendedUntil || null,
      });

      if (!error) {
        await fetchUsers();
        setSuspendingUser(null);
      }
    } catch (_error) {}
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      const { error } = await getUserApi(userId).suspension.patch({
        isSuspended: false,
        suspendedUntil: null,
      });

      if (!error) {
        await fetchUsers();
      }
    } catch (_error) {}
  };

  const handleDelete = async () => {
    if (!deleteUser) return;

    try {
      const { error } = await api.api.users({ id: deleteUser.id }).delete();

      if (!error) {
        await fetchUsers();
        setDeleteUser(null);
      }
    } catch (_error) {}
  };

  const isUserSuspended = (user: User): boolean => {
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
            Suspended
            {user.suspendedUntil && ` until ${new Date(user.suspendedUntil).toLocaleDateString()}`}
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
            onClick={() => setEditingUser(user)}
            aria-label={`Edit ${user.name}`}
          >
            <Edit />
          </Button>
          {isUserSuspended(user) ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleUnsuspend(user.id)}
              aria-label={`Restore ${user.name}`}
            >
              <CheckCircle />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSuspendingUser(user)}
              aria-label={`Suspend ${user.name}`}
            >
              <Ban />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            disabled={user.id === session?.user?.id}
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
                <Select name="role" defaultValue={editingUser?.role}>
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
              <Button type="submit">Save Changes</Button>
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
              <Button type="submit" variant="destructive">
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
