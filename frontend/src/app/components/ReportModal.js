"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Shield,
  User,
  ShieldAlert,
  CheckCircle2,
  X,
  Maximize2,
  Minimize2,
  AlertTriangle,
  MapPin,
  Compass,
  IndianRupee,
  Lock,
  PhoneCall,
  BellRing
} from "lucide-react";
import { findAreaByInput, KNOWN_AREAS } from "../data/knownAreas";

const INITIAL_MESSAGES = [
  {
    id: "m-1",
    sender: "bot",
    text: "Welcome to Citizen Fraud Registry.\n\nPaste the suspicious SMS, call demand, or link you received. We will run instant community cross-verification against known scam patterns.",
    quickReplies: [
      { label: "Phone Call Threat", value: "phone_call" },
      { label: "SMS / WhatsApp Message", value: "sms" },
      { label: "Fake UPI / QR Request", value: "upi" },
      { label: "Phishing Link / Website", value: "link" },
    ],
  },
];

// Contextual dynamic investigation questions tailored to each scam category
const SCAM_INVESTIGATION_QUESTIONS = {
  "digital-arrest": {
    question: "This matches an impersonation attempt by a fake law enforcement or customs officer. To help police track their apparatus:",
    prompt: "Did they demand a video call or claim an illegal parcel was found in your name?",
    replies: [
      { label: "📹 Video Call Demanded (Skype/WhatsApp with fake uniform)", value: "tactic_video_call" },
      { label: "📦 Illegal FedEx/DHL Parcel with drugs claimed in my name", value: "tactic_parcel_drugs" },
      { label: "🔒 Ordered me to stay isolated in a room and not call family", value: "tactic_room_isolation" },
      { label: "🏦 Demanded transfer to a 'Safe Government RBI Account'", value: "tactic_rbi_bail" },
    ],
  },
  "electricity-disconnection": {
    question: "This matches an Electricity Disconnection extortion scheme targeting household power consumers.",
    prompt: "What specific method did they use to threaten power cutoff?",
    replies: [
      { label: "⏰ Threatened power cutoff tonight (e.g. 9:30 PM)", value: "tactic_night_cutoff" },
      { label: "📲 Sent an APK file (e.g. Suvidha.apk / Urja.apk) to install", value: "tactic_apk_install" },
      { label: "📞 Instructed to call a personal 10-digit mobile number", value: "tactic_personal_phone" },
      { label: "💳 Demanded ₹10 to ₹50 token payment via unknown link", value: "tactic_token_payment" },
    ],
  },
  "job-offer": {
    question: "This matches a Part-Time Task & Investment Trap (Telegram/WhatsApp task fraud).",
    prompt: "What stage of the recruitment trap did you encounter?",
    replies: [
      { label: "📢 Telegram group for liking YouTube videos or hotel ratings", value: "tactic_telegram_tasks" },
      { label: "💵 Paid small initial return (₹150–₹500) to gain trust", value: "tactic_small_payout" },
      { label: "🚫 Froze funds & demanded deposit (₹10,000+) to withdraw", value: "tactic_deposit_demand" },
      { label: "💬 Unsolicited WhatsApp message from fake HR recruiter", value: "tactic_unsolicited_hr" },
    ],
  },
  "fake-kyc-link": {
    question: "This matches a Banking & KYC Phishing Attack impersonating financial institutions.",
    prompt: "What sensitive information or access did they try to extract?",
    replies: [
      { label: "🔗 Phishing link asking for NetBanking ID, Password or CVV", value: "tactic_credential_phish" },
      { label: "📥 Instructed to download screen-sharing app (AnyDesk/RustDesk)", value: "tactic_screen_share" },
      { label: "⛔ Claimed bank account or PAN will be permanently blocked", value: "tactic_account_blocked" },
      { label: "🔢 Caller insisted on reading out the OTP code received on SMS", value: "tactic_otp_demand" },
    ],
  },
  "upi-refund-qr": {
    question: "This matches a QR Code & UPI Inversion Fraud (money extraction trick).",
    prompt: "How did they attempt to trick you into authorizing payment?",
    replies: [
      { label: "📷 Sent QR code claiming 'Scan QR code to receive money'", value: "tactic_scan_to_receive" },
      { label: "📥 Sent UPI Collect Request pretending it was an incoming refund", value: "tactic_collect_request" },
      { label: "🎖️ Posed as an Army/Defence officer transferring on duty", value: "tactic_army_officer" },
      { label: "📦 Demanded advance courier or delivery fee before purchase", value: "tactic_advance_courier" },
    ],
  },
  "loan-app-harassment": {
    question: "This matches an Unregulated Predatory Loan Harassment Scheme.",
    prompt: "What harassment or coercion tactics did they use?",
    replies: [
      { label: "📱 App demanded access to complete contact list & gallery", value: "tactic_permission_abuse" },
      { label: "⚠️ Threatened to send morphed photos to family/contacts", value: "tactic_morphed_threat" },
      { label: "💸 Deducted 40-50% processing fees before loan disbursal", value: "tactic_high_deduction" },
      { label: "📞 Abusive recovery calls from multiple overseas numbers", value: "tactic_abusive_calls" },
    ],
  },
  "courier-customs": {
    question: "This matches a Fake Parcel / Customs Confiscation Scam.",
    prompt: "What did they claim was found in your parcel?",
    replies: [
      { label: "📦 Narcotics, fake passports, or contraband seized in your name", value: "tactic_contraband" },
      { label: "👮 Transferring call to 'Mumbai/Delhi Cyber Crime Police'", value: "tactic_police_transfer" },
      { label: "💰 Demanded customs clearance fee or penalty to release parcel", value: "tactic_customs_fine" },
      { label: "✈️ International parcel detained at airport terminal", value: "tactic_airport_hold" },
    ],
  },
  "sextortion": {
    question: "This matches a Video Blackmail & Cyber Extortion Scheme.",
    prompt: "What extortion threats were made against you?",
    replies: [
      { label: "📹 Brief WhatsApp video call recorded and morphed", value: "tactic_morphed_video" },
      { label: "⚠️ Threatened to send video to Facebook/Instagram relatives", value: "tactic_social_leak" },
      { label: "👮 Person posing as cyber police officer demanding fee to delete", value: "tactic_fake_cop_delete" },
      { label: "⏳ Given 30-minute deadline to pay before filing fake FIR", value: "tactic_fir_deadline" },
    ],
  },
  "lottery-prize": {
    question: "This matches a Lottery / Sweepstakes Advance-Fee Scam.",
    prompt: "What prize lure was used in the communication?",
    replies: [
      { label: "🎁 Claimed I won KBC ₹25 Lakhs or a Tata Safari car", value: "tactic_kbc_lottery" },
      { label: "💳 Demanded GST / clearance fee before releasing prize money", value: "tactic_prize_gst" },
      { label: "📜 Sent fake certificate with government stamps on WhatsApp", value: "tactic_fake_cert" },
      { label: "📞 Audio recording claiming to be bank head manager", value: "tactic_manager_audio" },
    ],
  },
  "general-fraud": {
    question: "To document this suspicious activity accurately in the registry:",
    prompt: "Which primary deception technique did the fraudster use?",
    replies: [
      { label: "🚨 Urgent legal, tax, or police threat demanding payment", value: "tactic_legal_threat" },
      { label: "🎁 Unrealistic high returns, cashback, or lottery lure", value: "tactic_high_return" },
      { label: "🔑 Demanding OTP, ATM PIN, or remote app installation", value: "tactic_cred_demand" },
      { label: "⚠️ Unsolicited payment request or suspicious link", value: "tactic_link_demand" },
    ],
  },
};

