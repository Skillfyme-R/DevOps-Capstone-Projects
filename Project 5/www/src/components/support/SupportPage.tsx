import React, { useState, useRef, useEffect } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import styled from 'styled-components'

type ChatMsg = { from: 'user' | 'agent'; text: string; time: string }

const AGENT_REPLIES = [
  "Thanks for reaching out! Let me look into that for you.",
  "I understand the issue. Can you tell me more about what you were doing when this happened?",
  "Got it! Our team is aware of this and we're working on a fix.",
  "I've escalated this to our technical team. You should hear back within 2 hours.",
  "Is there anything else I can help you with today?",
  "Could you try clearing your browser cache and reloading? That usually resolves this.",
  "I've noted this in your account. We'll follow up over email as well.",
]

function agentReply(i: number) {
  return AGENT_REPLIES[i % AGENT_REPLIES.length]
}

const MY_ISSUES_QUERY = gql`
  query MyIssues {
    myIssues {
      id subject description status priority insertedAt
    }
  }
`

const REPORT_ISSUE = gql`
  mutation ReportIssue($subject: String!, $description: String!) {
    reportIssue(subject: $subject, description: $description) {
      id subject status
    }
  }
`

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#F59E0B',
  RESOLVED: '#22C55E',
  CLOSED: '#475569',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#64748B',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
}

const FAQ = [
  { q: 'Video is buffering or low quality', a: 'Check your internet speed. We recommend 25 Mbps for 4K, 5 Mbps for HD. Try changing quality in player settings.' },
  { q: 'Cannot login to my account', a: 'Ensure your email and password are correct. Use "Forgot Password" to reset. Clear browser cookies if the issue persists.' },
  { q: 'Downloaded content not playing', a: 'Downloads expire after 30 days or if your subscription lapses. Re-download from the catalog while subscribed.' },
  { q: 'Payment not going through', a: 'Verify your card details and billing address. Contact your bank if the issue continues. We accept Visa, Mastercard, and Amex.' },
  { q: 'How do I cancel my subscription?', a: 'Go to Billing & Plans → Manage Subscription → Cancel. Your access continues until the end of the billing period.' },
]

