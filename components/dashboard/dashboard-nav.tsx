"use client";

import { Users, MessageSquare, BarChart3 } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Dock, DockItem, DockIcon, DockLabel } from "@/components/ui/shadcn-io/dock";
import { cn } from "@/lib/utils";

const navigation = [
  {
    title: "Agents",
    href: "/dashboard/agents",
    icon: Users,
  },
  {
    title: "Flows",
    href: "/dashboard/sessions",
    icon: MessageSquare,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 hover:opacity-90 opacity-50">
      <Dock className="items-end pb-3">
        {navigation.map((item, idx) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={idx} href={item.href}>
              <DockItem
                className={cn(
                  "aspect-square rounded-full transition-transform duration-200",
                  "hover:scale-110", // Zoom effect
                  isActive ? "bg-foreground/20 text-accent shadow-lg" : "bg-gray-200 dark:bg-neutral-800"
                )}
              >
                <DockLabel>{item.title}</DockLabel>
                <DockIcon>
                  <Icon
                    className={cn(
                      "h-full w-full transition-colors duration-200",
                      isActive ? "text-accent-foreground" : "text-neutral-600 dark:text-neutral-300"
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
