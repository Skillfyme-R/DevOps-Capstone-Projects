import React, { useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import styled from 'styled-components'

const ALL_ISSUES = gql`
  query AllIssues {
    allIssues(limit: 100) {
      id subject description status priority insertedAt updatedAt
    }
  }
`

const UPDATE_STATUS = gql`
  mutation UpdateIssueStatus($id: ID!, $status: String!) {
    updateIssueStatus(id: $id, status: $status) {
      id subject status priority
    }
  }
`

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#F59E0B',
  RESOLVED: '#22C55E',
  CLOSED: '#475569',
  WONT_FIX: '#EF4444',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#64748B',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WONT_FIX'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED', 'WONT_FIX'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  WONT_FIX: [],
}

export default function AdminTicketsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('ALL')

  const { data, loading, refetch } = useQuery(ALL_ISSUES, { fetchPolicy: 'network-only' })
  const [updateStatus, { loading: updating }] = useMutation(UPDATE_STATUS)

  const allIssues: any[] = data?.allIssues ?? []

  const filtered = filterStatus === 'ALL'
    ? allIssues
    : allIssues.filter((i) => i.status === filterStatus)

  const counts = allIssues.reduce((acc: any, i: any) => {
    acc[i.status] = (acc[i.status] || 0) + 1
    return acc
  }, {})

  const handleStatusChange = async (id: string, status: string) => {
    await updateStatus({ variables: { id, status } })
    refetch()
  }

  return (
    <Page>
      <Header>
        <PageTitle>Support Tickets</PageTitle>
        <RefreshBtn onClick={() => refetch()}>↻ Refresh</RefreshBtn>
      </Header>

      <StatsRow>
        {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
          <StatCard key={s} $color={STATUS_COLOR[s]} $active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? 'ALL' : s)}>
            <StatCount>{counts[s] || 0}</StatCount>
            <StatLabel>{s.replace('_', ' ')}</StatLabel>
          </StatCard>
        ))}
      </StatsRow>

      <FilterRow>
        <FilterLabel>Filter:</FilterLabel>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
          <FilterChip key={s} $active={filterStatus === s} onClick={() => setFilterStatus(s)}>
            {s.replace('_', ' ')}
          </FilterChip>
        ))}
      </FilterRow>

      {loading && <Skeleton />}

      {!loading && filtered.length === 0 && (
        <Empty>
          <EmptyIcon>🎫</EmptyIcon>
          <EmptyText>{filterStatus === 'ALL' ? 'No tickets yet.' : `No ${filterStatus.replace('_', ' ').toLowerCase()} tickets.`}</EmptyText>
        </Empty>
      )}

      {!loading && filtered.map((issue: any) => (
        <TicketCard key={issue.id} $status={issue.status}>
          <TicketTop onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}>
            <TicketLeft>
              <TicketSubject>{issue.subject}</TicketSubject>
              <TicketMeta>
                #{issue.id.slice(0, 8)} · {new Date(issue.insertedAt).toLocaleString()}
              </TicketMeta>
            </TicketLeft>
            <TicketRight>
              <PriorityBadge $color={PRIORITY_COLOR[issue.priority] ?? '#64748B'}>
                {issue.priority}
              </PriorityBadge>
              <StatusBadge $color={STATUS_COLOR[issue.status] ?? '#64748B'}>
                {issue.status?.replace('_', ' ')}
              </StatusBadge>
              <ChevronIcon $open={expandedId === issue.id}>▼</ChevronIcon>
            </TicketRight>
          </TicketTop>

          {expandedId === issue.id && (
            <TicketExpanded>
              <DescLabel>Description</DescLabel>
              <DescText>{issue.description}</DescText>

              {(STATUS_TRANSITIONS[issue.status] ?? []).length > 0 && (
                <ActionRow>
                  <ActionLabel>Update Status:</ActionLabel>
                  {(STATUS_TRANSITIONS[issue.status] ?? []).map((s) => (
                    <ActionBtn
                      key={s}
                      $color={STATUS_COLOR[s]}
                      disabled={updating}
                      onClick={() => handleStatusChange(issue.id, s)}
                    >
                      → {s.replace('_', ' ')}
                    </ActionBtn>
                  ))}
                </ActionRow>
              )}
            </TicketExpanded>
          )}
        </TicketCard>
      ))}
    </Page>
  )
}

const Page = styled.div`display: flex; flex-direction: column; gap: 1.25rem; max-width: 900px;`

