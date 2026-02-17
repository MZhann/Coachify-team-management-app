import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Team } from "@/models/Team";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const teams = await Team.find({ coachId: session.userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(teams);
  } catch (err) {
    console.error("Teams list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name, sport } = body;

    if (!name || !sport) {
      return NextResponse.json(
        { error: "Team name and sport are required" },
        { status: 400 }
      );
    }

    const validSports = ["football", "basketball", "volleyball", "american_football"];
    if (!validSports.includes(sport)) {
      return NextResponse.json(
        { error: "Invalid sport. Use: football, basketball, volleyball, american_football" },
        { status: 400 }
      );
    }

    await connectDB();
    const team = await Team.create({
      name,
      sport,
      coachId: session.userId,
    });

    return NextResponse.json(team);
  } catch (err) {
    console.error("Team create error:", err);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
