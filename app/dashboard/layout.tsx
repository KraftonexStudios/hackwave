import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <a className="mr-6 flex items-center space-x-2" href="/dashboard">
              <span className="hidden font-bold sm:inline-block">
                AI Debate Platform
              </span>
            </a>
            <DashboardNav />
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {/* Search can be added here later */}
            </div>
            <nav className="flex items-center space-x-2">
              <ThemeSwitcher />
              <UserNav user={user} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  );
}