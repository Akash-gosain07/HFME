import Link from 'next/link';
import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getFrictionLevel, formatDuration, formatPercentage } from '@/lib/utils';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getWorkflowData(id: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: {
          aggregatedMetrics: true,
          aiInsights: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      _count: {
        select: { sessions: true },
      },
    },
  });

  if (!workflow) {
    return null;
  }

  return workflow;
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const workflow = await getWorkflowData(params.id);

  if (!workflow) {
    notFound();
  }

  const totalMetrics = workflow.steps.reduce(
    (acc, step) => {
      if (step.aggregatedMetrics) {
        return {
          avgTime: acc.avgTime + step.aggregatedMetrics.avgTime,
          retries: acc.retries + step.aggregatedMetrics.retries,
          dropOff: Math.max(acc.dropOff, step.aggregatedMetrics.dropOffRate),
          friction: acc.friction + step.aggregatedMetrics.frictionScore,
        };
      }
      return acc;
    },
    { avgTime: 0, retries: 0, dropOff: 0, friction: 0 }
  );

  const avgFriction = workflow.steps.length > 0 ? totalMetrics.friction / workflow.steps.length : 0;
  const frictionLevel = getFrictionLevel(avgFriction);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/workflows"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Workflows
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{workflow.name}</h1>
              {workflow.description && (
                <p className="text-sm text-gray-600">{workflow.description}</p>
              )}
            </div>
            <div className="text-right">
              <p
                className="text-4xl font-bold"
                style={{ color: frictionLevel.color }}
              >
                {(avgFriction * 100).toFixed(0)}
              </p>
              <p className="text-sm text-gray-600">{frictionLevel.label} Friction</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Sessions</p>
            <p className="text-3xl font-bold text-gray-900">{workflow._count.sessions}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Avg. Time</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatDuration(totalMetrics.avgTime)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Retries</p>
            <p className="text-3xl font-bold text-gray-900">{totalMetrics.retries}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Max Drop-off</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatPercentage(totalMetrics.dropOff)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Steps</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {workflow.steps.map((step, index) => {
              const metrics = step.aggregatedMetrics;
              const insight = step.aiInsights[0];
              const stepFriction = metrics ? getFrictionLevel(metrics.frictionScore) : null;

              return (
                <div key={step.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{step.name}</h3>
                        <p className="text-sm text-gray-600">
                          Expected: {formatDuration(step.expectedTimeSeconds)}
                        </p>
                      </div>
                    </div>
                    {stepFriction && (
                      <span
                        className="px-3 py-1 text-sm font-medium rounded"
                        style={{
                          backgroundColor: `${stepFriction.color}20`,
                          color: stepFriction.color,
                        }}
                      >
                        {(metrics!.frictionScore * 100).toFixed(0)} - {stepFriction.label}
                      </span>
                    )}
                  </div>

                  {metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Avg Time</p>
                        <p className="font-medium text-gray-900">
                          {formatDuration(metrics.avgTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Retries</p>
                        <p className="font-medium text-gray-900">{metrics.retries}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Idle Time</p>
                        <p className="font-medium text-gray-900">
                          {formatDuration(metrics.idleTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Back Nav</p>
                        <p className="font-medium text-gray-900">{metrics.backNav}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Drop-off</p>
                        <p className="font-medium text-gray-900">
                          {formatPercentage(metrics.dropOffRate)}
                        </p>
                      </div>
                    </div>
                  )}

                  {insight && (
                    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-purple-900 mb-1">
                            {insight.detectedIssue}
                          </p>
                          <p className="text-sm text-purple-700 mb-2">
                            {insight.recommendation}
                          </p>
                          <p className="text-xs text-purple-600">
                            Impact: {(insight.impactScore * 100).toFixed(0)}% • Confidence:{' '}
                            {(insight.confidenceLevel * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!metrics && (
                    <p className="text-sm text-gray-500 italic">No data available yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
