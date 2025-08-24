import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/dashboard-nav"; // ✅ new dock nav
import { UserNav } from "@/components/dashboard/user-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Image from "next/image";
import Logo from "@/public/images/photo-1694903089438-bf28d4697d9a.avif";
import VoiceNavigation from "@/components/voice/VoiceNavigation";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky px-20 top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            {/* ✅ Removed DashboardNav (top nav) */}
            <Image height={100} width={100} className="w-20 rounded-md overflow-hidden" alt="image" src={Logo} />
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none"></div>
            <nav className="flex items-center space-x-2">
              <ThemeSwitcher />
              <UserNav user={user} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto py-6">{children}</div>

      {/* ✅ Apple-style Dock at the bottom */}
      <DashboardNav />
      <VoiceNavigation />
    </div>
  );
}
