// Plain-language policy content for Knots. Written to be genuinely
// readable, not legal boilerplate for its own sake. This is prototype/demo
// content -- a real launch should have counsel review every policy here.

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    updated: "August 2026",
    intro:
      "Your relationship notes are among the most sensitive things you could write down. This policy explains, in plain language, what we collect, why, and how you stay in control.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account information: an email address and password (or sign-in provider), nothing more.",
          "Journal content: the relationship profiles, entries, tags, and trait ratings you choose to write. We collect the minimum necessary to run the app — we do not ask for real names, photos, or contact details of anyone you write about.",
          "Basic technical data (device type, crash logs) only if you opt in to diagnostics.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To store and sync your private entries so you can access them across your devices.",
          "To operate core features like timelines, tag suggestions, and reminders you set.",
          "We do not use your journal contents to train AI models, target advertising, or build behavioral profiles about you or anyone you write about — ever — unless you give separate, explicit, opt-in consent in Settings.",
        ],
      },
      {
        heading: "Who can see your entries",
        body: [
          "Only you. Entries are private by default and there is no social or sharing feature that exposes them to other users.",
          "A small number of engineers may access anonymized system logs to fix bugs; they cannot browse individual journal content as part of routine operations.",
        ],
      },
      {
        heading: "Your controls",
        body: [
          "Export everything as a JSON file anytime from Settings.",
          "Delete a single entry, a whole relationship, or your entire account and all associated data anytime. Deletion is immediate on our primary systems and removed from backups on the schedule described in our Data Retention & Backup Policy.",
        ],
      },
      {
        heading: "Legal bases and your rights",
        body: [
          "We process your data based on your consent and our contract with you (providing the service you signed up for).",
          "Depending on where you live, you may have rights to access, correct, delete, or port your data, and to object to certain processing. Contact privacy@kinlight.app to exercise any of these rights.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Use",
    updated: "August 2026",
    intro: "The basics of using Knots, written as plainly as we can manage.",
    sections: [
      {
        heading: "What Knots is",
        body: [
          "Knots is a personal journaling tool for reflecting on your relationships. It is not therapy, medical advice, or a diagnostic tool, and it does not evaluate, score, or make claims about any other person.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You must be 16 or older to use Knots. You're responsible for keeping your login credentials secure.",
          "You can close your account at any time from Settings, which permanently deletes your data per our Data Deletion Policy.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Use Knots for your own private reflection. Don't use it to harass, surveil, or build a case against another person, and don't submit content that violates others' legal rights.",
        ],
      },
      {
        heading: "No professional advice",
        body: [
          "Nothing in the app constitutes medical, psychological, or legal advice. If you're in crisis, see the Support & Safety page for emergency resources.",
        ],
      },
      {
        heading: "Changes and termination",
        body: [
          "We may update these terms; we'll notify you of material changes in-app. We may suspend accounts that violate these terms or our Acceptable Use Policy.",
        ],
      },
    ],
  },
  {
    slug: "data-deletion",
    title: "Data Deletion Policy",
    updated: "August 2026",
    intro: "How deletion works when you delete an entry, a relationship, or your whole account.",
    sections: [
      {
        heading: "Deleting a single entry or relationship",
        body: [
          "Deletion is immediate and permanent on our live database. There is no trash or undo — we ask for confirmation first because of this.",
        ],
      },
      {
        heading: "Deleting your account",
        body: [
          "From Settings > Delete all my data, you can erase every relationship, entry, and rating in one action. Your account record itself is deleted within 30 days of request, giving you a short window to contact support if you deleted by mistake and want to change your mind before it's final.",
        ],
      },
      {
        heading: "Backups",
        body: [
          "Deleted data is removed from encrypted backups within 30 days, consistent with our Data Retention & Backup Policy.",
        ],
      },
    ],
  },
  {
    slug: "retention",
    title: "Data Retention & Backup Policy",
    updated: "August 2026",
    intro: "How long we keep data, and how backups work.",
    sections: [
      {
        heading: "Active data",
        body: [
          "We retain your journal content for as long as your account is active, so your timeline stays available to you.",
        ],
      },
      {
        heading: "Backups",
        body: [
          "We keep encrypted daily backups for disaster recovery, retained on a rolling 30-day window. Deleted content is purged from backups within that same window.",
        ],
      },
      {
        heading: "Inactive accounts",
        body: [
          "If an account is inactive for 3 years, we'll email a warning before archiving or deleting the data, consistent with applicable law.",
        ],
      },
    ],
  },
  {
    slug: "security",
    title: "Security Overview",
    updated: "August 2026",
    intro: "A plain-language look at how we protect your data. This is a summary, not an exhaustive technical audit.",
    sections: [
      {
        heading: "Encryption",
        body: [
          "Data is encrypted in transit (TLS) and at rest. Database access is restricted by row-level security so your entries are isolated from every other account.",
        ],
      },
      {
        heading: "Access controls",
        body: [
          "Employee access to production systems is limited to those who need it, logged, and reviewed periodically. Support staff cannot browse journal content without a specific, logged reason tied to a support request you initiated.",
        ],
      },
      {
        heading: "Vulnerability management",
        body: [
          "We apply security patches on a regular cadence and welcome responsible disclosure reports at security@kinlight.app.",
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Notice",
    updated: "August 2026",
    intro: "We keep this simple: essential cookies only, unless you opt into analytics.",
    sections: [
      {
        heading: "Essential cookies",
        body: [
          "Used to keep you signed in and remember basic preferences like light/dark mode. These can't be turned off because the app won't function without them.",
        ],
      },
      {
        heading: "Optional analytics",
        body: [
          "If you opt in from Settings, we use privacy-respecting analytics that never include journal content — only anonymous usage counts (e.g., which screens are opened).",
        ],
      },
    ],
  },
  {
    slug: "subscription",
    title: "Subscription Terms, Refunds & Cancellation",
    updated: "August 2026",
    intro: "How billing, refunds, and cancellation work for premium features.",
    sections: [
      {
        heading: "Free and premium tiers",
        body: [
          "Core journaling, timelines, and privacy controls are free. Premium unlocks relationship-specific guided prompts (e.g., dating reflection prompts, sibling role-pattern templates, mentorship goal templates).",
        ],
      },
      {
        heading: "Billing",
        body: [
          "Subscriptions renew automatically until canceled. You'll be notified by email before any renewal that increases your price.",
        ],
      },
      {
        heading: "Cancellation",
        body: [
          "Cancel anytime from Settings > Subscription. You keep premium access through the end of the current billing period; no partial-period charges continue after that.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Contact support@kinlight.app within 14 days of a charge for a full refund, no questions asked.",
        ],
      },
    ],
  },
  {
    slug: "subprocessors",
    title: "Vendor & Subprocessors List",
    updated: "August 2026",
    intro: "The third-party services that help us operate Knots, and what they can access.",
    sections: [
      {
        heading: "Infrastructure",
        body: [
          "Database & authentication hosting (e.g., a managed Postgres provider with row-level security).",
          "Static hosting / CDN for the app itself.",
        ],
      },
      {
        heading: "Support & communications",
        body: [
          "Transactional email delivery (account and security notifications only).",
          "Customer support ticketing, used only when you contact us.",
        ],
      },
      {
        heading: "What subprocessors never receive",
        body: [
          "Your journal content is never shared with advertising, data-broker, or model-training vendors.",
        ],
      },
    ],
  },
  {
    slug: "incident-response",
    title: "Incident Response Plan",
    updated: "August 2026",
    intro: "What we do if something goes wrong, summarized for users.",
    sections: [
      {
        heading: "Detection & containment",
        body: [
          "We monitor for unusual access patterns and contain any confirmed incident by revoking access and rotating credentials immediately.",
        ],
      },
      {
        heading: "Notification",
        body: [
          "If your data is affected by a confirmed breach, we will notify you by email without undue delay and in line with applicable law, describing what happened, what data was involved, and what we're doing about it.",
        ],
      },
      {
        heading: "Post-incident review",
        body: [
          "After resolution, we conduct a review and, where appropriate, publish a summary of what changed to prevent recurrence.",
        ],
      },
    ],
  },
  {
    slug: "contractor-confidentiality",
    title: "Contractor Confidentiality & IP Assignment",
    updated: "August 2026",
    intro: "A summary of the commitments our contractors and staff make regarding your data.",
    sections: [
      {
        heading: "Confidentiality",
        body: [
          "Everyone who works on Knots signs a confidentiality agreement prohibiting them from accessing, disclosing, or discussing user journal content outside legitimate, logged support or engineering needs.",
        ],
      },
      {
        heading: "IP assignment",
        body: [
          "Contractors assign work product created for Knots to the company, ensuring the product you rely on remains consistently maintained and owned.",
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    updated: "August 2026",
    intro: "Our commitment to making Knots usable for everyone.",
    sections: [
      {
        heading: "Our standard",
        body: [
          "We aim to meet WCAG 2.1 AA across the app: keyboard navigation, screen reader labels, sufficient color contrast, and respect for reduced-motion preferences.",
        ],
      },
      {
        heading: "Feedback",
        body: [
          "If you hit an accessibility barrier, email accessibility@kinlight.app — we treat these reports as high priority.",
        ],
      },
    ],
  },
  {
    slug: "acceptable-use",
    title: "Community / Acceptable Use Policy",
    updated: "August 2026",
    intro: "Applies to any feedback, support messages, or (future) shared content you submit to us.",
    sections: [
      {
        heading: "What's not allowed",
        body: [
          "Harassment, hate speech, or sharing identifying information about another private individual without consent when contacting support or submitting feedback.",
          "Attempting to use the product to build a public profile, score, or dossier about another person.",
        ],
      },
      {
        heading: "Enforcement",
        body: [
          "Violations may result in a warning, feature restriction, or account suspension depending on severity.",
        ],
      },
    ],
  },
  {
    slug: "support-policy",
    title: "Support Policy & Escalation",
    updated: "August 2026",
    intro: "How to reach us, and what to expect.",
    sections: [
      {
        heading: "Standard support",
        body: [
          "Email support@kinlight.app. We aim to respond within 2 business days for general questions.",
        ],
      },
      {
        heading: "Privacy & security escalation",
        body: [
          "Privacy requests go to privacy@kinlight.app; security reports go to security@kinlight.app. Both are monitored daily and escalated immediately when urgent.",
        ],
      },
      {
        heading: "Safety escalation",
        body: [
          "Support requests that mention immediate danger are escalated instantly to a human, and every relevant screen links to the Support & Safety page with emergency resources.",
        ],
      },
    ],
  },
];

export function getLegalDoc(slug: string) {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
