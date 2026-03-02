import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    await prisma.projetTeamsConfig.delete({ where: { id: numId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE teams-config:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
