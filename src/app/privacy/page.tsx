export const metadata = {
  title: "Privacy policy",
  description: "How PadelPro Coaching handles your data.",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. What we collect",
    body: [
      "Account data: your name, email address and a hashed password. Coach profiles additionally include the professional information the coach chooses to publish (photo, bio, credentials, prices, languages).",
      "Coaching content: the videos players upload, the focus shots and notes they attach, the feedback coaches deliver (written and video), and the ratings players leave.",
      "Payment data: order details and the revenue split for each payment. Card details are handled by our payment provider and never touch our servers.",
    ],
  },
  {
    title: "2. How we use it",
    body: [
      "To run the marketplace: showing coach profiles to players, delivering submitted videos to the chosen coach, returning feedback, processing payments and paying coaches their share.",
      "We do not sell personal data, and we do not use your videos for anything other than delivering the coaching you asked for.",
    ],
  },
  {
    title: "3. Who can see what",
    body: [
      "Published coach profiles (photo, credentials, prices, ratings) are public. Player accounts are not public.",
      "An uploaded video is visible to the player who uploaded it, the coach it was sent to, and platform administrators. Profile photos and intro videos live at unguessable URLs used by the public profile pages.",
      "Ratings and comments you leave are shown on the coach's public profile with your first name.",
    ],
  },
  {
    title: "4. Storage and retention",
    body: [
      "Data is stored with our hosting providers (application database and video storage). Videos and feedback are kept while your account is active so you can revisit your coaching history.",
      "You can request deletion of your account and its content at any time via the contact email in the footer; we remove personal data unless we are legally required to keep it (for example, payment records).",
    ],
  },
  {
    title: "5. Cookies",
    body: [
      "We use one essential cookie: your login session. No advertising or cross-site tracking cookies.",
    ],
  },
  {
    title: "6. Your rights",
    body: [
      "Depending on where you live (for example under GDPR), you may have the right to access, correct, export or delete your personal data, and to object to certain processing. Contact us via the email in the footer to exercise these rights.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow text-court-600">Legal</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Privacy policy</h1>
      <p className="stat mt-3 text-xs uppercase tracking-wide text-slate-600">
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
