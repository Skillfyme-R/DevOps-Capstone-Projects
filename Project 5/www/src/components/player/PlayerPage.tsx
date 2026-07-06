import React, { useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gql, useQuery, useMutation } from '@apollo/client'
import styled from 'styled-components'

const DEMO_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js'

const STREAM_QUERY = gql`
  query StreamContent($id: ID!) {
    content(id: $id) {
      id title contentType masterPlaylistUrl durationSeconds
      studio { name }
      episodes { id title seasonNumber episodeNumber durationSeconds masterPlaylistUrl }
    }
  }
`

const RECORD_VIEW_MUTATION = gql`
  mutation RecordView($contentId: ID!, $watchedSeconds: Int!, $lastPosition: Int!, $completed: Boolean, $sessionId: String) {
    recordView(contentId: $contentId, watchedSeconds: $watchedSeconds, lastPosition: $lastPosition, completed: $completed, sessionId: $sessionId)
  }
`

function loadHlsScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any
    if (w.Hls) { resolve(w.Hls); return }
    const existing = document.querySelector(`script[src="${HLS_CDN}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(w.Hls))
      return
    }
    const script = document.createElement('script')
    script.src = HLS_CDN
    script.onload = () => resolve(w.Hls)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function PlayerPage() {
  const { contentId, episodeId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  const sessionId = useRef(crypto.randomUUID())
  const lastRecordedRef = useRef(0)

  const { data, loading } = useQuery(STREAM_QUERY, {
    variables: { id: contentId },
    skip: !contentId,
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  })

  const [recordView] = useMutation(RECORD_VIEW_MUTATION, { errorPolicy: 'all' })

  const content = data?.content
  const currentEpisode = episodeId
    ? content?.episodes?.find((e: any) => e.id === episodeId)
    : null

  const streamUrl =
    currentEpisode?.masterPlaylistUrl ||
    content?.masterPlaylistUrl ||
    DEMO_STREAM

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Safari — native HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl
      video.play().catch(() => {})
      return
    }

    // Chrome/Firefox — load hls.js from CDN then attach
    loadHlsScript().then((Hls) => {
      if (!Hls || !Hls.isSupported()) {
        video.src = streamUrl
        video.play().catch(() => {})
        return
      }
      const hls = new Hls({ enableWorker: false, debug: false })
      hlsRef.current = hls
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
      })
    }).catch(() => {
      video.src = streamUrl
      video.play().catch(() => {})
    })

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [streamUrl])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || !contentId) return
    const t = video.currentTime
    if (t - lastRecordedRef.current >= 30) {
      lastRecordedRef.current = t
      recordView({ variables: { contentId, watchedSeconds: Math.floor(t), lastPosition: Math.floor(t), sessionId: sessionId.current } })
    }
  }, [contentId, recordView])

  const handleEnded = useCallback(() => {
    const video = videoRef.current
    if (!video || !contentId) return
    recordView({ variables: { contentId, watchedSeconds: Math.floor(video.currentTime), lastPosition: Math.floor(video.currentTime), completed: true, sessionId: sessionId.current } })
  }, [contentId, recordView])

  if (loading) return <PlayerSkeleton />

  return (
    <PlayerRoot>
      <PlayerWrapper>
        <Video
          ref={videoRef}
          controls
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      </PlayerWrapper>

      <PlayerInfo>
        <BackBtn onClick={() => navigate(-1)}>← Back</BackBtn>
        <TitleSection>
          <ContentTitle>{content?.title ?? 'Loading…'}</ContentTitle>
          {currentEpisode && (
            <EpisodeLabel>S{currentEpisode.seasonNumber} · E{currentEpisode.episodeNumber} — {currentEpisode.title}</EpisodeLabel>
          )}
          {content?.studio?.name && <StudioName>by {content.studio.name}</StudioName>}
        </TitleSection>

        {content?.episodes?.length > 0 && (
          <EpisodesPanel>
            <EpisodesPanelTitle>Episodes</EpisodesPanelTitle>
            <EpisodeList>
              {content.episodes.map((ep: any) => (
                <EpisodeItem key={ep.id} $active={ep.id === episodeId}
                  onClick={() => navigate(`/watch/${contentId}/episode/${ep.id}`)}>
                  <EpNum>S{ep.seasonNumber}E{ep.episodeNumber}</EpNum>
                  <EpTitle>{ep.title}</EpTitle>
                </EpisodeItem>
              ))}
            </EpisodeList>
          </EpisodesPanel>
        )}
      </PlayerInfo>
    </PlayerRoot>
  )
}

const PlayerRoot = styled.div`display: flex; flex-direction: column; gap: 1.5rem; margin: -1.5rem -2rem;`
const PlayerWrapper = styled.div`background: #000; width: 100%; aspect-ratio: 16/9;`
const Video = styled.video`width: 100%; height: 100%; display: block; background: #000;`
const PlayerInfo = styled.div`padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1rem;`
const BackBtn = styled.button`background: none; border: none; color: #94A3B8; font-size: 0.875rem; cursor: pointer; padding: 0; width: fit-content; &:hover { color: #fff; }`
const TitleSection = styled.div``
const ContentTitle = styled.h1`font-size: 1.75rem; font-weight: 800; color: #fff; letter-spacing: -0.02em;`
const EpisodeLabel = styled.p`color: #9D5FF5; font-size: 0.875rem; font-weight: 600; margin-top: 0.25rem;`
const StudioName = styled.p`color: #64748B; font-size: 0.8125rem; margin-top: 0.25rem;`
const EpisodesPanel = styled.div``
const EpisodesPanelTitle = styled.h3`font-size: 0.9rem; font-weight: 700; color: #CBD5E1; margin-bottom: 0.75rem;`
const EpisodeList = styled.div`display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto;`
const EpisodeItem = styled.div<{ $active: boolean }>`display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.875rem; border-radius: 8px; background: ${p => p.$active ? 'rgb(124 58 237 / 0.2)' : '#141929'}; border: 1px solid ${p => p.$active ? '#7C3AED' : '#1E2640'}; cursor: pointer; transition: border-color 0.15s; &:hover { border-color: #7C3AED; }`
const EpNum = styled.span`font-size: 0.75rem; font-weight: 700; color: #7C3AED; white-space: nowrap;`
const EpTitle = styled.span`font-size: 0.8125rem; color: #CBD5E1;`
const PlayerSkeleton = styled.div`background: linear-gradient(90deg, #0A0E1A 25%, #141929 50%, #0A0E1A 75%); background-size: 400px 100%; animation: shimmer 1.4s infinite; aspect-ratio: 16/9; width: 100%; margin: -1.5rem -2rem 0; @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }`
