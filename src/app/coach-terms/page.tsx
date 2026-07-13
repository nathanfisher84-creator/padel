import { COACH_AGREEMENT_VERSION } from "@/lib/coachAgreement";

export const metadata = {
  title: "Coach Agreement",
  description:
    "The agreement every coach accepts when joining PadelPro Coaching.",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Who this agreement is between",
    body: [
      "This agreement is between you (the coach) and Hello Maya Events FZ-LLC, a Free Zone Limited Liability Company registered with the Ras Al Khaimah Economic Zone Authority (RAKEZ), Licence No. 17007155, operating the PadelPro Coaching platform (\"PadelPro\", \"we\").",
      "It applies from the moment you accept it during signup (or on your dashboard) and for as long as you have a coach account. It supplements the general Terms of Service, which also apply to you.",
    ],
  },
  {
    title: "2. You are an independent coach",
    body: [
      "You provide coaching services as an independent, self-employed professional. Nothing in this agreement creates an employment relationship, partnership, agency or joint venture between you and PadelPro.",
      "You are not entitled to employee benefits, and PadelPro does not sponsor visas, provide insurance or make social-security contributions on your behalf. You decide when you work and which reviews you accept, within the response time you commit to.",
    ],
  },
  {
    title: "3. Your profile and credentials",
    body: [
      "Everything on your profile — your name, credentials, certifications, playing history and experience — must be truthful and kept up to date. We review every profile before publishing it and may decline or unpublish a profile at our discretion.",
      "You confirm you have the right to use the photo and intro video you upload, and that they show you.",
    ],
  },
  {
    title: "4. Delivering reviews",
    body: [
      "You choose your own response-time commitment (shown on your profile), and you agree to deliver feedback within it for every video submitted to you. We send reminders as a deadline approaches and after it passes.",
      "Feedback must be genuine, personal analysis of the footage submitted — specific to the player, in line with the description on your profile. Templated or careless feedback harms players and the platform alike.",
      "If you repeatedly miss your committed response time or deliver sub-standard feedback, we may refund the player at your cost, unpublish your profile, or close your account.",
    ],
  },
  {
    title: "5. Pricing, payments and taxes",
    body: [
      "You set your own prices for one-off reviews and monthly plans, and can change them at any time from your profile (changes apply to future purchases only).",
      "PadelPro deducts a platform commission (currently 20%) from every payment before your payout; the earnings shown in your dashboard are always your share, after commission. We may change the commission with at least 30 days' notice — continued use after the notice period means you accept the new rate.",
      "You are solely responsible for reporting and paying any tax, levy or registration that applies to your earnings in your country of residence.",
    ],
  },
  {
    title: "6. Keeping coaching on PadelPro",
    body: [
      "Players come to you through the platform, so all coaching, communication and payment with players you meet on PadelPro must stay on PadelPro. You agree not to share or request personal contact details (email, phone, social handles, external links) with platform players, and not to solicit, accept or continue coaching them off-platform, while you have an account and for 12 months after your last review for that player.",
      "Contact details entered into free-text fields are removed automatically. Attempting to work around this — to avoid the commission or move a relationship off-platform — is grounds for immediate account closure and forfeiture of pending payouts related to the circumvention.",
    ],
  },
  {
    title: "7. Player privacy and content",
    body: [
      "Player videos are shared with you for one purpose only: delivering the review that was purchased. You must not download, share, republish or reuse player footage for any other purpose, including your own marketing, without the player's written consent given off the back of an explicit request.",
      "You keep ownership of the feedback you create. You grant PadelPro a licence to store and display your profile, photo, intro video and feedback within the platform, and to use your public profile (name, photo, headline) to promote the platform. You can end the marketing part of this licence at any time by closing your account.",
    ],
  },
  {
    title: "8. Conduct",
    body: [
      "Be professional and respectful in all feedback and interactions. Abusive, discriminatory or inappropriate behaviour towards players or staff leads to removal from the platform.",
    ],
  },
  {
    title: "9. Liability",
    body: [
      "You are responsible for the content and quality of your coaching advice. Players follow it at their own risk, and PadelPro is not liable for the advice you give — but you agree to give advice a competent coach would consider safe and reasonable for the player's apparent level.",
      "To the maximum extent permitted by law, each party's liability to the other under this agreement is limited to the amounts paid or payable through the platform in the 12 months before the claim arose.",
    ],
  },
  {
    title: "10. Suspension and ending this agreement",
    body: [
      "You can stop coaching at any time by finishing your outstanding reviews and asking us to unpublish or close your account. Outstanding earned payouts are paid out in the normal cycle.",
      "We can suspend or unpublish your profile immediately for breach of this agreement, suspected fraud, or legal necessity, and will tell you why. Sections 6 (non-circumvention), 7 (player privacy) and 9 (liability) survive the end of this agreement.",
    ],
  },
  {
    title: "11. Changes and governing law",
    body: [
      "We may update this agreement as the platform evolves. If we make a material change, you will be asked to accept the new version before continuing to receive new submissions.",
      "This agreement is governed by the laws of the United Arab Emirates as applicable in the Emirate of Ras Al Khaimah. Disputes will first be raised with us directly — most issues are resolved with a conversation.",
    ],
  },
];

export default function CoachTermsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow text-court-600">Legal</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Coach Agreement</h1>
      <p className="stat mt-3 text-xs uppercase tracking-wide text-slate-600">
        Version {COACH_AGREEMENT_VERSION} · Last updated 13 July 2026
      </p>
      <p className="mt-6 text-slate-700">
        This is the agreement every coach accepts when joining PadelPro
        Coaching. We&apos;ve kept it short and in plain language on purpose —
        it covers how we work together, how you get paid, and what we each
        promise.
      </p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-semibold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-slate-700">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
