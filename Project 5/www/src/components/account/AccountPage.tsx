import React, { useState } from 'react'
import styled from 'styled-components'
import { gql, useMutation } from '@apollo/client'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'

const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($name: String, $avatarUrl: String) {
    updateProfile(name: $name, avatarUrl: $avatarUrl) {
      id name email
    }
  }
`

const CANCEL_SUBSCRIPTION_MUTATION = gql`
  mutation CancelSubscription($subscriptionId: ID!) {
    cancelSubscription(subscriptionId: $subscriptionId)
  }
`

const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`

export default function AccountPage() {
  const { user, logout, refetchUser } = useAuth()
  const { push: pushNotif } = useNotifications()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [saveError, setSaveError] = useState('')
  const [pwdOpen, setPwdOpen] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)

  const [updateProfile, { loading: saveLoading }] = useMutation(UPDATE_PROFILE_MUTATION, {
    errorPolicy: 'all',
  })

  const [cancelSubId, setCancelSubId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePwd, setDeletePwd] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const [cancelSubscription, { loading: cancelLoading }] = useMutation(CANCEL_SUBSCRIPTION_MUTATION, {
    errorPolicy: 'all',
  })

  const handleCancelSubscription = async () => {
    if (!cancelSubId) return
    setCancelError('')
    const { data, errors } = await cancelSubscription({ variables: { subscriptionId: cancelSubId } })
    if (errors?.length) {
      setCancelError(errors[0].message)
    } else if (data?.cancelSubscription) {
      await refetchUser()
      pushNotif({
        type: 'subscription',
        title: 'Subscription Cancelled',
        body: 'Your subscription has been cancelled. You will retain access until the end of the billing period.',
      })
      setCancelSubId(null)
    } else {
      setCancelError('Failed to cancel subscription')
    }
  }

  const [changePassword, { loading: pwdLoading }] = useMutation(CHANGE_PASSWORD_MUTATION, {
    errorPolicy: 'all',
  })

  const DELETE_ACCOUNT_MUTATION = gql`
    mutation DeleteAccount($password: String!) {
      deleteAccount(password: $password)
    }
  `
  const [deleteAccount, { loading: deleteLoading }] = useMutation(DELETE_ACCOUNT_MUTATION, {
    errorPolicy: 'all',
  })

  const handleDeleteAccount = async () => {
    setDeleteError('')
    if (!deletePwd) { setDeleteError('Enter your password to confirm'); return }
    const { data, errors } = await deleteAccount({ variables: { password: deletePwd } })
    if (errors?.length) {
      setDeleteError(errors[0].message)
    } else if (data?.deleteAccount) {
      logout()
    } else {
      setDeleteError('Failed to delete account')
    }
  }

  const handleSaveName = async () => {
    setSaveError('')
    if (!name.trim()) { setSaveError('Name cannot be empty'); return }
    const { errors } = await updateProfile({ variables: { name: name.trim() } })
    if (errors?.length) {
      setSaveError(errors[0].message)
    } else {
      await refetchUser()
      setEditing(false)
    }
  }

  const handleChangePassword = async () => {
    setPwdError('')
    setPwdSuccess(false)
    if (!currentPwd) { setPwdError('Enter your current password'); return }
    if (newPwd.length < 8) { setPwdError('New password must be at least 8 characters'); return }
    if (newPwd !== confirmPwd) { setPwdError('New passwords do not match'); return }

    const { data, errors } = await changePassword({
      variables: { currentPassword: currentPwd, newPassword: newPwd },
    })

    if (errors?.length) {
      setPwdError(errors[0].message)
    } else if (data?.changePassword) {
      setPwdSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => { setPwdOpen(false); setPwdSuccess(false) }, 2000)
    } else {
      setPwdError('Failed to change password')
    }
  }

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  const roleBadge: Record<string, string> = {
    platform_admin: 'Platform Admin',
    PLATFORM_ADMIN: 'Platform Admin',
    studio_admin: 'Studio Admin',
    STUDIO_ADMIN: 'Studio Admin',
    viewer: 'Viewer',
    VIEWER: 'Viewer',
  }

  return (
    <Page>
      <PageTitle>Account</PageTitle>

      {/* Profile card */}
      <ProfileCard>
        <AvatarSection>
          {user?.avatarUrl ? (
            <AvatarImg src={user.avatarUrl} alt={user.name} />
          ) : (
            <AvatarPlaceholder>{initials}</AvatarPlaceholder>
          )}
          <AvatarHint>Profile Photo</AvatarHint>
        </AvatarSection>

        <ProfileInfo>
          {editing ? (
            <>
              <EditRow>
                <FieldInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                />
                <SaveBtn onClick={handleSaveName} disabled={saveLoading}>
                  {saveLoading ? 'Saving…' : 'Save'}
                </SaveBtn>
                <CancelBtn onClick={() => { setName(user?.name ?? ''); setEditing(false); setSaveError('') }}>Cancel</CancelBtn>
              </EditRow>
              {saveError && <SaveError>{saveError}</SaveError>}
            </>
          ) : (
            <NameRow>
              <DisplayName>{user?.name}</DisplayName>
              <EditBtn onClick={() => { setEditing(true); setName(user?.name ?? '') }}>Edit</EditBtn>
            </NameRow>
          )}
          <UserEmail>{user?.email}</UserEmail>
          {user?.role && (
            <RoleBadge>{roleBadge[user.role] ?? user.role}</RoleBadge>
          )}
          {user?.account && (
            <AccountInfo>
              <AccountLabel>Account</AccountLabel>
              <AccountName>{user.account.name}</AccountName>
              {user.account.tier && <TierBadge>{user.account.tier}</TierBadge>}
            </AccountInfo>
          )}
        </ProfileInfo>
      </ProfileCard>

      {/* Account details */}
      <SectionCard>
        <CardTitle>Account Details</CardTitle>
        <FieldGroup>
          <FieldRow>
            <FieldLabel>Name</FieldLabel>
            <FieldValue>{user?.name}</FieldValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>Email</FieldLabel>
            <FieldValue>{user?.email}</FieldValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>Role</FieldLabel>
            <FieldValue>{roleBadge[user?.role ?? ''] ?? user?.role ?? '—'}</FieldValue>
          </FieldRow>
          {user?.account && (
            <FieldRow>
              <FieldLabel>Organization</FieldLabel>
              <FieldValue>{user.account.name}</FieldValue>
            </FieldRow>
          )}
        </FieldGroup>
      </SectionCard>

      {/* Subscriptions */}
      <SectionCard>
        <CardTitle>Subscriptions</CardTitle>
        {(!user?.subscriptions || user.subscriptions.length === 0) ? (
          <EmptySubText>No active subscriptions.</EmptySubText>
        ) : (
          <FieldGroup>
            {user.subscriptions.map((sub) => (
              <SubRow key={sub.id}>
                <SubLeft>
                  <SubPlan>{sub.plan?.name}</SubPlan>
                  <SubStatus $status={sub.status}>{sub.status?.toUpperCase()}</SubStatus>
                </SubLeft>
                {['active', 'trialing'].includes(sub.status) && (
                  <CancelSubBtn onClick={() => { setCancelSubId(sub.id); setCancelError('') }}>
                    Cancel
                  </CancelSubBtn>
                )}
                {sub.status === 'canceled' && (
                  <CanceledLabel>Canceled</CanceledLabel>
                )}
              </SubRow>
            ))}
          </FieldGroup>
        )}

        {/* Cancel confirmation inline */}
        {cancelSubId && (
          <CancelConfirmBox>
            <CancelConfirmText>
              Are you sure you want to cancel this subscription? You will lose access at the end of the billing period.
            </CancelConfirmText>
            {cancelError && <PwdError>{cancelError}</PwdError>}
            <CancelConfirmActions>
              <CancelBtn onClick={() => setCancelSubId(null)}>Keep Subscription</CancelBtn>
              <DeleteConfirmBtn onClick={handleCancelSubscription} disabled={cancelLoading}>
                {cancelLoading ? 'Canceling…' : 'Yes, Cancel'}
              </DeleteConfirmBtn>
            </CancelConfirmActions>
          </CancelConfirmBox>
        )}
      </SectionCard>

      {/* Security */}
      <SectionCard>
        <CardTitle>Security</CardTitle>
        <FieldGroup>
          <FieldRow>
            <FieldLabel>Password</FieldLabel>
            <ChangePasswordBtn onClick={() => { setPwdOpen(!pwdOpen); setPwdError(''); setPwdSuccess(false) }}>
              {pwdOpen ? 'Cancel' : 'Change Password'}
            </ChangePasswordBtn>
          </FieldRow>
          {pwdOpen && (
            <PwdForm>
              <PwdField>
                <PwdLabel>Current Password</PwdLabel>
                <PwdInput
                  type="password"
                  placeholder="Enter current password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                />
              </PwdField>
              <PwdField>
                <PwdLabel>New Password</PwdLabel>
                <PwdInput
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
              </PwdField>
              <PwdField>
                <PwdLabel>Confirm New Password</PwdLabel>
                <PwdInput
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                />
              </PwdField>
              {pwdError && <PwdError>{pwdError}</PwdError>}
              {pwdSuccess && <PwdSuccess>Password changed successfully!</PwdSuccess>}
              <PwdSaveBtn onClick={handleChangePassword} disabled={pwdLoading}>
                {pwdLoading ? 'Saving…' : 'Update Password'}
              </PwdSaveBtn>
            </PwdForm>
          )}
          <FieldRow>
            <FieldLabel>Two-Factor Auth</FieldLabel>
            <TwoFARight>
              <TwoFABadge>Not enabled</TwoFABadge>
              <TwoFABtn disabled title="Coming soon">Enable 2FA</TwoFABtn>
            </TwoFARight>
          </FieldRow>
        </FieldGroup>
      </SectionCard>

      {/* Danger zone */}
      <DangerCard>
        <CardTitle style={{ color: '#EF4444' }}>Danger Zone</CardTitle>
        <DangerRow>
          <DangerInfo>
            <DangerLabel>Sign Out</DangerLabel>
            <DangerSubText>Sign out from this device</DangerSubText>
          </DangerInfo>
          <DangerBtn onClick={logout}>Sign Out</DangerBtn>
        </DangerRow>
        <DangerRow>
          <DangerInfo>
            <DangerLabel>Delete Account</DangerLabel>
            <DangerSubText>Permanently delete your account and all data. This cannot be undone.</DangerSubText>
          </DangerInfo>
          <DangerBtn $destructive onClick={() => { setDeleteModalOpen(true); setDeletePwd(''); setDeleteError('') }}>
            Delete Account
          </DangerBtn>
        </DangerRow>
      </DangerCard>

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <ModalOverlay onClick={() => setDeleteModalOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Delete Account</ModalTitle>
            <ModalBody>
              This will permanently delete your account and all your data. This action <strong>cannot be undone</strong>.
            </ModalBody>
            <PwdField>
              <PwdLabel>Enter your password to confirm</PwdLabel>
              <PwdInput
                type="password"
                placeholder="Your password"
                value={deletePwd}
                onChange={(e) => setDeletePwd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()}
                autoFocus
              />
            </PwdField>
            {deleteError && <PwdError>{deleteError}</PwdError>}
            <ModalActions>
              <CancelBtn onClick={() => setDeleteModalOpen(false)}>Cancel</CancelBtn>
              <DeleteConfirmBtn onClick={handleDeleteAccount} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting…' : 'Yes, Delete My Account'}
              </DeleteConfirmBtn>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
    </Page>
  )
}

