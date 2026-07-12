export const metadata = {
  title: "Terms of service",
  description: "The terms that govern the use of PadelPro Coaching.",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. What PadelPro is",
    body: [
      "PadelPro Coaching is a marketplace that connects padel players with independent coaches for video-based analysis. Players purchase one-off video reviews or monthly plans; coaches review the submitted footage and deliver personal feedback.",
      "Coaches on PadelPro are independent professionals, not employees of the platform. Each coach sets their own prices and commits to their own response time.",
    ],
  },
  {
    title: "2. Accounts",
    body: [
      "You need an account to buy coaching or to coach. You must provide accurate information and keep your login credentials confidential. You are responsible for activity on your account.",
      "Coach profiles are reviewed by our team before they are published. We may decline or unpublish a profile at our discretion, for example for inaccurate credentials or poor conduct.",
    ],
  },
  {
    title: "3. Purchases and payments",
    body: [
      "Prices are shown before you buy and are set by each coach. Payments are processed by our payment provider; we do not store card details.",
      "A one-off review entitles you to feedback on one submitted video. A monthly plan includes the number of reviews shown on the coach's profile per billing month, and renews until cancelled. You can cancel a monthly plan at any time, effective at the end of the current billing period.",
      "Each payment is split automatically between the coach and the platform. The platform's commission is deducted before coach payout.",
    ],
  },
  {
    title: "4. Content you upload",
    body: [
      "You keep ownership of the videos you upload. By uploading, you give PadelPro and your chosen coach permission to store, view and analyse the footage for the purpose of delivering coaching.",
      "Only upload footage you have the right to share. Make sure other people visible in your videos are comfortable with the footage being reviewed by a coach.",
      "Feedback (written or video) is provided for your personal use and may not be resold or republished without the coach's consent.",
    ],
  },
  {
    title: "5. Coach obligations",
    body: [
      "Coaches must describe their credentials accurately, deliver feedback within their committed response time, and provide genuine, personal analysis of the submitted footage.",
      "Repeated failure to meet the committed response time, or misrepresentation of credentials, may lead to a profile being unpublished.",
    ],
  },
  {
    title: "6. Keeping coaching on PadelPro",
    body: [
      "All coaching, communication and payment must take place through PadelPro. Coaches and players may not share or request personal contact details (such as email addresses, phone numbers, social handles or external links) in profiles, feedback, reviews or anywhere else on the platform in order to arrange or continue coaching off-platform.",
      "To support this, contact details entered into free-text fields are automatically removed. Attempting to circumvent the platform — to avoid fees or move a coaching relationship elsewhere — may lead to a profile being unpublished or an account being closed.",
    ],
  },
  {
    title: "7. Acceptable use",
    body: [
      "Don't upload unlawful, abusive or infringing content; don't misuse reviews or ratings; don't attempt to access other users' data or disrupt the service.",
    ],
  },
  {
    title: "8. Disclaimers",
    body: [
      "Coaching advice is provided by independent coaches based on the footage you supply. Physical training carries inherent risk — you are responsible for your own health and for exercising within your limits.",
      "The service is provided \"as is\". To the maximum extent permitted by law, PadelPro's liability for any claim is limited to the amount you paid in the twelve months before the claim arose.",
    ],
  },
  {
    title: "9. Changes and contact",
    body: [
      "We may update these terms as the service evolves; material changes will be announced on the site. Continued use after a change means you accept the updated terms.",
      "Questions? Contact us via the email address in the site footer.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow text-court-600">Legal</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Terms of service</h1>
      <p className="stat mt-3 text-xs uppercase tracking-wide text-slate-500">
        Last updated 11 July 2026
      </p>
      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-semibold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-slate-600">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
