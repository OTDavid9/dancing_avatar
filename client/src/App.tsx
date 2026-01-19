import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Library from "@/pages/Library";
import Practice from "@/pages/Practice";
import Dashboard from "@/pages/Dashboard";
import AvatarPage from "@/pages/Avatar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"/></div>;
  
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          Ready to Dance?
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Join our community of dancers and start your AI-powered journey today.
        </p>
        <Button onClick={() => window.location.href = "/api/login"} size="lg" className="rounded-full px-8 h-12">
          Log In with Replit
        </Button>
      </div>
    );
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/library" component={Library} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/practice/:id">
        {() => <ProtectedRoute component={Practice} />}
      </Route>
      <Route path="/avatar">
        {() => <ProtectedRoute component={AvatarPage} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
