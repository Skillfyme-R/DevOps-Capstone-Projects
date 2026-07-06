import React, { useState } from 'react'
import styled from 'styled-components'
import { gql, useMutation } from '@apollo/client'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'

const SUBSCRIBE_MUTATION = gql`
  mutation SubscribeToPlan($planSlug: String!) {
    subscribeToPlan(planSlug: $planSlug)
  }
`

const PLANS = [
  {
    slug: 'flux-free',
    name: 'Flux Free',
    price: 0,
    label: '$0',
    period: 'forever',
    quality: 'HD 720p',
    streams: 1,
    downloads: false,
    features: ['Access to free content catalog', '720p HD streaming', '1 screen at a time', 'Ad-supported'],
    color: '#475569',
    badge: null,
  },
  {
    slug: 'flux-standard',
    name: 'Flux Standard',
    price: 9.99,
    label: '$9.99',
    period: 'per month',
    quality: 'Full HD 1080p',
    streams: 2,
    downloads: true,
    features: ['Full content library', '1080p Full HD streaming', '2 screens simultaneously', 'Download on mobile', 'No ads'],
    color: '#7C3AED',
    badge: 'Most Popular',
  },
  {
    slug: 'flux-premium',
    name: 'Flux Premium',
    price: 17.99,
    label: '$17.99',
    period: 'per month',
    quality: '4K UHD + HDR',
    streams: 4,
    downloads: true,
    features: ['Full content library', '4K UHD + HDR + Dolby', '4 screens simultaneously', 'Download on all devices', 'No ads', 'Early access to originals', 'Premium audio'],
    color: '#F97316',
    badge: 'Best Value',
  },
]