export default function SupportPage() {
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [ticketError, setTicketError] = useState('')
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { from: 'agent', text: 'Hi! Welcome to FluxStream Support. How can I help you today?', time: 'just now' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [agentTyping, setAgentTyping] = useState(false)
  const [replyCount, setReplyCount] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, agentTyping])

  const sendChatMsg = () => {
    const text = chatInput.trim()
    if (!text) return
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setChatMsgs((prev) => [...prev, { from: 'user', text, time: now }])
    setChatInput('')
    setAgentTyping(true)
    setTimeout(() => {
      setAgentTyping(false)
      const reply = agentReply(replyCount)
      setReplyCount((c) => c + 1)
      setChatMsgs((prev) => [...prev, { from: 'agent', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    }, 1200 + Math.random() * 800)
  }

  const { data, loading, refetch } = useQuery(MY_ISSUES_QUERY, { fetchPolicy: 'network-only' })
  const [reportIssue, { loading: reporting }] = useMutation(REPORT_ISSUE)

  const issues = data?.myIssues ?? []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    setTicketError('')
    const { data: mutData, errors } = await reportIssue({ variables: { subject: subject.trim(), description: description.trim() } })
    if (errors?.length || !mutData?.reportIssue) {
      setTicketError(errors?.[0]?.message ?? 'Failed to submit ticket. Please try again.')
      return
    }
    setSubmitted(true)
    setShowForm(false)
    setSubject('')
    setDescription('')
    await refetch()
  }

  return (
    <Page>
      <PageTitle>Support</PageTitle>

      {/* Quick actions */}
      <QuickActions>
        <ActionCard onClick={() => setShowForm(true)}>
          <ActionIcon>🎫</ActionIcon>
          <ActionLabel>Open a Ticket</ActionLabel>
          <ActionSub>Report a playback or account issue</ActionSub>
        </ActionCard>
        <ActionCard as="a" href="mailto:support@fluxstream.io">
          <ActionIcon>✉️</ActionIcon>
          <ActionLabel>Email Us</ActionLabel>
          <ActionSub>support@fluxstream.io</ActionSub>
        </ActionCard>
        <ActionCard onClick={() => setShowChat((v) => !v)}>
          <ActionIcon>💬</ActionIcon>
          <ActionLabel>Live Chat</ActionLabel>
          <ActionSub>{showChat ? 'Chat open ↓' : 'Available 9am – 6pm IST'}</ActionSub>
        </ActionCard>
      </QuickActions>

      {showChat && (
        <ChatWindow>
          <ChatHeader>
            <ChatHeaderLeft>
              <AgentAvatar>FS</AgentAvatar>
              <div>
                <ChatAgentName>FluxStream Support</ChatAgentName>
                <ChatStatus>● Online</ChatStatus>
              </div>
            </ChatHeaderLeft>
            <ChatCloseBtn onClick={() => setShowChat(false)}>✕</ChatCloseBtn>
          </ChatHeader>
          <ChatBody>
            {chatMsgs.map((msg, i) => (
              <ChatBubbleRow key={i} $from={msg.from}>
                <ChatBubble $from={msg.from}>
                  {msg.text}
                  <BubbleTime>{msg.time}</BubbleTime>
                </ChatBubble>
              </ChatBubbleRow>
            ))}
            {agentTyping && (
              <ChatBubbleRow $from="agent">
                <ChatBubble $from="agent">
                  <TypingDots><span /><span /><span /></TypingDots>
                </ChatBubble>
              </ChatBubbleRow>
            )}
            <div ref={chatEndRef} />
          </ChatBody>
          <ChatInputRow>
            <ChatInput
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMsg()}
              placeholder="Type a message…"
            />
            <ChatSendBtn onClick={sendChatMsg} disabled={!chatInput.trim()}>Send</ChatSendBtn>
          </ChatInputRow>
        </ChatWindow>
      )}

      {/* New ticket form */}
      {showForm && (
        <FormCard>
          <FormTitle>Report an Issue</FormTitle>
          <Form onSubmit={handleSubmit}>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the problem"
              required
            />
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened in detail — include device, browser, and what you were watching"
              rows={5}
              required
            />
            {ticketError && <TicketErrorMsg>{ticketError}</TicketErrorMsg>}
            <FormActions>
              <CancelBtn type="button" onClick={() => setShowForm(false)}>Cancel</CancelBtn>
              <SubmitBtn type="submit" disabled={reporting}>
                {reporting ? 'Submitting…' : 'Submit Ticket'}
              </SubmitBtn>
            </FormActions>
          </Form>
        </FormCard>
      )}

      {submitted && (
        <SuccessBanner>
          ✓ Your ticket has been submitted. We'll respond within 24 hours.
        </SuccessBanner>
      )}

      {/* My tickets */}
      <Section>
        <SectionTitle>My Tickets</SectionTitle>
        {loading && <Skeleton />}
        {!loading && issues.length === 0 && (
          <EmptyTickets>
            <span>🎫</span>
            <p>No tickets yet. Open one if you need help.</p>
          </EmptyTickets>
        )}
        {!loading && issues.map((issue: any) => (
          <TicketCard key={issue.id}>
            <TicketRow onClick={() => setExpandedTicket(expandedTicket === issue.id ? null : issue.id)}>
              <TicketInfo>
                <TicketSubject>{issue.subject}</TicketSubject>
                <TicketMeta>
                  #{issue.id.slice(0, 8)} · {new Date(issue.insertedAt).toLocaleDateString()}
                </TicketMeta>
              </TicketInfo>
              <TicketBadges>
                {issue.priority && (
                  <PriorityBadge $color={PRIORITY_COLOR[issue.priority] ?? '#64748B'}>
                    {issue.priority}
                  </PriorityBadge>
                )}
                <StatusBadge $color={STATUS_COLOR[issue.status] ?? '#64748B'}>
                  {issue.status?.replace('_', ' ')}
                </StatusBadge>
                <TicketChevron $open={expandedTicket === issue.id}>▼</TicketChevron>
              </TicketBadges>
            </TicketRow>
            {expandedTicket === issue.id && (
              <TicketDetail>
                <TicketDetailLabel>Description</TicketDetailLabel>
                <TicketDetailText>{issue.description}</TicketDetailText>
                <TicketDetailMeta>
                  Ticket ID: {issue.id} · Raised on {new Date(issue.insertedAt).toLocaleString()}
                </TicketDetailMeta>
              </TicketDetail>
            )}
          </TicketCard>
        ))}
      </Section>

      {/* FAQ */}
      <Section>
        <SectionTitle>Frequently Asked Questions</SectionTitle>
        {FAQ.map((item, i) => (
          <FaqItem key={i}>
            <FaqQuestion onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <span>{item.q}</span>
              <FaqChevron $open={openFaq === i}>{openFaq === i ? '▲' : '▼'}</FaqChevron>
            </FaqQuestion>
            {openFaq === i && <FaqAnswer>{item.a}</FaqAnswer>}
          </FaqItem>
        ))}
      </Section>
    </Page>
  )
}

