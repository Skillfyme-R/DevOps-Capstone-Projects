import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { icon: '🏠', label: 'Browse', path: '/catalog' },
  { icon: '🔖', label: 'Watchlist', path: '/watchlist' },
  { icon: '🎬', label: 'My Studio', path: '/studio' },
  { icon: '💳', label: 'Billing', path: '/billing' },
  { icon: '🎭', label: 'Account', path: '/account' },
  { icon: '🛟', label: 'Support', path: '/support' },
]

const adminItems = [
  { icon: '🌐', label: 'CDN Network', path: '/cdn' },
  { icon: '🎫', label: 'Tickets', path: '/admin/tickets' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
]

export default function Sidebar() {
  const { user, isPlatformAdmin, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <SidebarRoot $collapsed={collapsed}>
      <Logo $collapsed={collapsed}>
        <LogoIcon>⚡</LogoIcon>
        {!collapsed && <LogoText>FluxStream</LogoText>}
      </Logo>

      <CollapseBtn onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? '›' : '‹'}
      </CollapseBtn>

      <Nav>
        <NavSection>
          {navItems.map((item) => (
            <NavItem key={item.path} to={item.path} $collapsed={collapsed}>
              <NavIcon>{item.icon}</NavIcon>
              {!collapsed && <NavLabel>{item.label}</NavLabel>}
            </NavItem>
          ))}
        </NavSection>

        {isPlatformAdmin && (
          <NavSection>
            {!collapsed && <SectionLabel>Platform Admin</SectionLabel>}
            {adminItems.map((item) => (
              <NavItem key={item.path} to={item.path} $collapsed={collapsed}>
                <NavIcon>{item.icon}</NavIcon>
                {!collapsed && <NavLabel>{item.label}</NavLabel>}
              </NavItem>
            ))}
          </NavSection>
        )}
      </Nav>

      <UserArea $collapsed={collapsed}>
        {user?.avatarUrl ? (
          <Avatar src={user.avatarUrl} alt={user.name} />
        ) : (
          <AvatarPlaceholder>{user?.name?.[0]?.toUpperCase()}</AvatarPlaceholder>
        )}
        {!collapsed && (
          <UserInfo>
            <UserName>{user?.name}</UserName>
            <UserEmail>{user?.email}</UserEmail>
          </UserInfo>
        )}
        {!collapsed && (
          <LogoutBtn onClick={logout} title="Sign out">↩</LogoutBtn>
        )}
      </UserArea>
    </SidebarRoot>
  )
}

const SidebarRoot = styled.aside<{ $collapsed: boolean }>`
  width: ${(p) => (p.$collapsed ? '68px' : '240px')};
  background: #141929;
  border-right: 1px solid #1E2640;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  position: relative;
  flex-shrink: 0;
`

const Logo = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: ${(p) => (p.$collapsed ? '1.25rem 0' : '1.25rem 1.25rem')};
  justify-content: ${(p) => (p.$collapsed ? 'center' : 'flex-start')};
  border-bottom: 1px solid #1E2640;
`

const LogoIcon = styled.span`font-size: 1.5rem;`
const LogoText = styled.span`font-size: 1.125rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;`

const CollapseBtn = styled.button`
  position: absolute;
  right: -12px;
  top: 1.5rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1E2640;
  border: 1px solid #334155;
  color: #94A3B8;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  &:hover { background: #7C3AED; color: #fff; }
`

const Nav = styled.nav`flex: 1; padding: 1rem 0; overflow-y: auto;`

const NavSection = styled.div`margin-bottom: 1.5rem;`

const SectionLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
  padding: 0 1.25rem;
  margin-bottom: 0.5rem;
`

const NavItem = styled(NavLink)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem ${(p) => (p.$collapsed ? '0' : '1.25rem')};
  justify-content: ${(p) => (p.$collapsed ? 'center' : 'flex-start')};
  color: #94A3B8;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.1s ease, color 0.1s ease;
  border-radius: 0;
  &:hover { background: #1E2640; color: #fff; }
  &.active { background: rgb(124 58 237 / 0.15); color: #9D5FF5; border-right: 2px solid #7C3AED; }
`

const NavIcon = styled.span`font-size: 1.1rem; flex-shrink: 0;`
const NavLabel = styled.span``

const UserArea = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem ${(p) => (p.$collapsed ? '0' : '1rem')};
  justify-content: ${(p) => (p.$collapsed ? 'center' : 'flex-start')};
  border-top: 1px solid #1E2640;
`

const Avatar = styled.img`width: 32px; height: 32px; border-radius: 50%; object-fit: cover;`

const AvatarPlaceholder = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #7C3AED;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const UserInfo = styled.div`flex: 1; min-width: 0;`
const UserName = styled.div`font-size: 0.8125rem; font-weight: 600; color: #fff; truncate: true; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const UserEmail = styled.div`font-size: 0.75rem; color: #64748B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const LogoutBtn = styled.button`background: none; border: none; color: #64748B; cursor: pointer; font-size: 1rem; &:hover { color: #EF4444; }`
