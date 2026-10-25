import { Link } from 'react-router-dom'
import LegalPage, { type LegalSection } from '@/components/custom/legal-page/legal-page.component'
import { site } from '@/config/site'

const supportEmail = 'hello@trust0.ai'

const sections: LegalSection[] = [
  {
    id: 'contact',
    title: 'Contact support',
    body: (
      <>
        <p>
          The fastest way to reach us is by email at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. We
          usually reply within 2 business days.
        </p>
        <p>To help us resolve your issue quickly, please include:</p>
        <ul>
          <li>a short description of what happened and what you expected;</li>
          <li>the browser and operating system you use;</li>
          <li>the {site.name} extension version (shown on the extension&rsquo;s page in your browser);</li>
          <li>the link to the page or media you were checking, if relevant.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'bugs',
    title: 'Report a bug or request a feature',
    body: (
      <p>
        {site.name} is open source. You can open an issue, report a bug or suggest a feature on{' '}
        <a href={`${site.githubUrl}/issues`} target="_blank" rel="noreferrer">
          GitHub
        </a>
        . Please do not post private information in public issues.
      </p>
    ),
  },
  {
    id: 'extension',
    title: 'Browser extension help',
    body: (
      <>
        <h3>The extension is not working</h3>
        <ul>
          <li>Make sure you are on the latest version of the extension and your browser.</li>
          <li>Reload the page you are checking, then try again.</li>
          <li>Disable other extensions that modify page content, then retry.</li>
          <li>If it still fails, email us with the details above.</li>
        </ul>
        <h3>Uninstalling</h3>
        <p>
          You can remove the extension at any time from your browser&rsquo;s extensions page. To delete your account
          and stored Reports, email us from your account address.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy and data requests',
    body: (
      <p>
        To access, correct or delete your data, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. See our{' '}
        <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms of Service</Link> for details on how
        we handle your information.
      </p>
    ),
  },
]

export default function SupportPage() {
  return (
    <LegalPage
      title="Support"
      lastRevised={site.legalLastRevised}
      sections={sections}
      intro={
        <p>
          Need help with {site.name} or the {site.name} browser extension? You&rsquo;re in the right place. Find how to
          reach us and how to report problems below.
        </p>
      }
    />
  )
}