// Contextual dynamic tactical explanations for investigation responses
const TACTIC_EXPLANATIONS = {
  tactic_video_call: {
    title: "📹 Video Call Coercion Analysis",
    content: "Scammers use fake police uniforms, forged ID cards, and blurred office backdrops on Skype/WhatsApp to induce panic.\n\n• Legal Fact: Under CrPC § 41A / BNSS, law enforcement CANNOT arrest, detain, or try anyone over a video call.\n• Demanding money transfer to an 'RBI verification account' is 100% fraud.\n• Hang up, block the number, and do not remain isolated.",
  },
  tactic_parcel_drugs: {
    title: "📦 Fake Parcel Confiscation Scheme",
    content: "Scammers claim an international courier (FedEx, DHL, Taiwan Post) containing contraband was seized in your name.\n\n• Real customs officers do not call to negotiate settlements.\n• Parcels detained by Indian Customs follow formal written procedures under the Customs Act 1962, never instant phone fines via UPI.\n• Disconnect and block immediately.",
  },
  tactic_room_isolation: {
    title: "🔒 Psychological Room Isolation Tactic",
    content: "The fraudster orders you to stay locked in a room, keep the camera on 24/7, and not talk to your family or lawyer.\n\n• Purpose: To prevent you from verifying their claims with rational friends or family.\n• Action: Break isolation immediately. Call a trusted relative or lawyer and dial 1930.",
  },
  tactic_rbi_bail: {
    title: "🏦 Fake 'Safe Government RBI Account' Trick",
    content: "The scammer demands you transfer your bank deposits to a 'Government Safe Account' for verification or bail.\n\n• Crucial Fact: The Reserve Bank of India (RBI) is a central regulatory bank. It DOES NOT maintain citizen retail accounts, nor does it conduct financial integrity checks via UPI/NEFT.\n• Any account number given is a criminal mule account.",
  },
  tactic_night_cutoff: {
    title: "⏰ Electricity Disconnection Deadline Trick",
    content: "Threatens that your electricity will be disconnected tonight at 9:30 PM due to an unpaid bill.\n\n• Discom Rules: Under Section 56 of the Electricity Act 2003, power companies must give at least 15 days formal written notice before disconnection.\n• Discoms never send disconnection warnings from personal 10-digit mobile numbers.",
  },
  tactic_apk_install: {
    title: "📲 Malicious APK Trojan Warning",
    content: "The attacker sent an APK (e.g. Suvidha.apk, Urja.apk, Bijli.apk) via WhatsApp or SMS.\n\n• Risk: Malicious APKs contain SMS-stealing and remote-control malware to read your banking OTPs and drain accounts.\n• Action: Turn on Airplane mode, go to Settings → Apps, and uninstall the APK immediately. Reset passwords from another device.",
  },
  tactic_personal_phone: {
    title: "📞 Personal Mobile Number Impersonation",
    content: "Instructed to call a personal 10-digit mobile number instead of the official power company helpline.\n\n• Power utilities have official 3-4 digit shortcodes (e.g. 1912) and verified toll-free numbers, not personal cell phones.",
  },
  tactic_token_payment: {
    title: "💳 ₹10 to ₹50 Token Payment Trap",
    content: "The caller demands a small ₹10 or ₹50 payment via a link to 'update the bill'.\n\n• Risk: The link opens a phishing page or initiates a recurring e-mandate/auto-debit permission that allows fraudsters to siphon funds repeatedly.",
  },
  tactic_telegram_tasks: {
    title: "📢 Telegram Task & Rating Trap",
    content: "Promised high daily income (₹3,000–₹5,000) for liking YouTube videos, Google maps ratings, or hotel reviews.\n\n• Structure: A classic advance-fee task scam. Small initial returns (₹150–₹500) are paid purely to gain trust before demanding big deposits.",
  },
  tactic_small_payout: {
    title: "💵 Psychological Conditioning via Small Payouts",
    content: "Fraudsters paid ₹150–₹500 directly into your UPI account.\n\n• This is calculated psychological bait to make you believe the system is genuine before trapping you in ₹20,000–₹1,00,000 'VIP tasks'.\n• Do not deposit any money.",
  },
  tactic_deposit_demand: {
    title: "🚫 Frozen Funds & Withdrawal Deposit Trap",
    content: "The platform froze your virtual balance and demands ₹10,000+ deposit to unfreeze or withdraw.\n\n• Reality: The dashboard is fake. Depositing more will NEVER unlock your money—fraudsters keep demanding additional 'taxes' or 'penalties' until you stop paying.",
  },
  tactic_unsolicited_hr: {
    title: "💬 Unsolicited HR Recruiter Lure",
    content: "Received an unexpected message on WhatsApp claiming to be an international HR agency.\n\n• Legitimate multinational employers never recruit employees via unsolicited WhatsApp messages offering daily cash tasks.",
  },
  tactic_credential_phish: {
    title: "🔗 Banking & KYC Phishing Link Attack",
    content: "A link asking for NetBanking User ID, Password, Debit Card CVV, or ATM PIN.\n\n• Golden Rule: Legitimate banks NEVER ask for your password, PIN, or CVV to update KYC or unblock an account.\n• Immediately freeze debit card and reset NetBanking credentials.",
  },
  tactic_screen_share: {
    title: "📥 Screen-Sharing Exploitation (AnyDesk / RustDesk)",
    content: "The caller instructed you to install AnyDesk, RustDesk, or TeamViewer QuickSupport.\n\n• Risk: Remote access tools allow the fraudster to view your screen in real time, capture your OTPs as they arrive, and transfer funds.\n• Uninstall the remote app immediately and reboot your device.",
  },
  tactic_account_blocked: {
    title: "⛔ Fake Account Suspension Fear Tactic",
    content: "Claimed your bank account, debit card, or PAN will be permanently blocked within 24 hours.\n\n• Panic Mechanism: Scammers manufacture urgency so you click dangerous links without verification. Banks issue formal mail notices, not WhatsApp threats.",
  },
  tactic_otp_demand: {
    title: "🔢 Direct OTP Extraction Attempt",
    content: "Caller insisted that you read out an OTP received on SMS to 'verify' your identity.\n\n• Absolute Rule: Bank staff NEVER ask for OTPs. An OTP is your personal digital signature to authorize debits.",
  },
  tactic_scan_to_receive: {
    title: "📷 QR Code Inversion Fraud",
    content: "Sent a QR code claiming 'Scan this QR code to receive money into your account'.\n\n• Technical Fact: QR codes and UPI PINs are SOLELY for sending money. Receiving money NEVER requires scanning a QR code or entering your PIN.",
  },
  tactic_collect_request: {
    title: "📥 Deceptive UPI Collect Request",
    content: "Sent a UPI 'Collect Request' pretending it is an incoming payment.\n\n• Reality: Approving a collect request and entering your PIN immediately transfers money FROM your account to the scammer. Decline it.",
  },
  tactic_army_officer: {
    title: "🎖️ Fake Armed Forces / Defence Officer Impersonation",
    content: "The buyer claims to be an Army or CISF officer stationed at an airport or military base, offering advance payment.\n\n• Scammers frequently forge military canteen cards to gain trust before sending fake QR codes or collect requests.",
  },
  tactic_advance_courier: {
    title: "📦 Advance Courier Fee Scam",
    content: "Demanded you transfer a ₹500–₹2,000 courier or insurance fee before dispatching an item.\n\n• Never pay courier fees upfront to unknown online buyers or sellers on OLX / social media.",
  },
  tactic_permission_abuse: {
    title: "📱 Predatory Loan App Permission Abuse",
    content: "An unverified loan app accessed your entire phone contact list, SMS inbox, and photo gallery.\n\n• RBI Mandate: Under RBI digital lending guidelines, loan apps cannot access mobile contacts, call logs, or media galleries. Report the app on sachet.rbi.org.in.",
  },
  tactic_morphed_threat: {
    title: "⚠️ Morphed Photos & Criminal Blackmail",
    content: "Threatening to send morphed photos to your contacts or family.\n\n• Legal Protection: Morphing and extortion are serious criminal offences under IT Act § 66E, § 67, and IPC § 506 / BNS § 351.\n• Do not pay extortion money. File an immediate complaint at cybercrime.gov.in.",
  },
  tactic_high_deduction: {
    title: "💸 Usurious Deductions & Predatory Interest",
    content: "Loan app disbursed only ₹3,000 against a ₹5,000 loan and demanded ₹6,000 in 7 days.\n\n• Unregulated predatory apps operate illegal 300%+ APR loan sharking. Legitimate NBFCs are regulated under RBI Fair Practices Code.",
  },
  tactic_abusive_calls: {
    title: "📞 Abusive Recovery Harassment",
    content: "Receiving abusive, threatening calls from multiple virtual or overseas numbers.\n\n• Under RBI guidelines, recovery agents cannot call before 8 AM or after 7 PM, nor use abusive language or intimidate relatives.",
  },
};

