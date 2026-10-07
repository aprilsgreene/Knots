import { Switch, Route, Router, Redirect, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEffect } from "react";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/AuthProvider";
import NotFound from "@/pages/not-found";
import { AppShell } from "@/components/AppShell";
import LoginPage from "@/pages/Login";

import Home from "@/pages/Home";
import RelationshipForm from "@/pages/RelationshipForm";
import RelationshipDetail from "@/pages/RelationshipDetail";
import EntryForm from "@/pages/EntryForm";
import EntryDetail from "@/pages/EntryDetail";
import ThemesPage from "@/pages/Themes";
import SettingsPage from "@/pages/Settings";
import SupportPage from "@/pages/Support";
import OnboardingPage from "@/pages/Onboarding";
import LegalIndexPage from "@/pages/LegalIndex";
import LegalDocPage from "@/pages/LegalDoc";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/relationships/new" component={RelationshipForm} />
      <Route path="/relationships/:id/edit" component={RelationshipForm} />
      <Route path="/relationships/:id" component={RelationshipDetail} />
      <Route path="/entries/new" component={EntryForm} />
      <Route path="/entries/:entryId/edit" component={EntryForm} />
      <Route path="/entries/:id" component={EntryDetail} />
      <Route path="/themes" component={ThemesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/legal/:slug" component={LegalDocPage} />
      <Route path="/legal" component={LegalIndexPage} />
      {/* Old or auth-related addresses (for example "/login" or "/auth/callback")
          land on home instead of a dead end. */}
      <Route path="/login">{() => <Redirect to="/" replace />}</Route>
      <Route path="/auth/:rest*">{() => <Redirect to="/" replace />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShellRouter() {
  const [location, navigate] = useLocation();
  const { data, isLoading } = useQuery<{ onboarded: boolean; theme: string }>({
    queryKey: ["/api/app-settings"],
  });

  useEffect(() => {
    if (isLoading) return;
    if (!data?.onboarded && location !== "/welcome") {
      navigate("/welcome", { replace: true });
    }
  }, [isLoading, data?.onboarded, location]);

  if (isLoading) return null;

  if (location === "/welcome") {
    return (
      <div className="min-h-dvh bg-background px-4 py-6">
        <OnboardingPage
          onComplete={async () => {
            await apiRequest("POST", "/api/app-settings/onboarded");
            await queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
            navigate("/", { replace: true });
          }}
        />
      </div>
    );
  }

  return (
    <AppShell>
      <AppRouter />
    </AppShell>
  );
}

function Gate() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  if (!session) {
    return <LoginPage />;
  }

  return (
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppShellRouter />
        </Router>
      </TooltipProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