const Page = styled.div`
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
`

const ProfileCard = styled.div`
  display: flex;
  gap: 1.5rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 16px;
  padding: 1.75rem;
  align-items: flex-start;
`

const AvatarSection = styled.div`display: flex; flex-direction: column; align-items: center; gap: 0.5rem;`

const AvatarImg = styled.img`
  width: 80px; height: 80px; border-radius: 50%; object-fit: cover;
  border: 3px solid #7C3AED;
`

const AvatarPlaceholder = styled.div`
  width: 80px; height: 80px; border-radius: 50%;
  background: linear-gradient(135deg, #7C3AED, #F97316);
  color: #fff; font-size: 1.5rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
`

const AvatarHint = styled.div`font-size: 0.7rem; color: #475569;`

const ProfileInfo = styled.div`flex: 1; display: flex; flex-direction: column; gap: 0.5rem;`

const NameRow = styled.div`display: flex; align-items: center; gap: 0.75rem;`

const DisplayName = styled.div`font-size: 1.5rem; font-weight: 800; color: #fff;`

const EditRow = styled.div`display: flex; gap: 0.5rem; align-items: center;`

const FieldInput = styled.input`
  padding: 0.5rem 0.75rem;
  background: #0A0E1A;
  border: 1px solid #7C3AED;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  flex: 1;
`

