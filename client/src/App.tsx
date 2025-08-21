import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "./contexts/Web3Context";
import { I18nProvider } from "./contexts/I18nContext";
import { ThemeProvider } from "next-themes";

// Pages
import Landing from "@/pages/Landing";
import Registration from "@/pages/Registration";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Education from "@/pages/Education";
import Discover from "@/pages/Discover";
import HiveWorld from "@/pages/HiveWorld";
import Me from "@/pages/Me";
import NotFound from "@/pages/not-found";

// Layout components
import Header from "@/components/Layout/Header";
import Navigation from "@/components/Layout/Navigation";
import Footer from "@/components/Layout/Footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/register" component={Registration} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/education" component={Education} />
      <Route path="/discover" component={Discover} />
      <Route path="/hiveworld" component={HiveWorld} />
      <Route path="/me" component={Me} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <Web3Provider>
          <I18nProvider>
            <TooltipProvider>
              <div className="min-h-screen bg-background text-foreground">
                <Header />
                <Navigation />
                <main className="min-h-[calc(100vh-theme(spacing.32))]">
                  <Router />
                </main>
                <Footer />
                <Toaster />
              </div>
            </TooltipProvider>
          </I18nProvider>
        </Web3Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