const Header = styled.div`display: flex; align-items: center; justify-content: space-between;`

const PageTitle = styled.h1`font-size: 1.75rem; font-weight: 800; color: #fff; margin: 0;`

const RefreshBtn = styled.button`
  padding: 0.5rem 1rem; background: transparent; border: 1px solid #334155;
  border-radius: 8px; color: #94A3B8; font-size: 0.875rem; cursor: pointer;
  &:hover { border-color: #7C3AED; color: #fff; }
`

const StatsRow = styled.div`display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;`

const StatCard = styled.div<{ $color: string; $active: boolean }>`
  background: ${(p) => p.$active ? `${p.$color}22` : '#141929'};
  border: 1px solid ${(p) => p.$active ? p.$color : '#1E2640'};
  border-radius: 12px; padding: 1rem; cursor: pointer; text-align: center;
  transition: all 0.15s;
  &:hover { border-color: ${(p) => p.$color}; }
`
const StatCount = styled.div`font-size: 1.75rem; font-weight: 800; color: #fff;`
const StatLabel = styled.div`font-size: 0.75rem; font-weight: 600; color: #64748B; margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;`

const FilterRow = styled.div`display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;`
const FilterLabel = styled.span`font-size: 0.8rem; color: #64748B; font-weight: 600;`
const FilterChip = styled.button<{ $active: boolean }>`
  padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer;
  background: ${(p) => p.$active ? '#7C3AED' : 'transparent'};
  border: 1px solid ${(p) => p.$active ? '#7C3AED' : '#1E2640'};
  color: ${(p) => p.$active ? '#fff' : '#64748B'};
  &:hover { border-color: #7C3AED; color: #fff; }
`

const Skeleton = styled.div`height: 80px; background: linear-gradient(90deg, #0A0E1A 25%, #141929 50%, #0A0E1A 75%); border-radius: 12px; animation: shimmer 1.4s infinite;`

const Empty = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem; background: #141929; border: 1px solid #1E2640; border-radius: 16px; gap: 0.75rem;
`
const EmptyIcon = styled.div`font-size: 2.5rem;`
const EmptyText = styled.div`color: #475569; font-size: 0.9375rem;`

const TicketCard = styled.div<{ $status: string }>`
  background: #141929;
  border: 1px solid ${(p) => p.$status === 'OPEN' ? '#3B82F633' : '#1E2640'};
  border-radius: 12px; overflow: hidden;
  transition: border-color 0.15s;
  &:hover { border-color: #7C3AED44; }
`

const TicketTop = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; cursor: pointer; gap: 1rem;
`
const TicketLeft = styled.div`flex: 1; min-width: 0;`
const TicketSubject = styled.div`font-size: 0.9375rem; font-weight: 700; color: #fff;`
const TicketMeta = styled.div`font-size: 0.75rem; color: #475569; margin-top: 0.2rem;`
const TicketRight = styled.div`display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;`
const ChevronIcon = styled.span<{ $open: boolean }>`
  color: #475569; font-size: 0.7rem; margin-left: 0.25rem;
  transform: ${(p) => p.$open ? 'rotate(180deg)' : 'rotate(0)'};
  transition: transform 0.15s;
`

const Badge = styled.span<{ $color: string }>`
  background: ${(p) => p.$color}22; color: ${(p) => p.$color};
  border: 1px solid ${(p) => p.$color}44;
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  padding: 2px 8px; border-radius: 4px;
`
const StatusBadge = styled(Badge)``
const PriorityBadge = styled(Badge)``

const TicketExpanded = styled.div`
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid #1E2640;
  margin-top: 0;
  display: flex; flex-direction: column; gap: 1rem;
`
const DescLabel = styled.div`font-size: 0.8rem; font-weight: 600; color: #64748B; margin-top: 0.75rem;`
const DescText = styled.div`font-size: 0.9rem; color: #CBD5E1; line-height: 1.6;`

const ActionRow = styled.div`display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;`
const ActionLabel = styled.div`font-size: 0.8rem; font-weight: 600; color: #64748B;`
const ActionBtn = styled.button<{ $color: string }>`
  padding: 0.375rem 0.875rem; border-radius: 7px; font-size: 0.8rem; font-weight: 700; cursor: pointer;
  background: ${(p) => p.$color}22; border: 1px solid ${(p) => p.$color}55; color: ${(p) => p.$color};
  &:hover { background: ${(p) => p.$color}44; }
  &:disabled { opacity: 0.5; cursor: default; }
`
