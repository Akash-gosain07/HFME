import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getFrictionLevel } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getWorkflows() {
  const workflows = await prisma.workflow.findMany({
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
      aggregatedMetrics: true,
      _count: {
        select: {
          sessions: true,
          aiInsights: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return workflows.map((workflow) => {
    const avgFriction =
      workflow.aggregatedMetrics.length > 0
        ? workflow.aggregatedMetrics.reduce((sum, m) => sum + m.frictionScore, 0) /
          workflow.aggregatedMetrics.length
        : 0;

    return {
      ...workflow,
      avgFriction,
      frictionLevel: getFrictionLevel(avgFriction),
    };
  });
}

export default async function WorkflowsPage() {
  const workflows = await getWorkflows();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">All Workflows</h1>
              <p className="text-sm text-gray-600">
                Manage and analyze your workflow friction
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Link
              key={workflow.id}
              href={`/workflows/${workflow.id}`}
              className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {workflow.name}
                    </h3>
                    {workflow.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {workflow.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold" style={{ color: workflow.frictionLevel.color }}>
                    {(workflow.avgFriction * 100).toFixed(0)}
                  </span>
                  <span
                    className="px-3 py-1 text-sm font-medium rounded"
                    style={{
                      backgroundColor: `${workflow.frictionLevel.color}20`,
                      color: workflow.frictionLevel.color,
                    }}
                  >
                    {workflow.frictionLevel.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Steps:</span>
                    <span className="font-medium text-gray-900">{workflow.steps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sessions:</span>
                    <span className="font-medium text-gray-900">{workflow._count.sessions}</span>
                  </div>
                  {workflow._count.aiInsights > 0 && (
                    <div className="flex justify-between">
                      <span>AI Insights:</span>
                      <span className="font-medium text-purple-600">
                        {workflow._count.aiInsights}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {workflows.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">No workflows found</p>
            <p className="text-sm text-gray-500">
              Run the seed script to generate demo data: <code className="bg-gray-100 px-2 py-1 rounded">npm run db:seed</code>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
