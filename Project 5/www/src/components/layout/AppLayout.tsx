import React from 'react'
import { Outlet } from 'react-router-dom'
import styled from 'styled-components'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function AppLayout() {
  return (
    <LayoutRoot>
      <Sidebar />
      <MainArea>
        <TopNav />
        <Content>
          <Outlet />
        </Content>
      </MainArea>
    </LayoutRoot>
  )
}

const LayoutRoot = styled.div`
  display: flex;
  min-height: 100vh;
  background: #0A0E1A;
`

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Content = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  @media (max-width: 768px) { padding: 1rem; }
`
