import type {Metadata} from 'next';
import './globals.css';
import './dashboards.css';
import './workspace-theme.css';
import './billing.css';
import './appearance.css';
import './profile-summary.css';
import AppTheme from './theme-provider';
import StartupLogo from './startup-logo';
import './startup-logo.css';
export const metadata:Metadata={title:'Tawar Homes | Accounts & Operations',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Tawar Homes',statusBarStyle:'default'},description:'Project accounts, company finances, petty cash approvals, salary and HR for Tawar Homes.',icons:{apple:'/brand/app-180.png',icon:'/brand/mark-primary.png',shortcut:'/brand/mark-primary.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><AppTheme><StartupLogo/>{children}</AppTheme></body></html>}