const EditBtn = styled.button`
  background: transparent; border: 1px solid #334155; border-radius: 6px;
  color: #94A3B8; font-size: 0.8125rem; padding: 0.25rem 0.75rem; cursor: pointer;
  &:hover { border-color: #7C3AED; color: #9D5FF5; }
`

const SaveBtn = styled.button`
  background: #7C3AED; border: none; border-radius: 6px;
  color: #fff; font-size: 0.875rem; font-weight: 700; padding: 0.375rem 0.875rem; cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const CancelBtn = styled.button`
  background: transparent; border: 1px solid #334155; border-radius: 6px;
  color: #94A3B8; font-size: 0.875rem; padding: 0.375rem 0.75rem; cursor: pointer;
`

const SaveError = styled.div`font-size: 0.8rem; color: #EF4444; margin-top: 0.25rem;`

const UserEmail = styled.div`font-size: 0.9375rem; color: #64748B;`

const RoleBadge = styled.span`
  display: inline-block;
  background: rgb(124 58 237 / 0.2);
  border: 1px solid #7C3AED44;
  color: #9D5FF5;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 20px;
  width: fit-content;
`

const AccountInfo = styled.div`display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;`
const AccountLabel = styled.span`font-size: 0.8rem; color: #475569;`
const AccountName = styled.span`font-size: 0.875rem; color: #CBD5E1; font-weight: 600;`
const TierBadge = styled.span`
  background: rgb(249 115 22 / 0.15);
  color: #F97316;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
`

