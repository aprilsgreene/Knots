import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Download, Trash2, ChevronRight, ShieldCheck, FileText, Sun, Moon, Monitor, LogOut, UserX } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { useAuth } from "@/lib/AuthProvider";
import type { ThemeMode } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Use" },
  { href: "/legal/data-deletion", label: "Data Deletion Policy" },
  { href: "/legal/retention", label: "Data Retention & Backup Policy" },
  { href: "/legal/security", label: "Security Overview" },
  { href: "/legal/cookies", label: "Cookie Notice" },
  { href: "/legal/subscription", label: "Subscription & Refund Terms" },
  { href: "/legal/subprocessors", label: "Vendor & Subprocessors List" },
  { href: "/legal/incident-response", label: "Incident Response Plan" },
  { href: "/legal/accessibility", label: "Accessibility Statement" },
  { href: "/legal/acceptable-use", label: "Community / Acceptable Use Policy" },
  { href: "/legal/support-policy", label: "Support Policy & Escalation" },
];

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [modelTraining, setModelTraining] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/privacy/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "knots-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: "Export ready", description: "Your data export has downloaded." });
    },
    onError: () => {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/privacy/delete-all");
    },
    onSuccess: () => {
      toast({ title: "All data deleted" });
      window.location.hash = "#/";
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/account");
    },
    onSuccess: async () => {
      setDeleteAccountOpen(false);
      toast({ title: "Account deleted", description: "Your account and all of your data have been removed." });
      queryClient.clear();
      await signOut();
    },
    onError: () => {
      toast({
        title: "Couldn't delete your account",
        description: "Nothing more was changed. Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="font-serif text-xl text-foreground">Settings</h1>

      <section aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-sm text-foreground mb-3">Account</h2>
        <Card className="divide-y divide-border">
          {user?.email && (
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm text-foreground mt-0.5">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 p-4 text-left hover-elevate active-elevate-2"
            data-testid="button-sign-out"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Sign out</span>
          </button>
        </Card>
      </section>

      <section aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-sm text-foreground mb-3">Appearance</h2>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <Label className="text-sm">Theme</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Choose light or dark, or follow your device's setting.
              </p>
            </div>
          </div>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-3 gap-2"
            data-testid="radiogroup-theme"
          >
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-1.5 rounded-md border py-3 text-xs hover-elevate active-elevate-2 ${
                    active ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"
                  }`}
                  data-testid={`button-theme-${value}`}
                >
                  <Icon className="w-4 h-4" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </button>
              );
            })}
          </div>
        </Card>
      </section>

      <section aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="text-sm text-foreground mb-3">Privacy &amp; data</h2>
        <Card className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label htmlFor="model-training" className="text-sm">Use my entries to improve AI models</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Off by default. We never use journal contents to train models, target ads, or build
                behavioral profiles without this explicit, opt-in consent.
              </p>
            </div>
            <Switch id="model-training" checked={modelTraining} onCheckedChange={setModelTraining} data-testid="switch-model-training" />
          </div>
          <div className="flex items-start justify-between gap-3 pt-3 border-t border-border">
            <div>
              <Label htmlFor="analytics" className="text-sm">Allow anonymous product analytics</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Helps us understand which features are useful. Never includes entry content.
              </p>
            </div>
            <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} data-testid="switch-analytics" />
          </div>
        </Card>
      </section>

      <section aria-labelledby="export-heading">
        <h2 id="export-heading" className="text-sm text-foreground mb-3">Export &amp; delete</h2>
        <Card className="divide-y divide-border">
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="w-full flex items-center gap-3 p-4 text-left hover-elevate active-elevate-2"
            data-testid="button-export-data"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{exportMutation.isPending ? "Preparing export..." : "Export all my data"}</p>
              <p className="text-xs text-muted-foreground">Download everything as a plain JSON file.</p>
            </div>
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center gap-3 p-4 text-left hover-elevate active-elevate-2"
            data-testid="button-delete-all-data"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
            <div className="flex-1">
              <p className="text-sm text-destructive">Delete all my data</p>
              <p className="text-xs text-muted-foreground">Permanently erases every relationship and entry. Your account stays.</p>
            </div>
          </button>
          <button
            onClick={() => setDeleteAccountOpen(true)}
            className="w-full flex items-center gap-3 p-4 text-left hover-elevate active-elevate-2"
            data-testid="button-delete-account"
          >
            <UserX className="w-4 h-4 text-destructive" />
            <div className="flex-1">
              <p className="text-sm text-destructive">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently removes your account, your sign-in, and all of your data.</p>
            </div>
          </button>
        </Card>
      </section>

      <section aria-labelledby="legal-heading">
        <h2 id="legal-heading" className="text-sm text-foreground mb-3">Policies &amp; agreements</h2>
        <Card className="divide-y divide-border">
          {LEGAL_LINKS.map((item) => (
            <Link key={item.href} href={item.href} data-testid={`link-legal-${item.href.split("/").pop()}`}>
              <div className="w-full flex items-center gap-3 p-4 hover-elevate active-elevate-2 cursor-pointer">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </Card>
      </section>

      <Link href="/support">
        <Card className="p-4 flex items-center gap-3 hover-elevate active-elevate-2 cursor-pointer" data-testid="link-support-settings">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="flex-1 text-sm text-foreground">Support &amp; Safety</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Card>
      </Link>

      <AlertDialog open={deleteAccountOpen} onOpenChange={(o) => !deleteAccountMutation.isPending && setDeleteAccountOpen(o)}>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and will remove all your data. Your account, every relationship, note,
              check-in, and rating will be erased, and you will be signed out. It cannot be undone. Consider
              exporting a copy first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccountMutation.isPending} data-testid="button-cancel-delete-account">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteAccountMutation.mutate();
              }}
              disabled={deleteAccountMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-account"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every relationship, entry, and rating you've recorded. This cannot be
              undone. Consider exporting a copy first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-all"
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
