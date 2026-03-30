import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getConfig() {
  const configs = await prisma.aIMonitoringConfig.findMany();
  return configs[0] || null;
}

export default async function AdminPage() {
  const config = await getConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-gray-900" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            AI Monitoring Configuration
          </h2>

          {config ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Monitoring Enabled
                  </label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {config.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Anomaly Sensitivity
                  </label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {config.anomalySensitivity}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Prediction Enabled
                  </label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {config.predictionEnabled ? '✓ Yes' : '✗ No'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Explanation Enabled
                  </label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {config.explanationEnabled ? '✓ Yes' : '✗ No'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Monitoring Interval
                  </label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {config.monitoringInterval}s
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Alert Threshold
                  </label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {config.alertThreshold}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> To modify these settings, update the database directly
                  or implement an admin UI form. These values control how the AI monitoring
                  system behaves.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">
              No configuration found. Run the seed script to initialize default settings.
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Recalculate Metrics</p>
                <p className="text-sm text-gray-600">
                  Recompute friction scores for all workflows
                </p>
              </div>
              <button className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
                Run
              </button>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Train AI Models</p>
                <p className="text-sm text-gray-600">
                  Retrain anomaly detection and prediction models
                </p>
              </div>
              <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                Train
              </button>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Generate Insights</p>
                <p className="text-sm text-gray-600">
                  Run AI analysis on all high-friction steps
                </p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Generate
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
