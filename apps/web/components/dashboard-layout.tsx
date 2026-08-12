"use client";

import { GitGraph, LogOut, type LucideIcon, Network, Server, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandLockup } from "@/components/brand";
import { FadeIn } from "@/components/motion";
import { FullScreenLoader } from "@/components/page-layout";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";

type NavigationGroup = {
  label: string;
  items: Array<{
    href: string;
    icon: LucideIcon;
    label: string;
    context: string;
    adminOnly?: boolean;
  }>;
};

const navigation: NavigationGroup[] = [
  {
    label: "Operations",
    items: [
      {
        href: "/dashboard/users",
        icon: Users,
        label: "Users",
        context: "Identity",
        adminOnly: true,
      },
      { href: "/dashboard/servers", icon: Server, label: "Servers", context: "Workloads" },
      {
        href: "/dashboard/topology",
        icon: GitGraph,
        label: "Network",
        context: "Topology",
        adminOnly: true,
      },
    ],
  },
  {
    label: "Kubernetes",
    items: [
      {
        href: "/dashboard/k8s",
        icon: Network,
        label: "Resources",
        context: "Cluster",
        adminOnly: true,
      },
    ],
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login");
      return;
    }
    if (
      !isPending &&
      session?.user.role !== "admin" &&
      (pathname === "/dashboard/users" ||
        pathname.startsWith("/dashboard/topology") ||
        pathname.startsWith("/dashboard/k8s") ||
        pathname.startsWith("/dashboard/servers/create") ||
        pathname.startsWith("/dashboard/servers/edit"))
    ) {
      router.replace("/dashboard/servers");
    }
  }, [session, isPending, pathname, router]);

  if (isPending || !session?.user) return <FullScreenLoader />;
  const isAdmin = session.user.role === "admin";
  const visibleNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isAdmin || !item.adminOnly),
    }))
    .filter((group) => group.items.length > 0);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";
  const currentPage = visibleNavigation
    .flatMap((group) => group.items)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <Sidebar className="border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border px-5 py-5">
          <BrandLockup
            subtitle="Control plane"
            compact
            textClassName="group-data-[collapsible=icon]:hidden"
          />
        </SidebarHeader>
        <SidebarContent className="py-4">
          {visibleNavigation.map((group) => (
            <SidebarGroup key={group.label} className="px-3">
              <SidebarGroupLabel className="font-mono text-[9px] uppercase tracking-[0.2em]">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                        className="h-11 rounded-sm px-3 text-sm font-bold data-[active=true]:border-l-2 data-[active=true]:border-sidebar-primary"
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto w-full justify-start gap-3 overflow-hidden px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-sm">
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col items-start normal-case tracking-normal group-data-[collapsible=icon]:hidden">
                  <span className="max-w-40 truncate text-xs font-bold">{session?.user?.name}</span>
                  <span className="max-w-40 truncate font-mono text-[9px] text-sidebar-foreground/45">
                    {session?.user?.email}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger className="border border-border bg-card" />
          <div className="h-5 w-px bg-border" />
          <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            {currentPage ? `${currentPage.context} / ${currentPage.label}` : "Control plane"}
          </span>
          <ThemeToggle className="ml-auto" />
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <FadeIn key={pathname} y={10} duration={0.4}>
            {children}
          </FadeIn>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
