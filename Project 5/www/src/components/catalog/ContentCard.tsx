import React from 'react'
import styled from 'styled-components'

interface ContentCardProps {
  content: {
    id: string
    title: string
    thumbnailUrl?: string
    contentType: string
    durationSeconds?: number
    avgRating?: number
    viewCount?: number
    genres?: string[]
    studio?: { name: string }
  }
  onClick: () => void
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatViews(count?: number): string {
  if (!count) return ''
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`
  return `${count}`
}

export default function ContentCard({ content, onClick }: ContentCardProps) {
  return (
    <Card className="content-card" onClick={onClick}>
      <Thumbnail>
        {content.thumbnailUrl ? (
          <img src={content.thumbnailUrl} alt={content.title} loading="lazy" />
        ) : (
          <ThumbnailPlaceholder>🎬</ThumbnailPlaceholder>
        )}
        <TypeBadge>{content.contentType}</TypeBadge>
        {content.durationSeconds && <Duration>{formatDuration(content.durationSeconds)}</Duration>}
        <PlayOverlay>▶</PlayOverlay>
      </Thumbnail>
      <Info>
        <Title title={content.title}>{content.title}</Title>
        <Meta>
          {content.studio && <StudioName>{content.studio.name}</StudioName>}
          <Stats>
            {content.avgRating && <span>★ {content.avgRating.toFixed(1)}</span>}
            {content.viewCount && content.viewCount > 0 && <span>{formatViews(content.viewCount)} views</span>}
          </Stats>
        </Meta>
        {content.genres && content.genres.length > 0 && (
          <Genres>{content.genres.slice(0, 2).join(' · ')}</Genres>
        )}
      </Info>
    </Card>
  )
}

const Card = styled.div`
  background: #141929;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #1E2640;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-3px) scale(1.02);
    border-color: #7C3AED;
    box-shadow: 0 8px 24px rgb(124 58 237 / 0.25);
  }
`

const Thumbnail = styled.div`
  position: relative;
  aspect-ratio: 16/9;
  background: #0A0E1A;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`

const ThumbnailPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  background: #1E2640;
`

const TypeBadge = styled.span`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: rgb(10 14 26 / 0.85);
  backdrop-filter: blur(4px);
  color: #9D5FF5;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgb(124 58 237 / 0.4);
`

const Duration = styled.span`
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgb(10 14 26 / 0.85);
  color: #CBD5E1;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
`

const PlayOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgb(124 58 237 / 0.0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: transparent;
  transition: all 0.2s ease;
  ${Card}:hover & {
    background: rgb(124 58 237 / 0.2);
    color: #fff;
  }
`

const Info = styled.div`padding: 0.75rem;`
const Title = styled.h3`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.div`display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;`
const StudioName = styled.span`font-size: 0.7rem; color: #7C3AED; font-weight: 500;`
const Stats = styled.div`display: flex; gap: 0.5rem; font-size: 0.7rem; color: #64748B;`
const Genres = styled.div`font-size: 0.7rem; color: #475569;`
