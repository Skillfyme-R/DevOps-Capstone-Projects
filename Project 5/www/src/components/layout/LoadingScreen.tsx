import React from 'react'
import styled, { keyframes } from 'styled-components'

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.95); }
`

export default function LoadingScreen() {
  return (
    <Wrapper>
      <Logo>⚡</Logo>
      <Name>FluxStream</Name>
      <Spinner />
    </Wrapper>
  )
}

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0A0E1A;
  gap: 0.75rem;
`

const Logo = styled.div`
  font-size: 3rem;
  animation: ${pulse} 1.5s ease-in-out infinite;
`

const Name = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Spinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid #1E2640;
  border-top-color: #7C3AED;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  margin-top: 0.5rem;
`
