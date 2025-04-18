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
            <Route path="/parent-portal" component={ParentPortal} />
            <Route path="/reset-password" component={ResetPassword} />
            <ProtectedRoute path="/mobile" component={MobileView} />
            <ProtectedRoute path="/attendance" component={AttendancePage} />
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
