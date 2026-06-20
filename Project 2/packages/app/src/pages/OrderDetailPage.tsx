import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Stack, Chip, Button,
  Grid, Divider, Stepper, Step, StepLabel,
  LinearProgress, alpha, StepConnector, stepConnectorClasses,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Rating, Snackbar, Alert, RadioGroup,
  FormControlLabel, Radio, FormLabel, CircularProgress,
  Avatar, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  ArrowBack, LocalShipping, CheckCircle, Inventory2,
  Receipt, Support, Star, Download,
  Replay, Assignment, DoneAll, DirectionsBike, Store,
  Close, Send, Check, WarningAmber, HeadsetMic,
  Chat, Email, Phone,
} from '@mui/icons-material';
import { formatINR } from '../utils/currency';
import { VV_COLORS } from '../styles/theme';

/* ─── Styled stepper connector ─── */
const VioletConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 22 },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient(90deg, ${VV_COLORS.emerald}, ${VV_COLORS.violetMid})`,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient(90deg, ${VV_COLORS.emerald}, ${VV_COLORS.emerald})`,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3, border: 0, borderRadius: 2,
    backgroundColor: VV_COLORS.slate200,
  },
}));

interface StepIconProps {
  active?: boolean;
  completed?: boolean;
  icon: React.ReactNode;
}

