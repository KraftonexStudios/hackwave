import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await (await supabase).auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mock fitness data for now - you can replace this with actual database queries
    const mockFitnessData = {
      steps: Math.floor(Math.random() * 10000) + 5000,
      calories: Math.floor(Math.random() * 500) + 200,
      activeMinutes: Math.floor(Math.random() * 120) + 30,
      distance: Math.floor(Math.random() * 10) + 2,
      date: new Date().toISOString().split("T")[0],
    };

    return NextResponse.json(mockFitnessData);
  } catch (error) {
    console.error("Error fetching fitness data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
