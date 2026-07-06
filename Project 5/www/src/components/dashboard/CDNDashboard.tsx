import React from 'react'
import { gql, useQuery } from '@apollo/client'
import styled from 'styled-components'

const CDN_QUERY = gql`
  query CDNDashboard {
    cdnNodes {
      id name region country city provider status
      popCode capacityGbps currentLoadPct activeStreams lastHealthCheck
    }
    platformCapacity {
      totalCapacityGbps avgLoadPct totalActiveStreams nodeCount
    }
  }
`

const STATUS_COLOR: Record<string, string> = {
  HEALTHY: '#10B981',
  DEGRADED: '#F59E0B',
  DRAINING: '#F97316',
  OFFLINE: '#EF4444',
  PROVISIONING: '#3B82F6',
}

export default function CDNDashboard() {
  const { data, loading } = useQuery(CDN_QUERY, { pollInterval: 30_000 })
  const nodes = data?.cdnNodes ?? []
  const capacity = data?.platformCapacity

  return (
    <Page>
      <Header>
        <Title>🌐 CDN Network</Title>
        <Subtitle>Global edge node status and capacity</Subtitle>
      </Header>

      {capacity && (
        <MetricGrid>
          <MetricCard>
            <MetricValue>{capacity.nodeCount}</MetricValue>
            <MetricLabel>Active Nodes</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{capacity.totalCapacityGbps?.toFixed(0)} Gbps</MetricValue>
            <MetricLabel>Total Capacity</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{capacity.avgLoadPct?.toFixed(1)}%</MetricValue>
            <MetricLabel>Avg Load</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{capacity.totalActiveStreams?.toLocaleString()}</MetricValue>
            <MetricLabel>Active Streams</MetricLabel>
          </MetricCard>
        </MetricGrid>
      )}

      <NodeList>
        {loading
          ? Array.from({ length: 6 }, (_, i) => <NodeSkeleton key={i} className="skeleton" />)
          : nodes.map((node: any) => (
              <NodeCard key={node.id}>
                <NodeHeader>
                  <NodeName>{node.name}</NodeName>
                  <StatusBadge $color={STATUS_COLOR[node.status] || '#64748B'}>
                    {node.status}
                  </StatusBadge>
                </NodeHeader>
                <NodeMeta>
                  <span>📍 {node.city}, {node.country}</span>
                  <span>🏷️ {node.popCode}</span>
                  <span>☁️ {node.provider}</span>
                </NodeMeta>
                <LoadBar>
                  <LoadLabel>Load: {node.currentLoadPct?.toFixed(1)}%</LoadLabel>
                  <LoadTrack>
                    <LoadFill
                      $pct={node.currentLoadPct || 0}
                      $color={node.currentLoadPct > 80 ? '#EF4444' : node.currentLoadPct > 60 ? '#F59E0B' : '#10B981'}
                    />
                  </LoadTrack>
                </LoadBar>
                <NodeFooter>
                  <span>Capacity: {node.capacityGbps} Gbps</span>
                  <span>Streams: {node.activeStreams?.toLocaleString()}</span>
                </NodeFooter>
              </NodeCard>
            ))}
      </NodeList>
    </Page>
  )
}

const Page = styled.div`display: flex; flex-direction: column; gap: 1.5rem;`
const Header = styled.div``
const Title = styled.h1`font-size: 1.5rem; font-weight: 800; color: #fff;`
const Subtitle = styled.p`color: #64748B; font-size: 0.875rem; margin-top: 0.25rem;`

const MetricGrid = styled.div`display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;`

const MetricCard = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  padding: 1.25rem;
`
const MetricValue = styled.div`font-size: 1.75rem; font-weight: 800; color: #fff;`
const MetricLabel = styled.div`font-size: 0.8rem; color: #64748B; margin-top: 0.25rem;`

const NodeList = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;`

const NodeCard = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const NodeHeader = styled.div`display: flex; justify-content: space-between; align-items: center;`
const NodeName = styled.div`font-size: 0.9rem; font-weight: 600; color: #fff;`

const StatusBadge = styled.span<{ $color: string }>`
  background: ${(p) => p.$color}22;
  color: ${(p) => p.$color};
  border: 1px solid ${(p) => p.$color}44;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
`

const NodeMeta = styled.div`display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.75rem; color: #64748B;`

const LoadBar = styled.div``
const LoadLabel = styled.div`font-size: 0.75rem; color: #94A3B8; margin-bottom: 0.375rem;`
const LoadTrack = styled.div`background: #0A0E1A; border-radius: 4px; height: 6px; overflow: hidden;`
const LoadFill = styled.div<{ $pct: number; $color: string }>`
  width: ${(p) => Math.min(p.$pct, 100)}%;
  height: 100%;
  background: ${(p) => p.$color};
  border-radius: 4px;
  transition: width 0.3s ease;
`

const NodeFooter = styled.div`display: flex; justify-content: space-between; font-size: 0.75rem; color: #475569;`

const NodeSkeleton = styled.div`height: 160px; border-radius: 12px;`
