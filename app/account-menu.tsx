'use client';
import {ChevronsUpDown,LogOut,Settings2} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {useSidebar} from '@/components/ui/sidebar';
import {roleNames,type Role} from '@/lib/cashbook';
import type {PersonProfile} from '@/lib/profile';
import {ProfileAvatar} from './dashboard-parts';

export default function AccountMenu({name,profile,role,demo,busy,onSettings,onLogout}:{name:string;profile:PersonProfile|null;role:Role;demo:boolean;busy:boolean;onSettings:()=>void;onLogout:()=>Promise<void>}) {
  const {setOpenMobile}=useSidebar();
  return <DropdownMenu><DropdownMenuTrigger asChild><button className="account-menu-trigger" aria-label={'Account menu for '+name}>
    <ProfileAvatar person={{name,photo_url:profile?.photo_url||null}}/><span className="account-menu-identity"><strong>{name}</strong><small>{roleNames[role]}</small></span><ChevronsUpDown size={15}/>
  </button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" sideOffset={10} className="account-menu-popover">
    <DropdownMenuLabel className="account-menu-label"><strong>{name}</strong><span>{profile?.email||roleNames[role]}</span></DropdownMenuLabel><DropdownMenuSeparator/>
    <DropdownMenuItem onSelect={()=>{setOpenMobile(false);onSettings();}}><Settings2 size={17}/>Settings</DropdownMenuItem>
    <DropdownMenuSeparator/><DropdownMenuItem disabled={busy||demo} onSelect={()=>{void onLogout();}}><LogOut size={17}/>{busy?'Please wait…':'Logout'}</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}
