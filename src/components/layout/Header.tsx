import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, ImageIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

export default function Header() {
  const { user, profile, logout } = useAuth();
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'bg-primary/10 text-primary';
      case 'faculty':
        return 'bg-success/10 text-success';
      case 'admin':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-slide-in-top">
      <div className="container px-6 md:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center hover:scale-105 transition-all duration-300">
            <img 
              src="https://res.cloudinary.com/dfnpgl0bb/image/upload/v1771046687/ChatGPT_Image_Feb_14_2026_10_54_24_AM_k20wkr.png" 
              alt="Student Hub Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Student Hub</h1>
            {profile && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all duration-300 hover:scale-105 ${getRoleBadgeColor(
                  profile.role
                )}`}
              >
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            )}
          </div>
        </div>

        {user && profile && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-2 ring-transparent hover:ring-primary/30 transition-all">
                  <Avatar className="h-10 w-10">
                    {user?.avatar && (
                      <AvatarImage 
                        src={user.avatar} 
                        alt={profile.full_name} 
                        className="object-cover object-center"
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 min-w-[8rem] p-1" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      {user?.avatar && (
                        <AvatarImage 
                          src={user.avatar} 
                          alt={profile.full_name}
                          className="object-cover object-center" 
                        />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-lg">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      {profile.student_id && (
                        <p className="text-xs leading-none text-muted-foreground mt-1">
                          ID: {profile.student_id}
                        </p>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.avatar && (
                  <DropdownMenuItem 
                    onClick={() => setShowAvatarPreview(true)} 
                    className="cursor-pointer"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    <span>View Profile Picture</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Full Avatar Preview Dialog */}
            <Dialog open={showAvatarPreview} onOpenChange={setShowAvatarPreview}>
              <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] p-0 bg-black/95 border-0 overflow-hidden">
                <div className="relative flex items-center justify-center min-h-[50vh] max-h-[90vh]">
                  {/* Close button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 z-10 text-white hover:bg-white/20 rounded-full"
                    onClick={() => setShowAvatarPreview(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>

                  {/* User info */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white/30">
                      <AvatarImage src={user.avatar} alt={profile.full_name} className="object-cover" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white font-medium text-lg drop-shadow-lg">{profile.full_name}</span>
                  </div>

                  {/* Full image */}
                  <img
                    src={user.avatar}
                    alt={`${profile.full_name}'s profile picture`}
                    className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
                    style={{ margin: '70px 20px 20px 20px' }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </header>
  );
}
