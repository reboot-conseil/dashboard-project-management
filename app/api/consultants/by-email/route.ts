import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const consultant = await prisma.consultant.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        nom: true,
        email: true,
        tjm: true,
        couleur: true,
        actif: true,
      },
    });

    if (!consultant) {
      return NextResponse.json(
        { error: "Consultant non trouvé", email },
        { status: 404 }
      );
    }

    if (!consultant.actif) {
      return NextResponse.json(
        { error: "Consultant inactif", consultant },
        { status: 403 }
      );
    }

    return NextResponse.json({ consultant });
  } catch (error) {
    console.error("Erreur recherche consultant:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