const SectionCard = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 16px;
  padding: 1.5rem 1.75rem;
`

const CardTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
  color: #CBD5E1;
  margin: 0 0 1.25rem;
`

const FieldGroup = styled.div`display: flex; flex-direction: column; gap: 0;`

const FieldRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0;
  border-bottom: 1px solid #1E2640;
  &:last-child { border-bottom: none; }
`

const FieldLabel = styled.div`font-size: 0.9rem; color: #94A3B8;`
const FieldValue = styled.div`font-size: 0.9rem; color: #CBD5E1; font-weight: 500;`

const ChangePasswordBtn = styled.button`
  background: transparent; border: 1px solid #334155; border-radius: 7px;
  color: #94A3B8; font-size: 0.8125rem; padding: 0.375rem 0.875rem; cursor: pointer;
  &:hover { border-color: #7C3AED; color: #9D5FF5; }
`

const PwdForm = styled.div`
  display: flex; flex-direction: column; gap: 0.875rem;
  padding: 1rem 0 1rem;
  border-bottom: 1px solid #1E2640;
`
const PwdField = styled.div`display: flex; flex-direction: column; gap: 0.375rem;`
const PwdLabel = styled.label`font-size: 0.8rem; color: #64748B; font-weight: 500;`
const PwdInput = styled.input`
  padding: 0.5rem 0.75rem;
  background: #0A0E1A;
  border: 1px solid #1E2640;
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: #7C3AED; }
`
const PwdError = styled.div`font-size: 0.8125rem; color: #EF4444; padding: 0.25rem 0;`
const PwdSuccess = styled.div`font-size: 0.8125rem; color: #22C55E; padding: 0.25rem 0;`
const PwdSaveBtn = styled.button`
  background: #7C3AED; border: none; border-radius: 8px;
  color: #fff; font-size: 0.875rem; font-weight: 700;
  padding: 0.5625rem 1.25rem; cursor: pointer; width: fit-content;
  transition: background 0.15s;
  &:hover:not(:disabled) { background: #9D5FF5; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const SubRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0;
  border-bottom: 1px solid #1E2640;
  &:last-child { border-bottom: none; }
`
const SubLeft = styled.div`display: flex; align-items: center; gap: 0.75rem;`
const SubPlan = styled.div`font-size: 0.9rem; color: #CBD5E1; font-weight: 600;`
const SubStatus = styled.div<{ $status: string }>`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${(p) => (['active','trialing','ACTIVE','TRIALING'].includes(p.$status)) ? '#22C55E' : '#EF4444'};
  background: ${(p) => (['active','trialing','ACTIVE','TRIALING'].includes(p.$status)) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'};
  padding: 2px 8px;
  border-radius: 20px;
`
const CancelSubBtn = styled.button`
  background: transparent; border: 1px solid #EF444455; border-radius: 6px;
  color: #EF4444; font-size: 0.8rem; padding: 0.25rem 0.75rem; cursor: pointer;
  &:hover { background: rgba(239,68,68,0.1); border-color: #EF4444; }
`
const CanceledLabel = styled.span`font-size: 0.75rem; color: #475569;`
const EmptySubText = styled.p`font-size: 0.875rem; color: #475569; margin: 0;`
const CancelConfirmBox = styled.div`
  margin-top: 1rem; padding: 1rem; background: rgba(239,68,68,0.05);
  border: 1px solid rgba(239,68,68,0.2); border-radius: 10px;
  display: flex; flex-direction: column; gap: 0.75rem;
`
const CancelConfirmText = styled.p`font-size: 0.875rem; color: #94A3B8; margin: 0;`
const CancelConfirmActions = styled.div`display: flex; gap: 0.75rem;`