function VioletStepIcon({ active, completed, icon }: StepIconProps) {
  const icons: Record<string, React.ReactNode> = {
    '1': <Assignment fontSize="small" />,
    '2': <Store fontSize="small" />,
    '3': <LocalShipping fontSize="small" />,
    '4': <DirectionsBike fontSize="small" />,
    '5': <DoneAll fontSize="small" />,
  };

  return (
    <Box
      sx={{
        width: 44, height: 44, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: completed
          ? `linear-gradient(135deg, ${VV_COLORS.emerald}, ${VV_COLORS.emeraldDark})`
          : active
            ? `linear-gradient(135deg, ${VV_COLORS.violetLight}, ${VV_COLORS.violetMid})`
            : VV_COLORS.slate200,
        color: (completed || active) ? '#fff' : VV_COLORS.slate400,
        boxShadow: active
          ? `0 0 0 4px ${alpha(VV_COLORS.violetMid, 0.2)}`
          : completed
            ? `0 0 0 3px ${alpha(VV_COLORS.emerald, 0.2)}`
            : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {icons[String(icon)]}
    </Box>
  );
}

const STEPS = ['Order Placed', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];
const ACTIVE_STEP = 4;

const ITEMS = [
  { name: 'Wireless Noise-Cancelling Headphones', qty: 1, price: 12499, emoji: '🎧' },
  { name: 'USB-C Charging Cable 2m',              qty: 1, price: 1099,  emoji: '🔌' },
];

const RETURN_REASONS = [
  'Product damaged or defective',
  'Wrong item delivered',
  'Item not as described',
  'Changed my mind',
  'Better price available elsewhere',
  'Other',
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  /* ── star rating ── */
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  /* ── Write Review dialog ── */
  const [reviewOpen, setReviewOpen]           = useState(false);
  const [reviewItem, setReviewItem]           = useState('');
  const [reviewStars, setReviewStars]         = useState<number | null>(null);
  const [reviewTitle, setReviewTitle]         = useState('');
  const [reviewBody, setReviewBody]           = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone]           = useState(false);

  /* ── Download Invoice ── */
  const [invoiceLoading, setInvoiceLoading]   = useState(false);

  /* ── Return / Refund dialog ── */
  const [returnOpen, setReturnOpen]           = useState(false);
  const [returnReason, setReturnReason]       = useState('');
  const [returnDetails, setReturnDetails]     = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnDone, setReturnDone]           = useState(false);

  /* ── Get Support dialog ── */
  const [supportOpen, setSupportOpen]         = useState(false);
  const [supportMessage, setSupportMessage]   = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportDone, setSupportDone]         = useState(false);

  /* ── Submit Rating snackbar ── */
  const [ratingSnack, setRatingSnack]         = useState(false);

  /* ── Snackbar ── */
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const showSnack = (message: string, severity: 'success' | 'info' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  /* ── Handlers ── */
  function handleReviewSubmit() {
    if (!reviewStars) return;
    setReviewSubmitting(true);
    setTimeout(() => {
      setReviewSubmitting(false);
      setReviewDone(true);
    }, 1400);
  }

  function handleDownloadInvoice() {
    setInvoiceLoading(true);
    setTimeout(() => {
      setInvoiceLoading(false);
      const win = window.open('', '_blank');
      if (!win) return;
      const invoiceNo = `INV-VV-${id}-2025`;
      const orderDate = 'June 10, 2025';
      const deliveryDate = 'June 14, 2025';
      const dueDate = 'Paid';
      win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${invoiceNo} | VendorVault</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;color:#1a1a2e;font-size:13px;}
    .page{max-width:820px;margin:32px auto;background:#fff;border-radius:12px;box-shadow:0 4px 32px rgba(44,27,105,0.10);overflow:hidden;position:relative;}

    /* watermark */
    .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:90px;font-weight:900;color:rgba(108,61,224,0.05);white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:8px;}

    /* header strip */
    .header{background:linear-gradient(135deg,#2D1B69 0%,#6C3DE0 60%,#9B72F5 100%);padding:32px 40px 28px;position:relative;overflow:hidden;}
    .header::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.07);}
    .header::after{content:'';position:absolute;bottom:-30px;right:80px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.05);}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
    .brand-icon{width:48px;height:48px;background:rgba(255,255,255,0.18);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;border:1px solid rgba(255,255,255,0.25);}
    .brand-name{font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;}
    .brand-sub{font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;}
    .header-meta{display:flex;justify-content:space-between;align-items:flex-end;}
    .invoice-title{font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;}
    .invoice-subtitle{font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:2px;text-transform:uppercase;margin-top:4px;}
    .status-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.2);color:#6DFFC7;border:1px solid rgba(16,185,129,0.4);padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;}
    .status-dot{width:7px;height:7px;border-radius:50%;background:#10B981;}

    /* body */
    .body{padding:36px 40px;position:relative;z-index:1;}

    /* info grid */
    .info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-bottom:32px;}
    .info-box{background:#f8f7ff;border:1px solid #ede8ff;border-radius:10px;padding:16px 18px;}
    .info-box-title{font-size:10px;font-weight:700;color:#9B72F5;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;}
    .info-box p{font-size:12.5px;color:#374151;line-height:1.7;margin:0;}
    .info-box strong{color:#1a1a2e;font-weight:700;}

    /* invoice meta row */
    .meta-row{display:flex;gap:12px;margin-bottom:32px;flex-wrap:wrap;}
    .meta-pill{background:#f8f7ff;border:1px solid #ede8ff;border-radius:8px;padding:10px 16px;flex:1;min-width:130px;}
    .meta-pill .label{font-size:10px;font-weight:600;color:#9B72F5;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
    .meta-pill .value{font-size:13px;font-weight:700;color:#2D1B69;}

    /* items table */
    .section-title{font-size:11px;font-weight:700;color:#6C3DE0;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
    .section-title::after{content:'';flex:1;height:1px;background:linear-gradient(to right,#ede8ff,transparent);}
    table{width:100%;border-collapse:collapse;margin-bottom:28px;}
    thead tr{background:linear-gradient(135deg,#2D1B69,#6C3DE0);}
    thead th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;}
    thead th:last-child{text-align:right;}
    tbody tr{border-bottom:1px solid #f0edf9;}
    tbody tr:hover{background:#faf9ff;}
    tbody td{padding:14px 16px;font-size:13px;color:#374151;vertical-align:middle;}
    tbody td:last-child{text-align:right;font-weight:700;color:#2D1B69;}
    .item-name{font-weight:600;color:#1a1a2e;margin-bottom:3px;}
    .item-desc{font-size:11px;color:#9ca3af;}
    .item-emoji{font-size:22px;margin-right:10px;vertical-align:middle;}
    .qty-badge{display:inline-block;background:#f0edf9;color:#6C3DE0;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700;}
    .hsn{font-size:11px;color:#9ca3af;}

    /* totals */
    .totals-section{display:flex;justify-content:flex-end;margin-bottom:28px;}
    .totals-box{width:320px;background:#f8f7ff;border:1px solid #ede8ff;border-radius:12px;overflow:hidden;}
    .totals-row{display:flex;justify-content:space-between;padding:10px 18px;border-bottom:1px solid #ede8ff;}
    .totals-row:last-child{border-bottom:none;background:linear-gradient(135deg,#2D1B69,#6C3DE0);padding:14px 18px;}
    .totals-row .t-label{font-size:12.5px;color:#6b7280;}
    .totals-row .t-value{font-size:12.5px;font-weight:600;color:#1a1a2e;}
    .totals-row.grand .t-label{color:rgba(255,255,255,0.8);font-weight:700;font-size:13px;}
    .totals-row.grand .t-value{color:#fff;font-weight:800;font-size:16px;}
    .discount{color:#10B981 !important;}

    /* tax breakdown */
    .tax-table{width:100%;border-collapse:collapse;margin-bottom:28px;font-size:12px;}
    .tax-table th{background:#f0edf9;color:#6C3DE0;padding:8px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;}
    .tax-table td{padding:8px 14px;border-bottom:1px solid #f0edf9;color:#4b5563;}
    .tax-table td:last-child{text-align:right;font-weight:600;}

    /* payment & shipping row */
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;}
    .detail-card{background:#f8f7ff;border:1px solid #ede8ff;border-radius:10px;padding:16px 18px;}
    .detail-card .dc-title{font-size:10px;font-weight:700;color:#9B72F5;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;}
    .detail-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #ede8ff;}
    .detail-row:last-child{border-bottom:none;}
    .detail-row .dk{font-size:11.5px;color:#6b7280;}
    .detail-row .dv{font-size:11.5px;font-weight:600;color:#1a1a2e;text-align:right;}

    /* signature */
    .sig-section{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;}
    .sig-box{border:1px dashed #d1c4e9;border-radius:10px;padding:16px 20px;min-height:80px;display:flex;flex-direction:column;justify-content:space-between;}
    .sig-label{font-size:10px;font-weight:700;color:#9B72F5;text-transform:uppercase;letter-spacing:1.5px;}
    .sig-name{font-size:13px;font-weight:700;color:#2D1B69;margin-top:24px;}
    .sig-sub{font-size:11px;color:#9ca3af;}
    .sig-stamp{width:60px;height:60px;border-radius:50%;border:3px solid #6C3DE0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#6C3DE0;text-align:center;line-height:1.2;float:right;background:rgba(108,61,224,0.05);}

    /* notes */
    .notes-box{background:#fff8e1;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:28px;}
    .notes-box .n-title{font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
    .notes-box p{font-size:12px;color:#78350f;line-height:1.6;}

    /* footer */
    .footer{background:linear-gradient(135deg,#2D1B69,#6C3DE0);padding:20px 40px;display:flex;justify-content:space-between;align-items:center;}
    .footer p{font-size:11px;color:rgba(255,255,255,0.7);}
    .footer strong{color:#fff;}
    .footer-right{text-align:right;}
    .powered{font-size:10px;color:rgba(255,255,255,0.45);margin-top:4px;}

    /* QR placeholder */
    .qr-box{width:72px;height:72px;border:2px solid rgba(255,255,255,0.25);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;}

    @media print {
      body{background:#fff;}
      .page{margin:0;box-shadow:none;border-radius:0;}
      .no-print{display:none!important;}
    }
  </style>
</head>
<body>
<div class="page">
  <div class="watermark">VENDORVAULT</div>

  <!-- HEADER -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">🛍</div>
      <div>
        <div class="brand-name">VendorVault</div>
        <div class="brand-sub">Multi-Vendor Marketplace</div>
      </div>
    </div>
    <div class="header-meta">
      <div>
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-subtitle">Original for Recipient</div>
      </div>
      <div style="text-align:right;">
        <div class="status-badge"><span class="status-dot"></span>PAID &amp; DELIVERED</div>
        <div style="color:rgba(255,255,255,0.55);font-size:11px;margin-top:8px;">${invoiceNo}</div>
      </div>
    </div>
  </div>

  <div class="body">

    <!-- META PILLS -->
    <div class="meta-row">
      <div class="meta-pill"><div class="label">Invoice No.</div><div class="value">${invoiceNo}</div></div>
      <div class="meta-pill"><div class="label">Order ID</div><div class="value">${id}</div></div>
      <div class="meta-pill"><div class="label">Invoice Date</div><div class="value">${orderDate}</div></div>
      <div class="meta-pill"><div class="label">Delivery Date</div><div class="value">${deliveryDate}</div></div>
      <div class="meta-pill"><div class="label">Payment Status</div><div class="value" style="color:#10B981;">${dueDate}</div></div>
    </div>

    <!-- PARTY INFO GRID -->
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">Sold By (Vendor)</div>
        <p><strong>SoundWave Store</strong><br/>
        B-204, Tech Park, Whitefield<br/>
        Bengaluru, Karnataka – 560066<br/>
        India<br/>
        <strong>GSTIN:</strong> 29AAPFU0939F1ZV<br/>
        <strong>PAN:</strong> AAPFU0939F<br/>
        support@soundwavestore.in</p>
      </div>
      <div class="info-box">
        <div class="info-box-title">Billed To (Customer)</div>
        <p><strong>Demo User</strong><br/>
        123 Main Street, Apt 4B<br/>
        Austin, Texas – 78701<br/>
        United States<br/>
        <strong>Email:</strong> demo@vendorvault.in<br/>
        <strong>Phone:</strong> +91 98765 43210</p>
      </div>
      <div class="info-box">
        <div class="info-box-title">Shipped To</div>
        <p><strong>Demo User</strong><br/>
        123 Main Street, Apt 4B<br/>
        Austin, Texas – 78701<br/>
        United States<br/><br/>
        <strong>Carrier:</strong> FedEx Ground<br/>
        <strong>AWB:</strong> 774899776376</p>
      </div>
    </div>

    <!-- ITEMS TABLE -->
    <div class="section-title">Items Ordered</div>
    <table>
      <thead>
        <tr>
          <th style="width:42%">Product Description</th>
          <th>HSN Code</th>
          <th>Unit Price</th>
          <th>Qty</th>
          <th>Discount</th>
          <th>Taxable Value</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span class="item-emoji">🎧</span>
            <div class="item-name" style="display:inline-block;vertical-align:middle;">
              Wireless Noise-Cancelling Headphones<br/>
              <span class="item-desc">Model: SoundWave Pro X1 · Color: Midnight Black · 1 Year Warranty</span>
            </div>
          </td>
          <td><span class="hsn">8518 22 00</span></td>
          <td>₹10,592</td>
          <td><span class="qty-badge">1</span></td>
          <td class="discount">₹0</td>
          <td>₹10,592</td>
          <td>₹12,499</td>
        </tr>
        <tr>
          <td>
            <span class="item-emoji">🔌</span>
            <div class="item-name" style="display:inline-block;vertical-align:middle;">
              USB-C Charging Cable 2m<br/>
              <span class="item-desc">Model: SpeedLink Pro · 100W PD · Braided Nylon</span>
            </div>
          </td>
          <td><span class="hsn">8544 42 90</span></td>
          <td>₹931</td>
          <td><span class="qty-badge">1</span></td>
          <td class="discount">₹0</td>
          <td>₹931</td>
          <td>₹1,099</td>
        </tr>
      </tbody>
    </table>

    <!-- TAX BREAKDOWN -->
    <div class="section-title">GST Tax Breakdown</div>
    <table class="tax-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Taxable Value</th>
          <th>CGST (9%)</th>
          <th>SGST (9%)</th>
          <th>IGST</th>
          <th>Total Tax</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Wireless Noise-Cancelling Headphones</td>
          <td>₹10,592</td>
          <td>₹953</td>
          <td>₹953</td>
          <td>—</td>
          <td>₹1,907</td>
        </tr>
        <tr>
          <td>USB-C Charging Cable 2m</td>
          <td>₹931</td>
          <td>₹84</td>
          <td>₹84</td>
          <td>—</td>
          <td>₹168</td>
        </tr>
        <tr style="background:#f0edf9;font-weight:700;">
          <td><strong>Total</strong></td>
          <td><strong>₹11,523</strong></td>
          <td><strong>₹1,037</strong></td>
          <td><strong>₹1,037</strong></td>
          <td>—</td>
          <td><strong>₹2,075</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- TOTALS -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row"><span class="t-label">Subtotal (excl. tax)</span><span class="t-value">₹11,523</span></div>
        <div class="totals-row"><span class="t-label">CGST (9%)</span><span class="t-value">₹1,037</span></div>
        <div class="totals-row"><span class="t-label">SGST (9%)</span><span class="t-value">₹1,037</span></div>
        <div class="totals-row"><span class="t-label">Shipping Charges</span><span class="t-value discount">FREE</span></div>
        <div class="totals-row"><span class="t-label">Discount</span><span class="t-value discount">— ₹0</span></div>
        <div class="totals-row grand"><span class="t-label">TOTAL PAID</span><span class="t-value">₹13,598</span></div>
      </div>
    </div>

    <!-- AMOUNT IN WORDS -->
    <div style="background:#f8f7ff;border:1px solid #ede8ff;border-radius:8px;padding:12px 18px;margin-bottom:28px;">
      <span style="font-size:10px;font-weight:700;color:#9B72F5;text-transform:uppercase;letter-spacing:1px;">Amount in Words: </span>
      <span style="font-size:12.5px;font-weight:600;color:#2D1B69;">Thirteen Thousand Five Hundred and Ninety Eight Rupees Only</span>
    </div>

    <!-- PAYMENT & SHIPPING -->
    <div class="two-col">
      <div class="detail-card">
        <div class="dc-title">Payment Information</div>
        <div class="detail-row"><span class="dk">Method</span><span class="dv">Credit Card</span></div>
        <div class="detail-row"><span class="dk">Card</span><span class="dv">Visa •••• 4242</span></div>
        <div class="detail-row"><span class="dk">Transaction ID</span><span class="dv">TXN-VV-8834521</span></div>
        <div class="detail-row"><span class="dk">Payment Date</span><span class="dv">June 10, 2025</span></div>
        <div class="detail-row"><span class="dk">Status</span><span class="dv" style="color:#10B981;">✓ Successful</span></div>
      </div>
      <div class="detail-card">
        <div class="dc-title">Shipping Information</div>
        <div class="detail-row"><span class="dk">Carrier</span><span class="dv">FedEx Ground</span></div>
        <div class="detail-row"><span class="dk">Tracking No.</span><span class="dv">774899776376</span></div>
        <div class="detail-row"><span class="dk">Service</span><span class="dv">Standard Delivery</span></div>
        <div class="detail-row"><span class="dk">Dispatched</span><span class="dv">June 11, 2025</span></div>
        <div class="detail-row"><span class="dk">Delivered</span><span class="dv" style="color:#10B981;">June 14, 2025</span></div>
      </div>
    </div>

    <!-- NOTES -->
    <div class="notes-box">
      <div class="n-title">⚠ Important Notes</div>
      <p>
        1. This is a computer-generated invoice and does not require a physical signature.<br/>
        2. Goods once sold will not be taken back or exchanged unless covered under our return policy (within 10 days of delivery).<br/>
        3. All disputes are subject to the jurisdiction of courts in Bengaluru, Karnataka, India.<br/>
        4. For warranty claims, please retain this invoice and contact the vendor directly.
      </p>
    </div>

    <!-- SIGNATURES -->
    <div class="sig-section">
      <div class="sig-box">
        <div class="sig-label">Customer Acknowledgement</div>
        <div>
          <div class="sig-name">Demo User</div>
          <div class="sig-sub">Customer · Order accepted</div>
        </div>
      </div>
      <div class="sig-box">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div class="sig-label">Authorised Signatory</div>
          <div class="sig-stamp">VV<br/>PAID</div>
        </div>
        <div>
          <div class="sig-name">SoundWave Store</div>
          <div class="sig-sub">For VendorVault Marketplace</div>
        </div>
      </div>
    </div>

  </div><!-- /body -->

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <p><strong>VendorVault Technologies Pvt. Ltd.</strong></p>
      <p>CIN: U74999KA2024PTC123456 · GSTIN: 29AABCV1234F1Z5</p>
      <p>support@vendorvault.in · www.vendorvault.in · 1800-XXX-XXXX</p>
    </div>
    <div class="qr-box">🔳</div>
    <div class="footer-right">
      <p>Thank you for shopping with <strong>VendorVault!</strong></p>
      <p>Invoice generated on ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</p>
      <p class="powered">Powered by VendorVault · Page 1 of 1</p>
    </div>
  </div>

  <!-- PRINT BUTTON -->
  <div class="no-print" style="text-align:center;padding:20px;background:#f8f7ff;">
    <button onclick="window.print()" style="background:linear-gradient(135deg,#2D1B69,#6C3DE0);color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.5px;">
      🖨 Print / Save as PDF
    </button>
    <p style="font-size:11px;color:#9ca3af;margin-top:8px;">Use browser Print → Save as PDF to download</p>
  </div>

</div>
</body>
</html>`);
      win.document.close();
      showSnack('Professional invoice opened — click "Print / Save as PDF"', 'success');
    }, 1000);
  }

  function handleReturnSubmit() {
    if (!returnReason) return;
    setReturnSubmitting(true);
    setTimeout(() => {
      setReturnSubmitting(false);
      setReturnDone(true);
    }, 1600);
  }

  function handleSupportSubmit() {
    if (!supportMessage.trim()) return;
    setSupportSubmitting(true);
    setTimeout(() => {
      setSupportSubmitting(false);
      setSupportDone(true);
    }, 1500);
  }

  function handleRatingSubmit() {
    setRatingSnack(true);
  }

  return (
    <Box>
      {/* ── Back Button ── */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/orders')}
        sx={{ mb: 3, color: VV_COLORS.slate600, '&:hover': { color: VV_COLORS.violetMid } }}
      >
        Back to Orders
      </Button>

      {/* ── Hero Banner ── */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 60%, ${VV_COLORS.violetLight} 100%)`,
          borderRadius: 3,
          p: { xs: 3, md: 4 },
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -50, right: -50,
            width: 200, height: 200,
            borderRadius: '50%',
            background: alpha('#fff', 0.06),
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
              <Typography variant="h4" fontWeight={800} color="#fff">
                Order {id}
              </Typography>
              <Chip
                label="Delivered"
                size="small"
                sx={{
                  bgcolor: alpha(VV_COLORS.emerald, 0.25),
                  color: '#fff',
                  fontWeight: 700,
                  border: `1px solid ${alpha(VV_COLORS.emerald, 0.5)}`,
                }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.7) }}>
              Placed on June 10, 2025 &nbsp;·&nbsp; Delivered June 14, 2025
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: alpha('#fff', 0.12),
              borderRadius: 2.5,
              px: 3, py: 2,
              border: `1px solid ${alpha('#fff', 0.18)}`,
              textAlign: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Typography variant="h5" fontWeight={800} color="#fff">
              {formatINR(13598)}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
              Order Total
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Tracking Section ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2,
                bgcolor: alpha(VV_COLORS.violetMid, 0.1),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <LocalShipping sx={{ color: VV_COLORS.violetMid }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Shipment Tracking</Typography>
              <Typography variant="caption" color="text.secondary">
                FedEx Ground · Tracking #{' '}
                <Typography component="span" variant="caption" fontWeight={700} color={VV_COLORS.violetMid}>
                  774899776376
                </Typography>
              </Typography>
            </Box>
          </Stack>

          <Stepper activeStep={ACTIVE_STEP} alternativeLabel connector={<VioletConnector />}>
            {STEPS.map((label, idx) => (
              <Step key={label} completed={idx <= ACTIVE_STEP}>
                <StepLabel
                  StepIconComponent={VioletStepIcon}
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontWeight: idx === ACTIVE_STEP ? 700 : 500,
                      color: idx === ACTIVE_STEP ? VV_COLORS.violetMid : 'inherit',
                      fontSize: '0.75rem',
                      mt: 1,
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box
            sx={{
              mt: 4, borderRadius: 2.5, p: 2.5,
              background: `linear-gradient(135deg, ${alpha(VV_COLORS.emerald, 0.08)}, ${alpha(VV_COLORS.emerald, 0.04)})`,
              border: `1.5px solid ${alpha(VV_COLORS.emerald, 0.3)}`,
              display: 'flex', alignItems: 'center', gap: 2,
            }}
          >
            <Box
              sx={{
                width: 40, height: 40, borderRadius: '50%',
                bgcolor: VV_COLORS.emerald,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={700} color={VV_COLORS.emeraldDark}>
                Package Delivered Successfully
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Delivered on June 14, 2025 at 2:34 PM &nbsp;·&nbsp; Left at front door
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* ── Items Ordered ── */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                <Box
                  sx={{
                    width: 36, height: 36, borderRadius: 1.5,
                    bgcolor: alpha(VV_COLORS.violetMid, 0.1),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Inventory2 sx={{ color: VV_COLORS.violetMid, fontSize: 20 }} />
                </Box>
                <Typography variant="h6" fontWeight={700}>Items Ordered</Typography>
              </Stack>

              <Stack spacing={2}>
                {ITEMS.map((item, idx) => (
                  <Box key={item.name}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 56, height: 56, borderRadius: 2,
                          bgcolor: VV_COLORS.violetPastel,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 26, flexShrink: 0,
                          border: `1px solid ${alpha(VV_COLORS.violetMid, 0.15)}`,
                        }}
                      >
                        {item.emoji}
                      </Box>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Qty: {item.qty}
                        </Typography>
                      </Box>
                      <Stack alignItems="flex-end" spacing={0.75} flexShrink={0}>
                        <Typography variant="body1" fontWeight={700} color={VV_COLORS.slate800}>
                          {formatINR(item.price)}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Star sx={{ fontSize: '14px !important' }} />}
                          onClick={() => { setReviewItem(item.name); setReviewStars(null); setReviewTitle(''); setReviewBody(''); setReviewDone(false); setReviewOpen(true); }}
                          sx={{ fontSize: '0.7rem', py: 0.375, px: 1.25, borderRadius: 1.5 }}
                        >
                          Write Review
                        </Button>
                      </Stack>
                    </Stack>
                    {idx < ITEMS.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 2.5 }} />
              <Stack spacing={1}>
                {[
                  { label: 'Subtotal', value: formatINR(13598) },
                  { label: 'Shipping', value: 'Free' },
                  { label: 'Tax (GST)', value: formatINR(0) },
                ].map(row => (
                  <Stack key={row.label} direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                  </Stack>
                ))}
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" fontWeight={700}>Total Paid</Typography>
                  <Typography variant="h6" fontWeight={800} color={VV_COLORS.violetMid}>
                    {formatINR(13598)}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Order Summary Sidebar ── */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            <Card>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
                  <Box
                    sx={{
                      width: 36, height: 36, borderRadius: 1.5,
                      bgcolor: alpha(VV_COLORS.amber, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Receipt sx={{ color: VV_COLORS.amber, fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Order Summary</Typography>
                </Stack>

                <Stack spacing={2}>
                  {[
                    { label: 'Vendor',      value: 'SoundWave Store', icon: '🏪' },
                    { label: 'Shipped via', value: 'FedEx Ground',     icon: '🚚' },
                    { label: 'Tracking #',  value: '774899776376',      icon: '📦' },
                    { label: 'Payment',     value: 'Visa •••• 4242',   icon: '💳' },
                    { label: 'Ship to',     value: '123 Main St, Austin TX 78701', icon: '📍' },
                  ].map(row => (
                    <Stack key={row.label} direction="row" spacing={1.5} alignItems="flex-start">
                      <Typography fontSize={16} lineHeight={1.4}>{row.icon}</Typography>
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {row.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-all' }}>
                          {row.value}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>

                <Divider sx={{ my: 2.5 }} />

                <Stack spacing={1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={invoiceLoading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <Download />}
                    disabled={invoiceLoading}
                    onClick={handleDownloadInvoice}
                    sx={{ py: 1.25 }}
                  >
                    {invoiceLoading ? 'Generating...' : 'Download Invoice'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Support />}
                    onClick={() => { setSupportMessage(''); setSupportDone(false); setSupportOpen(true); }}
                  >
                    Get Support
                  </Button>
                  <Button
                    fullWidth
                    variant="text"
                    color="error"
                    startIcon={<Replay />}
                    onClick={() => { setReturnReason(''); setReturnDetails(''); setReturnDone(false); setReturnOpen(true); }}
                    sx={{ '&:hover': { bgcolor: alpha(VV_COLORS.coral, 0.06) } }}
                  >
                    Return / Refund
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* ── Rate Your Experience ── */}
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={3}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                <Box
                  sx={{
                    width: 36, height: 36, borderRadius: 1.5,
                    background: `linear-gradient(135deg, ${VV_COLORS.amber}, ${VV_COLORS.amberDark})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Star sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" fontWeight={700}>Rate Your Experience</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                How was your overall shopping experience with SoundWave Store?
              </Typography>
            </Box>

            <Stack spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
              <Stack direction="row" spacing={0.5}>
                {[1, 2, 3, 4, 5].map(star => {
                  const filled = star <= (hoverRating || rating);
                  return (
                    <Box
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      sx={{ cursor: 'pointer', transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.2)' } }}
                    >
                      {filled
                        ? <Star sx={{ color: VV_COLORS.amber, fontSize: 32 }} />
                        : <Star sx={{ color: VV_COLORS.slate200, fontSize: 32 }} />
                      }
                    </Box>
                  );
                })}
              </Stack>
              {rating > 0 && (
                <Typography variant="caption" color={VV_COLORS.amber} fontWeight={700}>
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]} — thanks for your feedback!
                </Typography>
              )}
              {rating > 0 && (
                <Button variant="contained" size="small" sx={{ borderRadius: 2 }} onClick={handleRatingSubmit}>
                  Submit Rating
                </Button>
              )}
            </Stack>
          </Stack>

          {rating === 0 && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={0}
                sx={{
                  height: 4, borderRadius: 2,
                  bgcolor: VV_COLORS.slate100,
                  '& .MuiLinearProgress-bar': { bgcolor: VV_COLORS.amber },
                }}
              />
              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                Click the stars above to rate your experience
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════
          DIALOG: Write Review
      ════════════════════════════════════════════ */}
      <Dialog open={reviewOpen} onClose={() => { if (!reviewSubmitting) setReviewOpen(false); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: alpha(VV_COLORS.amber, 0.15), color: VV_COLORS.amber, width: 36, height: 36 }}>
                <Star fontSize="small" />
              </Avatar>
              <Box>
                <Typography fontWeight={700}>Write a Review</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                  {reviewItem}
                </Typography>
              </Box>
            </Stack>
            <Button size="small" onClick={() => setReviewOpen(false)} disabled={reviewSubmitting} sx={{ minWidth: 0, p: 0.5 }}>
              <Close fontSize="small" />
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {reviewDone ? (
            <Stack alignItems="center" spacing={2} py={3}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(VV_COLORS.emerald, 0.12), color: VV_COLORS.emerald }}>
                <CheckCircle sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={700} textAlign="center">Review Submitted!</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Thank you for sharing your feedback. Your review helps other shoppers make better decisions.
              </Typography>
              <Chip label="Review is live" sx={{ bgcolor: alpha(VV_COLORS.emerald, 0.1), color: VV_COLORS.emeraldDark, fontWeight: 700 }} />
            </Stack>
          ) : (
            <Stack spacing={3} pt={1}>
              <Box>
                <Typography variant="body2" fontWeight={600} mb={1}>Your Rating *</Typography>
                <Rating
                  value={reviewStars}
                  onChange={(_, v) => setReviewStars(v)}
                  size="large"
                  sx={{ color: VV_COLORS.amber, '& .MuiRating-iconEmpty': { color: VV_COLORS.slate200 } }}
                />
                {reviewStars && (
                  <Typography variant="caption" color={VV_COLORS.amber} fontWeight={600} mt={0.5} display="block">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewStars]}
                  </Typography>
                )}
              </Box>
              <TextField
                label="Review Title"
                placeholder="Summarise your experience in one line"
                value={reviewTitle}
                onChange={e => setReviewTitle(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Your Review"
                placeholder="Tell others what you liked or didn't like about this product..."
                value={reviewBody}
                onChange={e => setReviewBody(e.target.value)}
                fullWidth
                multiline
                rows={4}
                size="small"
              />
            </Stack>
          )}
        </DialogContent>

        {!reviewDone && (
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setReviewOpen(false)} disabled={reviewSubmitting}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!reviewStars || reviewSubmitting}
              startIcon={reviewSubmitting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <Send />}
              onClick={handleReviewSubmit}
            >
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogActions>
        )}
        {reviewDone && (
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="contained" onClick={() => setReviewOpen(false)}>Done</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ════════════════════════════════════════════
          DIALOG: Return / Refund
      ════════════════════════════════════════════ */}
      <Dialog open={returnOpen} onClose={() => { if (!returnSubmitting) setReturnOpen(false); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: alpha(VV_COLORS.coral, 0.12), color: VV_COLORS.coral, width: 36, height: 36 }}>
                <Replay fontSize="small" />
              </Avatar>
              <Box>
                <Typography fontWeight={700}>Request Return / Refund</Typography>
                <Typography variant="caption" color="text.secondary">Order {id}</Typography>
              </Box>
            </Stack>
            <Button size="small" onClick={() => setReturnOpen(false)} disabled={returnSubmitting} sx={{ minWidth: 0, p: 0.5 }}>
              <Close fontSize="small" />
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {returnDone ? (
            <Stack alignItems="center" spacing={2} py={3}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(VV_COLORS.emerald, 0.12), color: VV_COLORS.emerald }}>
                <CheckCircle sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={700} textAlign="center">Return Request Submitted!</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Your return request <strong>RET-{id}-2025</strong> has been raised. Our team will review it within 24–48 hours and initiate the refund to your original payment method.
              </Typography>
              <Stack spacing={1} width="100%">
                {[
                  { label: 'Refund Amount', value: formatINR(13598) },
                  { label: 'Refund to', value: 'Visa •••• 4242' },
                  { label: 'Processing Time', value: '5–7 business days' },
                ].map(r => (
                  <Stack key={r.label} direction="row" justifyContent="space-between"
                    sx={{ bgcolor: alpha(VV_COLORS.slate50, 0.8), px: 2, py: 1, borderRadius: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">{r.label}</Typography>
                    <Typography variant="caption" fontWeight={700}>{r.value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={3} pt={1}>
              <Box
                sx={{
                  p: 2, borderRadius: 2,
                  bgcolor: alpha(VV_COLORS.amber, 0.07),
                  border: `1px solid ${alpha(VV_COLORS.amber, 0.25)}`,
                  display: 'flex', gap: 1.5, alignItems: 'flex-start',
                }}
              >
                <WarningAmber sx={{ color: VV_COLORS.amber, fontSize: 20, mt: 0.1 }} />
                <Typography variant="caption" color="text.secondary">
                  Return window: <strong>10 days from delivery</strong>. This order was delivered on June 14, 2025. Last return date: <strong>June 24, 2025</strong>.
                </Typography>
              </Box>

              <Box>
                <FormLabel sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary', mb: 1, display: 'block' }}>
                  Reason for Return *
                </FormLabel>
                <RadioGroup value={returnReason} onChange={e => setReturnReason(e.target.value)}>
                  {RETURN_REASONS.map(r => (
                    <FormControlLabel key={r} value={r} control={<Radio size="small" />} label={
                      <Typography variant="body2">{r}</Typography>
                    } />
                  ))}
                </RadioGroup>
              </Box>

              <TextField
                label="Additional Details (optional)"
                placeholder="Describe the issue in more detail..."
                value={returnDetails}
                onChange={e => setReturnDetails(e.target.value)}
                fullWidth
                multiline
                rows={3}
                size="small"
              />
            </Stack>
          )}
        </DialogContent>

        {!returnDone ? (
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setReturnOpen(false)} disabled={returnSubmitting}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              disabled={!returnReason || returnSubmitting}
              startIcon={returnSubmitting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <Replay />}
              onClick={handleReturnSubmit}
            >
              {returnSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogActions>
        ) : (
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="contained" onClick={() => setReturnOpen(false)}>Done</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ════════════════════════════════════════════
          DIALOG: Get Support
      ════════════════════════════════════════════ */}
      <Dialog open={supportOpen} onClose={() => { if (!supportSubmitting) setSupportOpen(false); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: alpha(VV_COLORS.violetMid, 0.12), color: VV_COLORS.violetMid, width: 36, height: 36 }}>
                <HeadsetMic fontSize="small" />
              </Avatar>
              <Box>
                <Typography fontWeight={700}>Get Support</Typography>
                <Typography variant="caption" color="text.secondary">Order {id}</Typography>
              </Box>
            </Stack>
            <Button size="small" onClick={() => setSupportOpen(false)} disabled={supportSubmitting} sx={{ minWidth: 0, p: 0.5 }}>
              <Close fontSize="small" />
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {supportDone ? (
            <Stack alignItems="center" spacing={2} py={3}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(VV_COLORS.violetMid, 0.12), color: VV_COLORS.violetMid }}>
                <Check sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={700} textAlign="center">Support Ticket Created!</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Your ticket <strong>#SUP-{id}-{Math.floor(Math.random() * 9000) + 1000}</strong> has been raised. Our support team will get back to you within <strong>2–4 hours</strong>.
              </Typography>
              <Box sx={{ width: '100%', bgcolor: alpha(VV_COLORS.violetMid, 0.05), borderRadius: 2, p: 2, border: `1px solid ${alpha(VV_COLORS.violetMid, 0.12)}` }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                  We&apos;ll reach you via:
                </Typography>
                <Stack spacing={0.75}>
                  {[
                    { icon: <Email fontSize="small" />, text: 'demo@vendorvault.in' },
                    { icon: <Chat fontSize="small" />, text: 'In-app chat notification' },
                  ].map((c, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      <Box sx={{ color: VV_COLORS.violetMid }}>{c.icon}</Box>
                      <Typography variant="caption">{c.text}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={3} pt={1}>
              {/* Quick contact options */}
              <Box>
                <Typography variant="body2" fontWeight={600} mb={1.5}>Quick Contact</Typography>
                <List dense disablePadding sx={{ bgcolor: alpha(VV_COLORS.slate50, 0.6), borderRadius: 2, border: `1px solid ${alpha(VV_COLORS.slate200, 0.6)}` }}>
                  {[
                    { icon: <Chat sx={{ color: VV_COLORS.violetMid }} />, primary: 'Live Chat', secondary: 'Avg. response: 5 min', badge: 'Online' },
                    { icon: <Phone sx={{ color: VV_COLORS.emerald }} />, primary: 'Call Support', secondary: '1800-XXX-XXXX · Mon–Sat 9AM–6PM', badge: null },
                    { icon: <Email sx={{ color: VV_COLORS.amber }} />, primary: 'Email Support', secondary: 'support@vendorvault.in', badge: null },
                  ].map((item, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Divider component="li" />}
                      <ListItem sx={{ py: 1.25 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                        <ListItemText
                          primary={<Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={600}>{item.primary}</Typography>
                            {item.badge && <Chip label={item.badge} size="small" sx={{ height: 18, fontSize: 10, bgcolor: alpha(VV_COLORS.emerald, 0.12), color: VV_COLORS.emeraldDark, fontWeight: 700 }} />}
                          </Stack>}
                          secondary={item.secondary}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Box>

              <Divider>
                <Typography variant="caption" color="text.secondary">or send us a message</Typography>
              </Divider>

              <TextField
                label="Describe your issue"
                placeholder="E.g. I received a damaged product, missing item, wrong color..."
                value={supportMessage}
                onChange={e => setSupportMessage(e.target.value)}
                fullWidth
                multiline
                rows={4}
                size="small"
              />
            </Stack>
          )}
        </DialogContent>

        {!supportDone ? (
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setSupportOpen(false)} disabled={supportSubmitting}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!supportMessage.trim() || supportSubmitting}
              startIcon={supportSubmitting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <Send />}
              onClick={handleSupportSubmit}
            >
              {supportSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogActions>
        ) : (
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="contained" onClick={() => setSupportOpen(false)}>Done</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ── Global Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}
          sx={{ borderRadius: 2 }}>
          {snack.message}
        </Alert>
      </Snackbar>

      {/* ── Rating submitted snackbar ── */}
      <Snackbar
        open={ratingSnack}
        autoHideDuration={3500}
        onClose={() => setRatingSnack(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setRatingSnack(false)} sx={{ borderRadius: 2 }}
          icon={<Star fontSize="inherit" />}>
          Rating submitted — thank you for your feedback!
        </Alert>
      </Snackbar>
    </Box>
  );
}
