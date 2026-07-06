import React from 'react'
import styled from 'styled-components'

export default function ContentCardSkeleton() {
  return (
    <Card>
      <SkeletonThumb className="skeleton" />
      <Info>
        <SkeletonText $width="85%" className="skeleton" />
        <SkeletonText $width="55%" $height="10px" className="skeleton" />
      </Info>
    </Card>
  )
}

const Card = styled.div`
  background: #141929;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #1E2640;
`
const SkeletonThumb = styled.div`
  aspect-ratio: 16/9;
  width: 100%;
`
const Info = styled.div`padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;`
const SkeletonText = styled.div<{ $width?: string; $height?: string }>`
  height: ${(p) => p.$height || '12px'};
  width: ${(p) => p.$width || '100%'};
  border-radius: 4px;
`
