import React, { useState } from 'react'
import { gql, useLazyQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import ContentCard from './ContentCard'
import ContentCardSkeleton from './ContentCardSkeleton'

const SEARCH_QUERY = gql`
  query SearchContent($query: String!, $limit: Int) {
    searchContent(query: $query, limit: $limit) {
      id title slug thumbnailUrl contentType durationSeconds avgRating viewCount
      genres studio { id name slug }
    }
  }
`

export default function SearchPage() {
  const [term, setTerm] = useState('')
  const navigate = useNavigate()

  const [search, { data, loading, called }] = useLazyQuery(SEARCH_QUERY)

  const results = data?.searchContent ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (term.trim()) search({ variables: { query: term.trim(), limit: 40 } })
  }

  return (
    <Page>
      <PageTitle>Search</PageTitle>

      <SearchForm onSubmit={handleSubmit}>
        <SearchInput
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search movies, series, documentaries…"
          autoFocus
        />
        <SearchBtn type="submit" disabled={!term.trim()}>Search</SearchBtn>
      </SearchForm>

      {loading && (
        <Grid>
          {Array.from({ length: 12 }, (_, i) => <ContentCardSkeleton key={i} />)}
        </Grid>
      )}

      {!loading && called && results.length === 0 && (
        <Empty>
          <EmptyIcon>🔍</EmptyIcon>
          <EmptyText>No results for "{term}"</EmptyText>
          <EmptySubText>Try different keywords or browse the catalog</EmptySubText>
        </Empty>
      )}

      {!loading && results.length > 0 && (
        <>
          <ResultsLabel>{results.length} result{results.length !== 1 ? 's' : ''} for "{term}"</ResultsLabel>
          <Grid>
            {results.map((c: any) => (
              <ContentCard key={c.id} content={c} onClick={() => navigate(`/catalog/${c.slug}`)} />
            ))}
          </Grid>
        </>
      )}

      {!called && (
        <Hint>
          <HintIcon>🎬</HintIcon>
          <HintText>Search the entire FluxStream catalog</HintText>
        </Hint>
      )}
    </Page>
  )
}

const Page = styled.div`display: flex; flex-direction: column; gap: 1.5rem;`

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
`

const SearchForm = styled.form`
  display: flex;
  gap: 0.75rem;
`

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: #7C3AED; }
  &::placeholder { color: #475569; }
`

const SearchBtn = styled.button`
  padding: 0.75rem 1.75rem;
  background: #7C3AED;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: #6D28D9; }
  &:disabled { opacity: 0.4; cursor: default; }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
`

const ResultsLabel = styled.div`
  font-size: 0.875rem;
  color: #64748B;
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
const EmptySubText = styled.div`font-size: 0.875rem; color: #64748B;`

const Hint = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;
  text-align: center;
`

const HintIcon = styled.div`font-size: 3rem; margin-bottom: 1rem; opacity: 0.4;`
const HintText = styled.div`font-size: 1rem; color: #475569;`
