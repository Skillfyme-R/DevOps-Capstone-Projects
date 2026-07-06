import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import styled from 'styled-components'

const STUDIO_CONTENTS_QUERY = gql`
  query StudioContents($studioId: ID!) {
    studioContents(studioId: $studioId) {
      id title slug contentType status thumbnailUrl
      durationSeconds avgRating viewCount genres
    }
  }
`

const STATUS_COLOR: Record<string, string> = {
  published: '#22C55E',
  PUBLISHED: '#22C55E',
  draft: '#F59E0B',
  DRAFT: '#F59E0B',
  processing: '#3B82F6',
  PROCESSING: '#3B82F6',
  archived: '#475569',
  ARCHIVED: '#475569',
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function StudioContentList() {
  const { studioId } = useParams<{ studioId: string }>()
  const navigate = useNavigate()

  const { data, loading } = useQuery(STUDIO_CONTENTS_QUERY, {
    variables: { studioId },
    skip: !studioId,
  })

  const contents = data?.studioContents ?? []

  return (
    <Page>
      <Header>
        <BackBtn onClick={() => navigate('/studio')}>← Studio</BackBtn>
        <PageTitle>Content Library</PageTitle>
        <UploadBtn onClick={() => navigate(`/studio/${studioId}/upload`)}>
          + Upload Content
        </UploadBtn>
      </Header>

      {loading && (
        <TableWrap>
          {Array.from({ length: 5 }, (_, i) => <RowSkeleton key={i} />)}
        </TableWrap>
      )}

      {!loading && contents.length === 0 && (
        <EmptyState>
          <EmptyIcon>📹</EmptyIcon>
          <EmptyTitle>No content yet</EmptyTitle>
          <EmptySubText>Upload your first video to start building your library.</EmptySubText>
          <UploadBtn onClick={() => navigate(`/studio/${studioId}/upload`)}>
            + Upload Your First Video
          </UploadBtn>
        </EmptyState>
      )}

      {!loading && contents.length > 0 && (
        <TableWrap>
          <TableHeader>
            <Col $flex={3}>Title</Col>
            <Col>Type</Col>
            <Col>Status</Col>
            <Col>Duration</Col>
            <Col>Views</Col>
            <Col>Rating</Col>
            <Col>Actions</Col>
          </TableHeader>

          {contents.map((c: any) => (
            <TableRow key={c.id}>
              <Col $flex={3} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Thumb
                  src={c.thumbnailUrl || `https://picsum.photos/seed/${c.id}/80/45`}
                  alt={c.title}
                />
                <ContentTitle>{c.title}</ContentTitle>
              </Col>
              <Col>
                <TypeBadge>{c.contentType}</TypeBadge>
              </Col>
              <Col>
                <StatusDot $color={STATUS_COLOR[c.status] ?? '#64748B'} />
                <StatusText>{c.status}</StatusText>
              </Col>
              <Col>{c.durationSeconds ? formatDuration(c.durationSeconds) : '—'}</Col>
              <Col>{c.viewCount?.toLocaleString() ?? '—'}</Col>
              <Col>{c.avgRating ? `★ ${c.avgRating.toFixed(1)}` : '—'}</Col>
              <Col style={{ display: 'flex', gap: '0.5rem' }}>
                <SmallBtn onClick={() => navigate(`/catalog/${c.slug}`)}>View</SmallBtn>
                <SmallBtn onClick={() => navigate(`/watch/${c.id}`)}>Play</SmallBtn>
              </Col>
            </TableRow>
          ))}
        </TableWrap>
      )}
    </Page>
  )
}

const Page = styled.div`display: flex; flex-direction: column; gap: 1.5rem;`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const BackBtn = styled.button`
  background: none;
  border: none;
  color: #64748B;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  &:hover { color: #fff; }
  white-space: nowrap;
`

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  flex: 1;
`

const UploadBtn = styled.button`
  padding: 0.5rem 1.25rem;
  background: #7C3AED;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: #6D28D9; }
`

const TableWrap = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 14px;
  overflow: hidden;
`

const TableHeader = styled.div`
  display: flex;
  padding: 0.75rem 1.25rem;
  background: #0A0E1A;
  border-bottom: 1px solid #1E2640;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const TableRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #1E2640;
  font-size: 0.875rem;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255,255,255,0.02); }
`

const Col = styled.div<{ $flex?: number }>`
  flex: ${(p) => p.$flex ?? 1};
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
`

const Thumb = styled.img`
  width: 60px;
  aspect-ratio: 16/9;
  object-fit: cover;
  border-radius: 5px;
  flex-shrink: 0;
`

const ContentTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #CBD5E1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TypeBadge = styled.span`
  background: rgba(124,58,237,0.15);
  color: #9D5FF5;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
`

const StatusDot = styled.span<{ $color: string }>`
  width: 7px; height: 7px; border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`

const StatusText = styled.span`font-size: 0.8rem; color: #94A3B8; text-transform: capitalize;`

const SmallBtn = styled.button`
  padding: 3px 10px;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #94A3B8;
  font-size: 0.75rem;
  cursor: pointer;
  &:hover { border-color: #7C3AED; color: #9D5FF5; }
`

const RowSkeleton = styled.div`
  height: 60px;
  margin: 2px 0;
  background: linear-gradient(90deg, #0A0E1A 25%, #141929 50%, #0A0E1A 75%);
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
const EmptyTitle = styled.div`font-size: 1.125rem; font-weight: 700; color: #fff;`
const EmptySubText = styled.div`font-size: 0.875rem; color: #64748B; margin-bottom: 0.5rem;`
