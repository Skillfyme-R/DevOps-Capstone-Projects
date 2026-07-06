import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gql, useQuery, useMutation, useApolloClient } from '@apollo/client'
import styled from 'styled-components'

const CONTENT_QUERY = gql`
  query ContentDetail($slug: String!) {
    content(slug: $slug) {
      id title slug description contentType status
      thumbnailUrl bannerUrl masterPlaylistUrl
      durationSeconds avgRating viewCount genres subtitles
      studio { id name slug }
      episodes {
        id title seasonNumber episodeNumber durationSeconds thumbnailUrl
      }
    }
  }
`

const ADD_WATCHLIST = gql`
  mutation AddToWatchlist($contentId: ID!) {
    addToWatchlist(contentId: $contentId)
  }
`

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function ContentDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const apolloClient = useApolloClient()
  const [watchlisted, setWatchlisted] = useState(false)

  const { data, loading } = useQuery(CONTENT_QUERY, {
    variables: { slug },
    skip: !slug,
  })

  const [addToWatchlist] = useMutation(ADD_WATCHLIST)

  const content = data?.content

  const handleWatchlist = async () => {
    if (!content) return
    await addToWatchlist({ variables: { contentId: content.id } })
    setWatchlisted(true)
    apolloClient.cache.evict({ fieldName: 'myWatchlist' })
    apolloClient.cache.gc()
  }

  if (loading) return <LoadingShell />

  if (!content) return (
    <NotFound>
      <span>404</span>
      <p>Content not found</p>
      <BackBtn onClick={() => navigate('/catalog')}>← Back to Catalog</BackBtn>
    </NotFound>
  )

  const groupedEpisodes = content.episodes?.reduce((acc: any, ep: any) => {
    const key = `Season ${ep.seasonNumber}`
    if (!acc[key]) acc[key] = []
    acc[key].push(ep)
    return acc
  }, {})

  return (
    <Page>
      {/* Banner */}
      <Banner style={{ backgroundImage: `url(${content.bannerUrl || content.thumbnailUrl})` }}>
        <BannerGradient />
        <BannerContent>
          <BackBtn onClick={() => navigate(-1)}>← Back</BackBtn>
          <TypeBadge>{content.contentType}</TypeBadge>
          <BannerTitle>{content.title}</BannerTitle>
          <BannerMeta>
            {content.durationSeconds && <MetaChip>{formatDuration(content.durationSeconds)}</MetaChip>}
            {content.avgRating && <MetaChip>★ {content.avgRating.toFixed(1)}</MetaChip>}
            {content.viewCount && <MetaChip>{content.viewCount.toLocaleString()} views</MetaChip>}
          </BannerMeta>
          <BannerGenres>{content.genres?.join(' · ')}</BannerGenres>
          <BannerActions>
            <PlayBtn onClick={() => navigate(`/watch/${content.id}`)}>▶ Play Now</PlayBtn>
            <WatchlistBtn $added={watchlisted} onClick={handleWatchlist} disabled={watchlisted}>
              {watchlisted ? '✓ Added' : '+ Watchlist'}
            </WatchlistBtn>
            {content.studio && (
              <StudioLink onClick={() => navigate(`/studio`)}>
                By {content.studio.name}
              </StudioLink>
            )}
          </BannerActions>
        </BannerContent>
      </Banner>

      <Body>
        {/* Description */}
        {content.description && (
          <Section>
            <SectionTitle>About</SectionTitle>
            <Description>{content.description}</Description>
          </Section>
        )}

        {/* Episodes */}
        {content.episodes?.length > 0 && (
          <Section>
            <SectionTitle>Episodes</SectionTitle>
            {Object.entries(groupedEpisodes || {}).map(([season, eps]: [string, any]) => (
              <SeasonGroup key={season}>
                <SeasonLabel>{season}</SeasonLabel>
                <EpisodeGrid>
                  {eps.map((ep: any) => (
                    <EpisodeCard
                      key={ep.id}
                      onClick={() => navigate(`/watch/${content.id}/episode/${ep.id}`)}
                    >
                      <EpThumb
                        src={ep.thumbnailUrl || content.thumbnailUrl}
                        alt={ep.title}
                      />
                      <EpInfo>
                        <EpNum>E{ep.episodeNumber}</EpNum>
                        <EpTitle>{ep.title}</EpTitle>
                        {ep.durationSeconds && <EpDur>{formatDuration(ep.durationSeconds)}</EpDur>}
                      </EpInfo>
                      <PlayOverlay>▶</PlayOverlay>
                    </EpisodeCard>
                  ))}
                </EpisodeGrid>
              </SeasonGroup>
            ))}
          </Section>
        )}
      </Body>
    </Page>
  )
}