const Page = styled.div`
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
`

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`

const ActionCard = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  text-decoration: none;
  display: block;
  transition: border-color 0.15s, transform 0.15s;
  &:hover { border-color: #7C3AED; transform: translateY(-2px); }
`

const ActionIcon = styled.div`font-size: 1.75rem; margin-bottom: 0.5rem;`
const ActionLabel = styled.div`font-size: 0.9375rem; font-weight: 700; color: #fff; margin-bottom: 0.25rem;`
const ActionSub = styled.div`font-size: 0.8125rem; color: #64748B;`

const FormCard = styled.div`
  background: #141929;
  border: 1px solid #7C3AED44;
  border-radius: 16px;
  padding: 1.5rem 1.75rem;
`

const FormTitle = styled.h2`font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 1.25rem;`

const Form = styled.form`display: flex; flex-direction: column; gap: 0.75rem;`

const Label = styled.label`font-size: 0.875rem; color: #94A3B8; font-weight: 600;`

const Input = styled.input`
  padding: 0.625rem 0.875rem;
  background: #0A0E1A;
  border: 1px solid #1E2640;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  &:focus { border-color: #7C3AED; }
  &::placeholder { color: #475569; }
`

const Textarea = styled.textarea`
  padding: 0.625rem 0.875rem;
  background: #0A0E1A;
  border: 1px solid #1E2640;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  resize: vertical;
  outline: none;
  font-family: inherit;
  &:focus { border-color: #7C3AED; }
  &::placeholder { color: #475569; }
`

const TicketErrorMsg = styled.div`
  padding: 0.625rem 0.875rem;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 8px;
  color: #EF4444;
  font-size: 0.875rem;
`

const FormActions = styled.div`display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;`

const CancelBtn = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #94A3B8;
  font-size: 0.875rem;
  cursor: pointer;
`

const SubmitBtn = styled.button`
  padding: 0.5rem 1.25rem;
  background: #7C3AED;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
`

const SuccessBanner = styled.div`
  background: rgba(34,197,94,0.1);
  border: 1px solid #22C55E44;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  color: #22C55E;
  font-size: 0.9375rem;
  font-weight: 600;
`

const Section = styled.section`display: flex; flex-direction: column; gap: 0;`

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: #CBD5E1;
  margin: 0 0 1rem;
`

const Skeleton = styled.div`
  height: 60px;
  background: linear-gradient(90deg, #0A0E1A 25%, #141929 50%, #0A0E1A 75%);
  border-radius: 10px;
  animation: shimmer 1.4s infinite;
`

