import { Link } from "@tanstack/react-router";
import { User as UserIcon, MoreVertical, Sun, Moon, LogOut as LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AppShellUserMenuProps {
  user: any;
  name: string;
  initials: string;
  resolvedTheme: string;
  toggleTheme: () => void;
  signOut: () => Promise<void>;
}

export function AppShellUserMenu({
  user,
  name,
  initials,
  resolvedTheme,
  toggleTheme,
  signOut,
}: AppShellUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-accent text-xs text-accent-foreground">{initials}</AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-left">{user ? name : "Entrar"}</span>
          <MoreVertical className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {user ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <UserIcon className="mr-2 size-4" />
                Meus dados
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
              {resolvedTheme === "dark" ? (
                <Sun className="mr-2 size-4 text-amber-400" />
              ) : (
                <Moon className="mr-2 size-4 text-muted-foreground" />
              )}
              <span>Tema {resolvedTheme === "dark" ? "Claro" : "Escuro"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOutIcon className="mr-2 size-4" />
              Sair
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link to="/auth">
                <UserIcon className="mr-2 size-4" />
                Acessar Conta
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
              {resolvedTheme === "dark" ? (
                <Sun className="mr-2 size-4 text-amber-400" />
              ) : (
                <Moon className="mr-2 size-4 text-muted-foreground" />
              )}
              <span>Tema {resolvedTheme === "dark" ? "Claro" : "Escuro"}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