const Page = styled.div`
  margin: -1.5rem -2rem;
  display: flex;
  flex-direction: column;
`

const Banner = styled.div`
  position: relative;
  min-height: 520px;
  background-size: cover;
  background-position: center top;
  display: flex;
  align-items: flex-end;
`

const BannerGradient = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    #0A0E1A 20%,
    rgba(10,14,26,0.6) 60%,
    rgba(10,14,26,0.2) 100%
  );
`

const BannerContent = styled.div`
  position: relative;
  padding: 2rem 2.5rem 2.5rem;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`

const BackBtn = styled.button`
  background: none;
  border: none;
  color: #94A3B8;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  width: fit-content;
  margin-bottom: 0.5rem;
  &:hover { color: #fff; }
`

const TypeBadge = styled.span`
  display: inline-block;
  background: rgb(124 58 237 / 0.3);
  border: 1px solid #7C3AED;
  color: #9D5FF5;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
`

const BannerTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  line-height: 1.15;
  letter-spacing: -0.02em;
`

const BannerMeta = styled.div`display: flex; gap: 0.5rem; flex-wrap: wrap;`

const MetaChip = styled.span`
  background: rgb(255 255 255 / 0.1);
  color: #CBD5E1;
  font-size: 0.8125rem;
  padding: 2px 8px;
  border-radius: 4px;
`

const BannerGenres = styled.div`font-size: 0.875rem; color: #94A3B8;`

const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
`

const PlayBtn = styled.button`
  padding: 0.75rem 1.75rem;
  background: #7C3AED;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: #9D5FF5; }
`

const WatchlistBtn = styled.button<{ $added: boolean }>`
  padding: 0.75rem 1.25rem;
  background: ${(p) => p.$added ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.1)'};
  border: 1px solid ${(p) => p.$added ? '#22C55E' : 'rgba(255,255,255,0.2)'};
  border-radius: 9px;
  color: ${(p) => p.$added ? '#22C55E' : '#fff'};
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: ${(p) => p.$added ? 'default' : 'pointer'};
  backdrop-filter: blur(8px);
`

const StudioLink = styled.button`
  background: none;
  border: none;
  color: #7C3AED;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  &:hover { color: #9D5FF5; }
`

const Body = styled.div`padding: 2rem 2.5rem 3rem; display: flex; flex-direction: column; gap: 2rem;`

const Section = styled.section``

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 1rem;
`

const Description = styled.p`
  font-size: 0.9375rem;
  color: #94A3B8;
  line-height: 1.7;
  max-width: 720px;
`

const SeasonGroup = styled.div`margin-bottom: 1.5rem;`

const SeasonLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 700;
  color: #7C3AED;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.75rem;
`

const EpisodeGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`

const EpisodeCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 10px;
  padding: 0.625rem;
  cursor: pointer;
  position: relative;
  transition: border-color 0.15s;
  &:hover { border-color: #7C3AED; }
  &:hover > div:last-child { opacity: 1; }
`

const EpThumb = styled.img`
  width: 120px;
  aspect-ratio: 16/9;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
`

const EpInfo = styled.div`flex: 1;`
const EpNum = styled.div`font-size: 0.75rem; color: #7C3AED; font-weight: 700; margin-bottom: 0.25rem;`
const EpTitle = styled.div`font-size: 0.9rem; color: #fff; font-weight: 600;`
const EpDur = styled.div`font-size: 0.8rem; color: #64748B; margin-top: 0.25rem;`

const PlayOverlay = styled.div`
  opacity: 0;
  transition: opacity 0.15s;
  font-size: 1.5rem;
  color: #7C3AED;
  padding-right: 0.5rem;
`

const LoadingShell = styled.div`
  background: linear-gradient(90deg, #0A0E1A 25%, #141929 50%, #0A0E1A 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite;
  min-height: 520px;
  border-radius: 0;
  margin: -1.5rem -2rem;
`

const NotFound = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 0.5rem;
  span { font-size: 3rem; font-weight: 800; color: #7C3AED; }
  p { color: #64748B; font-size: 1rem; }
`
