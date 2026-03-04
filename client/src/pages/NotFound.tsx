import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-lg mx-4 shadow-lg bg-card/80 backdrop-blur-xl border border-border rounded-2xl">
        <div className="pt-8 pb-8 text-center px-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-warm-terracotta-light dark:bg-warm-terracotta/15 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-warm-terracotta" />
            </div>
          </div>

          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
            404
          </h1>

          <h2 className="text-xl font-semibold text-foreground mb-4">
            Page Not Found
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            Sorry, the page you are looking for doesn&apos;t exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              variant="default"
              className="px-6 py-2.5"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
