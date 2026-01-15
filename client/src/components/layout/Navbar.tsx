import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  User, 
  Dumbbell, 
  Library, 
  Sparkles, 
  LogOut,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/use-profile";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/library", label: "Library", icon: Library },
    { href: "/avatar", label: "Avatar", icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg group-hover:shadow-primary/50 transition-all duration-300">
            <Sparkles className="size-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            Rhythm<span className="text-primary">AI</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
                    ${location === link.href 
                      ? "bg-white/10 text-white shadow-sm" 
                      : "text-muted-foreground hover:text-white hover:bg-white/5"}
                  `}>
                    <link.icon className="size-4" />
                    {link.label}
                  </div>
                </Link>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-white/10 hover:ring-primary/50 transition-all">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {user.firstName?.[0] || user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card border-white/10" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">{profile?.displayName || user.firstName || "Dancer"}</p>
                    <p className="text-xs leading-none text-muted-foreground">Level {profile?.level || 1}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-muted-foreground focus:text-white focus:bg-white/10 cursor-pointer" onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/library">
              <Button variant="ghost" className="text-muted-foreground hover:text-white">Explore</Button>
            </Link>
            <Link href="/api/login">
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-full px-6">
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
