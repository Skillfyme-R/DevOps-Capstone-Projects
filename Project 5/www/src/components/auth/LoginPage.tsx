import React, { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { gql, useMutation } from '@apollo/client'
import { useAuth } from '../../contexts/AuthContext'
import styled from 'styled-components'

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id name email role avatarUrl
        account { id name slug tier }
        subscriptions { id status plan { id name slug } }
      }
    }
  }
`

const SOCIAL_LOGIN_MUTATION = gql`
  mutation SocialLogin($provider: String!, $name: String!, $email: String!) {
    socialLogin(provider: $provider, name: $name, email: $email) {
      token
      user {
        id name email role avatarUrl
        account { id name slug tier }
        subscriptions { id status plan { id name slug } }
      }
    }
  }
`

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [oauthProvider, setOauthProvider] = useState<'google' | 'github' | null>(null)
  const [oauthName, setOauthName] = useState('')
  const [oauthEmail, setOauthEmail] = useState('')
  const [oauthLoading, setOauthLoading] = useState(false)
  const [oauthFormError, setOauthFormError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION)
  const [socialLoginMutation] = useMutation(SOCIAL_LOGIN_MUTATION)

  const openOAuth = (provider: 'google' | 'github') => {
    setOauthProvider(provider)
    setOauthName('')
    setOauthEmail('')
    setOauthFormError('')
  }

  const handleOAuthConfirm = async () => {
    if (!oauthProvider) return
    if (!oauthName.trim() || !oauthEmail.trim()) {
      setOauthFormError('Please fill in your name and email.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(oauthEmail)) {
      setOauthFormError('Please enter a valid email address.')
      return
    }
    setOauthFormError('')
    setOauthLoading(true)
    try {
      const { data, errors } = await socialLoginMutation({
        variables: { provider: oauthProvider, name: oauthName.trim(), email: oauthEmail.trim() }
      })
      if (errors?.length) { setOauthFormError(errors[0].message); setOauthLoading(false); return }
      if (data?.socialLogin) {
        login(data.socialLogin.token, data.socialLogin.user)
        navigate('/catalog')
      }
    } catch (err: any) {
      setOauthFormError(err.message || 'Sign in failed. Please try again.')
      setOauthLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const { data, errors } = await loginMutation({ variables: { email, password } })

      if (errors?.length) {
        setError(errors[0].message)
        return
      }

      if (data?.login) {
        login(data.login.token, data.login.user)
        navigate('/catalog')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    }
  }

  return (
    <PageWrapper>
      <LogoArea>
        <LogoText>⚡ FluxStream</LogoText>
        <Tagline>Your Content. Infinite Scale.</Tagline>
      </LogoArea>

      <Card>
        <CardTitle>Sign in to FluxStream</CardTitle>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <Form onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </Field>

          <Field>
            <LabelRow>
              <Label htmlFor="password">Password</Label>
              <ForgotLink href="#">Forgot password?</ForgotLink>
            </LabelRow>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </Field>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </SubmitButton>
        </Form>

        <Divider><DividerText>or continue with</DividerText></Divider>

        <SocialRow>
          <SocialButton type="button" onClick={() => openOAuth('google')}>
            <GoogleIcon viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </GoogleIcon>
            Continue with Google
          </SocialButton>
          <SocialButton type="button" onClick={() => openOAuth('github')}>
            <GithubIcon viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </GithubIcon>
            Continue with GitHub
          </SocialButton>
        </SocialRow>

        {/* OAuth Consent Modal */}
        {oauthProvider && (
          <OAuthOverlay onClick={() => !oauthLoading && setOauthProvider(null)}>
            <OAuthModal $dark={oauthProvider === 'github'} onClick={e => e.stopPropagation()}>
              {oauthProvider === 'google' ? (
                <>
                  <OAuthHeader>
                    <GoogleIcon viewBox="0 0 24 24" style={{ width: 28, height: 28 }}>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </GoogleIcon>
                    <OAuthProviderName>Sign in with Google</OAuthProviderName>
                  </OAuthHeader>
                  <OAuthSubtitle>to continue to FluxStream</OAuthSubtitle>
                  <OAuthFields>
                    <OAuthFieldLabel>Full Name</OAuthFieldLabel>
                    <OAuthInput
                      type="text"
                      placeholder="Your full name"
                      value={oauthName}
                      onChange={e => setOauthName(e.target.value)}
                      autoFocus
                    />
                    <OAuthFieldLabel>Gmail Address</OAuthFieldLabel>
                    <OAuthInput
                      type="email"
                      placeholder="you@gmail.com"
                      value={oauthEmail}
                      onChange={e => setOauthEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleOAuthConfirm()}
                    />
                    {oauthFormError && <OAuthError>{oauthFormError}</OAuthError>}
                  </OAuthFields>
                  <OAuthPermissions>
                    <OAuthPermTitle>FluxStream will receive:</OAuthPermTitle>
                    <OAuthPerm>Your name and profile picture</OAuthPerm>
                    <OAuthPerm>Your email address</OAuthPerm>
                  </OAuthPermissions>
                  <OAuthActions>
                    <OAuthCancelBtn onClick={() => setOauthProvider(null)}>Cancel</OAuthCancelBtn>
                    <OAuthConfirmBtn $provider="google" onClick={handleOAuthConfirm} disabled={oauthLoading}>
                      {oauthLoading ? 'Signing in…' : 'Continue'}
                    </OAuthConfirmBtn>
                  </OAuthActions>
                </>
              ) : (
                <>
                  <OAuthHeader>
                    <GithubIcon viewBox="0 0 24 24" fill="#fff" style={{ width: 28, height: 28 }}>
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </GithubIcon>
                    <OAuthProviderName $dark>Authorize FluxStream</OAuthProviderName>
                  </OAuthHeader>
                  <OAuthSubtitle $dark>FluxStream by skillfyme wants to access your GitHub account</OAuthSubtitle>
                  <OAuthFields $dark>
                    <OAuthFieldLabel $dark>Username / Full Name</OAuthFieldLabel>
                    <OAuthInput
                      $dark
                      type="text"
                      placeholder="Your name"
                      value={oauthName}
                      onChange={e => setOauthName(e.target.value)}
                      autoFocus
                    />
                    <OAuthFieldLabel $dark>Email Address</OAuthFieldLabel>
                    <OAuthInput
                      $dark
                      type="email"
                      placeholder="you@example.com"
                      value={oauthEmail}
                      onChange={e => setOauthEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleOAuthConfirm()}
                    />
                    {oauthFormError && <OAuthError>{oauthFormError}</OAuthError>}
                  </OAuthFields>
                  <OAuthPermissions $dark>
                    <OAuthPermTitle $dark>FluxStream will be able to:</OAuthPermTitle>
                    <OAuthPerm $dark>Read your public profile</OAuthPerm>
                    <OAuthPerm $dark>Read your email address</OAuthPerm>
                  </OAuthPermissions>
                  <OAuthActions>
                    <OAuthCancelBtn onClick={() => setOauthProvider(null)}>Cancel</OAuthCancelBtn>
                    <OAuthConfirmBtn $provider="github" onClick={handleOAuthConfirm} disabled={oauthLoading}>
                      {oauthLoading ? 'Authorizing…' : 'Authorize FluxStream'}
                    </OAuthConfirmBtn>
                  </OAuthActions>
                </>
              )}
            </OAuthModal>
          </OAuthOverlay>
        )}

        <FooterText>
          Don't have an account?{' '}
          <Link to="/register">Create one — first 14 days free</Link>
        </FooterText>
      </Card>
    </PageWrapper>
  )
}

const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0A0E1A;
  padding: 2rem;
`

