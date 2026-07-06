import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { gql, useLazyQuery } from '@apollo/client'
import styled from 'styled-components'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'

const SUGGEST_QUERY = gql`
  query SearchSuggest($query: String!) {
    searchContent(query: $query, limit: 6) {
      id title slug contentType thumbnailUrl avgRating
    }
  }
`

export default function TopNav() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { user, hasActiveSubscription, logout } = useAuth()
  const { notifications, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const [runSearch, { data, loading }] = useLazyQuery(SUGGEST_QUERY, {
    fetchPolicy: 'network-only',
  })

  const suggestions = data?.searchContent ?? []

  // Debounce search as user types
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        runSearch({ variables: { query: val.trim() } })
        setShowDropdown(true)
      }, 250)
    } else {
      setShowDropdown(false)
    }
  }, [runSearch])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setShowDropdown(false)
      navigate(`/catalog/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSelect = (slug: string) => {
    setShowDropdown(false)
    setSearchQuery('')
    navigate(`/catalog/${slug}`)
  }

  const handleClear = () => {
    setSearchQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      movie: 'Movie', series: 'Series', documentary: 'Documentary',
      live: 'Live', short: 'Short',
    }
    return map[t?.toLowerCase()] ?? t
  }

  return (
    <NavBar>
      <SearchWrapper ref={wrapperRef}>
        <SearchForm onSubmit={handleSubmit}>
          <SearchIcon>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="7" stroke="#64748B" strokeWidth="2"/>
              <path d="M15 15l3 3" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </SearchIcon>
          <SearchInput
            ref={inputRef}
            type="text"
            placeholder="Search movies, series, studios…"
            value={searchQuery}
            onChange={handleChange}
            onFocus={() => { if (suggestions.length > 0 && searchQuery.length >= 2) setShowDropdown(true) }}
            autoComplete="off"
          />
          {searchQuery && (
            <ClearBtn type="button" onClick={handleClear}>✕</ClearBtn>
          )}
        </SearchForm>

        {showDropdown && (
          <Dropdown>
            {loading && (
              <DropdownLoading>
                <Spinner />
                Searching…
              </DropdownLoading>
            )}

            {!loading && suggestions.length === 0 && searchQuery.length >= 2 && (
              <NoResults>No results for "{searchQuery}"</NoResults>
            )}

            {!loading && suggestions.length > 0 && (
              <>
                <DropdownHeader>Suggestions</DropdownHeader>
                {suggestions.map((item: any) => (
                  <SuggestionRow key={item.id} onClick={() => handleSelect(item.slug)}>
                    <SuggThumb>
                      {item.thumbnailUrl
                        ? <img src={item.thumbnailUrl} alt={item.title} />
                        : <ThumbFallback>🎬</ThumbFallback>
                      }
                    </SuggThumb>
                    <SuggInfo>
                      <SuggTitle>{highlightMatch(item.title, searchQuery)}</SuggTitle>
                      <SuggMeta>
                        <TypeTag>{typeLabel(item.contentType)}</TypeTag>
                        {item.avgRating && <span>★ {item.avgRating.toFixed(1)}</span>}
                      </SuggMeta>
                    </SuggInfo>
                    <SuggArrow>›</SuggArrow>
                  </SuggestionRow>
                ))}
                <DropdownFooter onClick={handleSubmit as any}>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="#7C3AED" strokeWidth="2"/>
                    <path d="M15 15l3 3" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  See all results for "{searchQuery}"
                </DropdownFooter>
              </>
            )}
          </Dropdown>
        )}
      </SearchWrapper>

      <Actions>
        {!hasActiveSubscription && (
          <UpgradeBtn onClick={() => navigate('/billing')}>
            ⚡ Upgrade
          </UpgradeBtn>
        )}

        <NotifWrapper ref={notifRef}>
          <NotificationBtn onClick={() => setShowNotif(v => !v)} title="Notifications" $active={showNotif}>
            <BellIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </BellIcon>
            {unreadCount > 0 && <NotifBadge>{unreadCount}</NotifBadge>}
          </NotificationBtn>

          {showNotif && (
            <NotifPanel>
              <NotifHeader>
                <NotifTitle>Notifications</NotifTitle>
                {unreadCount > 0 && (
                  <MarkAllBtn onClick={markAllRead}>Mark all read</MarkAllBtn>
                )}
              </NotifHeader>

              {notifications.length === 0 ? (
                <NotifEmpty>No notifications yet</NotifEmpty>
              ) : (
                <NotifList>
                  {notifications.map(n => (
                    <NotifItem key={n.id} $unread={!n.read} onClick={() => markRead(n.id)}>
                      <NotifDot $unread={!n.read} />
                      <NotifBody>
                        <NotifItemTitle $unread={!n.read}>{n.title}</NotifItemTitle>
                        <NotifItemBody>{n.body}</NotifItemBody>
                        <NotifTime>{n.time}</NotifTime>
                      </NotifBody>
                    </NotifItem>
                  ))}
                </NotifList>
              )}
            </NotifPanel>
          )}
        </NotifWrapper>

        {/* User avatar menu */}
        <UserMenuWrapper ref={userMenuRef}>
          <AvatarBtn onClick={() => setShowUserMenu(v => !v)} $active={showUserMenu}>
            {user?.avatarUrl
              ? <AvatarImg src={user.avatarUrl} alt={user.name} />
              : <AvatarInitial>{user?.name?.[0]?.toUpperCase() ?? 'U'}</AvatarInitial>
            }
          </AvatarBtn>

          {showUserMenu && (
            <UserMenuPanel>
              <UserMenuHeader>
                <UserMenuName>{user?.name}</UserMenuName>
                <UserMenuEmail>{user?.email}</UserMenuEmail>
              </UserMenuHeader>
              <UserMenuDivider />
              <UserMenuItem onClick={() => { setShowUserMenu(false); navigate('/account') }}>
                <MenuItemIcon>👤</MenuItemIcon> Account
              </UserMenuItem>
              <UserMenuItem onClick={() => { setShowUserMenu(false); navigate('/settings') }}>
                <MenuItemIcon>⚙️</MenuItemIcon> Settings
              </UserMenuItem>
              <UserMenuItem onClick={() => { setShowUserMenu(false); navigate('/billing') }}>
                <MenuItemIcon>💳</MenuItemIcon> Billing
              </UserMenuItem>
              <UserMenuDivider />
              <UserMenuItemDanger onClick={handleLogout}>
                <MenuItemIcon>🚪</MenuItemIcon> Sign Out
              </UserMenuItemDanger>
            </UserMenuPanel>
          )}
        </UserMenuWrapper>
      </Actions>
    </NavBar>
  )
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <Highlight>{text.slice(idx, idx + query.length)}</Highlight>
      {text.slice(idx + query.length)}
    </>
  )
}

const NavBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 2rem;
  background: #0A0E1A;
  border-bottom: 1px solid #1E2640;
  position: sticky;
  top: 0;
  z-index: 200;
`

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  max-width: 480px;
`

const SearchForm = styled.form`
  position: relative;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  pointer-events: none;
`

const SearchInput = styled.input`
  width: 100%;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 8px;
  padding: 0.5625rem 2.5rem 0.5625rem 2.5rem;
  color: #fff;
  font-size: 0.875rem;
  transition: border-color 0.15s ease, background 0.15s;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: #7C3AED;
    background: #1A1F35;
  }
  &::placeholder { color: #475569; }
`

const ClearBtn = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #64748B;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 4px;
  border-radius: 4px;
  &:hover { color: #fff; background: #1E2640; }
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #141929;
  border: 1px solid #2D3A5C;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6);
  overflow: hidden;
  z-index: 300;
`

const DropdownHeader = styled.div`
  padding: 0.5rem 1rem 0.375rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

const SuggestionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: #1E2640; }
`

const SuggThumb = styled.div`
  width: 48px;
  height: 32px;
  border-radius: 5px;
  overflow: hidden;
  flex-shrink: 0;
  background: #1E2640;
  img { width: 100%; height: 100%; object-fit: cover; }
`

const ThumbFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
`

const SuggInfo = styled.div`flex: 1; min-width: 0;`

const SuggTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Highlight = styled.mark`
  background: none;
  color: #9D5FF5;
  font-weight: 700;
`

const SuggMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2px;
  font-size: 0.7rem;
  color: #64748B;
`

const TypeTag = styled.span`
  background: #1E2640;
  border: 1px solid #2D3A5C;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #7C3AED;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const SuggArrow = styled.span`
  color: #334155;
  font-size: 1.25rem;
  transition: color 0.12s;
  ${SuggestionRow}:hover & { color: #7C3AED; }
`

const DropdownLoading = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #64748B;
  font-size: 0.875rem;
`

const Spinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid #1E2640;
  border-top-color: #7C3AED;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`

const NoResults = styled.div`
  padding: 1rem;
  color: #64748B;
  font-size: 0.875rem;
  text-align: center;
`

const DropdownFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-top: 1px solid #1E2640;
  color: #7C3AED;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: #1E2640; }
`

const Actions = styled.div`display: flex; align-items: center; gap: 0.75rem;`

const UpgradeBtn = styled.button`
  background: linear-gradient(135deg, #7C3AED, #F97316);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s ease;
  &:hover { opacity: 0.9; }
`

const NotifWrapper = styled.div`position: relative; flex-shrink: 0;`

const NotificationBtn = styled.button<{ $active?: boolean }>`
  background: ${p => p.$active ? '#1E2640' : '#141929'};
  border: 1px solid ${p => p.$active ? '#7C3AED' : '#1E2640'};
  color: ${p => p.$active ? '#fff' : '#94A3B8'};
  border-radius: 8px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  transition: all 0.15s;
  &:hover { border-color: #7C3AED; color: #fff; background: #1E2640; }
`

const BellIcon = styled.svg`width: 18px; height: 18px;`

const NotifBadge = styled.span`
  position: absolute;
  top: -5px; right: -5px;
  background: #EF4444;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 800;
  width: 16px; height: 16px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #0A0E1A;
`

const NotifPanel = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 340px;
  background: #141929;
  border: 1px solid #2D3A5C;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6);
  overflow: hidden;
  z-index: 300;
`

const NotifHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.875rem 1rem 0.75rem;
  border-bottom: 1px solid #1E2640;
`
const NotifTitle = styled.h3`font-size: 0.9375rem; font-weight: 700; color: #fff; margin: 0;`
const MarkAllBtn = styled.button`
  background: none; border: none; color: #7C3AED; font-size: 0.75rem;
  font-weight: 600; cursor: pointer; padding: 0;
  &:hover { color: #9D5FF5; }
`

const NotifList = styled.div`max-height: 360px; overflow-y: auto;`

const NotifItem = styled.div<{ $unread: boolean }>`
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: ${p => p.$unread ? 'rgba(124,58,237,0.06)' : 'transparent'};
  border-bottom: 1px solid #1E264066;
  cursor: pointer; transition: background 0.12s;
  &:last-child { border-bottom: none; }
  &:hover { background: #1E2640; }
`

const NotifDot = styled.div<{ $unread: boolean }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
  background: ${p => p.$unread ? '#7C3AED' : 'transparent'};
  border: ${p => p.$unread ? 'none' : '1.5px solid #334155'};
`

const NotifBody = styled.div`flex: 1; min-width: 0;`
const NotifItemTitle = styled.div<{ $unread: boolean }>`
  font-size: 0.8125rem; font-weight: ${p => p.$unread ? 700 : 500};
  color: ${p => p.$unread ? '#fff' : '#CBD5E1'}; margin-bottom: 0.2rem;
`
const NotifItemBody = styled.div`font-size: 0.775rem; color: #64748B; line-height: 1.4;`
const NotifTime = styled.div`font-size: 0.7rem; color: #475569; margin-top: 0.3rem;`
const NotifEmpty = styled.div`padding: 2rem 1rem; text-align: center; color: #475569; font-size: 0.875rem;`

const UserMenuWrapper = styled.div`position: relative; flex-shrink: 0;`

const AvatarBtn = styled.button<{ $active: boolean }>`
  width: 36px; height: 36px; border-radius: 50%; cursor: pointer; padding: 0;
  border: 2px solid ${p => p.$active ? '#7C3AED' : '#1E2640'};
  background: #1E2640; overflow: hidden;
  transition: border-color 0.15s;
  display: flex; align-items: center; justify-content: center;
  &:hover { border-color: #7C3AED; }
`

const AvatarImg = styled.img`width: 100%; height: 100%; object-fit: cover;`

const AvatarInitial = styled.div`
  font-size: 0.875rem; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, #7C3AED, #F97316);
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
`

const UserMenuPanel = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: #141929;
  border: 1px solid #2D3A5C;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6);
  overflow: hidden;
  z-index: 300;
`

const UserMenuHeader = styled.div`padding: 0.875rem 1rem 0.75rem;`
const UserMenuName = styled.div`font-size: 0.9rem; font-weight: 700; color: #fff;`
const UserMenuEmail = styled.div`font-size: 0.75rem; color: #475569; margin-top: 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const UserMenuDivider = styled.div`height: 1px; background: #1E2640;`

const UserMenuItem = styled.button`
  width: 100%; display: flex; align-items: center; gap: 0.625rem;
  padding: 0.625rem 1rem; background: none; border: none;
  color: #CBD5E1; font-size: 0.875rem; cursor: pointer; text-align: left;
  transition: background 0.12s;
  &:hover { background: #1E2640; color: #fff; }
`

const UserMenuItemDanger = styled(UserMenuItem)`
  color: #EF4444;
  &:hover { background: rgba(239,68,68,0.1); color: #EF4444; }
`

const MenuItemIcon = styled.span`font-size: 0.9rem;`