// Authoritative Indian Cybercrime Knowledge Base Responses
const getAssistantAnswer = (text, reportData) => {
  const t = text.toLowerCase();

  // 1. Helpline 1930 / Reporting / Police / FIR
  if (
    t.includes("1930") ||
    t.includes("helpline") ||
    t.includes("how to report") ||
    t.includes("cyber police") ||
    t.includes("cyber cell") ||
    t.includes("file complaint") ||
    t.includes("fir")
  ) {
    return {
      text: "📞 National Cyber Crime Helpline: 1930\n\n• Operates 24x7 toll-free under the Ministry of Home Affairs (I4C).\n• Golden Hour Action: If you transferred funds within the last 2 to 4 hours, calling 1930 triggers an instant freeze/lien on the fraudster's mule account before cash withdrawal.\n• Official Portal: File an e-complaint on https://cybercrime.gov.in to receive an official FIR / Acknowledgement Number.\n• Keep Ready: Transaction UTR / Ref number, bank account details, and screenshot of payment.",
      quickReplies: [
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
        { label: "🛡️ How to Protect My Bank", value: "ask_bank_safety" },
        { label: "💬 Ask Another Question", value: "ask_question" },
      ],
    };
  }

  // 2. Digital Arrest / Video Call
  if (
    t.includes("digital arrest") ||
    t.includes("video call") ||
    t.includes("skype") ||
    t.includes("cbi") ||
    t.includes("police arrest") ||
    t.includes("customs arrest")
  ) {
    return {
      text: "🚨 Official Police Advisory on \"Digital Arrest\":\n\n1. NO DIGITAL ARREST IN LAW: Under Indian Criminal Law (CrPC § 41A / BNSS), police and CBI CANNOT arrest, try, or detain citizens over WhatsApp or Skype video calls.\n2. NO 'SAFE RBI ACCOUNTS': Government agencies never ask you to transfer funds to any 'verification account' or demand bail via UPI/RTGS.\n3. ACTION: Disconnect the call immediately. Do not stay locked in a room. Inform your family and report the number to 1930.",
      quickReplies: [
        { label: "🛡️ No Money Lost (₹0)", value: "loss_0" },
        { label: "💸 I Transferred Money", value: "loss_10k" },
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
      ],
    };
  }

  // 3. Electricity Cutoff
  if (
    t.includes("electricity") ||
    t.includes("power cut") ||
    t.includes("power cutoff") ||
    t.includes("light cut") ||
    t.includes("bescom") ||
    t.includes("msedcl") ||
    t.includes("tneb") ||
    t.includes("discom")
  ) {
    return {
      text: "⚡ Electricity Disconnection Extortion Warning:\n\n1. Discoms NEVER send disconnection threats from personal 10-digit mobile numbers.\n2. Under Section 56 of the Electricity Act 2003, power boards must provide at least 15 days written notice before disconnecting supply.\n3. The 9:30 PM deadline is artificial panic engineered to make you click phishing links or download malware.\n4. Check bill status only on the official state electricity portal.",
      quickReplies: [
        { label: "📲 They Sent an APK", value: "tactic_apk_install" },
        { label: "🛡️ Caught in Time (₹0 Lost)", value: "loss_0" },
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
      ],
    };
  }

  // 4. Malicious APKs / Screen Sharing
  if (
    t.includes("apk") ||
    t.includes("virus") ||
    t.includes("download") ||
    t.includes("anydesk") ||
    t.includes("rustdesk") ||
    t.includes("suvidha") ||
    t.includes("urja") ||
    t.includes("teamviewer")
  ) {
    return {
      text: "📲 Emergency Protocol for Suspicious APKs & Screen Sharing:\n\n1. Turn on AIRPLANE MODE immediately to cut remote internet control.\n2. Go to phone Settings → Apps → Find the downloaded APK (e.g. Suvidha, Urja, AnyDesk, QuickSupport) and tap UNINSTALL.\n3. From a different, clean device: Change your NetBanking login password, transaction password, and UPI PINs.\n4. Call 1930 or your bank to check for any unauthorized debit requests.",
      quickReplies: [
        { label: "🔒 Bank Security Checklist", value: "ask_bank_safety" },
        { label: "📞 Dial 1930 Helpline", value: "ask_1930" },
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
      ],
    };
  }

  // 5. UPI / QR Code / Collect Request
  if (
    t.includes("qr") ||
    t.includes("upi collect") ||
    t.includes("scan to receive") ||
    t.includes("olx")
  ) {
    return {
      text: "💳 QR Code & UPI Security Rule:\n\n• You NEVER need to scan a QR code or enter your UPI PIN to receive money.\n• Scanning a QR code or approving a 'Collect Request' exclusively TRANSFERS MONEY OUT of your bank account.\n• Incoming funds enter your account automatically with zero action needed on your phone.\n• Decline any incoming collect request from unknown buyers immediately.",
      quickReplies: [
        { label: "🛡️ Caught in Time (₹0 Lost)", value: "loss_0" },
        { label: "💸 Money Transferred by Mistake", value: "loss_10k" },
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
      ],
    };
  }

  // 6. Telegram Task & Job Fraud
  if (
    t.includes("telegram") ||
    t.includes("task") ||
    t.includes("part time") ||
    t.includes("job offer") ||
    t.includes("daily salary") ||
    t.includes("vip task")
  ) {
    return {
      text: "📢 Telegram Task & Rating Fraud Advisory:\n\n• Fraudsters pay small amounts (₹150–₹500) initially to lure you into depositing larger amounts (₹10,000–₹1,00,000).\n• Once money is deposited, your account is 'frozen' and they demand more money for 'tax' or 'credit score'.\n• Do NOT send any more money. You will never recover previous deposits by paying more.\n• File an immediate report on 1930 with the scammer's bank details and Telegram handles.",
      quickReplies: [
        { label: "🚫 Froze Funds & Demanded Deposit", value: "tactic_deposit_demand" },
        { label: "💸 I Lost Money to Tasks", value: "loss_10k" },
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
      ],
    };
  }

  // 7. Loan App Blackmail
  if (
    t.includes("loan app") ||
    t.includes("instant loan") ||
    t.includes("morphed") ||
    t.includes("contacts leaked") ||
    t.includes("blackmail")
  ) {
    return {
      text: "⚠️ Predatory Loan App Blackmail Protection:\n\n1. Do NOT pay extortion demands. Paying once causes scammers to demand higher amounts repeatedly.\n2. Inform your contacts and family that an illegal app has accessed your contact list.\n3. Morphing images is a criminal offence under IT Act § 66E / § 67 and IPC § 506 / BNS § 351.\n4. File an immediate complaint on https://cybercrime.gov.in under 'Cyber Harassment' and report to RBI on https://sachet.rbi.org.in.",
      quickReplies: [
        { label: "📞 How to Report to 1930", value: "ask_1930" },
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
        { label: "💬 Ask Another Question", value: "ask_question" },
      ],
    };
  }

  // 8. Bank Safety Checklist
  if (t.includes("bank safety") || t.includes("protect my bank") || t.includes("unfreeze")) {
    return {
      text: "🔒 Citizen Bank Protection Checklist:\n\n1. Immediately call your bank's official 24x7 customer care number (printed on the back of your card) to block cards and freeze NetBanking.\n2. If money was deducted, note down the 12-digit UTR/RRN number from the SMS.\n3. Call national cybercrime helpline 1930 within the Golden Hour.\n4. File a dispute/chargeback with your home branch in writing within 3 working days under RBI Zero-Liability circular.",
      quickReplies: [
        { label: "📞 Dial 1930 Helpline", value: "ask_1930" },
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
        { label: "💬 Ask Another Question", value: "ask_question" },
      ],
    };
  }

  // 9. Chakshu / Sanchar Saathi
  if (t.includes("chakshu") || t.includes("sanchar saathi") || t.includes("block number")) {
    return {
      text: "🌐 DoT Sanchar Saathi & Chakshu Facility:\n\n• Chakshu (https://sancharsaathi.gov.in) allows citizens to report suspected fraud communications via calls, SMS, or WhatsApp.\n• The Department of Telecommunications verifies reports and can disconnect the scammer's SIM card and block their mobile handset IMEI across all Indian telecom operators.",
      quickReplies: [
        { label: "📍 Broadcast to Threat Map", value: "confirm_save" },
        { label: "📞 Dial 1930 Helpline", value: "ask_1930" },
        { label: "💬 Ask Another Question", value: "ask_question" },
      ],
    };
  }

  return null;
};

