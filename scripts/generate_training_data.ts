import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function generateData() {
  const workflows = await prisma.workflow.findMany({
    include: { sessions: { include: { events: true } } }
  });

  const examples = [];

  for (const wf of workflows) {
    for (const session of wf.sessions) {
      const eventTypes = session.events.map((e: any) => e.type).reduce((acc: any, type: string) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      const sessionDurationMinutes = session.endedAt 
        ? ((session.endedAt.getTime() - session.startedAt.getTime()) / 60000).toFixed(2) 
        : 'N/A';

      const summary = `Workflow: ${wf.name}. Session Status: ${session.completed ? 'Completed' : 'Dropped-off'}. Duration: ${sessionDurationMinutes} mins. Events Summary: ${JSON.stringify(eventTypes)}.`;
      
      let frictionAnalysis = 'No obvious friction detected. User completed the workflow smoothly.';
      if (!session.completed) {
        frictionAnalysis = 'High friction: Session drop-off detected. The user abandoned the workflow, indicating potential confusion or a blocking issue in the preceding step.';
      } else if (eventTypes['ERROR'] || eventTypes['RETRY'] > 2) {
        frictionAnalysis = 'Moderate friction: Multiple errors or retries detected. The interface might be misleading or system validation is overly strict.';
      } else if (session.endedAt && ((session.endedAt.getTime() - session.startedAt.getTime()) > 300000)) {
        frictionAnalysis = 'Low friction: High duration session. The user spent more than 5 minutes, which may suggest cognitive load or distraction, although they eventually succeeded.';
      }

      examples.push({
        instruction: `Analyze friction in this HFME data: ${summary}`,
        response: frictionAnalysis
      });
    }
  }

  const outputPath = path.resolve(process.cwd(), 'training_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(examples, null, 2), 'utf-8');
  console.log(`Successfully generated ${examples.length} training examples and saved to ${outputPath}`);
}

generateData()
  .catch(e => {
    console.error("Error generating data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });