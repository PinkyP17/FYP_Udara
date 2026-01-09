'use client';

import { useUser, SignOutButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';

export default function UserMenu() {
  const { user } = useUser();
  const router = useRouter();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full p-0 h-10 w-10">
          <Avatar>
            <AvatarImage src={user.imageUrl} alt={user.fullName || 'User'} />
            <AvatarFallback>{user.firstName?.[0]}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
        </div>

        <DropdownMenuItem onClick={() => router.push('/edit-profile')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Edit Profile
        </DropdownMenuItem>

        <SignOutButton>
          <DropdownMenuItem className="cursor-pointer text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
