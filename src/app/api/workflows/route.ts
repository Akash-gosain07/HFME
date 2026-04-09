import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Failed to fetch workflows:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, steps } = body;

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        steps: {
          create: steps.map((step: any, index: number) => ({
            name: step.name,
            order: index,
            expectedTimeSeconds: step.expectedTimeSeconds || 30,
          })),
        },
      },
      include: {
        steps: true,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Failed to create workflow:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}
