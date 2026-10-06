import { Card } from "@/components/ui/card";
import { LifeBuoy, Phone, MessageCircle, HeartHandshake, Mail } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-2.5">
        <LifeBuoy className="w-5 h-5 text-primary" />
        <h1 className="font-serif text-xl text-foreground">Support &amp; Safety</h1>
      </div>

      <Card className="p-4 border-destructive/30" data-testid="card-emergency">
        <h2 className="text-sm text-foreground mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4 text-destructive" />
          If you're in immediate danger
        </h2>
        <p className="text-sm text-foreground">
          Call 911 or your local emergency number right away.
        </p>
      </Card>

      <Card className="p-4" data-testid="card-crisis-line">
        <h2 className="text-sm text-foreground mb-2 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          If you're thinking about harming yourself
        </h2>
        <p className="text-sm text-foreground">
          Call or text{" "}
          <a href="tel:988" className="text-primary underline underline-offset-2" data-testid="link-call-988">
            988
          </a>{" "}
          to reach the 988 Suicide &amp; Crisis Lifeline (U.S.), available 24/7. Outside the U.S., search
          for your country's crisis line — we can help you find one if you ask.
        </p>
      </Card>

      <Card className="p-4" data-testid="card-domestic-violence">
        <h2 className="text-sm text-foreground mb-2 flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-primary" />
          If a relationship feels unsafe
        </h2>
        <p className="text-sm text-foreground mb-2">
          The National Domestic Violence Hotline is available 24/7 in the U.S.:
        </p>
        <p className="text-sm text-foreground">
          Call{" "}
          <a href="tel:18007997233" className="text-primary underline underline-offset-2">
            1-800-799-7233
          </a>{" "}
          or text "START" to 88788.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm text-foreground mb-2">What this app is — and isn't — for</h2>
        <p className="text-sm text-foreground mb-2">
          Knots is a private space for your own reflection. It never diagnoses, labels, scores, or makes
          decisions about another person. Anything that looks like a pattern here is drawn from your own
          entries, is always editable, and is meant to support your reflection — not replace your judgment,
          a friend's counsel, or professional care.
        </p>
        <p className="text-sm text-foreground">
          If what you're going through feels like more than journaling can hold, a licensed therapist or
          counselor can offer support this app is not designed to provide.
        </p>
      </Card>

      <Card className="p-4" data-testid="card-contact">
        <h2 className="text-sm text-foreground mb-2 flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          Contact us
        </h2>
        <p className="text-sm text-foreground">
          For account, privacy, or safety questions, reach us at{" "}
          <a href="mailto:support@kinlight.app" className="text-primary underline underline-offset-2">
            support@kinlight.app
          </a>
          . We aim to respond within 2 business days.
        </p>
      </Card>
    </div>
  );
}