const EmptyTickets = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 12px;
  span { font-size: 1.5rem; }
  p { color: #475569; font-size: 0.875rem; margin: 0; }
`

const TicketCard = styled.div`
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 10px;
  margin-bottom: 0.5rem;
  overflow: hidden;
  transition: border-color 0.15s;
  &:hover { border-color: #7C3AED44; }
`

const TicketRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  gap: 1rem;
  cursor: pointer;
`

const TicketInfo = styled.div`flex: 1; min-width: 0;`
const TicketSubject = styled.div`font-size: 0.9rem; font-weight: 600; color: #fff;`
const TicketMeta = styled.div`font-size: 0.75rem; color: #475569; margin-top: 0.2rem;`
const TicketBadges = styled.div`display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;`

const TicketChevron = styled.span<{ $open: boolean }>`
  color: #475569; font-size: 0.65rem; margin-left: 0.25rem;
  display: inline-block;
  transform: ${(p) => p.$open ? 'rotate(180deg)' : 'rotate(0)'};
  transition: transform 0.15s;
`

const TicketDetail = styled.div`
  padding: 0.75rem 1.25rem 1rem;
  border-top: 1px solid #1E2640;
  display: flex; flex-direction: column; gap: 0.5rem;
`
const TicketDetailLabel = styled.div`font-size: 0.75rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;`
const TicketDetailText = styled.div`font-size: 0.875rem; color: #CBD5E1; line-height: 1.6;`
const TicketDetailMeta = styled.div`font-size: 0.7rem; color: #334155; margin-top: 0.25rem;`

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

const PriorityBadge = styled(StatusBadge)``

const FaqItem = styled.div`
  border-bottom: 1px solid #1E2640;
  &:last-child { border-bottom: none; }
`

const FaqQuestion = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  cursor: pointer;
  color: #CBD5E1;
  font-size: 0.9375rem;
  font-weight: 600;
  gap: 1rem;
  &:hover { color: #fff; }
`

const FaqChevron = styled.span<{ $open: boolean }>`
  color: #7C3AED;
  font-size: 0.75rem;
  flex-shrink: 0;
  transition: transform 0.15s;
`

const FaqAnswer = styled.div`
  padding: 0 0 1rem;
  font-size: 0.875rem;
  color: #94A3B8;
  line-height: 1.65;
`

const ChatWindow = styled.div`
  background: #141929;
  border: 1px solid #7C3AED44;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #0A0E1A;
  border-bottom: 1px solid #1E2640;
`

const ChatHeaderLeft = styled.div`display: flex; align-items: center; gap: 0.75rem;`

const AgentAvatar = styled.div`
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #7C3AED, #F97316);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 800; color: #fff;
`

const ChatAgentName = styled.div`font-size: 0.9rem; font-weight: 700; color: #fff;`
const ChatStatus = styled.div`font-size: 0.75rem; color: #22C55E;`

const ChatCloseBtn = styled.button`
  background: none; border: none; color: #64748B; font-size: 1rem; cursor: pointer;
  &:hover { color: #fff; }
`

const ChatBody = styled.div`
  flex: 1;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 320px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #1E2640; border-radius: 2px; }
`

const ChatBubbleRow = styled.div<{ $from: 'user' | 'agent' }>`
  display: flex;
  justify-content: ${(p) => p.$from === 'user' ? 'flex-end' : 'flex-start'};
`

const ChatBubble = styled.div<{ $from: 'user' | 'agent' }>`
  max-width: 75%;
  padding: 0.625rem 0.875rem;
  border-radius: ${(p) => p.$from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
  background: ${(p) => p.$from === 'user' ? '#7C3AED' : '#1E2640'};
  color: #fff;
  font-size: 0.875rem;
  line-height: 1.5;
  position: relative;
`

const BubbleTime = styled.div`
  font-size: 0.65rem;
  color: rgba(255,255,255,0.45);
  margin-top: 0.25rem;
  text-align: right;
`

const TypingDots = styled.div`
  display: flex; gap: 4px; align-items: center; padding: 2px 0;
  span {
    width: 6px; height: 6px; border-radius: 50%; background: #64748B;
    animation: bounce 1.2s infinite;
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }
`

const ChatInputRow = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid #1E2640;
  background: #0A0E1A;
`

const ChatInput = styled.input`
  flex: 1;
  padding: 0.5rem 0.875rem;
  background: #141929;
  border: 1px solid #1E2640;
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  outline: none;
  &:focus { border-color: #7C3AED; }
  &::placeholder { color: #475569; }
`

const ChatSendBtn = styled.button`
  padding: 0.5rem 1.125rem;
  background: #7C3AED;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: #6D28D9; }
  &:disabled { opacity: 0.4; cursor: default; }
`
