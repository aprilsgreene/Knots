import { Link, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { getLegalDoc } from "@/lib/legalContent";

export default function LegalDocPage() {
  const { slug } = useParams<{ slug: string }>();
  const doc = getLegalDoc(slug ?? "");

  if (!doc) {
    return (
      <div className="max-w-lg space-y-4">
        <Link href="/legal" className="flex items-center gap-1.5 text-sm text-muted-foreground -ml-2 px-2 py-1">
          <ArrowLeft className="w-4 h-4" />
          All policies
        </Link>
        <p className="text-sm text-muted-foreground">That policy couldn't be found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <Link
        href="/legal"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate active-elevate-2 rounded-md -ml-2 px-2 py-1 w-fit"
        data-testid="link-back-to-legal"
      >
        <ArrowLeft className="w-4 h-4" />
        All policies
      </Link>

      <div>
        <h1 className="font-serif text-xl text-foreground" data-testid="text-legal-title">{doc.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">Last updated {doc.updated}</p>
      </div>

      <p className="text-sm text-foreground">{doc.intro}</p>

      <div className="space-y-5">
        {doc.sections.map((section) => (
          <div key={section.heading}>
            <h2 className="text-sm text-foreground mb-2">{section.heading}</h2>
            <div className="space-y-2">
              {section.body.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        Questions about this policy? Contact{" "}
        <a href="mailto:support@kinlight.app" className="text-primary underline underline-offset-2">
          support@kinlight.app
        </a>
        .
      </p>
    </div>
  );
}
