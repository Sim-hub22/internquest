"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowUpDownIcon,
  EyeIcon,
  MoreHorizontalIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type AdminUserRow = Doc<"users"> & { isSuspended: boolean };
type RoleFilter = "all" | "candidate" | "recruiter";
type SuspensionFilter = "all" | "active" | "suspended";

type SuspensionTarget = {
  userId: Id<"users">;
  name: string;
  isSuspended: boolean;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

const columnHelper = createColumnHelper<AdminUserRow>();

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function RoleBadge({ role }: { role: AdminUserRow["role"] }) {
  if (!role) {
    return <Badge variant="secondary">Unassigned</Badge>;
  }

  return <Badge variant="outline">{role}</Badge>;
}

function SuspensionBadge({ isSuspended }: { isSuspended: boolean }) {
  return (
    <Badge
      variant={isSuspended ? "destructive" : "secondary"}
      className={cn(!isSuspended && "bg-emerald-500/15 text-emerald-600")}
    >
      {isSuspended ? "Suspended" : "Active"}
    </Badge>
  );
}

export function AdminUsersPage() {
  const { isAuthenticated } = useConvexAuth();
  const users = useQuery(api.admin.listUsers, isAuthenticated ? {} : "skip");
  const suspendUser = useMutation(api.admin.suspendUser);
  const unsuspendUser = useMutation(api.admin.unsuspendUser);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [suspensionFilter, setSuspensionFilter] =
    useState<SuspensionFilter>("all");
  const [pendingTarget, setPendingTarget] = useState<SuspensionTarget | null>(
    null
  );
  const [suspensionNote, setSuspensionNote] = useState("");
  const [isMutating, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    if (!users) {
      return [];
    }

    return users.filter((user) => {
      const matchesRole =
        roleFilter === "all" ? true : user.role === roleFilter;
      const matchesSuspension =
        suspensionFilter === "all"
          ? true
          : suspensionFilter === "suspended"
            ? user.isSuspended
            : !user.isSuspended;

      return matchesRole && matchesSuspension;
    });
  }, [roleFilter, suspensionFilter, users]);

  const columns = [
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          User
          <ArrowUpDownIcon data-icon="inline-end" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9 border border-border/60">
            <AvatarImage src={row.original.imageUrl} alt={row.original.name} />
            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.original.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              @{row.original.username}
            </span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: ({ getValue }) => (
        <span className="truncate text-sm text-muted-foreground">
          {getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: ({ getValue }) => <RoleBadge role={getValue()} />,
    }),
    columnHelper.accessor("isSuspended", {
      id: "account_status",
      header: "Account",
      cell: ({ getValue }) => <SuspensionBadge isSuspended={getValue()} />,
    }),
    columnHelper.accessor("createdAt", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Joined
          <ArrowUpDownIcon data-icon="inline-end" />
        </Button>
      ),
      cell: ({ getValue }) => DATE_FORMATTER.format(new Date(getValue())),
    }),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontalIcon />
              <span className="sr-only">Open actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="whitespace-nowrap">
                <Link href={`/admin/users/${row.original._id}` as Route}>
                  <EyeIcon />
                  View detail
                </Link>
              </DropdownMenuItem>
              {row.original.role !== "admin" ? (
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  onClick={() => {
                    setPendingTarget({
                      userId: row.original._id,
                      name: row.original.name,
                      isSuspended: row.original.isSuspended,
                    });
                    setSuspensionNote("");
                  }}
                  variant={row.original.isSuspended ? "default" : "destructive"}
                >
                  {row.original.isSuspended ? (
                    <ShieldCheckIcon />
                  ) : (
                    <ShieldAlertIcon />
                  )}
                  {row.original.isSuspended ? "Unsuspend user" : "Suspend user"}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ] as ColumnDef<AdminUserRow>[];

  const handleConfirm = () => {
    if (!pendingTarget) {
      return;
    }

    startTransition(async () => {
      try {
        if (pendingTarget.isSuspended) {
          await unsuspendUser({ userId: pendingTarget.userId });
          toast.success("User unsuspended");
        } else {
          await suspendUser({
            userId: pendingTarget.userId,
            reason: suspensionNote,
          });
          toast.success("User suspended");
        }
        setPendingTarget(null);
        setSuspensionNote("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to update user"
        );
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Review accounts, inspect roles, and suspend access when moderation
            requires it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as RoleFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="candidate">Candidates</SelectItem>
              <SelectItem value="recruiter">Recruiters</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={suspensionFilter}
            onValueChange={(value) =>
              setSuspensionFilter(value as SuspensionFilter)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="suspended">Suspended only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {users !== undefined && users.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No users yet</EmptyTitle>
            <EmptyDescription>
              Candidate and recruiter accounts will appear here as they join the
              platform.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={users === undefined}
          searchPlaceholder="Search name, username, or email..."
          emptyMessage="No users match the current filters."
        />
      )}

      <AlertDialog
        open={pendingTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingTarget(null);
            setSuspensionNote("");
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={cn(
                pendingTarget?.isSuspended
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {pendingTarget?.isSuspended ? (
                <ShieldCheckIcon />
              ) : (
                <ShieldAlertIcon />
              )}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {pendingTarget?.isSuspended
                ? "Unsuspend this user?"
                : "Suspend this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTarget
                ? pendingTarget.isSuspended
                  ? `${pendingTarget.name} will regain access to protected features and their account metadata will be synced back to Clerk.`
                  : `${pendingTarget.name} will be blocked from protected routes and Convex actions until an admin unsuspends the account.`
                : "Update this account's access status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingTarget && !pendingTarget.isSuspended ? (
            <div className="space-y-2 px-1">
              <p className="text-sm font-medium">Suspension note</p>
              <Textarea
                value={suspensionNote}
                onChange={(event) => setSuspensionNote(event.target.value)}
                placeholder="Add context for why this account is being suspended."
                rows={4}
                disabled={isMutating}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                This note will be saved as the latest moderation note for the
                account.
              </p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating || pendingTarget === null}
              onClick={handleConfirm}
              variant={pendingTarget?.isSuspended ? "default" : "destructive"}
            >
              {pendingTarget?.isSuspended ? "Unsuspend user" : "Suspend user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