const DangerCard = styled.div`
  background: #141929;
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 16px;
  padding: 1.5rem 1.75rem;
`

const DangerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0;
  border-bottom: 1px solid #1E264055;
  &:last-child { border-bottom: none; }
`

const DangerInfo = styled.div``
const DangerLabel = styled.div`font-size: 0.9rem; color: #CBD5E1; font-weight: 600;`
const DangerSubText = styled.div`font-size: 0.8rem; color: #475569; margin-top: 0.2rem;`

const DangerBtn = styled.button<{ $destructive?: boolean }>`
  padding: 0.4375rem 1rem;
  background: ${(p) => p.$destructive ? 'rgba(239,68,68,0.1)' : 'transparent'};
  border: 1px solid ${(p) => p.$destructive ? '#EF4444' : '#334155'};
  border-radius: 7px;
  color: ${(p) => p.$destructive ? '#EF4444' : '#94A3B8'};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${(p) => p.$destructive ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'};
  }
`

const TwoFARight = styled.div`display: flex; align-items: center; gap: 0.75rem;`
const TwoFABadge = styled.span`font-size: 0.8rem; color: #EF4444;`
const TwoFABtn = styled.button`
  background: transparent; border: 1px solid #334155; border-radius: 7px;
  color: #475569; font-size: 0.8125rem; padding: 0.375rem 0.875rem;
  cursor: not-allowed; opacity: 0.5;
  &::after { content: ' (Coming soon)'; font-size: 0.7rem; }
`

const ModalOverlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
`
const ModalBox = styled.div`
  background: #141929; border: 1px solid rgba(239,68,68,0.3);
  border-radius: 16px; padding: 2rem; width: 100%; max-width: 440px;
  display: flex; flex-direction: column; gap: 1.25rem;
`
const ModalTitle = styled.h2`font-size: 1.25rem; font-weight: 800; color: #EF4444; margin: 0;`
const ModalBody = styled.p`font-size: 0.9rem; color: #94A3B8; margin: 0; line-height: 1.6;
  strong { color: #CBD5E1; }
`
const ModalActions = styled.div`display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;`
const DeleteConfirmBtn = styled.button`
  background: #EF4444; border: none; border-radius: 8px;
  color: #fff; font-size: 0.875rem; font-weight: 700;
  padding: 0.5625rem 1.25rem; cursor: pointer;
  &:hover:not(:disabled) { background: #DC2626; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`
