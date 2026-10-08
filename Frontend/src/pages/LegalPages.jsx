import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowUpRightIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import "./LegalPages.css";

const terms = [
  {
    id: "using-the-service",
    title: "Using CERTIVERXIA",
    paragraphs: [
      "These Terms and Conditions govern use of the CERTIVERXIA certificate management and verification portal. By creating an account or using the service, you agree to these terms. If you act for an institute, you must have authority to act on its behalf.",
      "CERTIVERXIA provides tools for institutes to issue and manage certificates and for others to check certificate records. Institutes remain responsible for their educational services, assessments, awards, and the accuracy of the information they provide.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts and access",
    paragraphs: [
      "Provide accurate institute, administrator, and contact details, and keep them up to date. Registration may require email verification and super admin approval before you can use your workspace.",
      "Keep your password and verification codes private. Give staff access only through authorised accounts and notify info@certiverxia.com if you suspect misuse. You are responsible for activity you authorise through your account.",
    ],
  },
  {
    id: "certificates",
    title: "Certificates and verification",
    paragraphs: [
      "Only issue certificates you are authorised to award. Obtain the permissions and provide the notices needed to upload learner information, signatures, logos, and other materials. Do not create misleading or fraudulent credentials.",
      "Verification reports the record and checks available at the time of the request. It does not independently establish a learner’s competence, accreditation, or an institute’s legal standing. Read the current certificate status and any signature or trust warnings; a record can later be suspended, revoked, expired, or replaced.",
      "Offline signature checks cannot confirm the latest revocation status or current issuer trust. Reconnect to check the current online record before relying on an offline result.",
    ],
  },
  {
    id: "trial",
    title: "Your free trial",
    paragraphs: [
      "Where subscription packages are enabled, a newly registered institute receives one 14-day trial using the Starter package limits in effect at registration. The trial begins at registration, including time spent awaiting account verification or approval. No payment is required for the trial.",
      "The trial is shared by the institute and its teachers. It does not restart when you select a package, and its unused allowance does not transfer to an approved paid package.",
    ],
  },
  {
    id: "payments",
    title: "Packages, bank payments, and invoices",
    paragraphs: [
      "The package page shows the price, currency, allowance, and included features. Follow the bank instructions shown at checkout and upload accurate payment information and proof. Selecting a package, making a transfer, or uploading a receipt does not activate access by itself.",
      "The super admin must verify and approve the payment. Approval starts a fresh 12-month term with the purchased allowances. An approved PDF invoice marked PAID is available in payment history and queued for email delivery. Email delivery may be delayed; check your account for the approval result.",
      "Subscriptions are paid by manual bank transfer; this flow does not automatically debit your account or renew a package. Contact info@certiverxia.com about a duplicate or incorrect transfer, payment dispute, or refund request and include your transaction reference. Nothing in these terms limits a refund or other remedy required by applicable law.",
    ],
  },
  {
    id: "upgrades",
    title: "Upgrades, expiry, and stopped packages",
    paragraphs: [
      "An active paid subscriber can request an eligible higher package. The current package remains available until its own expiry, a suspension, or approval of the upgrade. Upgrade approval replaces the old package with a new 12-month term and fresh allowances.",
      "Upgrades use the full displayed annual price. The standard upgrade flow does not prorate remaining time, refund the unused term, or carry forward unused credits. This does not override any remedy required by law.",
      "Package features stop when the term expires or the super admin stops the package. Login, renewal options, existing records, and approved receipts remain available subject to account security restrictions. An expiry email is a reminder; delayed or failed delivery does not extend the package.",
      "The super admin can stop a package with a recorded reason. Contact support if you believe a restriction is incorrect. Resuming a package does not extend its original expiry date.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use and your content",
    paragraphs: [
      "Do not impersonate an institute or learner, submit fabricated payment evidence, access another organisation’s records without permission, bypass access or usage limits, distribute malicious files, or interfere with the service. Verification access must not be used to harvest personal information.",
      "You retain your rights in the material you provide. You permit CERTIVERXIA to store, process, display, and deliver that material as needed to provide the service and the sharing features you use. This does not transfer ownership of your content.",
      "Share credential links only with intended recipients. A person with an accessible link or certificate code may view the information that the corresponding verification or sharing feature exposes.",
    ],
  },
  {
    id: "availability",
    title: "Availability and responsibility",
    paragraphs: [
      "Service interruptions, maintenance, network failures, and email or SMS delivery delays can occur. Keep appropriate copies of your original records and review verification results before making decisions.",
      "CERTIVERXIA does not guarantee uninterrupted availability or the accuracy of information supplied by an institute. Each party remains responsible for its own conduct. Nothing in these terms excludes liability, consumer protections, or other rights that cannot lawfully be excluded.",
    ],
  },
  {
    id: "changes-contact",
    title: "Changes, questions, and disputes",
    paragraphs: [
      "Updates to these terms will appear on this page with a revised date. Review them before making a new purchase. Changes to the published catalogue do not change the price and allowances already saved for a purchased package.",
      "Contact CERTIVERXIA first if you have a concern about your account, a payment, or these terms. We can be reached at info@certiverxia.com, 078 789 6876, or Mary’s Road, Colombo, Sri Lanka. Applicable legal rights and available complaint or court processes remain unaffected.",
    ],
  },
];

const privacy = [
  {
    id: "scope",
    title: "About this policy",
    paragraphs: [
      "This policy explains how personal information is handled through the CERTIVERXIA portal. It covers institute administrators, teachers, learners whose records are supplied by institutes, and people using certificate verification or shared links.",
      "CERTIVERXIA handles account administration, payment review, and platform security information. Issuing institutes supply and manage their learners’ records and determine which certificates to issue or share. For a correction to an award or learner record, contact the issuing institute; you can also contact us for assistance.",
    ],
  },
  {
    id: "information",
    title: "Information the portal processes",
    paragraphs: [
      "Account and institute details: names, email addresses, phone numbers, addresses, institute type, approximate student count, staff roles, account approval status, and authentication information. Passwords are stored as hashes rather than readable passwords.",
      "Learner and credential details: learner names and contact information, course and enrolment records, award dates, certificate identifiers, certificate images, templates, institute branding, and certificate status and history.",
      "Payment and subscription details: selected packages, allowances and usage, payer names, payment dates, transaction references, receipt images, review decisions, invoices, and package start and expiry dates. The bank-transfer flow does not ask for online banking passwords or card security codes.",
      "Usage and security records: verification requests and outcomes, timestamps, sharing activity, administrative actions, and device or network information. Verification logs use hashed IP and browser identifiers; other activity or server logs may contain IP addresses and browser information.",
    ],
  },
  {
    id: "purposes",
    title: "How information is used",
    paragraphs: [
      "Information is used to create and secure accounts, verify institute access, manage courses and learners, issue and verify credentials, deliver controlled sharing, review payments, enforce package limits, and provide support.",
      "It also supports usage and subscription reporting, audit trails, abuse detection, dispute handling, and service communications such as verification codes, credential notifications, paid invoices, and package expiry notices.",
      "Where applicable law requires a legal basis, processing must have an appropriate basis for its purpose, such as providing the requested service, meeting legal obligations, protecting legitimate security and administrative interests, or consent where required. An institute is responsible for having the necessary authority to supply learner information, including any permissions needed for children’s records.",
    ],
  },
  {
    id: "public-records",
    title: "Public verification and shared certificates",
    paragraphs: [
      "Someone who has a certificate code or verification link can access the public verification information, which may include the learner’s name, course, institute, award date, certificate identifier, status, and verification or lifecycle details. Consider this visibility before issuing or distributing a certificate.",
      "Public verification does not by itself provide the original certificate image for download. Controlled share links may expose selected fields and the certificate image according to the issuer’s choices. These links can have expiry times, view limits, and revocation controls.",
      "Treat share links as private access information. A recipient may retain information they have already seen or downloaded; revoking a link cannot remove copies already saved by that recipient. Signed QR credentials may also contain information readable by a person holding the QR code.",
    ],
  },
  {
    id: "recipients",
    title: "Who may receive information",
    paragraphs: [
      "Authorised institute staff can access information within their assigned workspace and permissions. Super admins can access information needed for institute approvals, payment review, subscription management, security, and support. Verification visitors and share-link recipients receive information as described above.",
      "Hosting, database, storage, email, and, where enabled, SMS services may process information to operate the portal. Delivery providers receive the contact details and message content needed for the communication. Information may also be disclosed when required by law or needed to investigate misuse or establish, exercise, or defend legal claims.",
      "The locations where information is processed depend on the service providers used for the deployment and may include locations outside Sri Lanka. Contact us for current provider and processing-location details; any transfer must follow applicable requirements.",
    ],
  },
  {
    id: "browser",
    title: "Browser storage and camera access",
    paragraphs: [
      "The portal uses local browser storage for sign-in tokens and account information, and session storage for some payment-flow state. Clearing browser storage can sign you out or remove saved browser state. Use a trusted device and sign out when using a shared computer.",
      "The QR camera feature requests browser permission when you choose to start scanning. The scanner reads the QR through your device camera; the extracted certificate code is used for verification. You can deny camera access and enter the code manually instead.",
    ],
  },
  {
    id: "retention",
    title: "Retention and security",
    paragraphs: [
      "Retention depends on the record’s purpose, applicable obligations, and the deployed retention settings. Account, credential, payment, and audit records may remain available after a package ends to support verification, invoice access, fraud prevention, and disputes. Package expiry does not automatically delete these records.",
      "Verification logs and expired sharing records have configurable cleanup periods. Other records and backups may follow different retention arrangements. Contact us for the periods that apply to your information or to request deletion; do not assume that closing access removes every historical record.",
      "Controls include password hashing, role and institute access checks, restricted payment-proof access, and controlled sharing. No service can guarantee complete security. Report suspected unauthorised access promptly, and avoid uploading unrelated sensitive information in payment proofs or support requests.",
    ],
  },
  {
    id: "choices",
    title: "Your choices and requests",
    paragraphs: [
      "Contact info@certiverxia.com to ask about your information or request access, correction, deletion, or other privacy assistance. Depending on the law that applies, you may also have rights to object to or restrict processing, receive a copy of information, or withdraw consent where processing relies on consent.",
      "We may need to confirm your identity and coordinate with the institute responsible for a learner record. Requests are subject to applicable law and legitimate record-retention needs; we will explain any restriction rather than promise automatic deletion. Withdrawing consent does not undo processing already lawfully carried out.",
      "A parent or guardian with concerns about a child’s learner information should contact the issuing institute or our support team. You may also seek guidance from the relevant data protection authority where applicable.",
    ],
  },
  {
    id: "contact",
    title: "Contact and policy updates",
    paragraphs: [
      "Contact CERTIVERXIA at info@certiverxia.com, 078 789 6876, or Mary’s Road, Colombo, Sri Lanka. Please describe the record or account involved, but do not email your password, one-time code, or banking login details.",
      "Changes to this policy will be published here with an updated date. For information about Sri Lanka’s data protection framework and official guidance, consult the Data Protection Authority using the link below.",
    ],
  },
];

export default function LegalPages({ kind = "terms" }) {
  const isPrivacy = kind === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms and Conditions";
  const sections = isPrivacy ? privacy : terms;
  const Icon = isPrivacy ? ShieldCheckIcon : DocumentTextIcon;
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | CERTIVERXIA`;
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, [title]);
  return (
    <div className="cvx-legal">
      <header className="cvx-legal-hero">
        <span className="brand-eyebrow">
          CERTIVERXIA · TRUST & TRANSPARENCY
        </span>
        <div className="cvx-legal-icon">
          <Icon aria-hidden="true" />
        </div>
        <h1>{title}</h1>
        <p>
          {isPrivacy
            ? "Your information, your credentials, and how we handle them."
            : "A clear guide to your account, certificates, and subscription."}
        </p>
        <span className="cvx-legal-date">Last updated: 9 October 2026</span>
        <nav aria-label="Legal pages" className="cvx-legal-tabs">
          <Link to="/terms" aria-current={!isPrivacy ? "page" : undefined}>
            Terms & Conditions
          </Link>
          <Link to="/privacy" aria-current={isPrivacy ? "page" : undefined}>
            Privacy Policy
          </Link>
        </nav>
      </header>
      <div className="cvx-legal-layout">
        <aside className="cvx-legal-sidebar">
          <nav aria-label="On this page">
            <h2>On this page</h2>
            {sections.map((section, i) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            ))}
          </nav>
          <a className="cvx-legal-contact" href="mailto:info@certiverxia.com">
            <EnvelopeIcon aria-hidden="true" />
            <span>
              Have a question?<strong>Contact our team</strong>
            </span>
            <ArrowUpRightIcon aria-hidden="true" />
          </a>
        </aside>
        <article className="cvx-legal-document" aria-label={title}>
          <div className="cvx-legal-summary">
            <ShieldCheckIcon aria-hidden="true" />
            <p>
              {isPrivacy
                ? "Certificate verification can reveal learner information. Read the public verification and sharing section to understand what others can see."
                : "Paid access starts after payment approval. Your package page and payment history show the terms and allowances for your subscription."}
            </p>
          </div>
          {sections.map((section, i) => (
            <section
              id={section.id}
              key={section.id}
              className="cvx-legal-section"
            >
              <h2>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </section>
          ))}
          {isPrivacy && (
            <p className="cvx-legal-reference">
              <a
                href="https://www.dpa.gov.lk/guidelines.php"
                target="_blank"
                rel="noopener noreferrer"
              >
                Data Protection Authority of Sri Lanka: official guidance{" "}
                <ArrowUpRightIcon aria-hidden="true" />
              </a>
            </p>
          )}
          <div className="cvx-legal-document-footer">
            <p>
              {isPrivacy
                ? "Read the terms for using your account and package."
                : "Learn how account, payment, and credential information is handled."}
            </p>
            <Link to={isPrivacy ? "/terms" : "/privacy"}>
              {isPrivacy ? "View Terms and Conditions" : "View Privacy Policy"}{" "}
              <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
