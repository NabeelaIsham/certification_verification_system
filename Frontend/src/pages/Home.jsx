import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, ShieldCheckIcon, QrCodeIcon, AcademicCapIcon, CheckIcon, DocumentCheckIcon, BuildingLibraryIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const features = [
  { icon: ShieldCheckIcon, title: 'Credentials with integrity', text: 'Digitally signed certificates help you detect tampering and validate the original credential.' },
  { icon: QrCodeIcon, title: 'A simpler way to verify', text: 'Scan a QR code or enter a certificate ID to check a credential and its current status.' },
  { icon: BuildingLibraryIcon, title: 'Built for your institution', text: 'Bring courses, students, and certificate issuance together in one dedicated workspace.' },
  { icon: EnvelopeIcon, title: 'Achievements, delivered', text: 'Send certificates directly to learners, ready to download and share with their next opportunity.' },
];

export default function Home() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const verify = (event) => {
    event.preventDefault();
    if (code.trim()) navigate(`/verify/${encodeURIComponent(code.trim())}`);
  };
  return (
    <div className="brand-home">
      <section className="brand-hero">
        <div className="brand-container hero-grid">
          <div className="hero-copy">
            <span className="brand-eyebrow"><span className="status-dot" /> A NEW STANDARD FOR DIGITAL CREDENTIALS</span>
            <h1>Real achievements.<br /><span className="gradient-text">Verifiable trust.</span></h1>
            <p className="hero-description">Every achievement deserves to be trusted. Issue, share, and verify digital certificates in one secure, connected platform.</p>
            <div className="hero-actions">
              <Link to="/verify" className="brand-button">Verify a certificate <ArrowRightIcon /></Link>
              <Link to="/register" className="brand-button brand-button-secondary">For institutions <BuildingLibraryIcon /></Link>
            </div>
            <div className="hero-assurances"><span><CheckIcon /> Digitally signed</span><span><CheckIcon /> QR verification</span><span><CheckIcon /> Easy to share</span></div>
          </div>
          <div className="credential-scene" aria-label="Illustration of a sample digital certificate">
            <div className="scene-orbit orbit-one" /><div className="scene-orbit orbit-two" />
            <div className="sample-certificate">
              <div className="sample-top"><img src="/favicon.svg" alt="" /><span>THE VALUE OF EVERY ACHIEVEMENT</span><span className="sample-label">SAMPLE</span></div>
              <div className="certificate-rule" />
              <AcademicCapIcon className="sample-cap" />
              <p className="sample-kicker">A MILESTONE WORTH SHARING</p>
              <h2>Certificate of Achievement</h2>
              <p className="sample-caption">Recognising dedication. Celebrating possibility.</p>
              <div className="sample-name">Your next great achievement</div>
              <div className="sample-lines"><span /><span /></div>
              <div className="sample-bottom"><div><span className="sample-kicker">ISSUED WITH CONFIDENCE</span><p>Powered by CERTIVERXIA</p></div><ShieldCheckIcon /></div>
            </div>
            <div className="floating-proof"><span className="proof-icon"><ShieldCheckIcon /></span><div><strong>Trust, built in.</strong><span>Digital signatures. Clear verification.</span></div></div>
          </div>
        </div>
      </section>
      <section className="brand-container quick-verify" aria-labelledby="quick-verify-title">
        <div className="quick-verify-heading"><span className="feature-icon"><DocumentCheckIcon /></span><div><h2 id="quick-verify-title">Have a certificate to check?</h2><p>A little certainty goes a long way.</p></div></div>
        <form onSubmit={verify} className="quick-verify-form"><label htmlFor="home-certificate-code" className="sr-only">Certificate code</label><input id="home-certificate-code" value={code} onChange={event => setCode(event.target.value)} placeholder="Enter certificate code" required maxLength={200} /><button className="brand-button" type="submit">Verify now <ArrowRightIcon /></button></form>
      </section>
      <section className="brand-container brand-features" id="platform">
        <div className="section-heading"><div><span className="brand-eyebrow">CONFIDENCE AT EVERY STEP</span><h2>One platform.<br />Every credential, connected.</h2></div><p>From the moment a certificate is issued to the moment it opens a new door. Make every step simpler.</p></div>
        <div className="feature-grid">{features.map((feature, index) => <article className="feature-card" key={feature.title}><div className="feature-card-top"><span className="feature-icon"><feature.icon /></span><span className="feature-number">0{index + 1}</span></div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
      </section>
      <section className="brand-workflow" id="how-it-works"><div className="brand-container"><div className="section-heading"><div><span className="brand-eyebrow">LESS FRICTION. MORE POSSIBILITY.</span><h2>From achievement to assurance.</h2></div><Link to="/verify" className="text-link">Explore verification <ArrowRightIcon /></Link></div><div className="workflow-grid">{[
        ['01', 'Issue with confidence', 'Institutions create digitally signed credentials for their learners.'],
        ['02', 'Share your success', 'Learners receive their certificates and share them when it matters.'],
        ['03', 'Verify with clarity', 'Employers and reviewers check certificate details using a code or QR.'],
      ].map(([number, title, text]) => <article key={number}><span className="workflow-number">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="brand-container"><div className="brand-cta"><div><span className="brand-eyebrow">YOUR ACHIEVEMENTS. OUR COMMITMENT.</span><h2>Give every credential<br />the confidence it deserves.</h2><p>A better experience for institutions, learners, and everyone who relies on their achievements.</p></div><Link to="/register" className="brand-button">Get started <ArrowRightIcon /></Link></div></section>
    </div>
  );
}
