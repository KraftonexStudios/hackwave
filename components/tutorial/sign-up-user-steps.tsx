import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Database, Zap } from "lucide-react";
import Link from "next/link";

export function SignUpUserSteps() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Get Started
          </CardTitle>
          <CardDescription>
            Your Supabase project is connected! Follow these steps to start using the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Badge variant="outline">Step 1</Badge>
            <p className="text-sm text-muted-foreground">
              Sign up for an account to access the dashboard
            </p>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Create Account</Link>
            </Button>
          </div>
          
          <div className="space-y-2">
            <Badge variant="outline">Step 2</Badge>
            <p className="text-sm text-muted-foreground">
              Create AI agents and start debates
            </p>
          </div>
          
          <div className="space-y-2">
            <Badge variant="outline">Step 3</Badge>
            <p className="text-sm text-muted-foreground">
              Visualize agent interactions and generate reports
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-4 w-4" />
              Database Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your Supabase database is configured and ready to store agents, sessions, and debate data.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-4 w-4" />
              AI Powered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Integrated with OpenAI and Anthropic for intelligent agent conversations and debates.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}