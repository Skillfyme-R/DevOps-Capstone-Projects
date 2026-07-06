import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gql, useMutation } from '@apollo/client'
import styled from 'styled-components'

const CONTENT_TYPES = ['MOVIE', 'SERIES', 'SHORT', 'DOCUMENTARY', 'LIVE']
const GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Documentary', 'Sci-Fi', 'Horror', 'Romance', 'Animation', 'Crime']

const CREATE_CONTENT = gql`
  mutation CreateContent(
    $studioId: ID!, $title: String!, $description: String,
    $contentType: String!, $genres: [String], $thumbnailUrl: String
  ) {
    createContent(
      studioId: $studioId, title: $title, description: $description,
      contentType: $contentType, genres: $genres, thumbnailUrl: $thumbnailUrl
    ) {
      id title slug
    }
  }
`

const PUBLISH_CONTENT = gql`
  mutation PublishContent($id: ID!) {
    publishContent(id: $id) { id title status }
  }
`

export default function StudioUpload() {
  const { studioId } = useParams<{ studioId: string }>()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState('MOVIE')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [createContent] = useMutation(CREATE_CONTENT, { errorPolicy: 'all' })
  const [publishContent] = useMutation(PUBLISH_CONTENT, { errorPolicy: 'all' })

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  const handleThumb = (file: File) => {
    setThumbFile(file)
    const url = URL.createObjectURL(file)
    setThumbPreview(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setSubmitError('Please enter a title for the content.')
      return
    }
    if (!studioId) {
      setSubmitError('Studio not found. Please go back and try again.')
      return
    }
    setSubmitError('')
    setUploading(true)
    setProgress(0)

    // Simulate file upload progress (real upload would use S3/MinIO presigned URL)
    const steps = videoFile ? 8 : 3
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 120))
      setProgress(Math.round((i / steps) * 80))
    }

    // Create content record in DB
    const { data: createData, errors: createErrors } = await createContent({
      variables: {
        studioId,
        title: title.trim(),
        description: description.trim() || null,
        contentType: contentType.toLowerCase(),
        genres: selectedGenres.length > 0 ? selectedGenres : null,
        thumbnailUrl: thumbPreview || null,
      },
    })

    if (createErrors?.length || !createData?.createContent) {
      setUploading(false)
      setProgress(0)
      setSubmitError(createErrors?.[0]?.message ?? 'Failed to create content')
      return
    }

    setProgress(90)

    // Publish immediately
    const contentId = createData.createContent.id
    const { errors: pubErrors } = await publishContent({ variables: { id: contentId } })

    if (pubErrors?.length) {
      setUploading(false)
      setProgress(0)
      setSubmitError(pubErrors[0].message)
      return
    }

    setProgress(100)
    setUploading(false)
    setDone(true)
  }

  if (done) {
    return (
      <Page>
        <SuccessCard>
          <SuccessIcon>🎉</SuccessIcon>
          <SuccessTitle>Upload Complete!</SuccessTitle>
          <SuccessText>
            <strong>{title}</strong> has been submitted for processing.
            It will appear in your content library once transcoding is complete (usually 5–15 minutes).
          </SuccessText>
          <SuccessActions>
            <BackBtn onClick={() => navigate(`/studio/${studioId}/content`)}>
              View Content Library
            </BackBtn>
            <AnotherBtn onClick={() => { setDone(false); setTitle(''); setVideoFile(null); setThumbPreview(null); setProgress(0) }}>
              Upload Another
            </AnotherBtn>
          </SuccessActions>
        </SuccessCard>
      </Page>
    )
  }

  return (
    <Page>
      <Header>
        <BackBtn2 onClick={() => navigate(`/studio/${studioId}/content`)}>← Content Library</BackBtn2>
        <PageTitle>Upload Content</PageTitle>
      </Header>

      <Form onSubmit={handleSubmit}>
        <FormGrid>
          {/* Left column */}
          <LeftCol>
            <FieldGroup>
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title"
                required
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the content…"
                rows={4}
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Content Type *</Label>
              <TypeGrid>
                {CONTENT_TYPES.map((t) => (
                  <TypeChip
                    key={t}
                    type="button"
                    $active={contentType === t}
                    onClick={() => setContentType(t)}
                  >
                    {t}
                  </TypeChip>
                ))}
              </TypeGrid>
            </FieldGroup>

            <FieldGroup>
              <Label>Genres</Label>
              <GenreGrid>
                {GENRES.map((g) => (
                  <GenreChip
                    key={g}
                    type="button"
                    $active={selectedGenres.includes(g)}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </GenreChip>
                ))}
              </GenreGrid>
            </FieldGroup>
          </LeftCol>

          {/* Right column */}
          <RightCol>
            {/* Video upload */}
            <FieldGroup>
              <Label>Video File *</Label>
              <DropZone
                $hasFile={!!videoFile}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) setVideoFile(f)
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
                />
                {videoFile ? (
                  <>
                    <DropIcon>✓</DropIcon>
                    <DropText>{videoFile.name}</DropText>
                    <DropSubText>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</DropSubText>
                  </>
                ) : (
                  <>
                    <DropIcon>📁</DropIcon>
                    <DropText>Drop video file here</DropText>
                    <DropSubText>or click to browse · MP4, MOV, MKV</DropSubText>
                  </>
                )}
              </DropZone>
            </FieldGroup>

            {/* Thumbnail */}
            <FieldGroup>
              <Label>Thumbnail</Label>
              <ThumbDropZone
                onClick={() => thumbRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) handleThumb(f)
                }}
                style={thumbPreview ? { backgroundImage: `url(${thumbPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                <input
                  ref={thumbRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleThumb(e.target.files[0])}
                />
                {!thumbPreview && (
                  <>
                    <DropIcon style={{ fontSize: '1.5rem' }}>🖼️</DropIcon>
                    <DropText style={{ fontSize: '0.8125rem' }}>Add Thumbnail</DropText>
                  </>
                )}
              </ThumbDropZone>
            </FieldGroup>
          </RightCol>
        </FormGrid>

        {uploading && (
          <ProgressSection>
            <ProgressLabel>Uploading… {progress}%</ProgressLabel>
            <ProgressTrack>
              <ProgressFill style={{ width: `${progress}%` }} />
            </ProgressTrack>
          </ProgressSection>
        )}

        {submitError && <ErrorMsg>{submitError}</ErrorMsg>}

        <FormFooter>
          <CancelBtn type="button" onClick={() => navigate(`/studio/${studioId}/content`)}>
            Cancel
          </CancelBtn>
          <SubmitBtn type="submit" disabled={!title || uploading}>
            {uploading ? `Uploading… ${progress}%` : 'Upload & Publish'}
          </SubmitBtn>
        </FormFooter>
      </Form>
    </Page>
  )
}

const Page = styled.div`display: flex; flex-direction: column; gap: 1.5rem;`

const Header = styled.div`display: flex; align-items: center; gap: 1rem;`

const BackBtn2 = styled.button`
  background: none; border: none; color: #64748B; font-size: 0.875rem; cursor: pointer; padding: 0;
  &:hover { color: #fff; }
  white-space: nowrap;
`

const PageTitle = styled.h1`font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0;`

const Form = styled.form`display: flex; flex-direction: column; gap: 1.5rem;`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`

const LeftCol = styled.div`display: flex; flex-direction: column; gap: 1.25rem;`
const RightCol = styled.div`display: flex; flex-direction: column; gap: 1.25rem;`

const FieldGroup = styled.div`display: flex; flex-direction: column; gap: 0.5rem;`

const Label = styled.label`font-size: 0.875rem; font-weight: 600; color: #94A3B8;`

const Input = styled.input`
  padding: 0.625rem 0.875rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 9px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  &:focus { border-color: #7C3AED; }
  &::placeholder { color: #475569; }
`

const Textarea = styled.textarea`
  padding: 0.625rem 0.875rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 9px;
  color: #fff;
  font-size: 0.9rem;
  resize: vertical;
  outline: none;
  font-family: inherit;
  &:focus { border-color: #7C3AED; }
  &::placeholder { color: #475569; }
`

const TypeGrid = styled.div`display: flex; flex-wrap: wrap; gap: 0.5rem;`

const TypeChip = styled.button<{ $active: boolean }>`
  padding: 0.375rem 0.875rem;
  background: ${(p) => p.$active ? '#7C3AED' : '#141929'};
  border: 1px solid ${(p) => p.$active ? '#7C3AED' : '#1E2640'};
  border-radius: 7px;
  color: ${(p) => p.$active ? '#fff' : '#64748B'};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
`

const GenreGrid = styled.div`display: flex; flex-wrap: wrap; gap: 0.4rem;`

const GenreChip = styled.button<{ $active: boolean }>`
  padding: 0.25rem 0.75rem;
  background: ${(p) => p.$active ? 'rgba(124,58,237,0.2)' : 'transparent'};
  border: 1px solid ${(p) => p.$active ? '#7C3AED' : '#1E2640'};
  border-radius: 20px;
  color: ${(p) => p.$active ? '#9D5FF5' : '#64748B'};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #7C3AED; color: #9D5FF5; }
`

const DropZone = styled.div<{ $hasFile: boolean }>`
  border: 2px dashed ${(p) => p.$hasFile ? '#22C55E' : '#1E2640'};
  border-radius: 12px;
  padding: 2.5rem 1rem;
  text-align: center;
  cursor: pointer;
  background: ${(p) => p.$hasFile ? 'rgba(34,197,94,0.05)' : '#141929'};
  transition: border-color 0.15s, background 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  &:hover { border-color: ${(p) => p.$hasFile ? '#22C55E' : '#7C3AED'}; }
`

const DropIcon = styled.div`font-size: 2rem;`
const DropText = styled.div`font-size: 0.9375rem; color: #CBD5E1; font-weight: 600;`
const DropSubText = styled.div`font-size: 0.8rem; color: #475569;`

const ThumbDropZone = styled.div`
  border: 2px dashed #1E2640;
  border-radius: 12px;
  aspect-ratio: 16/9;
  cursor: pointer;
  background: #141929;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  transition: border-color 0.15s;
  &:hover { border-color: #7C3AED; }
`

const ProgressSection = styled.div`display: flex; flex-direction: column; gap: 0.5rem;`
const ProgressLabel = styled.div`font-size: 0.875rem; color: #94A3B8;`
const ProgressTrack = styled.div`background: #1E2640; border-radius: 4px; height: 8px; overflow: hidden;`
const ProgressFill = styled.div`height: 100%; background: linear-gradient(90deg, #7C3AED, #F97316); border-radius: 4px; transition: width 0.2s;`

const ErrorMsg = styled.div`
  padding: 0.75rem 1rem; background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3); border-radius: 8px;
  color: #EF4444; font-size: 0.875rem;
`
const FormFooter = styled.div`display: flex; justify-content: flex-end; gap: 0.75rem;`

const CancelBtn = styled.button`
  padding: 0.625rem 1.25rem;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 9px;
  color: #94A3B8;
  font-size: 0.9rem;
  cursor: pointer;
  &:hover { border-color: #64748B; color: #fff; }
`

const SubmitBtn = styled.button`
  padding: 0.625rem 1.75rem;
  background: #F97316;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: #EA6C0A; }
  &:disabled { opacity: 0.4; cursor: default; }
`

const SuccessCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #141929;
  border: 1px solid #22C55E44;
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  gap: 1rem;
  max-width: 520px;
  margin: 2rem auto;
`

const SuccessIcon = styled.div`font-size: 3.5rem;`
const SuccessTitle = styled.h2`font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0;`
const SuccessText = styled.p`font-size: 0.9375rem; color: #94A3B8; line-height: 1.65;`
const SuccessActions = styled.div`display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem;`

const BackBtn = styled.button`
  padding: 0.625rem 1.25rem;
  background: #7C3AED;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: #6D28D9; }
`

const AnotherBtn = styled.button`
  padding: 0.625rem 1.25rem;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 9px;
  color: #94A3B8;
  font-size: 0.9rem;
  cursor: pointer;
  &:hover { border-color: #7C3AED; color: #9D5FF5; }
`
