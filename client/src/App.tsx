import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ParentPortal from "@/pages/parent-portal";
import MobileView from "@/pages/mobile-view";
import AttendancePage from "@/pages/attendance-page";
import ResetPassword from "@/pages/reset-password";
import SettingsPage from "@/pages/settings-page";
import StudentPage from "@/pages/parent/student";
import { AuthProvider } from "./hooks/use-auth";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            <ProtectedRoute path="/" component={HomePage} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/parent" component={ParentPortal} />
            <Route path="/parent/student/:studentCode" component={StudentPage} />
            <Route path="/tra-cuu" component={ParentPortal} />
            <Route path="/parent-portal" component={ParentPortal} />
            <Route path="/reset-password" component={ResetPassword} />
            <ProtectedRoute path="/mobile" component={MobileView} />
            <ProtectedRoute path="/attendance" component={AttendancePage} />
            <ProtectedRoute path="/settings" component={SettingsPage} />

            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
