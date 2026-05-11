import LegalDocumentLayout from '../components/LegalDocumentLayout';

export default function ChildSafety() {
  return (
    <LegalDocumentLayout title="Child Safety Standards Policy">
      <>
        <p>
          <strong>Last updated:</strong> January 5, 2026
        </p>
        <p>
          Vetrivel is committed to maintaining a safe and secure platform. We strictly prohibit any form of Child Sexual
          Abuse and Exploitation (CSAE) and take all necessary steps to prevent, detect, and report such content and
          activity.
        </p>
        <hr />
        <h2>1. Zero-Tolerance Policy on CSAE</h2>
        <p>
          We enforce a zero-tolerance policy against Child Sexual Abuse Material (CSAM) and all forms of child sexual abuse
          and exploitation. This includes, but is not limited to:
        </p>
        <ul>
          <li>Any content that depicts, encourages, or facilitates child sexual abuse or exploitation.</li>
          <li>Any attempt to groom, solicit, or engage minors in inappropriate conversations or activities.</li>
          <li>The sharing, storage, or transmission of CSAM in any form.</li>
          <li>The use of our platform for the recruitment or facilitation of child trafficking or exploitation.</li>
        </ul>
        <p>Any accounts found to be engaging in such activities will be permanently banned and reported to the appropriate authorities.</p>
        <hr />
        <h2>2. Reporting Mechanism</h2>
        <p>We provide an easy-to-use reporting mechanism within the app. Users can:</p>
        <ul>
          <li>
            Tap <strong>Report</strong> on any content or profile they find suspicious.
          </li>
          <li>
            Email us directly at{' '}
            <a href="mailto:xbeyond.developer@gmail.com">xbeyond.developer@gmail.com</a>.
          </li>
        </ul>
        <p>All reports are reviewed by our trust and safety team. We encourage users to report any unsafe behavior, even if uncertain.</p>
        <hr />
        <h2>3. Handling of CSAM and Compliance</h2>
        <p>When reports of CSAM or CSAE are received:</p>
        <ul>
          <li>Offending content is immediately removed from the platform.</li>
          <li>The responsible account is permanently banned.</li>
          <li>
            Confirmed cases are reported to the <strong>National Center for Missing and Exploited Children (NCMEC)</strong>{' '}
            CyberTipline at{' '}
            <a href="https://www.cybertipline.org" target="_blank" rel="noopener noreferrer">
              cybertipline.org
            </a>{' '}
            or to the relevant local law enforcement authority in compliance with applicable child protection laws.
          </li>
        </ul>
        <hr />
        <h2>4. Proactive Detection and Moderation</h2>
        <p>To ensure compliance and prevent CSAE, we implement the following measures:</p>
        <ul>
          <li>
            <strong>Automated and Manual Review:</strong> We use a combination of automated tools and trained human moderators
            to detect and review content.
          </li>
          <li>
            <strong>Account Monitoring:</strong> Suspicious accounts or repeat offenders are disabled immediately.
          </li>
          <li>
            <strong>Staff Training:</strong> Our moderation team receives training on identifying signs of abuse and escalation
            protocols.
          </li>
        </ul>
        <hr />
        <h2>5. Age Restrictions</h2>
        <p>
          Vetrivel is not intended for users under the age of 13. Users found to be underage will have their accounts
          suspended.
        </p>
        <hr />
        <h2>6. Dedicated Child Safety Contact</h2>
        <p>For any child safety concerns, authorities, parents, or users can contact our designated Child Safety representative:</p>
        <div className="my-3 space-y-2">
          <p>
            <strong>Name:</strong> Suresh Unnikrishnan Menon
          </p>
          <p>
            <strong>Title:</strong> Child Safety Lead
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:xdeveloper@gmail.com">xdeveloper@gmail.com</a>
          </p>
          <p>
            <strong>Response time:</strong> Within 24 hours for urgent matters
          </p>
        </div>
        <hr />
        <h2>7. Ongoing Commitment</h2>
        <p>
          We continuously update and strengthen our child protection measures in alignment with industry best practices,
          including guidance from the <strong>Tech Coalition</strong> and <strong>Google Play&apos;s Child Safety Standards</strong>.
          We cooperate fully with law enforcement and regulatory authorities.
        </p>
        <hr />
        <p className="text-sm italic opacity-90">
          This policy is published by Suresh Unnikrishnan Menon in compliance with Google Play&apos;s Child Safety Standards Policy.
        </p>
      </>
    </LegalDocumentLayout>
  );
}
