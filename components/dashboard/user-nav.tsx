'use client';

import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings, User as UserIcon, Crown, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserSubscription, type SubscriptionInfo } from '@/lib/subscription';

interface UserNavProps {
  user: User;
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  // Load user subscription status
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const userSubscription = await getUserSubscription(user.id);
        setSubscription(userSubscription);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    loadSubscription();
  }, [user.id]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });

      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error signing out',
        description: 'There was a problem signing you out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getUserInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const getUserDisplayName = () => {
    return user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  };

  const isProUser = subscription?.isPremium && subscription?.isActive;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.user_metadata?.avatar_url}
              alt={getUserDisplayName()}
            />
            <AvatarFallback>
              {getUserInitials(user.email || '')}
            </AvatarFallback>
          </Avatar>
          {/* Pro User Indicator */}
          {isProUser && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-ping opacity-75"></div>
              <Crown className="h-2.5 w-2.5 text-white relative z-10" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {getUserDisplayName()}
              </p>
              {isProUser && (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 animate-pulse">
                  <Crown className="h-3 w-3 mr-1" />
                  Pro
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {!isLoadingSubscription && (
              <div className="flex items-center space-x-1 mt-1">
                {isProUser ? (
                  <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-3 w-3 mr-1" />
                    <span>Premium Plan</span>
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>Free Plan</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}