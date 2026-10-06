import { Link } from "wouter";
import { ChevronRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LEGAL_DOCS } from "@/lib/legalContent";

export default function LegalIndexPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-serif text-xl text-foreground">Policies &amp; agreements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every policy that governs Knots, written in plain language.
        </p>
      </div>
      <Card className="divide-y divide-border">
        {LEGAL_DOCS.map((doc) => (
          <Link key={doc.slug} href={`/legal/${doc.slug}`} data-testid={`link-legal-doc-${doc.slug}`}>
            <div className="w-full flex items-center gap-3 p-4 hover-elevate active-elevate-2 cursor-pointer">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm text-foreground">{doc.title}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