export default function BillingPage() {
  const { user, refetchUser } = useAuth()
  const { push: pushNotif } = useNotifications()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState('')
  const [confirmSuccess, setConfirmSuccess] = useState('')

  const [subscribeToPlan, { loading: subLoading }] = useMutation(SUBSCRIBE_MUTATION, {
    errorPolicy: 'all',
  })

  const activeSub = user?.subscriptions?.find(
    (s) => ['active', 'trialing', 'ACTIVE', 'TRIALING'].includes(s.status)
  )
  const currentPlanSlug = activeSub?.plan?.slug ?? 'flux-free'

  const handleConfirmPay = async () => {
    if (!selectedPlan) return
    setConfirmError('')
    setConfirmSuccess('')
    const { data, errors } = await subscribeToPlan({ variables: { planSlug: selectedPlan } })
    if (errors?.length) {
      setConfirmError(errors[0].message)
    } else if (data?.subscribeToPlan) {
      await refetchUser()
      const plan = PLANS.find(p => p.slug === selectedPlan)
      setConfirmSuccess(`Successfully switched to ${plan?.name}!`)
      pushNotif({
        type: 'subscription',
        title: 'Subscription Updated',
        body: `You are now on the ${plan?.name} plan. Enjoy your benefits!`,
      })
      setSelectedPlan(null)
      setTimeout(() => setConfirmSuccess(''), 4000)
    } else {
      setConfirmError('Failed to switch plan. Please try again.')
    }
  }

  return (
    <PageRoot>
      {/* Header */}
      <PageHeader>
        <HeaderLeft>
          <PageTitle>Billing &amp; Plans</PageTitle>
          <PageSubtitle>Manage your subscription and payment method</PageSubtitle>
        </HeaderLeft>
      </PageHeader>

      {/* Current plan banner */}
      <CurrentPlanBanner>
        <BannerIcon>💳</BannerIcon>
        <BannerContent>
          <BannerTitle>
            {activeSub
              ? `You're on ${activeSub.plan.name}`
              : "You're on the Free plan"}
          </BannerTitle>
          <BannerSub>
            {activeSub
              ? `Status: ${activeSub.status.charAt(0) + activeSub.status.slice(1).toLowerCase()} · Renews automatically`
              : 'Upgrade to unlock the full catalog, 4K streaming, and more.'}
          </BannerSub>
        </BannerContent>
        {activeSub && (
          <ManageBtn>Manage Subscription</ManageBtn>
        )}
      </CurrentPlanBanner>

      {/* Plans grid */}
      <SectionTitle>Choose a Plan</SectionTitle>
      <PlansGrid>
        {PLANS.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug
          const isSelected = selectedPlan === plan.slug

          return (
            <PlanCard
              key={plan.slug}
              $active={isCurrent}
              $selected={isSelected}
              $accent={plan.color}
              onClick={() => !isCurrent && setSelectedPlan(plan.slug)}
            >
              {plan.badge && <Badge $color={plan.color}>{plan.badge}</Badge>}
              {isCurrent && <Badge $color="#22C55E">Current Plan</Badge>}

              <PlanName>{plan.name}</PlanName>
              <PlanPrice>
                <PriceAmount>{plan.label}</PriceAmount>
                <PricePeriod>/{plan.period}</PricePeriod>
              </PlanPrice>

              <Divider />

              <QualityTag $color={plan.color}>{plan.quality}</QualityTag>
              <StreamsTag>{plan.streams} screen{plan.streams > 1 ? 's' : ''} at once</StreamsTag>

              <FeatureList>
                {plan.features.map((f) => (
                  <FeatureItem key={f}>
                    <FeatureCheck>✓</FeatureCheck>
                    {f}
                  </FeatureItem>
                ))}
              </FeatureList>

              <PlanBtn
                $color={plan.color}
                $current={isCurrent}
                disabled={isCurrent}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isCurrent) setSelectedPlan(plan.slug)
                }}
              >
                {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
              </PlanBtn>
            </PlanCard>
          )
        })}
      </PlansGrid>

      {confirmSuccess && <SuccessBanner>{confirmSuccess}</SuccessBanner>}

      {selectedPlan && selectedPlan !== currentPlanSlug && (
        <ConfirmBanner>
          <ConfirmText>
            Switch to <strong>{PLANS.find((p) => p.slug === selectedPlan)?.name}</strong>?
          </ConfirmText>
          <ConfirmRight>
            {confirmError && <ConfirmError>{confirmError}</ConfirmError>}
            <ConfirmActions>
              <CancelBtn onClick={() => { setSelectedPlan(null); setConfirmError('') }}>Cancel</CancelBtn>
              <ConfirmBtn onClick={handleConfirmPay} disabled={subLoading}>
                {subLoading ? 'Processing…' : 'Confirm & Pay'}
              </ConfirmBtn>
            </ConfirmActions>
          </ConfirmRight>
        </ConfirmBanner>
      )}

      {/* Payment method placeholder */}
      <SectionTitle style={{ marginTop: '2.5rem' }}>Payment Method</SectionTitle>
      <PaymentCard>
        <PaymentIcon>💳</PaymentIcon>
        <PaymentInfo>
          <PaymentTitle>No payment method on file</PaymentTitle>
          <PaymentSub>Add a card to upgrade your plan</PaymentSub>
        </PaymentInfo>
        <AddCardBtn>+ Add Card</AddCardBtn>
      </PaymentCard>

      {/* Billing history placeholder */}
      <SectionTitle style={{ marginTop: '2.5rem' }}>Billing History</SectionTitle>
      <EmptyHistory>
        <EmptyIcon>🧾</EmptyIcon>
        <EmptyText>No invoices yet</EmptyText>
        <EmptySubText>Your billing history will appear here once you have an active paid plan.</EmptySubText>
      </EmptyHistory>
    </PageRoot>
  )
}

/* ─── Styled Components ──────────────────────────────────────────────────── */

const PageRoot = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 0 3rem;
`

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.75rem;
`

const HeaderLeft = styled.div``

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 0.25rem;
`

const PageSubtitle = styled.p`
  font-size: 0.9375rem;
  color: #64748B;
  margin: 0;
`

const CurrentPlanBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #1a1f35 0%, #141929 100%);
  border: 1px solid #1E2640;
  border-left: 4px solid #7C3AED;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2.5rem;
`

const BannerIcon = styled.span`font-size: 1.75rem; flex-shrink: 0;`

const BannerContent = styled.div`flex: 1;`

const BannerTitle = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.25rem;
`

const BannerSub = styled.div`
  font-size: 0.875rem;
  color: #94A3B8;
`

const ManageBtn = styled.button`
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: 1px solid #7C3AED;
  border-radius: 8px;
  color: #9D5FF5;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(124,58,237,0.15); }
