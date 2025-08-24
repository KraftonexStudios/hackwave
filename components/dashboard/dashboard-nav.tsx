"use client";

import { BarChart3, Bot, Workflow, Home, LayoutDashboardIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Dock, DockItem, DockIcon, DockLabel } from "@/components/ui/shadcn-io/dock";
import { cn } from "@/lib/utils";

const navigation = [
  { title: "Home", href: "/", icon: Home },
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Agents", href: "/dashboard/agents", icon: Bot },
  { title: "Flows", href: "/dashboard/sessions", icon: Workflow },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 hover:opacity-90 opacity-50">
      <Dock className="items-end pb-3">
        {navigation.map((item, idx) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname === item.href;

          const Icon = item.icon;

          return (
            <Link key={idx} href={item.href}>
              <DockItem
                className={cn(
                  "aspect-square rounded-full transition-transform duration-200 hover:scale-110",
                  isActive ? "bg-foreground text-primary shadow-lg" : "bg-background text-secondary-foreground"
                )}
              >
                <DockLabel>{item.title}</DockLabel>
                <DockIcon>
                  <Icon
                    className={cn(
                      "h-full w-full transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </DockIcon>
              </DockItem>
            </Link>
          );
        })}
      </Dock>
    </div>
  );
}
