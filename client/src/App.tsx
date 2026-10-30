import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import Home from "./pages/Home";
import DemoBanner from "./components/DemoBanner";
import { IS_DEMO } from "./lib/demo";

// Vite's base path ("/" normally, a sub-path for the hosted demo)
const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <WouterRouter base={ROUTER_BASE}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            {IS_DEMO && <DemoBanner />}
            <Router />
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
