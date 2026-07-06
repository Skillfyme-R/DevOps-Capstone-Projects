import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useAuth } from '../../contexts/AuthContext'

const STORAGE_KEY = 'fluxstream_settings'

interface Settings {
  quality: string
  autoplay: boolean
  subtitleLang: string
  newReleaseNotifs: boolean
  emailNotifs: boolean
  debugMode: boolean
  maintenanceBanner: boolean
}

const DEFAULTS: Settings = {
  quality: 'auto',
  autoplay: true,
  subtitleLang: 'en',
  newReleaseNotifs: true,
  emailNotifs: true,
  debugMode: false,
  maintenanceBanner: false,
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULTS
}

export default function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.role === 'platform_admin'

  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const set = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setSaved(true)
    setHasChanges(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    setSettings(DEFAULTS)
    localStorage.removeItem(STORAGE_KEY)
    setHasChanges(false)
    setSaved(false)
  }

  return (
    <Page>
      <Header>
        <PageTitle>Settings</PageTitle>
        {saved && <SavedBadge>✓ Settings saved</SavedBadge>}
      </Header>

      {/* Playback */}
      <SectionCard>
        <CardTitle>Playback</CardTitle>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Video Quality</SettingLabel>
            <SettingSubText>Default streaming quality for all content</SettingSubText>
          </SettingInfo>
          <Select value={settings.quality} onChange={(e) => set('quality', e.target.value)}>
            <option value="auto">Auto (Recommended)</option>
            <option value="4k">4K UHD</option>
            <option value="1080p">Full HD 1080p</option>
            <option value="720p">HD 720p</option>
            <option value="480p">SD 480p</option>
          </Select>
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Autoplay Next Episode</SettingLabel>
            <SettingSubText>Automatically play the next episode in a series</SettingSubText>
          </SettingInfo>
          <Toggle $on={settings.autoplay} onClick={() => set('autoplay', !settings.autoplay)}>
            <ToggleKnob $on={settings.autoplay} />
          </Toggle>
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Subtitle Language</SettingLabel>
            <SettingSubText>Default language for subtitles</SettingSubText>
          </SettingInfo>
          <Select value={settings.subtitleLang} onChange={(e) => set('subtitleLang', e.target.value)}>
            <option value="off">Off</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </Select>
        </SettingRow>
      </SectionCard>

      {/* Notifications */}
      <SectionCard>
        <CardTitle>Notifications</CardTitle>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>New Releases</SettingLabel>
            <SettingSubText>Get notified when new content is added to your genres</SettingSubText>
          </SettingInfo>
          <Toggle $on={settings.newReleaseNotifs} onClick={() => set('newReleaseNotifs', !settings.newReleaseNotifs)}>
            <ToggleKnob $on={settings.newReleaseNotifs} />
          </Toggle>
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Email Notifications</SettingLabel>
            <SettingSubText>Receive updates and recommendations at {user?.email}</SettingSubText>
          </SettingInfo>
          <Toggle $on={settings.emailNotifs} onClick={() => set('emailNotifs', !settings.emailNotifs)}>
            <ToggleKnob $on={settings.emailNotifs} />
          </Toggle>
        </SettingRow>
      </SectionCard>

      {/* Appearance */}
      <SectionCard>
        <CardTitle>Appearance</CardTitle>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Theme</SettingLabel>
            <SettingSubText>FluxStream always uses Dark mode for the best viewing experience</SettingSubText>
          </SettingInfo>
          <ThemeChip>🌙 Dark Mode</ThemeChip>
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Sidebar</SettingLabel>
            <SettingSubText>Use the ‹ button on the sidebar to collapse it</SettingSubText>
          </SettingInfo>
          <SettingValue>Collapsible</SettingValue>
        </SettingRow>
      </SectionCard>

      {/* Platform admin only */}
      {isAdmin && (
        <SectionCard>
          <CardTitle>Platform Administration</CardTitle>
          <SettingRow>
            <SettingInfo>
              <SettingLabel>Debug Mode</SettingLabel>
              <SettingSubText>Show GraphQL query timings and cache info in the console</SettingSubText>
            </SettingInfo>
            <Toggle $on={settings.debugMode} onClick={() => set('debugMode', !settings.debugMode)}>
              <ToggleKnob $on={settings.debugMode} />
            </Toggle>
          </SettingRow>
          <SettingRow>
            <SettingInfo>
              <SettingLabel>Maintenance Banner</SettingLabel>
              <SettingSubText>Show a maintenance notice to all users</SettingSubText>
            </SettingInfo>
            <Toggle $on={settings.maintenanceBanner} onClick={() => set('maintenanceBanner', !settings.maintenanceBanner)}>
              <ToggleKnob $on={settings.maintenanceBanner} />
            </Toggle>
          </SettingRow>
        </SectionCard>
      )}

      <SaveRow>
        <ResetBtn onClick={handleReset}>Reset to Defaults</ResetBtn>
        <SaveBtn onClick={handleSave} $hasChanges={hasChanges}>
          {hasChanges ? 'Save Changes' : 'Save Settings'}
        </SaveBtn>
      </SaveRow>
    </Page>
  )
}

