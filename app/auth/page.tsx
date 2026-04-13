"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-5 h-5"
        >
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

export default function AuthPage() {
    async function handleGoogleLogin() {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            {/* Pixel grid background decoration */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                }}
            />

            <div className="relative z-10 flex flex-col items-center gap-10 px-4">
                {/* Logo / Brand */}
                <motion.div
                    className="flex flex-col items-center gap-3"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Pixel character placeholder */}
                    <div className="grid grid-cols-5 gap-[3px]">
                        {[
                            0, 1, 1, 1, 0,
                            1, 0, 1, 0, 1,
                            1, 1, 1, 1, 1,
                            0, 1, 0, 1, 0,
                            1, 0, 0, 0, 1,
                        ].map((on, i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 ${on ? "bg-foreground" : "bg-transparent"}`}
                            />
                        ))}
                    </div>

                    <h1 className="text-3xl md:text-4xl tracking-tighter font-semibold text-center">
                        Pixel Atelier
                    </h1>
                    <p className="text-muted-foreground text-sm tracking-tight text-center max-w-xs">
                        Sign in to start crafting your pixel character
                    </p>
                </motion.div>

                {/* Auth card */}
                <motion.div
                    className="w-full max-w-sm border border-border/50 rounded-xl p-8 bg-background/60 backdrop-blur-sm flex flex-col gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                >
                    <div className="flex flex-col gap-1 text-center">
                        <h2 className="text-lg font-medium tracking-tight">Welcome</h2>
                        <p className="text-sm text-muted-foreground">
                            Continue with your Google account
                        </p>
                    </div>

                    <Button
                        size="lg"
                        variant="outline"
                        className="w-full gap-3 font-medium"
                        onClick={handleGoogleLogin}
                    >
                        <GoogleIcon />
                        Continue with Google
                    </Button>

                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        By continuing, you agree to our{" "}
                        <span className="underline underline-offset-2 cursor-pointer">
                            Terms of Service
                        </span>{" "}
                        and{" "}
                        <span className="underline underline-offset-2 cursor-pointer">
                            Privacy Policy
                        </span>
                        .
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
