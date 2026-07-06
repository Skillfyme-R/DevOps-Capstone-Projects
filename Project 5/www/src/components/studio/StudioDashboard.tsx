import React from 'react'
import { gql, useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useAuth } from '../../contexts/AuthContext'

const MY_STUDIOS_QUERY = gql`
  query MyStudios {
    myStudios {
      id name slug description logoUrl status verified
    }
  }
`

export default function StudioDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading } = useQuery(MY_STUDIOS_QUERY)

  const studios = data?.myStudios ?? []

  return (
    <Page>
      <Header>
        <div>
          <PageTitle>My Studio</PageTitle>
          <PageSubtitle>Manage your content, uploads, and analytics</PageSubtitle>
        </div>
        <CreateBtn onClick={() => {}}>+ Create Studio</CreateBtn>
      </Header>

      {loading && (
        <Grid>
          {[0, 1].map((i) => <StudioSkeleton key={i} />)}
        </Grid>
      )}

      {!loading && studios.length === 0 && (
        <EmptyState>
          <EmptyIcon>🎬</EmptyIcon>
          <EmptyTitle>No studios yet</EmptyTitle>
          <EmptySubText>
            Create a studio to start uploading and publishing content on FluxStream.
          </EmptySubText>
          <CreateBtn onClick={() => {}}>+ Create Your First Studio</CreateBtn>
        </EmptyState>
      )}

      {!loading && studios.length > 0 && (
        <Grid>
          {studios.map((studio: any) => (
            <StudioCard key={studio.id}>
              <StudioCardHeader>
                {studio.logoUrl ? (
                  <StudioLogo src={studio.logoUrl} alt={studio.name} />
                ) : (
                  <StudioLogoPlaceholder>
                    {studio.name[0].toUpperCase()}
                  </StudioLogoPlaceholder>
                )}
                <StudioMeta>
                  <StudioName>{studio.name}</StudioName>
                  <StudioSlug>@{studio.slug}</StudioSlug>
                </StudioMeta>
                {studio.verified && <VerifiedBadge title="Verified Studio">✓</VerifiedBadge>}
              </StudioCardHeader>

              {studio.description && (
                <StudioDesc>{studio.description}</StudioDesc>
              )}

              <StatusRow>
                <StatusBadge $status={studio.status}>{studio.status}</StatusBadge>
              </StatusRow>

              <CardActions>
                <ActionBtn
                  $primary
                  onClick={() => navigate(`/studio/${studio.id}/content`)}
                >
                  Content Library
                </ActionBtn>
                <ActionBtn
                  onClick={() => navigate(`/studio/${studio.id}/upload`)}
                >
                  Upload
                </ActionBtn>
              </CardActions>
            </StudioCard>
          ))}
        </Grid>
      )}

      {/* Quick stats placeholder */}
      <StatsSection>
        <SectionTitle>Platform Overview</SectionTitle>
        <StatsGrid>
          {[
            { label: 'Total Uploads', value: '—', icon: '📹' },
            { label: 'Total Views', value: '—', icon: '👁' },
            { label: 'Avg Rating', value: '—', icon: '★' },
            { label: 'Revenue', value: '—', icon: '💰' },
          ].map((stat) => (
            <StatCard key={stat.label}>
              <StatIcon>{stat.icon}</StatIcon>
              <StatValue>{stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsGrid>
      </StatsSection>
    </Page>
  )
}

const Page = styled.div`display: flex; flex-direction: column; gap: 2rem;`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 0.25rem;
`

const PageSubtitle = styled.p`
  font-size: 0.9rem;
  color: #64748B;
  margin: 0;
`

const CreateBtn = styled.button`
  padding: 0.625rem 1.25rem;
  background: #7C3AED;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:hover { background: #6D28D9; }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
`

const StudioCard = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  transition: border-color 0.15s;
  &:hover { border-color: #7C3AED44; }
`

const StudioCardHeader = styled.div`display: flex; align-items: center; gap: 0.875rem;`

const StudioLogo = styled.img`
  width: 48px; height: 48px; border-radius: 10px; object-fit: cover;
`

const StudioLogoPlaceholder = styled.div`
  width: 48px; height: 48px; border-radius: 10px;
  background: linear-gradient(135deg, #7C3AED, #F97316);
  color: #fff; font-size: 1.25rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
`

const StudioMeta = styled.div`flex: 1; min-width: 0;`
const StudioName = styled.div`font-size: 1rem; font-weight: 700; color: #fff;`
const StudioSlug = styled.div`font-size: 0.8125rem; color: #64748B;`

const VerifiedBadge = styled.div`
  width: 22px; height: 22px; border-radius: 50%;
  background: #22C55E22; border: 1px solid #22C55E44;
  color: #22C55E; font-size: 0.75rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
`

const StudioDesc = styled.p`font-size: 0.875rem; color: #94A3B8; margin: 0; line-height: 1.5;`

const StatusRow = styled.div``

const StatusBadge = styled.span<{ $status: string }>`
  background: ${(p) =>
    p.$status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' :
    p.$status === 'PENDING' ? 'rgba(245,158,11,0.1)' :
    'rgba(239,68,68,0.1)'};
  color: ${(p) =>
    p.$status === 'ACTIVE' ? '#22C55E' :
    p.$status === 'PENDING' ? '#F59E0B' :
    '#EF4444'};
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
`

const CardActions = styled.div`display: flex; gap: 0.625rem;`

const ActionBtn = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 0.5rem 0;
  background: ${(p) => p.$primary ? '#7C3AED' : 'transparent'};
  border: 1px solid ${(p) => p.$primary ? '#7C3AED' : '#334155'};
  border-radius: 8px;
  color: ${(p) => p.$primary ? '#fff' : '#94A3B8'};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${(p) => p.$primary ? '#6D28D9' : 'rgba(255,255,255,0.05)'};
    border-color: ${(p) => p.$primary ? '#6D28D9' : '#7C3AED'};
    color: #fff;
  }
`

const StudioSkeleton = styled.div`
  height: 220px;
  background: linear-gradient(90deg, #0A0E1A 25%, #141929 50%, #0A0E1A 75%);
  border-radius: 16px;
  animation: shimmer 1.4s infinite;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 16px;
  text-align: center;
  gap: 0.75rem;
`

const EmptyIcon = styled.div`font-size: 3rem;`
const EmptyTitle = styled.div`font-size: 1.25rem; font-weight: 700; color: #fff;`
const EmptySubText = styled.div`font-size: 0.875rem; color: #64748B; max-width: 420px; margin-bottom: 0.5rem;`

const StatsSection = styled.section``
const SectionTitle = styled.h2`font-size: 1.125rem; font-weight: 700; color: #CBD5E1; margin: 0 0 1rem;`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
`

const StatCard = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
`

const StatIcon = styled.div`font-size: 1.5rem;`
const StatValue = styled.div`font-size: 1.75rem; font-weight: 800; color: #fff;`
const StatLabel = styled.div`font-size: 0.8rem; color: #64748B;`
