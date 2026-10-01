import { Link } from 'react-router-dom'
import LegalPage, { type LegalSection } from '@/components/custom/legal-page/legal-page.component'
import { site } from '@/config/site'

const sections: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Account information</strong>, such as your name, email address, password and profile details, or
            the basic profile information shared by a sign-in provider you choose (for example Google).
          </li>
          <li>
            <strong>Content you submit</strong>, such as links, uploaded photos and videos, text and any notes you
            add, together with the Reports we generate from them.
          </li>
          <li>
            <strong>Payment information</strong> if you buy a paid plan. Card details are collected and processed by
            our payment processor; we receive limited details such as your billing address, plan and transaction
            history.
          </li>
          <li>
            <strong>Communications</strong>, such as support requests, feedback and survey responses.
          </li>
        </ul>

        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Device and log information</strong>, such as IP address, browser and device type, operating
            system, language and the dates and times of your visits.
          </li>
          <li>
            <strong>Usage information</strong>, such as pages viewed, features used, links clicked and errors
            encountered.
          </li>
          <li>
            <strong>Approximate location</strong> inferred from your IP address.
          </li>
        </ul>

        <h3>Information from other sources</h3>
        <ul>
          <li>
            <strong>Publicly available content</strong> located at the links you submit, along with related public
            information we find while tracing its origin (see{' '}
            <a href="#people-in-content">People who appear in submitted content</a>).
          </li>
          <li>
            <strong>Sign-in providers</strong>, if you choose to log in with a third-party account.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use information',
    body: (
      <>
        <p>We use the information we collect to:</p>
        <ul>
          <li>analyze the content you submit, trace its sources and generate Reports;</li>
          <li>create, maintain and secure your account;</li>
          <li>process payments and manage subscriptions;</li>
          <li>respond to support requests and send service messages, such as receipts and security alerts;</li>
          <li>
            send product updates and marketing emails, where permitted, which you can unsubscribe from at any time;
          </li>
          <li>monitor, debug and improve the Services, including the accuracy of our detection and tracing;</li>
          <li>detect and prevent fraud, abuse and violations of our Terms;</li>
          <li>comply with legal obligations and enforce our rights.</li>
        </ul>
        <p>
          <strong>Model improvement.</strong> [State here whether content submitted to trust0 is used to train or
          evaluate detection models, and how users can opt out. Delete this sentence if you do not use submitted
          content for training.]
        </p>
        <p>
          Where the law requires a legal basis for processing (for example in the EU and UK), we rely on: performing
          our contract with you; our legitimate interests in operating, securing and improving the Services; your
          consent, where we ask for it; and compliance with legal obligations.
        </p>
      </>
    ),
  },
  {
    id: 'people-in-content',
    title: 'People who appear in submitted content',
    body: (
      <>
        <p>
          The content you ask us to check, and the copies we find while tracing it, may include information about
          other people, such as public account names, handles, profile pictures, captions and posting times. We
          process this information only to provide the Services: to establish where content came from and how it
          spread.
        </p>
        <p>
          We do not use it to build profiles of individuals or sell it. If you believe a Report contains information
          about you that should be corrected or removed, contact us at{' '}
          <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'How we share information',
    body: (
      <>
        <p>We do not sell your personal information. We share it only as follows:</p>
        <ul>
          <li>
            <strong>Service providers</strong> who process information on our behalf, such as cloud hosting, payment
            processing, email delivery, analytics and customer support, under contracts that limit their use of it.
          </li>
          <li>
            <strong>Shared Reports.</strong> If you create a shareable link to a Report, anyone with the link can see
            the Report&rsquo;s contents.
          </li>
          <li>
            <strong>Legal and safety reasons</strong>, when we believe in good faith that disclosure is required by
            law or legal process, or needed to protect the rights, safety or property of our users, the public or
            us.
          </li>
          <li>
            <strong>Business transfers</strong>, in connection with a merger, acquisition, financing or sale of
            assets, subject to this Privacy Policy.
          </li>
          <li>
            <strong>With your consent</strong> or at your direction.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and similar technologies',
    body: (
      <>
        <p>
          We use cookies and similar technologies to keep you signed in, remember your preferences, understand how
          the Services are used and improve them. You can block or delete cookies in your browser settings, but some
          features, such as staying logged in, may stop working.
        </p>
        <p>
          [List the analytics or other third-party tools the site uses, and link to their opt-out pages where
          available.]
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep information',
    body: (
      <p>
        We keep personal information for as long as your account is active or as needed to provide the Services.
        You can delete individual Reports and submissions at any time. When you delete your account, we delete or
        anonymize your personal information within a reasonable period, except where we need to keep it to comply
        with the law, resolve disputes, prevent abuse or enforce our agreements. [Add specific retention periods if
        you have them.]
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        We use administrative, technical and physical safeguards designed to protect your information. No method of
        transmission or storage is completely secure, so we cannot guarantee absolute security. Please use a strong,
        unique password and tell us right away if you suspect unauthorized access to your account.
      </p>
    ),
  },
  {
    id: 'international',
    title: 'International transfers',
    body: (
      <p>
        We and our service providers may process information in countries other than the one where you live, which
        may have different data protection laws. Where required, we use appropriate safeguards for these transfers,
        such as standard contractual clauses.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights and choices',
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access, correct, delete or receive a copy of your
          personal information, to object to or restrict certain processing, and to withdraw consent you have given.
          You can exercise many of these choices directly in your account settings, or by emailing{' '}
          <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>. We may need to verify your identity before
          acting on a request, and we will not discriminate against you for exercising your rights.
        </p>
        <p>
          If you are in the EU or UK, you also have the right to lodge a complaint with your local data protection
          authority. Residents of California and other U.S. states with privacy laws have the rights described above,
          and we do not sell or &ldquo;share&rdquo; personal information as those terms are defined under those laws.
        </p>
        <p>You can unsubscribe from marketing emails using the link in any such email.</p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        The Services are not directed to children under {site.minimumAge}, and we do not knowingly collect their
        personal information. If you believe a child has given us personal information, contact us and we will delete
        it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this Privacy Policy',
    body: (
      <p>
        We may update this Privacy Policy from time to time. We will change the &ldquo;Last revised&rdquo; date above
        and, for material changes, give you notice, such as by email or in the product.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions or requests about privacy? Email <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a> or
        write to {site.legalName}, {site.address}.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastRevised={site.legalLastRevised}
      sections={sections}
      intro={
        <>
          <p>
            This Privacy Policy explains how {site.legalName} (&ldquo;{site.name}&rdquo;, &ldquo;we&rdquo;,
            &ldquo;us&rdquo;) collects, uses and shares information when you use the {site.name} website, applications,
            APIs and related features (the &ldquo;Services&rdquo;). We are the controller of the personal information
            described here.
          </p>
          <p>
            It should be read together with our <Link to="/terms">Terms of Service</Link>. If you do not agree with
            this Privacy Policy, please do not use the Services.
          </p>
        </>
      }
    />
  )
}
