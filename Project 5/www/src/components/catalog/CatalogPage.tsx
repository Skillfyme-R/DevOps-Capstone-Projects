import React, { useState, useEffect } from 'react'
import { gql, useQuery, useLazyQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import ContentCard from './ContentCard'
import ContentCardSkeleton from './ContentCardSkeleton'

const CATALOG_QUERY = gql`
  query Catalog {
    featuredContent(limit: 5) {
      id title slug thumbnailUrl bannerUrl contentType durationSeconds avgRating viewCount
      genres studio { id name slug }
    }
    contents(orderBy: "popular", limit: 24) {
      id title slug thumbnailUrl contentType durationSeconds avgRating viewCount
      genres studio { id name slug }
    }
  }
`

const GENRE_QUERY = gql`
  query ContentByGenre($genre: String!) {
    contents(genre: $genre, limit: 20) {
      id title slug thumbnailUrl contentType durationSeconds avgRating viewCount
      genres studio { id name slug }
    }
  }
`

const GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Documentary', 'Sci-Fi', 'Horror', 'Romance', 'Animation', 'Crime']

export default function CatalogPage() {
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const navigate = useNavigate()

  const { data, loading } = useQuery(CATALOG_QUERY, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  })

  const [fetchGenre, { data: genreData, loading: genreLoading }] = useLazyQuery(GENRE_QUERY, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  })

  useEffect(() => {
    if (activeGenre) {
      fetchGenre({ variables: { genre: activeGenre } })
    }
  }, [activeGenre, fetchGenre])

  const featured = data?.featuredContent ?? []
  const trending = data?.contents ?? []
  const genreContent = genreData?.contents ?? []

  const heroItem = featured[0]

  return (
    <Page>
      {/* Hero Banner */}
      {heroItem && (
        <Hero
          style={{ backgroundImage: `url(${heroItem.bannerUrl || heroItem.thumbnailUrl})` }}
          onClick={() => navigate(`/catalog/${heroItem.slug}`)}
        >
          <HeroGradient />
          <HeroContent>
            <HeroMeta>
              <Badge>{heroItem.contentType}</Badge>
              {heroItem.avgRating && <Rating>★ {heroItem.avgRating.toFixed(1)}</Rating>}
            </HeroMeta>
            <HeroTitle>{heroItem.title}</HeroTitle>
            <HeroGenres>{heroItem.genres?.slice(0, 3).join(' · ')}</HeroGenres>
            <HeroActions>
              <PlayBtn onClick={(e) => { e.stopPropagation(); navigate(`/watch/${heroItem.id}`) }}>
                ▶ Watch Now
              </PlayBtn>
              <InfoBtn onClick={(e) => { e.stopPropagation(); navigate(`/catalog/${heroItem.slug}`) }}>
                ℹ More Info
              </InfoBtn>
            </HeroActions>
          </HeroContent>
        </Hero>
      )}

      {/* Genre Filter */}
      <GenreBar>
        <GenreChip $active={!activeGenre} onClick={() => setActiveGenre(null)}>All</GenreChip>
        {GENRES.map((g) => (
          <GenreChip key={g} $active={activeGenre === g} onClick={() => setActiveGenre(g)}>{g}</GenreChip>
        ))}
      </GenreBar>

      {/* Trending */}
      {!activeGenre && (
        <Section>
          <SectionTitle>🔥 Trending Now</SectionTitle>
          <Grid>
            {loading
              ? Array.from({ length: 8 }, (_, i) => <ContentCardSkeleton key={i} />)
              : trending.map((c: any) => (
                  <ContentCard key={c.id} content={c} onClick={() => navigate(`/catalog/${c.slug}`)} />
                ))}
          </Grid>
        </Section>
      )}

      {/* Genre results */}
      {activeGenre && (
        <Section>
          <SectionTitle>🎭 {activeGenre}</SectionTitle>
          <Grid>
            {genreLoading
              ? Array.from({ length: 8 }, (_, i) => <ContentCardSkeleton key={i} />)
              : genreContent.map((c: any) => (
                  <ContentCard key={c.id} content={c} onClick={() => navigate(`/catalog/${c.slug}`)} />
                ))}
            {!genreLoading && genreContent.length === 0 && (
              <Empty>No {activeGenre} content available yet.</Empty>
            )}
          </Grid>
        </Section>
      )}

      {/* Featured row (excluding hero) */}
      {!activeGenre && featured.length > 1 && (
        <Section>
          <SectionTitle>⭐ Featured</SectionTitle>
          <Grid>
            {featured.slice(1).map((c: any) => (
              <ContentCard key={c.id} content={c} onClick={() => navigate(`/catalog/${c.slug}`)} />
            ))}
          </Grid>
        </Section>
      )}
    </Page>
  )
}

const Page = styled.div`display: flex; flex-direction: column; gap: 2rem;`

const Hero = styled.div`
  position: relative;
  height: 460px;
  border-radius: 16px;
  background-size: cover;
  background-position: center top;
  overflow: hidden;
  cursor: pointer;
`

const HeroGradient = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(10,14,26,0.95) 30%, rgba(10,14,26,0.3) 70%, transparent);
`

const HeroContent = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 2.5rem;
  max-width: 55%;
`

const HeroMeta = styled.div`display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;`

const Badge = styled.span`
  background: rgb(124 58 237 / 0.3);
  border: 1px solid #7C3AED;
  color: #9D5FF5;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 4px;
`

const Rating = styled.span`color: #FCD34D; font-size: 0.875rem; font-weight: 600;`

const HeroTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
`

const HeroGenres = styled.p`color: #94A3B8; font-size: 0.875rem; margin-bottom: 1.5rem;`

const HeroActions = styled.div`display: flex; gap: 0.75rem;`

const PlayBtn = styled.button`
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover { background: #9D5FF5; }
`

const InfoBtn = styled.button`
  background: rgb(255 255 255 / 0.15);
  backdrop-filter: blur(8px);
  color: #fff;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover { background: rgb(255 255 255 / 0.25); }
`

const GenreBar = styled.div`display: flex; gap: 0.5rem; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 0.25rem; -ms-overflow-style: none; scrollbar-width: none; &::-webkit-scrollbar { display: none; }`

const GenreChip = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? '#7C3AED' : '#141929')};
  color: ${(p) => (p.$active ? '#fff' : '#94A3B8')};
  border: 1px solid ${(p) => (p.$active ? '#7C3AED' : '#1E2640')};
  border-radius: 20px;
  padding: 0.375rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  &:hover { border-color: #7C3AED; color: #fff; }
`

const Section = styled.section``
const SectionTitle = styled.h2`font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1rem;`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
`

const Empty = styled.p`color: #64748B; font-size: 0.9rem; grid-column: 1 / -1; padding: 2rem 0; text-align: center;`
