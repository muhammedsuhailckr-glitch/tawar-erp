'use client';
import {ThemeProvider,useTheme} from 'next-themes';
import {useEffect,useState} from 'react';
export default function AppTheme({children}:{children:React.ReactNode}){
 return <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="tawar-appearance" disableTransitionOnChange>{children}</ThemeProvider>;
}
export function AppearancePreference(){
 const {theme,setTheme}=useTheme(),[ready,setReady]=useState(false);
 useEffect(()=>setReady(true),[]);
 return <section className="panel appearance-settings"><div><h2>Appearance</h2><p>Follow your device’s dark mode or choose a theme for this browser.</p></div><label className="field"><span>Theme</span><select aria-label="Theme" value={ready?theme||'system':'system'} onChange={e=>setTheme(e.target.value)}><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></label></section>;
}
