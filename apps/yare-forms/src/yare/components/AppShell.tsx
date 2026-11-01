import { useState, type ReactNode } from 'react';
import { Avatar, Button, Drawer, Tooltip } from '@heroui/react';
import { GearIcon, ListIcon, SignOutIcon } from '@phosphor-icons/react';
import type { AppIdentity } from '../brand';
import { AboutYareDialog } from './AboutYareDialog';
import { HelpMenu } from './HelpMenu';
import { YareLogo, YareMark } from './YareLogo';

export interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Render as a link. Without href the item is a button that calls onPress. */
  href?: string;
  onPress?: () => void;
  isActive?: boolean;
  /** Something small at the end of the row: an unread dot, a count. */
  badge?: ReactNode;
}

export interface NavSection {
  id: string;
  /** Small uppercase heading above the items, e.g. "Your forms". */
  label?: string;
  items: NavItem[];
}

export interface ShellUser {
  name: string;
  /** Second line: the workspace, the email, or a role. */
  detail?: string;
  avatarUrl?: string;
}

export interface AppShellProps {
  app: AppIdentity;
  /** The yellow button at the top of the sidebar, e.g. "New form". */
  /** Replaces the app's lockup at the top of the sidebar, e.g. a community's own logo or name. */
  brand?: ReactNode;
  primaryAction?: ReactNode;
  nav: NavSection[];
  user?: ShellUser;
  onSignOut?: () => void;
  /** Shows a Settings button in the sidebar footer when provided. */
  onSettings?: () => void;
  /** Contents of the top bar: usually a PageHeader with breadcrumbs and actions. */
  topbar?: ReactNode;
  children: ReactNode;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

function NavItemView({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const content = (
    <>
      {item.icon}
      <span className="yare-nav-item__label">{item.label}</span>
      {item.badge && <span className="yare-nav-item__badge">{item.badge}</span>}
    </>
  );
  if (item.href) {
    return (
      <a className="yare-nav-item" href={item.href} aria-current={item.isActive ? 'page' : undefined} onClick={onNavigate}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className="yare-nav-item" data-active={item.isActive || undefined} onClick={() => { item.onPress?.(); onNavigate(); }}>
      {content}
    </button>
  );
}

function SidebarContent({ app, brand, primaryAction, nav, user, onSignOut, onSettings, onNavigate }: Omit<AppShellProps, 'topbar' | 'children'> & { onNavigate: () => void }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <aside className="yare-sidebar">
      <div className="yare-sidebar__logo">
        {brand ?? <YareLogo app={app} height={40} />}
      </div>
      {primaryAction}
      <nav className="yare-sidebar__nav" aria-label="Main">
        {nav.map((section) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            {section.label && <div className="yare-nav-section">{section.label}</div>}
            {section.items.map((item) => <NavItemView key={item.id} item={item} onNavigate={onNavigate} />)}
          </div>
        ))}
      </nav>
      <div className="yare-sidebar__footer">
        {user && (
          <div className="yare-user">
            <Avatar size="sm" color="accent" variant="soft">
              {user.avatarUrl && <Avatar.Image src={user.avatarUrl} alt="" />}
              <Avatar.Fallback>{initials(user.name)}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="yare-user__name">{user.name}</div>
              {user.detail && <div className="yare-user__detail">{user.detail}</div>}
            </div>
          </div>
        )}
        <div className="yare-sidebar__tools">
          {onSettings && (
            <Tooltip>
              <Button variant="ghost" isIconOnly aria-label="Settings" onPress={onSettings}><GearIcon /></Button>
              <Tooltip.Content>Settings</Tooltip.Content>
            </Tooltip>
          )}
          <HelpMenu app={app} />
          <Tooltip>
            <Button variant="ghost" isIconOnly aria-label="About Yare Monster" onPress={() => setAboutOpen(true)}><YareMark size={22} /></Button>
            <Tooltip.Content>About Yare Monster</Tooltip.Content>
          </Tooltip>
          <AboutYareDialog app={app} isOpen={aboutOpen} onOpenChange={setAboutOpen} />
          {onSignOut && (
            <Tooltip>
              <Button variant="ghost" isIconOnly aria-label="Sign out" onPress={onSignOut}><SignOutIcon /></Button>
              <Tooltip.Content>Sign out</Tooltip.Content>
            </Tooltip>
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * The layout every Yare Monster app shares: a 240px sidebar (logo, primary action, navigation, user and
 * tools), a 64px top bar for the page header, and the content area. On phones the sidebar becomes
 * a drawer behind a menu button. There is no app switcher: each app stands alone.
 */
const DRAWER = 'nd03ae65lp19roo1odr5:drawer';
const readDrawer = () => { try { return sessionStorage.getItem(DRAWER) === '1'; } catch { return false; } };

export function AppShell({ topbar, children, ...sidebar }: AppShellProps) {
  // On a phone the drawer stays where it was across a reload.
  const [drawerOpen, setDrawerOpenState] = useState(readDrawer);
  const setDrawerOpen = (open: boolean) => { setDrawerOpenState(open); try { sessionStorage.setItem(DRAWER, open ? '1' : '0'); } catch { /* storage may be off */ } };
  const closeDrawer = () => setDrawerOpen(false);
  return (
    <div className="yare-shell">
      <SidebarContent {...sidebar} onNavigate={() => undefined} />
      <div className="flex min-w-0 flex-col">
        <header className="yare-topbar" data-empty={topbar ? undefined : 'true'}>
          <div className="yare-topbar__mobile">
            <Button variant="ghost" isIconOnly aria-label="Open menu" onPress={() => setDrawerOpen(true)}><ListIcon /></Button>
            {sidebar.brand ? <span className="yare-topbar__logo">{sidebar.brand}</span> : <YareLogo app={sidebar.app} height={32} className="yare-topbar__logo" />}
          </div>
          <div className="yare-topbar__content">{topbar}</div>
        </header>
        <main className="yare-main">{children}</main>
      </div>
      <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="left" className="yare-drawer">
            <Drawer.Dialog aria-label="Menu" className="h-full w-72 max-w-[85vw] p-0">
              <SidebarContent {...sidebar} onNavigate={closeDrawer} />
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
