import { Link } from 'react-router-dom'
import LegalPage, { type LegalSection } from '@/components/custom/legal-page/legal-page.component'
import { site } from '@/config/site'

const sections: LegalSection[] = [
  {
    id: 'eligibility',
    title: 'Who may use the Services',
    body: (
      <>
        <p>
          You must be at least {site.minimumAge} years old to use the Services. If you are under the age of majority
          where you live, you may use the Services only if your parent or legal guardian has reviewed and agreed to
          these Terms on your behalf.
        </p>
        <p>
          If you use the Services on behalf of a company or other organization, &ldquo;you&rdquo; includes that
          organization, and you confirm that you are authorized to accept these Terms for it.
        </p>
      </>
    ),
  },
  {
    id: 'services',
    title: 'What trust0 does',
    body: (
      <>
        <p>
          trust0 helps you assess whether content can be trusted. You can submit links (for example to posts on
          social platforms or to articles), upload photos or videos, or paste text. We analyze that content and
          provide results such as signals that it may be AI-generated or edited, the earliest copies and accounts
          we could find, how it changed as it spread, and whether claims made about it are supported. We call each
          set of results a &ldquo;Report&rdquo;.
        </p>
        <p>
          Reports are <strong>probabilistic assessments, not definitive findings</strong>. Detection and source
          tracing rely on the information available to us at the time and can be incomplete or wrong. See{' '}
          <a href="#disclaimers">Disclaimers</a> for more.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: (
      <>
        <p>
          Some features require an account. You agree to give us accurate information and keep it up to date. You
          are responsible for activity on your account and for keeping your login details secure. Tell us right away
          at <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> if you think your account has been
          compromised.
        </p>
        <p>You may not create an account if we have previously suspended or banned you, unless we agree in writing.</p>
      </>
    ),
  },
  {
    id: 'paid-plans',
    title: 'Paid plans',
    body: (
      <>
        <p>
          If you buy a paid plan, you agree to pay the fees and any applicable taxes shown at checkout. Payments are
          handled by our payment processor. Subscriptions renew automatically at the end of each billing period at
          the then-current price until you cancel.
        </p>
        <p>
          You can cancel at any time from your account settings; cancellation takes effect at the end of the current
          billing period, and you keep access until then. Except where required by law or stated otherwise at
          purchase, payments are non-refundable. We will give you reasonable notice before changing the price of an
          existing subscription.
        </p>
      </>
    ),
  },
  {
    id: 'your-content',
    title: 'Content you submit',
    body: (
      <>
        <p>
          &ldquo;Your Content&rdquo; means the links, files, text and other material you submit to the Services. You
          keep whatever rights you have in Your Content.
        </p>
        <p>
          You give us a worldwide, non-exclusive, royalty-free license to access, retrieve, store, copy, process,
          analyze and display Your Content, and to retrieve publicly available content located at the links you
          submit, only as needed to provide, secure and improve the Services. This license lasts for as long as we
          store Your Content.
        </p>
        <p>
          You confirm that you have the right to submit Your Content and that submitting it does not violate the law
          or anyone else&rsquo;s rights. Do not submit content you are not permitted to share with us, such as
          confidential material you have no right to disclose.
        </p>
      </>
    ),
  },
  {
    id: 'reports',
    title: 'Reports and how you use them',
    body: (
      <>
        <p>
          You may save, download and share your Reports. If you create a shareable link to a Report, anyone with the
          link can view it until you disable sharing or delete the Report.
        </p>
        <p>When you share or rely on a Report, you agree that you will not:</p>
        <ul>
          <li>present it as conclusive proof that content is fake, manipulated or genuine;</li>
          <li>
            use it as the sole basis for a decision that significantly affects someone, such as employment,
            disciplinary, legal or law-enforcement action;
          </li>
          <li>alter it in a way that misrepresents what trust0 found.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to use the Services to:</p>
        <ul>
          <li>
            harass, threaten, stalk, dox or target any person, including people or accounts identified through source
            tracing;
          </li>
          <li>defame anyone or make false accusations, including by misrepresenting a Report;</li>
          <li>submit content that sexually exploits children, or any other unlawful content;</li>
          <li>infringe anyone&rsquo;s intellectual property, privacy or publicity rights;</li>
          <li>conduct unlawful surveillance or build profiles of individuals;</li>
          <li>
            access the Services through bots, scrapers or other automated means, except through an API or integration
            we provide and under its terms;
          </li>
          <li>
            reverse engineer, decompile or attempt to extract our models, detection methods or source code, or use
            the Services to build a competing product;
          </li>
          <li>
            probe, disrupt or overload the Services, get around usage limits or security measures, or introduce
            malware;
          </li>
          <li>break any applicable law or regulation.</li>
        </ul>
        <p>We may remove content or suspend accounts that we reasonably believe violate this section.</p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party platforms and content',
    body: (
      <>
        <p>
          The Services work with content hosted on third-party platforms such as Instagram, X, YouTube, TikTok,
          Reddit and news sites. trust0 is not affiliated with or endorsed by those platforms. Your use of them is
          governed by their own terms, and we are not responsible for their content, availability or practices.
        </p>
        <p>
          Content we retrieve from third parties belongs to its respective owners. Displaying it in a Report does
          not transfer any rights in it to you or to us.
        </p>
      </>
    ),
  },
  {
    id: 'copyright',
    title: 'Copyright complaints',
    body: (
      <>
        <p>
          If you believe material on the Services infringes your copyright, send a notice to{' '}
          <a href={`mailto:${site.copyrightEmail}`}>{site.copyrightEmail}</a> that includes:
        </p>
        <ul>
          <li>the copyrighted work you believe is infringed;</li>
          <li>the material you believe is infringing, with enough detail for us to locate it;</li>
          <li>your name, address, phone number and email address;</li>
          <li>
            a statement that you believe in good faith the use is not authorized by the copyright owner, its agent or
            the law;
          </li>
          <li>
            a statement, under penalty of perjury, that your notice is accurate and that you are the copyright owner
            or authorized to act for them; and
          </li>
          <li>your physical or electronic signature.</li>
        </ul>
        <p>We may disable the accounts of users who repeatedly infringe others&rsquo; rights.</p>
      </>
    ),
  },
  {
    id: 'ownership',
    title: 'Our intellectual property and feedback',
    body: (
      <>
        <p>
          The Services, including our software, models, design, text, graphics and the {site.name} name and logo, are
          owned by {site.legalName} or our licensors and protected by intellectual property laws. Subject to these
          Terms, we give you a personal, non-exclusive, non-transferable, revocable license to use the Services.
        </p>
        <p>
          If you send us ideas or feedback, we may use them without restriction or compensation to you.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: (
      <p>
        Our <Link to="/privacy">Privacy Policy</Link> explains how we collect and use personal information when you
        use the Services.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: (
      <>
        <p>
          The Services and all Reports are provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>.
          To the fullest extent permitted by law, we disclaim all warranties, express or implied, including
          warranties of merchantability, fitness for a particular purpose, accuracy and non-infringement.
        </p>
        <p>
          In particular, we do not guarantee that any Report is accurate, complete or current; that AI-generated or
          manipulated content will always be detected; that authentic content will never be flagged; or that we have
          found the true original source of any content. You are responsible for how you interpret and act on
          Reports.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <>
        <p>
          To the fullest extent permitted by law, {site.legalName} and its affiliates, officers, employees and
          licensors will not be liable for any indirect, incidental, special, consequential or punitive damages, or
          for any loss of profits, data, goodwill or reputation, arising out of or related to the Services or any
          Report.
        </p>
        <p>
          Our total liability for any claim relating to the Services or these Terms will not exceed the greater of
          the amount you paid us in the 12 months before the claim arose or US$100.
        </p>
        <p>Some jurisdictions do not allow these limitations, so some of them may not apply to you.</p>
      </>
    ),
  },
  {
    id: 'indemnity',
    title: 'Indemnification',
    body: (
      <p>
        You agree to defend and indemnify {site.legalName} and its affiliates, officers and employees against any
        claims, losses and expenses (including reasonable legal fees) arising from Your Content, your misuse of the
        Services or any Report, or your violation of these Terms or of anyone&rsquo;s rights.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Suspension and termination',
    body: (
      <p>
        You can stop using the Services and delete your account at any time. We may suspend or end your access if
        you breach these Terms, if required by law, or if continuing to provide the Services to you would create
        risk for us or others. Sections that by their nature should survive termination, including content
        licenses needed to wind down, disclaimers, limitation of liability and indemnification, will survive.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing law and disputes',
    body: (
      <p>
        These Terms are governed by the laws of {site.governingLaw}, without regard to its conflict-of-law rules.
        Before filing a claim, you agree to contact us and try to resolve the dispute informally for at least 30 days.
        Any dispute that is not resolved informally will be brought exclusively in {site.disputeVenue}, unless
        applicable law requires otherwise.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    body: (
      <p>
        We may update these Terms from time to time. When we do, we will change the &ldquo;Last revised&rdquo; date
        above, and for material changes we will give you reasonable notice, such as by email or in the product.
        Continuing to use the Services after changes take effect means you accept the updated Terms.
      </p>
    ),
  },
  {
    id: 'general',
    title: 'General',
    body: (
      <p>
        These Terms are the entire agreement between you and us about the Services. If any provision is found
        unenforceable, the rest remain in effect. Our failure to enforce a provision is not a waiver. You may not
        transfer these Terms without our consent; we may transfer them in connection with a merger, acquisition or
        sale of assets.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions about these Terms? Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> or write
        to {site.legalName}, {site.address}.
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastRevised={site.legalLastRevised}
      sections={sections}
      intro={
        <>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the {site.name} website at{' '}
            {site.url} and the related applications, APIs and features (together, the &ldquo;Services&rdquo;),
            provided by {site.legalName} (&ldquo;{site.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
          </p>
          <p>
            By accessing or using the Services, you agree to these Terms. If you do not agree, do not use the
            Services.
          </p>
        </>
      }
    />
  )
}