const LogoArea = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`

const LogoText = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
`

const Tagline = styled.p`
  color: #94A3B8;
  font-size: 0.875rem;
  margin-top: 0.25rem;
`

const Card = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
`

const CardTitle = styled.h2`
  font-size: 1.375rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1.5rem;
`

const ErrorBanner = styled.div`
  background: rgb(239 68 68 / 0.15);
  border: 1px solid rgb(239 68 68 / 0.4);
  color: #FCA5A5;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  margin-bottom: 1.25rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Field = styled.div`display: flex; flex-direction: column; gap: 0.375rem;`

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #CBD5E1;
`

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ForgotLink = styled.a`
  font-size: 0.8rem;
  color: #7C3AED;
  &:hover { color: #9D5FF5; }
`

const Input = styled.input`
  background: #0A0E1A;
  border: 1px solid #1E2640;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  color: #fff;
  font-size: 0.9375rem;
  transition: border-color 0.15s ease;
  &:focus { outline: none; border-color: #7C3AED; }
  &::placeholder { color: #475569; }
`

const SubmitButton = styled.button`
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.15s ease, transform 0.1s ease;
  &:hover:not(:disabled) { background: #9D5FF5; }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

const Divider = styled.div`
  position: relative;
  text-align: center;
  margin: 1.5rem 0;
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #1E2640;
  }
`

const DividerText = styled.span`
  position: relative;
  background: #141929;
  padding: 0 0.75rem;
  font-size: 0.8rem;
  color: #64748B;
`

const SocialRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`

const SocialButton = styled.button`
  background: #0A0E1A;
  border: 1px solid #1E2640;
  color: #CBD5E1;
  border-radius: 8px;
  padding: 0.625rem;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: border-color 0.15s ease, background 0.15s;
  &:hover { border-color: #7C3AED; background: #141929; color: #fff; }
`

const GoogleIcon = styled.svg`width: 18px; height: 18px; flex-shrink: 0;`
const GithubIcon = styled.svg`width: 18px; height: 18px; flex-shrink: 0; color: #CBD5E1;`

const OAuthOverlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(4px);
`

const OAuthModal = styled.div<{ $dark?: boolean }>`
  background: ${p => p.$dark ? '#0d1117' : '#fff'};
  border: ${p => p.$dark ? '1px solid #30363d' : 'none'};
  border-radius: 12px; padding: 2rem;
  width: 100%; max-width: 400px; margin: 1rem;
  display: flex; flex-direction: column; gap: 1rem;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
`

const OAuthHeader = styled.div`display: flex; align-items: center; gap: 0.75rem;`
const OAuthProviderName = styled.h2<{ $dark?: boolean }>`font-size: 1.25rem; font-weight: 700; color: ${p => p.$dark ? '#e6edf3' : '#111'}; margin: 0;`
const OAuthSubtitle = styled.p<{ $dark?: boolean }>`font-size: 0.875rem; color: ${p => p.$dark ? '#8b949e' : '#444'}; margin: 0;`

const OAuthAccountCard = styled.div<{ $dark?: boolean }>`
  display: flex; align-items: center; gap: 0.75rem;
  background: ${p => p.$dark ? '#0d1117' : '#f8f9fa'};
  border: 2px solid ${p => p.$dark ? '#30363d' : '#e0e0e0'};
  border-radius: 10px; padding: 0.875rem 1rem;
`

const OAuthAvatar = styled.div<{ $bg: string }>`
  width: 40px; height: 40px; border-radius: 50%;
  background: ${p => p.$bg};
  display: flex; align-items: center; justify-content: center;
  font-size: 1.125rem; font-weight: 800; color: #fff; flex-shrink: 0;
`

const OAuthAccountInfo = styled.div`flex: 1;`
const OAuthAccountName = styled.div`font-size: 0.9rem; font-weight: 600; color: #111;`
const OAuthAccountEmail = styled.div`font-size: 0.8rem; color: #555; margin-top: 1px;`
const OAuthCheck = styled.div`color: #1a73e8; font-size: 1.1rem; font-weight: 700;`

const OAuthFields = styled.div<{ $dark?: boolean }>`
  display: flex; flex-direction: column; gap: 0.5rem;
  background: ${p => p.$dark ? '#161b22' : '#f8f9fa'};
  border-radius: 8px; padding: 0.875rem 1rem;
`
const OAuthFieldLabel = styled.div<{ $dark?: boolean }>`
  font-size: 0.75rem; font-weight: 600;
  color: ${p => p.$dark ? '#8b949e' : '#555'};
`
const OAuthInput = styled.input<{ $dark?: boolean }>`
  padding: 0.5rem 0.75rem;
  background: ${p => p.$dark ? '#0d1117' : '#fff'};
  border: 1px solid ${p => p.$dark ? '#30363d' : '#ddd'};
  border-radius: 6px;
  color: ${p => p.$dark ? '#e6edf3' : '#111'};
  font-size: 0.875rem; outline: none;
  &:focus { border-color: ${p => p.$dark ? '#58a6ff' : '#1a73e8'}; }
  &::placeholder { color: ${p => p.$dark ? '#484f58' : '#999'}; }
`
const OAuthError = styled.div`
  font-size: 0.8rem; color: #d93025; margin-top: 0.25rem;
`

const OAuthPermissions = styled.div<{ $dark?: boolean }>`
  background: ${p => p.$dark ? '#161b22' : '#f8f9fa'};
  border-radius: 8px; padding: 0.875rem 1rem;
  display: flex; flex-direction: column; gap: 0.4rem;
`
const OAuthPermTitle = styled.div<{ $dark?: boolean }>`
  font-size: 0.8rem; font-weight: 600;
  color: ${p => p.$dark ? '#8b949e' : '#333'};
  margin-bottom: 0.25rem;
`
const OAuthPerm = styled.div<{ $dark?: boolean }>`
  font-size: 0.8rem; color: ${p => p.$dark ? '#8b949e' : '#555'}; padding-left: 0.5rem;
  &::before { content: '✓ '; color: #34A853; font-weight: 700; }
`

const OAuthActions = styled.div`display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.25rem;`

const OAuthCancelBtn = styled.button`
  padding: 0.5rem 1.25rem; background: transparent; border: 1px solid #ddd;
  border-radius: 6px; color: #555; font-size: 0.875rem; cursor: pointer;
  &:hover { background: #f5f5f5; color: #111; }
`

const OAuthConfirmBtn = styled.button<{ $provider: string }>`
  padding: 0.5rem 1.25rem;
  background: ${p => p.$provider === 'google' ? '#1a73e8' : '#24292f'};
  border: none; border-radius: 6px; color: #fff;
  font-size: 0.875rem; font-weight: 600; cursor: pointer;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

const FooterText = styled.p`
  text-align: center;
  font-size: 0.875rem;
  color: #64748B;
  a { color: #9D5FF5; &:hover { color: #fff; } }
`