const Page = styled.div`max-width: 720px; display: flex; flex-direction: column; gap: 1.5rem;`

const Header = styled.div`display: flex; align-items: center; gap: 1rem;`

const PageTitle = styled.h1`font-size: 1.75rem; font-weight: 800; color: #fff; margin: 0;`

const SavedBadge = styled.span`
  background: rgba(34,197,94,0.15); border: 1px solid #22C55E44;
  color: #22C55E; font-size: 0.8125rem; font-weight: 700;
  padding: 3px 10px; border-radius: 20px;
`

const SectionCard = styled.div`
  background: #141929; border: 1px solid #1E2640; border-radius: 16px; padding: 1.5rem 1.75rem;
`

const CardTitle = styled.h2`font-size: 1rem; font-weight: 700; color: #CBD5E1; margin: 0 0 1.25rem;`

const SettingRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.5rem; padding: 0.875rem 0;
  border-bottom: 1px solid #1E2640; &:last-child { border-bottom: none; }
`

const SettingInfo = styled.div`flex: 1; min-width: 0;`
const SettingLabel = styled.div`font-size: 0.9rem; font-weight: 600; color: #CBD5E1;`
const SettingSubText = styled.div`font-size: 0.8rem; color: #475569; margin-top: 0.2rem;`
const SettingValue = styled.div`font-size: 0.875rem; color: #64748B;`

const Select = styled.select`
  padding: 0.4375rem 0.75rem; background: #0A0E1A; border: 1px solid #1E2640;
  border-radius: 8px; color: #CBD5E1; font-size: 0.875rem; cursor: pointer;
  outline: none; flex-shrink: 0;
  &:focus { border-color: #7C3AED; }
`

const Toggle = styled.div<{ $on: boolean }>`
  width: 44px; height: 24px; border-radius: 12px;
  background: ${(p) => p.$on ? '#7C3AED' : '#1E2640'};
  cursor: pointer; position: relative; flex-shrink: 0; transition: background 0.2s;
`

const ToggleKnob = styled.div<{ $on: boolean }>`
  position: absolute; top: 3px;
  left: ${(p) => p.$on ? '23px' : '3px'};
  width: 18px; height: 18px; border-radius: 50%; background: #fff;
  transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.4);
`

const ThemeChip = styled.div`
  background: rgba(124,58,237,0.15); border: 1px solid #7C3AED44;
  color: #9D5FF5; font-size: 0.8125rem; font-weight: 600;
  padding: 4px 12px; border-radius: 20px;
`

const SaveRow = styled.div`display: flex; justify-content: flex-end; gap: 0.75rem;`

const ResetBtn = styled.button`
  padding: 0.625rem 1.25rem; background: transparent; border: 1px solid #334155;
  border-radius: 10px; color: #64748B; font-size: 0.875rem; cursor: pointer;
  &:hover { border-color: #64748B; color: #fff; }
`

const SaveBtn = styled.button<{ $hasChanges: boolean }>`
  padding: 0.625rem 1.75rem;
  background: ${p => p.$hasChanges ? '#F97316' : '#7C3AED'};
  border: none; border-radius: 10px; color: #fff;
  font-size: 0.9375rem; font-weight: 700; cursor: pointer;
  transition: background 0.2s;
  &:hover { opacity: 0.9; }
`
