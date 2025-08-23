import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export function ConnectSupabaseSteps() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Connect to Supabase</CardTitle>
                <CardDescription>
                    Follow these steps to set up your Supabase project and connect it to your application.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Badge variant="outline">Step 1</Badge>
                    <p className="text-sm text-muted-foreground">
                        Create a new Supabase project at{" "}
                        <a
                            href="https://supabase.com/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                            supabase.com/dashboard
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </p>
                </div>

                <div className="space-y-2">
                    <Badge variant="outline">Step 2</Badge>
                    <p className="text-sm text-muted-foreground">
                        Copy your project URL and anon key from Settings → API
                    </p>
                </div>

                <div className="space-y-2">
                    <Badge variant="outline">Step 3</Badge>
                    <p className="text-sm text-muted-foreground">
                        Update the environment variables in your .env.local file
                    </p>
                </div>

                <Button asChild className="w-full">
                    <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Get Started with Supabase
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                </Button>
            </CardContent>
        </Card>
    );
}