// Dynamic community safety advice tailored to the specific scam type
const DYNAMIC_SAFETY_ADVICE = {
  "digital-arrest": [
    { label: "Police & CBI never arrest on video calls; hang up and dial 1930", value: "sug_police_video" },
    { label: "Never transfer money to any secret 'Safe RBI verification account'", value: "sug_rbi_account" },
    { label: "Warn family & elderly neighbors about digital arrest impersonations", value: "sug_warn_family" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "electricity-disconnection": [
    { label: "Discoms never send disconnection threats from 10-digit mobile numbers", value: "sug_discom_mobile" },
    { label: "Never download APK files sent via WhatsApp or SMS", value: "sug_discom_apk" },
    { label: "Check bill status solely on the official state electricity portal", value: "sug_discom_portal" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "job-offer": [
    { label: "Never pay money to unlock salary tasks or earn daily profits", value: "sug_task_deposit" },
    { label: "Leave Telegram task groups immediately and report the channel", value: "sug_task_telegram" },
    { label: "Legitimate companies never hire without formal interview & contract", value: "sug_task_formal" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "fake-kyc-link": [
    { label: "Never enter UPI PIN or click SMS links to update KYC", value: "sug_kyc_pin" },
    { label: "Banks never ask for debit card CVV or OTP to prevent account block", value: "sug_kyc_cvv" },
    { label: "Visit your local bank branch directly if in doubt about your account", value: "sug_kyc_branch" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "upi-refund-qr": [
    { label: "Never scan a QR code to receive money - QR is strictly for paying", value: "sug_qr_pay" },
    { label: "Never enter your UPI PIN unless you intend to transfer funds", value: "sug_qr_pin" },
    { label: "Decline incoming UPI collect requests from unknown buyers on OLX", value: "sug_qr_olx" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "loan-app-harassment": [
    { label: "Never grant gallery or contact permissions to unverified loan apps", value: "sug_loan_perms" },
    { label: "Report harassment and blackmail numbers directly to cybercrime.gov.in", value: "sug_loan_report" },
    { label: "Check RBI registered NBFC list before applying for online loans", value: "sug_loan_rbi" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
  "general-fraud": [
    { label: "Never share OTP, PIN, or passwords with anyone", value: "sug_gen_otp" },
    { label: "Verify caller identity before authorizing any financial transaction", value: "sug_gen_verify" },
    { label: "Report suspicious numbers immediately to national helpline 1930", value: "sug_gen_1930" },
    { label: "No suggestions, proceed to save", value: "sug_none" },
  ],
};

export default function ReportModal({ isOpen, onClose, onSuccess, onHighlightLocation, apiBaseUrl }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [step, setStep] = useState("channel");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [uiError, setUiError] = useState("");
  const [requestingGps, setRequestingGps] = useState(false);

  const [reportData, setReportData] = useState({
    channel: "",
    identifier_type: "phone",
    identifier_value: "",
    scam_type: "",
    pincode: "",
    locality: "",
    city: "",
    note: "",
    amount_lost_inr: 0,
    investigation_tactic: "",
    predicted_risk: null,
    predicted_band: "",
    predicted_tactics: [],
    suggestions: [],
    wants_notifications: false,
    contact_for_alerts: "",
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setMessages(INITIAL_MESSAGES);
      setStep("channel");
      setReceipt(null);
      setUiError("");
      setRequestingGps(false);
      setReportData({
        channel: "",
        identifier_type: "phone",
        identifier_value: "",
        scam_type: "",
        pincode: "",
        locality: "",
        city: "",
        note: "",
        amount_lost_inr: 0,
        investigation_tactic: "",
        predicted_risk: null,
        predicted_band: "",
        predicted_tactics: [],
        suggestions: [],
        wants_notifications: false,
        contact_for_alerts: "",
      });
    }
  }, [isOpen]);

  const addBotMessage = (text, quickReplies = null, card = null) => {
    const uniqueId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [
      ...prev,
      {
        id: uniqueId,
        sender: "bot",
        text,
        quickReplies,
        card,
      },
    ]);
  };

  const scrubPII = (text) => {
    if (!text) return "";
    let scrubbed = text;
    scrubbed = scrubbed.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[EMAIL REDACTED]");
    scrubbed = scrubbed.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[ID REDACTED]");
    scrubbed = scrubbed.replace(/(\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b/g, "[PHONE REDACTED]");
    return scrubbed.trim();
  };

  // Client-Side Deterministic Heuristic Analyzer & Dynamic Severity Calculator
  const analyzeIncident = (userText, channel) => {
    const textLower = (userText || "").toLowerCase();

    // 1. Extract identifier
    let identType = "phone";
    let identVal = "+919876500000";

    const phoneMatch = userText.match(/(\+91[\-\s]?)?[6-9]\d{9}|\b1930\b|\b1800\d{6,8}\b/);
    const upiMatch = userText.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/);
    const urlMatch = userText.match(/https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(com|in|org|net|xyz|top|link|app)[^\s]*/);

    if (upiMatch) {
      identType = "upi";
      identVal = upiMatch[0];
    } else if (urlMatch) {
      identType = "url";
      identVal = urlMatch[0];
    } else if (phoneMatch) {
      identType = "phone";
      identVal = phoneMatch[0];
    }

    // 2. Classify Scam Pattern with High Accuracy Keyword Weights
    let detectedType = "general-fraud";
    let baseScore = 30;
    const detectedTactics = [];

    if (
      textLower.includes("digital arrest") ||
      textLower.includes("cbi") ||
      textLower.includes("narcotics") ||
      textLower.includes("illegal parcel") ||
      textLower.includes("skype") ||
      textLower.includes("cyber cell") ||
      textLower.includes("arrest warrant") ||
      textLower.includes("mumbai police")
    ) {
      detectedType = "digital-arrest";
      baseScore = 55;
      detectedTactics.push("Law Enforcement Impersonation", "Coercive Legal Threat");
    } else if (
      textLower.includes("electricity") ||
      textLower.includes("power disconnect") ||
      textLower.includes("power cutoff") ||
      textLower.includes("light cut") ||
      textLower.includes("update meter") ||
      textLower.includes("bescom") ||
      textLower.includes("tneb") ||
      textLower.includes("msedcl") ||
      textLower.includes("bill unpaid")
    ) {
      detectedType = "electricity-disconnection";
      baseScore = 50;
      detectedTactics.push("Utility Disconnection Threat", "Artificial Night Deadline");
    } else if (
      textLower.includes("part time") ||
      textLower.includes("part-time") ||
      textLower.includes("job offer") ||
      textLower.includes("telegram") ||
      textLower.includes("daily salary") ||
      textLower.includes("earn 3000") ||
      textLower.includes("earn 5000") ||
      textLower.includes("like youtube") ||
      textLower.includes("hotel review") ||
      textLower.includes("prepaid task") ||
      textLower.includes("vip task")
    ) {
      detectedType = "job-offer";
      baseScore = 48;
      detectedTactics.push("Unrealistic Daily Earning", "Deposit Task Trap");
    } else if (
      textLower.includes("kyc") ||
      textLower.includes("pan card") ||
      textLower.includes("account blocked") ||
      textLower.includes("sbi") ||
      textLower.includes("hdfc") ||
      textLower.includes("icici") ||
      textLower.includes("yono") ||
      textLower.includes("update pan") ||
      textLower.includes("netbanking")
    ) {
      detectedType = "fake-kyc-link";
      baseScore = 52;
      detectedTactics.push("Banking Credential Harvesting", "Account Suspension Fear");
    } else if (
      textLower.includes("scan qr") ||
      textLower.includes("qr code") ||
      textLower.includes("upi collect") ||
      textLower.includes("olx") ||
      textLower.includes("scan to receive") ||
      textLower.includes("enter pin to receive")
    ) {
      detectedType = "upi-refund-qr";
      baseScore = 48;
      detectedTactics.push("UPI Inversion Trick", "False Payment Authority");
    } else if (
      textLower.includes("fedex") ||
      textLower.includes("customs") ||
      textLower.includes("dhl") ||
      textLower.includes("parcel detained") ||
      textLower.includes("taiwan")
    ) {
      detectedType = "courier-customs";
      baseScore = 50;
      detectedTactics.push("Detained Cargo Lure", "Fake Customs Penalty");
    } else if (
      textLower.includes("instant loan") ||
      textLower.includes("loan app") ||
      textLower.includes("morphed photo") ||
      textLower.includes("contacts leaked") ||
      textLower.includes("recovery agent")
    ) {
      detectedType = "loan-app-harassment";
      baseScore = 58;
      detectedTactics.push("Intimidation & Contact Doxxing", "Predatory Interest Scheme");
    } else if (
      textLower.includes("sextortion") ||
      textLower.includes("video leak") ||
      textLower.includes("facebook relatives") ||
      textLower.includes("nude video") ||
      textLower.includes("blackmail")
    ) {
      detectedType = "sextortion";
      baseScore = 65;
      detectedTactics.push("Reputational Blackmail", "Extortion Deadline");
    } else if (
      textLower.includes("lottery") ||
      textLower.includes("kbc") ||
      textLower.includes("won 25 lakh") ||
      textLower.includes("lucky draw")
    ) {
      detectedType = "lottery-prize";
      baseScore = 38;
      detectedTactics.push("Advance Fee Fraud", "Fictitious Prize Lure");
    }

    // 3. Dynamic Score Modulation via Behavioral Heuristics
    let dynamicScore = baseScore;

    // A. Extreme Urgency Indicator (+12 pts)
    if (
      textLower.includes("tonight") ||
      textLower.includes("9:30") ||
      textLower.includes("immediately") ||
      textLower.includes("within 2 hours") ||
      textLower.includes("today itself") ||
      textLower.includes("24 hours") ||
      textLower.includes("urgent") ||
      textLower.includes("last chance")
    ) {
      dynamicScore += 12;
      detectedTactics.push("High Pressure Urgency");
    }

    // B. Severe Coercion / Threat Indicator (+16 pts)
    if (
      textLower.includes("arrest") ||
      textLower.includes("jail") ||
      textLower.includes("fir") ||
      textLower.includes("court") ||
      textLower.includes("police") ||
      textLower.includes("disconnect") ||
      textLower.includes("block") ||
      textLower.includes("raid")
    ) {
      dynamicScore += 16;
      detectedTactics.push("Punitive Threat & Coercion");
    }

    // C. Credential / Remote Access Harvesting (+18 pts)
    if (
      textLower.includes("otp") ||
      textLower.includes("pin") ||
      textLower.includes("password") ||
      textLower.includes("cvv") ||
      textLower.includes("anydesk") ||
      textLower.includes("rustdesk") ||
      textLower.includes("teamviewer") ||
      textLower.includes("apk") ||
      textLower.includes(".apk")
    ) {
      dynamicScore += 18;
      detectedTactics.push("Credential / APK Harvesting");
    }

    // D. Unverified Link or Channel Escalation (+10 pts)
    if (urlMatch || channel === "link" || channel === "upi") {
      dynamicScore += 10;
      detectedTactics.push("Unverified Link / Channel Vector");
    }

    // Clamp score within 15 to 98
    dynamicScore = Math.min(98, Math.max(18, dynamicScore));

    // Dynamic Risk Band Evaluation
    let riskBand = "Low";
    if (dynamicScore >= 85) {
      riskBand = "Critical";
    } else if (dynamicScore >= 66) {
      riskBand = "High";
    } else if (dynamicScore >= 35) {
      riskBand = "Suspicious";
    }

    let explanation = `Identified tactics: ${detectedTactics.slice(0, 3).join(", ")}.`;
    if (detectedType !== "general-fraud") {
      explanation = `Matches verified Indian ${detectedType.replace("-", " ")} signatures. ${explanation}`;
    }

    return {
      identType,
      identVal,
      detectedType,
      dynamicScore,
      riskBand,
      detectedTactics,
      explanation,
    };
  };

  // Haversine distance in kilometers
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // 2 to 3 km privacy-preserving spatial generalization
  const resolveZoneWithinRange = async (lat, lng) => {
    const angle = Math.random() * 2 * Math.PI;
    const offsetDistanceKm = 2.0 + Math.random() * 1.0;
    const dLat = (offsetDistanceKm / 111.32) * Math.cos(angle);
    const dLng = (offsetDistanceKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

    const fuzzedLat = lat + dLat;
    const fuzzedLng = lng + dLng;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${fuzzedLat}&lon=${fuzzedLng}&zoom=14&addressdetails=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "ScamRadar-India/1.0" } }
      );

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const regionalWard =
          addr.suburb ||
          addr.city_district ||
          addr.quarter ||
          addr.neighbourhood ||
          addr.town ||
          addr.village ||
          "Regional Safety Sector";
        const cityName = addr.city || addr.town || addr.county || "Bengaluru";
        const postCode = addr.postcode || "560001";
        const clusterLat = Math.round(fuzzedLat * 100) / 100;
        const clusterLng = Math.round(fuzzedLng * 100) / 100;

        return {
          pincode: postCode,
          locality: regionalWard,
          city: cityName,
          lat: clusterLat,
          lng: clusterLng,
          rangeLabel: `${offsetDistanceKm.toFixed(1)} km`,
        };
      }
    } catch (e) {}

    let matchedArea = KNOWN_AREAS[0];
    let minDiff = Infinity;
    for (const a of KNOWN_AREAS) {
      const dist = calculateDistanceKm(lat, lng, a.lat, a.lng);
      const diff = Math.abs(dist - 2.5);
      if (diff < minDiff) {
        minDiff = diff;
        matchedArea = a;
      }
    }

    return {
      ...matchedArea,
      rangeLabel: "2.5 km",
    };
  };

  const handleAutoLocationPermission = () => {
    setRequestingGps(true);
    if (!navigator.geolocation) {
      fallbackNearestArea("Metropolitan Zone");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const cluster = await resolveZoneWithinRange(latitude, longitude);
        setRequestingGps(false);

        setReportData((prev) => ({
          ...prev,
          pincode: cluster.pincode,
          locality: cluster.locality,
          city: cluster.city,
        }));

        if (onHighlightLocation) {
          onHighlightLocation({
            pincode: cluster.pincode,
            locality: cluster.locality,
            city: cluster.city,
            lat: cluster.lat,
            lng: cluster.lng,
          });
        }

        // Move to dynamic safety advice tailored to the detected scam
        promptDynamicSafetyAdvice(cluster);
      },
      () => {
        setRequestingGps(false);
        fallbackNearestArea("Regional Safety Zone");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const fallbackNearestArea = (label) => {
    const defaultZone = KNOWN_AREAS[1];
    setReportData((prev) => ({
      ...prev,
      pincode: defaultZone.pincode,
      locality: defaultZone.locality,
      city: defaultZone.city,
    }));
    if (onHighlightLocation) {
      onHighlightLocation(defaultZone);
    }
    promptDynamicSafetyAdvice(defaultZone);
  };

  const promptDynamicSafetyAdvice = (cluster) => {
    setStep("suggestions");
    const scamCategory = reportData.scam_type || "general-fraud";
    const adviceList = DYNAMIC_SAFETY_ADVICE[scamCategory] || DYNAMIC_SAFETY_ADVICE["general-fraud"];

    addBotMessage(
      `📍 Regional Cluster Mapped (~2–3 km): ${cluster.locality}, ${cluster.city} (PIN ${cluster.pincode}).\n\nWhat prevention guidance should we broadcast to protect fellow citizens in this cluster?`,
      adviceList
    );
  };

  const handleUserReply = async (text, payloadVal = null) => {
    setUiError("");
    const userVal = (payloadVal || text || "").trim();
    if (!userVal) {
      setUiError("Please enter or select a response.");
      return;
    }

    const uniqueUserMsgId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [
      ...prev.map((msg) => (msg.quickReplies ? { ...msg, quickReplies: null } : msg)),
      {
        id: uniqueUserMsgId,
        sender: "user",
        text: text,
      },
    ]);
    setInput("");

    const valLower = userVal.toLowerCase();
    const textLower = text.toLowerCase();

    // ── 1. TACTICAL INVESTIGATION FOLLOW-UP (When user clicked or mentioned a tactic) ──
    if (TACTIC_EXPLANATIONS[userVal] || valLower.startsWith("tactic_")) {
      const tacticInfo = TACTIC_EXPLANATIONS[userVal] || {
        title: "Tactical Investigation Finding",
        content: `Detailed insight into ${text}: Scammers utilize this coercion vector to bypass rational verification.`,
      };
      setReportData((prev) => ({
        ...prev,
        investigation_tactic: text,
      }));

      addBotMessage(
        `${tacticInfo.title}\n\n${tacticInfo.content}\n\nDid you suffer any financial loss in this incident, or did you detect the deception in time?`,
        [
          { label: "🛡️ No Money Lost (₹0 - Caught in Time)", value: "loss_0" },
          { label: "💸 Small Loss (Under ₹10,000 lost)", value: "loss_10k" },
          { label: "⚠️ Moderate Loss (₹10,000 to ₹50,000 lost)", value: "loss_50k" },
          { label: "🚨 Severe Loss (Over ₹50,000 lost)", value: "loss_high" },
        ]
      );
      setStep("financial_loss");
      return;
    }

    // ── 2. FINANCIAL LOSS EVALUATION & GOLDEN HOUR PROTOCOL ──
    if (
      userVal.startsWith("loss_") ||
      textLower.includes("money lost") ||
      textLower.includes("no loss") ||
      textLower.includes("₹0") ||
      textLower.includes("transferred") ||
      textLower.includes("lost ₹") ||
      textLower.includes("paid ₹")
    ) {
      let lossInr = 0;
      let isHighLoss = false;

      if (userVal === "loss_10k") {
        lossInr = 5000;
        isHighLoss = true;
      } else if (userVal === "loss_50k") {
        lossInr = 25000;
        isHighLoss = true;
      } else if (userVal === "loss_high") {
        lossInr = 75000;
        isHighLoss = true;
      } else if (!userVal.startsWith("loss_0") && !textLower.includes("no money") && !textLower.includes("₹0")) {
        const parsed = parseFloat(text.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed) && parsed > 0) {
          lossInr = parsed;
          isHighLoss = true;
        }
      }

      setReportData((prev) => ({
        ...prev,
        amount_lost_inr: lossInr,
        predicted_risk: isHighLoss ? Math.min(99, (prev.predicted_risk || 50) + 15) : prev.predicted_risk,
        predicted_band: isHighLoss ? "Critical" : prev.predicted_band,
      }));

      if (isHighLoss) {
        addBotMessage(
          `🚨 URGENT RECOVERY PROTOCOL (Golden Hour Helpline 1930):\n\nSince money was transferred, call national cybercrime helpline 1930 immediately!\n\n1. Under the I4C CFCFRMS protocol, reporting within the golden hour triggers an instant freeze on the scammer's mule bank account before cash withdrawal.\n2. Note down your transaction UTR / Reference number, bank account details, and screenshot of payment.\n3. File an official complaint on https://cybercrime.gov.in.\n\nWould you like to broadcast this threat anonymously to warn other citizens in your area?`,
          [
            { label: "📍 Broadcast Anonymously to Map", value: "confirm_save" },
            { label: "📞 How to Dial 1930 Helpline", value: "ask_1930" },
            { label: "💬 Ask Another Question", value: "ask_question" },
          ]
        );
      } else {
        addBotMessage(
          `🛡️ Excellent vigilance! You detected the scam in time before any money was lost.\n\nEven with zero loss, logging this threat anonymously helps shield elderly neighbors and students in your area from falling victim.\n\nWould you like to broadcast this report anonymously to the national threat map?`,
          [
            { label: "📍 Broadcast Anonymously to Map", value: "confirm_save" },
            { label: "🔔 Notify Me of Surge Alerts", value: "alerts_yes" },
            { label: "💬 Ask Another Question", value: "ask_question" },
          ]
        );
      }
      setStep("save_confirm");
      return;
    }

    // ── 3. BROADCAST / SAVE TO COMMUNITY THREAT MAP ──
    if (
      userVal === "confirm_save" ||
      userVal === "broadcast_map" ||
      textLower === "yes, publish anonymously to map" ||
      textLower === "broadcast" ||
      textLower === "publish" ||
      textLower === "save" ||
      textLower === "save report"
    ) {
      if (!reportData.pincode && !reportData.locality) {
        setStep("location_permission");
        addBotMessage(
          "To warn residents in your locality without compromising your privacy, please authorize broad neighborhood cluster detection (~2 to 3 km zone).",
          null,
          { type: "location_prompt_card" }
        );
      } else {
        addBotMessage("Submitting report to community threat registry...");
        setTimeout(() => {
          submitReportToDB(reportData);
        }, 300);
      }
      return;
    }

    // ── 4. CANCEL REPORT ──
    if (userVal === "cancel" || textLower === "cancel") {
      addBotMessage(
        "Report submission paused. No data was saved.\n\nYou can continue chatting with me below if you want safety advice, have questions, or want to check another message.",
        [
          { label: "📞 Helpline 1930 Information", value: "ask_1930" },
          { label: "🔍 Check Another Message", value: "ask_check_another" },
        ]
      );
      return;
    }

    // ── 5. NOTIFICATIONS OPT-IN ──
    if (userVal === "alerts_yes" || userVal === "alerts_no") {
      if (userVal === "alerts_yes") {
        if (typeof window !== "undefined" && "Notification" in window) {
          try {
            const perm = await Notification.requestPermission();
            if (perm === "granted") {
              new Notification("ScamRadar Surge Alert Active", {
                body: "Real-time scam surge alerts enabled for your safety cluster.",
                icon: "/favicon.ico",
              });
            }
          } catch (e) {}
        }
        const updated = {
          ...reportData,
          wants_notifications: true,
          contact_for_alerts: "browser_push",
        };
        setReportData(updated);
        addBotMessage("🔔 Real-time scam surge alerts enabled for your safety cluster!\n\nSubmitting report to community threat registry...");
        setTimeout(() => {
          submitReportToDB(updated);
        }, 300);
      } else {
        addBotMessage("Understood. Publishing your report anonymously...");
        setTimeout(() => {
          submitReportToDB({ ...reportData, wants_notifications: false });
        }, 300);
      }
      return;
    }

    // ── 6. CHANNEL SELECTION ──
    if (userVal === "phone_call" || userVal === "sms" || userVal === "upi" || userVal === "link") {
      const channelLabels = {
        phone_call: "Phone Call Threat",
        sms: "SMS / WhatsApp Message",
        upi: "Fake UPI / QR Request",
        link: "Phishing Link / Website",
      };
      const channelName = channelLabels[userVal] || userVal;
      setReportData((prev) => ({ ...prev, channel: userVal }));
      setStep("content");
      addBotMessage(
        `Channel recorded: ${channelName}.\n\nWhat did the fraudster claim or demand? Tap a common scam pattern below, or paste the message / phone number in the chat:`,
        [
          {
            label: "⚡ Electricity Will Be Cut Off Tonight",
            value: "Dear consumer your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Call 9876543210 immediately.",
          },
          {
            label: "🚨 Digital Arrest from Police / CBI",
            value: "CBI / Mumbai Cyber Crime: Illegal narcotics parcel detained at airport in your name. You are under digital arrest on Skype video call.",
          },
          {
            label: "💼 Part-Time Task (Earn ₹3,000/day)",
            value: "Work from home part-time task. Like YouTube videos and hotel ratings to earn 3000 per day. Join Telegram group.",
          },
          {
            label: "🏦 Bank KYC / PAN Card Blocked",
            value: "Dear customer your SBI / HDFC netbanking account is blocked due to expired KYC. Update PAN card immediately on the link.",
          },
        ]
      );
      return;
    }

    // ── 7. LOCATION ENTERED IN TEXT (e.g. "Koramangala", "560001", "Bengaluru", etc.) ──
    const areaMatch = findAreaByInput(text);
    if (areaMatch) {
      setReportData((prev) => ({
        ...prev,
        pincode: areaMatch.pincode,
        locality: areaMatch.locality,
        city: areaMatch.city,
      }));
      if (onHighlightLocation) {
        onHighlightLocation(areaMatch);
      }
      addBotMessage(
        `📍 Location Cluster Set (~2–3 km): ${areaMatch.locality}, ${areaMatch.city} (PIN ${areaMatch.pincode}).\n\nBroadcasting anonymously to this cluster protects fellow residents without storing your exact address.`,
        [
          { label: "📍 Confirm & Broadcast to Map", value: "confirm_save" },
          { label: "💬 Ask a Safety Question", value: "ask_question" },
        ]
      );
      return;
    }

    // ── 8. KNOWLEDGE BASE & INFORMATIONAL QUESTIONS (Continuous Q&A) ──
    const answer = getAssistantAnswer(text, reportData);
    if (answer) {
      addBotMessage(answer.text, answer.quickReplies);
      return;
    }

    // ── 9. SCAM INCIDENT TEXT (Direct paste or message description) ──
    // Runs heuristic analysis + backend checker
    const localAnalysis = analyzeIncident(text, reportData.channel || "sms");
    let finalScamType = localAnalysis.detectedType;
    let finalRiskScore = localAnalysis.dynamicScore;
    let finalRiskBand = localAnalysis.riskBand;
    let finalTactics = localAnalysis.detectedTactics;
    let finalExplanation = localAnalysis.explanation;
    let finalIdentType = localAnalysis.identType;
    let finalIdentVal = localAnalysis.identVal;

    try {
      const baseUrl = apiBaseUrl || "http://localhost:8000";
      const checkRes = await fetch(`${baseUrl}/check?stream=false`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, ui_language: "en" }),
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.scam_type && checkData.scam_type !== "other") {
          finalScamType = checkData.scam_type;
        }
        if (checkData.score && checkData.score > 0) {
          finalRiskScore = checkData.score;
          finalRiskBand = checkData.band || finalRiskBand;
        }
        if (checkData.tactics && checkData.tactics.length > 0) {
          finalTactics = Array.from(new Set([...finalTactics, ...checkData.tactics]));
        }
        if (checkData.explanation && checkData.explanation.length > 0) {
          finalExplanation = checkData.explanation.slice(0, 2).join(" ");
        }
      }
    } catch (e) {}

    setReportData((prev) => ({
      ...prev,
      note: text,
      identifier_type: finalIdentType,
      identifier_value: finalIdentVal,
      scam_type: finalScamType,
      predicted_risk: finalRiskScore,
      predicted_band: finalRiskBand,
      predicted_tactics: finalTactics,
    }));

    // Output Prediction Card
    addBotMessage(
      "",
      null,
      {
        type: "prediction_card",
        scam_type: finalScamType.toUpperCase(),
        risk_score: finalRiskScore,
        risk_band: finalRiskBand,
        explanation: finalExplanation,
        masked_message: scrubPII(text),
      }
    );

    // Follow-up investigative questions & suggestions
    const config = SCAM_INVESTIGATION_QUESTIONS[finalScamType] || SCAM_INVESTIGATION_QUESTIONS["general-fraud"];
    addBotMessage(
      `${config.question}\n\n${config.prompt}`,
      config.replies
    );
    setStep("investigation_question");
  };

  const submitReportToDB = async (finalData) => {
    setSubmitting(true);
    setUiError("");

    try {
      const reporterId =
        localStorage.getItem("scamradar_reporter_id") ||
        `rep_${Math.random().toString(36).substring(2, 12)}`;
      localStorage.setItem("scamradar_reporter_id", reporterId);

      let fullNote = finalData.note || "Report submitted by citizen";
      if (finalData.investigation_tactic) {
        fullNote += ` [Tactic: ${finalData.investigation_tactic}]`;
      }
      if (finalData.suggestions && finalData.suggestions.length > 0) {
        fullNote += ` [Safety Advice: ${finalData.suggestions.join("; ")}]`;
      }

      const payload = {
        case_id: `CASE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        reporter_id: reporterId,
        ip_prefix: "49.207.12.0",
        occurred_at: new Date().toISOString(),
        channel: finalData.channel === "phone_call" ? "Phone call" : finalData.channel === "upi" ? "UPI request" : "SMS",
        scam_type: finalData.scam_type || "digital-arrest",
        identifier_type: finalData.identifier_type || "phone",
        identifier_value: finalData.identifier_value || "+919876500000",
        pincode: finalData.pincode || "560001",
        locality: finalData.locality || "Central Zone",
        city: finalData.city || "Bengaluru",
        amount_lost_inr: finalData.amount_lost_inr || null,
        note: fullNote,
      };

      const baseUrl = apiBaseUrl || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || errData.error || "Failed to save report.");
      }

      const resData = await res.json();
      setReceipt(resData);
      setStep("done");

      addBotMessage(
        `✅ Report successfully logged!\n\nCase ID: ${resData.case_id}\nCluster: ${finalData.locality || "Bengaluru"} (${finalData.pincode || "560001"})\nStatus: Broadcast to Live Threat Map\n\nThank you for shielding your community! 🛡️\n\n💬 I am still here with you. Feel free to ask any follow-up questions, get bank safety advice, or paste another suspicious message below.`,
        [
          { label: "🔍 Check Another Scam Message", value: "ask_check_another" },
          { label: "📞 Helpline 1930 Information", value: "ask_1930" },
          { label: "🔒 Bank Security Checklist", value: "ask_bank_safety" },
        ]
      );

      if (onSuccess) {
        onSuccess(resData);
      }
    } catch (err) {
      setUiError(err.message || "Network error while saving report.");
      addBotMessage(`⚠️ Unable to complete database sync: ${err.message}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const getBandBadge = (band, score) => {
    const b = (band || "").toLowerCase();
    if (b === "critical" || score >= 85) {
      return {
        bg: "bg-[#E5201B] text-[#F7F7F2] font-black animate-pulse",
        border: "border-[#E5201B]",
        label: "Critical Threat",
      };
    }
    if (b === "high" || score >= 66) {
      return {
        bg: "bg-[#E5201B] text-[#F7F7F2] font-bold",
        border: "border-[#E5201B]",
        label: "High Threat",
      };
    }
    if (b === "suspicious" || score >= 35) {
      return {
        bg: "bg-[#0A0A0A] text-[#F7F7F2] font-bold",
        border: "border-[#0A0A0A]",
        label: "Suspicious",
      };
    }
    return {
      bg: "bg-[#23E000] text-[#0A0A0A] font-bold border border-[#0A0A0A]",
      border: "border-[#23E000]",
      label: "Low Risk",
    };
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150 animate-fadeIn"
    >
      <div
        className={`relative w-full ${
          isExpanded ? "max-w-2xl" : "max-w-md"
        } max-h-[92vh] flex flex-col bg-[#F7F7F2] border border-[#0A0A0A] rounded-[14px] p-5 sm:p-6 text-[#0A0A0A] shadow-2xl transition-all duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#0A0A0A] text-[#23E000] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">
                Citizen Fraud Intake & Telemetry
              </h2>
              <p className="text-[11px] opacity-70">
                AI Pattern Verification & Zero-Knowledge Community Map
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Minimize" : "Expand"}
              className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[#0A0A0A] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-3.5 py-4">
          {(() => {
            const lastMsgWithRepliesId = [...messages]
              .reverse()
              .find((msg) => msg.sender === "bot" && msg.quickReplies && msg.quickReplies.length > 0)?.id;

            return messages.map((m, idx) => (
            <div
              key={`${m.id}-${idx}`}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`flex gap-2 max-w-[90%] sm:max-w-[85%] ${
                  m.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-[#0A0A0A] ${
                    m.sender === "user"
                      ? "bg-[#0A0A0A] text-[#F7F7F2]"
                      : "bg-[#23E000] text-[#0A0A0A]"
                  }`}
                >
                  {m.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-2">
                  {m.text && (
                    <div
                      className={`p-3 rounded-[10px] border border-[#0A0A0A] text-xs whitespace-pre-line leading-relaxed ${
                        m.sender === "user"
                          ? "bg-[#0A0A0A] text-[#F7F7F2]"
                          : "bg-[#F7F7F2] text-[#0A0A0A]"
                      }`}
                    >
                      {m.text}
                    </div>
                  )}

                  {/* Dynamic Scam Pattern Verification Card */}
                  {m.card && m.card.type === "prediction_card" && (() => {
                    const badge = getBandBadge(m.card.risk_band, m.card.risk_score);
                    return (
                      <div className="rounded-[12px] border border-[#0A0A0A] bg-[#F7F7F2] overflow-hidden shadow-sm">
                        <div className="px-4 py-2.5 bg-[#0A0A0A] text-[#F7F7F2] flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Scam Pattern Verification
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-[4px] text-[10px] ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(10,10,10,0.04)]">
                              <span className="opacity-70 text-[10px] uppercase font-bold block">
                                Detected Pattern:
                              </span>
                              <div className="font-black text-sm text-[#E5201B] mt-0.5 tracking-tight">
                                {m.card.scam_type}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(10,10,10,0.04)]">
                              <span className="opacity-70 text-[10px] uppercase font-bold block">
                                Severity Score:
                              </span>
                              <div className="font-black text-sm text-[#0A0A0A] mt-0.5">
                                {m.card.risk_score} / 100
                              </div>
                            </div>
                          </div>

                          <div className="text-xs p-2.5 rounded-[8px] border border-[#0A0A0A] bg-[rgba(229,32,27,0.06)] leading-relaxed">
                            <strong>Finding:</strong> {m.card.explanation}
                          </div>

                          {/* Exact Reported Incident Message with Personal Info Masked */}
                          {m.card.masked_message && (
                            <div className="p-2.5 bg-white rounded-[8px] border border-[#0A0A0A]/30 text-xs space-y-1 font-mono">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#0A0A0A] uppercase flex items-center gap-1 font-sans">
                                  <Lock className="w-3 h-3 text-[#23E000]" />
                                  Reported Incident Message (Personal Info Masked)
                                </span>
                                <span className="text-[9px] bg-[#23E000]/25 text-[#0A0A0A] font-bold px-1.5 py-0.2 rounded font-sans">
                                  PII MASKED
                                </span>
                              </div>
                              <p className="text-[11px] text-[#0A0A0A] leading-relaxed whitespace-pre-wrap italic bg-[#F7F7F2] p-2 rounded border border-[#0A0A0A]/15">
                                "{m.card.masked_message}"
                              </p>
                              <span className="text-[9px] opacity-60 block font-sans">
                                ✓ Phone numbers, emails, and personal IDs automatically scrubbed to preserve privacy.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Location Cluster Prompt Card */}
                  {m.card && m.card.type === "location_prompt_card" && (
                    <div className="p-3.5 rounded-[10px] border border-[#0A0A0A] bg-[#23E000]/10 flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#0A0A0A]" />
                        <span className="font-bold text-[#0A0A0A]">
                          Location Privacy Rule: Broad Cluster Mapping (~2 to 3 km)
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 leading-relaxed">
                        Exact street and home GPS locations are strictly blocked and never stored. Permission only identifies your broad municipal/district safety cluster to warn neighboring citizens.
                      </p>
                      <button
                        onClick={handleAutoLocationPermission}
                        disabled={requestingGps}
                        className="mt-1 w-full min-h-[46px] px-4 py-2 bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Compass className="w-4 h-4 text-[#23E000]" />
                        <span>
                          {requestingGps ? "Detecting Regional Safety Cluster..." : "Allow & Detect Neighborhood Cluster"}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Dynamic Quick Reply Options - Only active on latest bot prompt */}
                  {m.quickReplies && m.id === lastMsgWithRepliesId && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {m.quickReplies.map((btn) => (
                        <button
                          key={btn.value}
                          onClick={() => handleUserReply(btn.label, btn.value)}
                          disabled={submitting}
                          className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-[#F7F7F2] hover:bg-[#0A0A0A] hover:text-[#F7F7F2] border border-[#0A0A0A] text-xs font-bold uppercase transition cursor-pointer disabled:opacity-50 text-left"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ));
        })()}
          <div ref={chatEndRef} />
        </div>

        {/* UI Error Banner */}
        {uiError && (
          <div className="mb-2 p-2.5 rounded-[8px] bg-[rgba(229,32,27,0.1)] border border-[#E5201B] text-xs font-bold text-[#E5201B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uiError}</span>
          </div>
        )}

        {/* Chat Input Bar - Always Available for Continuous Multiturn Dialogue */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUserReply(input);
          }}
          className="pt-2 border-t border-[#0A0A0A] flex gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={submitting}
            placeholder={
              submitting
                ? "Submitting report to community threat map..."
                : "Type your reply, ask a safety question, or paste text..."
            }
            className="flex-1 min-h-[46px] bg-[#F7F7F2] border border-[#0A0A0A] rounded-[8px] px-4 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/40 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          />
          <button
            type="submit"
            disabled={submitting || !input.trim()}
            className="min-h-[46px] px-5 bg-[#0A0A0A] text-[#F7F7F2] rounded-[8px] text-xs font-bold uppercase hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-[#23E000]" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
