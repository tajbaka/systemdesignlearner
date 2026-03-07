"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { AuthenticatedNavbar } from "@/domains/authentication/AuthenticatedNavbar";
import { Footer } from "@/components/Footer";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
};

export function ErrorPage({ error, reset, homeHref = "/" }: ErrorPageProps) {
  const isChunkError =
    error.name === "ChunkLoadError" ||
    error.message?.includes("ChunkLoadError") ||
    error.message?.includes("Loading chunk");

  useEffect(() => {
    console.error("ErrorPage:", error);
  }, [error]);

  const handleReload = () => {
    sessionStorage.removeItem("chunk_retry");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <AuthenticatedNavbar />
      <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 py-8 sm:px-6 md:gap-10 md:py-12 lg:px-8">
        <Card
          className={`bg-zinc-900 ${isChunkError ? "border-amber-500/50" : "border-red-500/50"}`}
        >
          <CardContent className="p-6 sm:p-8">
            <div className="text-center space-y-4">
              {isChunkError ? (
                <>
                  <CardTitle className="text-2xl text-amber-400">Page update available</CardTitle>
                  <CardDescription className="text-zinc-400">
                    A newer version of this page is available. Reload to get the latest version.
                  </CardDescription>
                  <div className="flex gap-4 justify-center mt-6">
                    <Button onClick={handleReload} variant="default" size="lg">
                      Reload page
                    </Button>
                    <Button
                      onClick={() => (window.location.href = homeHref)}
                      variant="outline"
                      size="lg"
                    >
                      Go home
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl text-red-400">Something went wrong</CardTitle>
                  <CardDescription className="text-zinc-400">
                    We encountered an error. Please try again.
                  </CardDescription>
                  {process.env.NODE_ENV === "development" && (
                    <div className="mt-4 p-4 bg-zinc-800 rounded-lg text-left">
                      <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
                    </div>
                  )}
                  <div className="flex gap-4 justify-center mt-6">
                    <Button onClick={reset} variant="default" size="lg">
                      Try again
                    </Button>
                    <Button
                      onClick={() => (window.location.href = homeHref)}
                      variant="outline"
                      size="lg"
                    >
                      Go home
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