`

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: #CBD5E1;
  margin: 0 0 1.25rem;
`

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
`

const PlanCard = styled.div<{ $active: boolean; $selected: boolean; $accent: string }>`
  position: relative;
  background: #141929;
  border: 2px solid ${(p) =>
    p.$active ? p.$accent : p.$selected ? p.$accent + '88' : '#1E2640'};
  border-radius: 16px;
  padding: 1.75rem 1.5rem 1.5rem;
  cursor: ${(p) => (p.$active ? 'default' : 'pointer')};
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: ${(p) => (p.$active ? `0 0 0 1px ${p.$accent}44` : 'none')};
  &:hover {
    border-color: ${(p) => (p.$active ? p.$accent : p.$accent + 'aa')};
    transform: ${(p) => (p.$active ? 'none' : 'translateY(-2px)')};
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
`

const Badge = styled.div<{ $color: string }>`
  position: absolute;
  top: -1px;
  right: 1.25rem;
  background: ${(p) => p.$color};
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.65rem;
  border-radius: 0 0 8px 8px;
`

const PlanName = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
`

const PlanPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
`

const PriceAmount = styled.span`
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
`

const PricePeriod = styled.span`
  font-size: 0.875rem;
  color: #64748B;
`

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #1E2640;
  margin: 0 0 1.25rem;
`

const QualityTag = styled.div<{ $color: string }>`
  display: inline-block;
  background: ${(p) => p.$color}22;
  color: ${(p) => p.$color};
  font-size: 0.8125rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
`

const StreamsTag = styled.div`
  font-size: 0.8125rem;
  color: #94A3B8;
  margin-bottom: 1.25rem;
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #CBD5E1;
`

const FeatureCheck = styled.span`
  color: #22C55E;
  font-weight: 700;
  flex-shrink: 0;
`

const PlanBtn = styled.button<{ $color: string; $current: boolean }>`
  width: 100%;
  padding: 0.6875rem 1rem;
  border-radius: 10px;
  border: none;
  background: ${(p) => (p.$current ? '#1E2640' : p.$color)};
  color: ${(p) => (p.$current ? '#64748B' : '#fff')};
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: ${(p) => (p.$current ? 'default' : 'pointer')};
  transition: opacity 0.15s, filter 0.15s;
  &:hover:not(:disabled) { filter: brightness(1.1); }
`

const ConfirmBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1f35;
  border: 1px solid #7C3AED;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-top: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
`

const ConfirmText = styled.div`
  font-size: 0.9375rem;
  color: #CBD5E1;
  strong { color: #fff; }
`

const ConfirmRight = styled.div`display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;`
const ConfirmError = styled.div`font-size: 0.8rem; color: #EF4444;`
const ConfirmActions = styled.div`display: flex; gap: 0.75rem;`
const SuccessBanner = styled.div`
  margin-top: 1rem; padding: 0.875rem 1.25rem;
  background: rgba(34,197,94,0.1); border: 1px solid #22C55E44;
  border-radius: 10px; color: #22C55E; font-size: 0.9rem; font-weight: 600;
`

const CancelBtn = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #94A3B8;
  font-size: 0.875rem;
  cursor: pointer;
  &:hover { border-color: #94A3B8; color: #fff; }
`

const ConfirmBtn = styled.button`
  padding: 0.5rem 1.25rem;
  background: #7C3AED;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  &:hover:not(:disabled) { background: #6D28D9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

const PaymentCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
`

const PaymentIcon = styled.span`font-size: 1.75rem;`

const PaymentInfo = styled.div`flex: 1;`

const PaymentTitle = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.25rem;
`

const PaymentSub = styled.div`
  font-size: 0.8125rem;
  color: #64748B;
`

const AddCardBtn = styled.button`
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #94A3B8;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  &:hover { border-color: #7C3AED; color: #9D5FF5; }
`

const EmptyHistory = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  text-align: center;
`

const EmptyIcon = styled.div`font-size: 2.5rem; margin-bottom: 0.75rem;`

const EmptyText = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.5rem;
`

const EmptySubText = styled.div`
  font-size: 0.875rem;
  color: #64748B;
  max-width: 400px;
`
