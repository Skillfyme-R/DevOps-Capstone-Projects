import React from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import ContentCardSkeleton from './ContentCardSkeleton'

const WATCHLIST_QUERY = gql`
  query MyWatchlist {
    myWatchlist {
      id
      content {
        id title slug thumbnailUrl contentType durationSeconds avgRating
      }
    }
  }
`

const REMOVE_MUTATION = gql`
  mutation RemoveFromWatchlist($contentId: ID!) {
    removeFromWatchlist(contentId: $contentId)
  }
`

export default function WatchlistPage() {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useQuery(WATCHLIST_QUERY, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  })
  const [remove] = useMutation(REMOVE_MUTATION)

  const items = data?.myWatchlist ?? []

  const handleRemove = async (contentId: string) => {
    await remove({ variables: { contentId } })
    refetch()
  }

  return (
    <Page>
      <Header>
        <PageTitle>My Watchlist</PageTitle>
        {items.length > 0 && <Count>{items.length} title{items.length !== 1 ? 's' : ''}</Count>}
      </Header>

      {loading && !data && (
        <Grid>
          {Array.from({ length: 8 }, (_, i) => <ContentCardSkeleton key={i} />)}
        </Grid>
      )}

      {!loading && items.length === 0 && !error && (
        <Empty>
          <EmptyIcon>🔖</EmptyIcon>
          <EmptyText>Your watchlist is empty</EmptyText>
          <EmptySubText>Browse the catalog and add titles to watch later</EmptySubText>
          <BrowseBtn onClick={() => navigate('/catalog')}>Browse Catalog</BrowseBtn>
        </Empty>
      )}

      {error && items.length === 0 && (
        <Empty>
          <EmptyIcon>⚠️</EmptyIcon>
          <EmptyText>Could not load watchlist</EmptyText>
          <EmptySubText>{error.message}</EmptySubText>
          <BrowseBtn onClick={() => refetch()}>Retry</BrowseBtn>
        </Empty>
      )}

      {!loading && items.length > 0 && (
        <Grid>
          {items.map((item: any) => {
            const c = item.content
            return (
              <Card key={item.id}>
                {c.thumbnailUrl ? (
                  <Thumb
                    src={c.thumbnailUrl}
                    alt={c.title}
                    onClick={() => navigate(`/catalog/${c.slug}`)}
                  />
                ) : (
                  <ThumbPlaceholder onClick={() => navigate(`/catalog/${c.slug}`)}>🎬</ThumbPlaceholder>
                )}
                <CardBody>
                  <CardTitle onClick={() => navigate(`/catalog/${c.slug}`)}>{c.title}</CardTitle>
                  <CardMeta>{c.contentType}{c.durationSeconds ? ` · ${Math.floor(c.durationSeconds / 60)}m` : ''}</CardMeta>
                  {c.avgRating && <Rating>★ {c.avgRating.toFixed(1)}</Rating>}
                  <CardActions>
                    <PlayBtn onClick={() => navigate(`/watch/${c.id}`)}>▶ Play</PlayBtn>
                    <RemoveBtn onClick={() => handleRemove(c.id)}>Remove</RemoveBtn>
                  </CardActions>
                </CardBody>
              </Card>
            )
          })}
        </Grid>
      )}
    </Page>
  )
}

const Page = styled.div`display: flex; flex-direction: column; gap: 1.5rem;`

const Header = styled.div`display: flex; align-items: baseline; gap: 1rem;`

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
`

const Count = styled.span`
  font-size: 0.9375rem;
  color: #64748B;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
`

const Card = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.15s;
  &:hover { border-color: #7C3AED44; transform: translateY(-2px); }
`

const Thumb = styled.img`
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  cursor: pointer;
  display: block;
`

const ThumbPlaceholder = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  background: #1E2640;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  cursor: pointer;
`

const CardBody = styled.div`padding: 0.875rem;`

const CardTitle = styled.div`
  font-size: 0.9375rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.25rem;
  cursor: pointer;
  &:hover { color: #9D5FF5; }
`

const CardMeta = styled.div`font-size: 0.8125rem; color: #64748B; margin-bottom: 0.375rem;`

const Rating = styled.div`
  font-size: 0.8125rem;
  color: #FCD34D;
  margin-bottom: 0.75rem;
`

const CardActions = styled.div`display: flex; gap: 0.5rem;`

const PlayBtn = styled.button`
  flex: 1;
  padding: 0.4375rem 0;
  background: #7C3AED;
  border: none;
  border-radius: 7px;
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: #6D28D9; }
`

const RemoveBtn = styled.button`
  padding: 0.4375rem 0.75rem;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 7px;
  color: #94A3B8;
  font-size: 0.8125rem;
  cursor: pointer;
  &:hover { border-color: #EF4444; color: #EF4444; }
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;
  text-align: center;
`

const EmptyIcon = styled.div`font-size: 3rem; margin-bottom: 1rem;`
const EmptyText = styled.div`font-size: 1.125rem; font-weight: 600; color: #fff; margin-bottom: 0.5rem;`
const EmptySubText = styled.div`font-size: 0.875rem; color: #64748B; margin-bottom: 1.5rem;`

const BrowseBtn = styled.button`
  padding: 0.625rem 1.5rem;
  background: #7C3AED;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: #6D28D9; }
`
