import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { TestTube2, Briefcase, FileText, FlaskConical, Mail, CheckCircle2, Loader2, ArrowRight, RefreshCw } from "lucide-react";

export default function AdminSandbox() {
  const [sampleJobId, setSampleJobId] = useState<number | null>(null);
  const [sampleResumeId, setSampleResumeId] = useState<number | null>(null);
  const [evidenceResult, setEvidenceResult] = useState<{ runId: number; score: number; itemCount: number } | null>(null);
  const [outreachResult, setOutreachResult] = useState<any>(null);
  const [testContactName, setTestContactName] = useState("");

  // Manual IDs for running on existing data
  const [manualJobId, setManualJobId] = useState("");
  const [manualResumeId, setManualResumeId] = useState("");

  const createJobMut = trpc.admin.sandbox.createSampleJobCard.useMutation({
    onSuccess: (data) => {
      setSampleJobId(data.jobCardId);
      toast.success(`Sample job card created (ID: ${data.jobCardId})`);
    },
    onError: (e) => toast.error(e.message),
  });

  const createResumeMut = trpc.admin.sandbox.createSampleResume.useMutation({
    onSuccess: (data) => {
      setSampleResumeId(data.resumeId);
      toast.success(`Sample resume created (ID: ${data.resumeId})`);
    },
    onError: (e) => toast.error(e.message),
  });

  const evidenceMut = trpc.admin.sandbox.runEvidenceTestMode.useMutation({
    onSuccess: (data) => {
      setEvidenceResult(data);
      toast.success(`Evidence scan completed! Score: ${data.score}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const outreachMut = trpc.admin.sandbox.generateOutreachTestMode.useMutation({
    onSuccess: (data) => {
      setOutreachResult(data);
      toast.success("Outreach pack generated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const effectiveJobId = manualJobId ? parseInt(manualJobId) : sampleJobId;
  const effectiveResumeId = manualResumeId ? parseInt(manualResumeId) : sampleResumeId;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Test Sandbox</h1>
          <p className="text-muted-foreground">
            Run Evidence+ATS scans and Outreach Pack generation in test mode (no credit deduction).
            All actions are logged with delta=0.
          </p>
        </div>

        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
          <TestTube2 className="h-4 w-4 inline mr-2" />
          <strong>Test Mode Active:</strong> All operations in this sandbox bypass credit checks. Ledger entries are created with amount=0 and tagged as "ADMIN TEST".
        </div>

        {/* Step 1: Create Sample Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Create Sample Data</CardTitle>
            <CardDescription>Create a sample job card and resume, or use existing IDs below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => createJobMut.mutate()}
                  disabled={createJobMut.isPending}
                >
                  {createJobMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Briefcase className="h-4 w-4 mr-2" />
                  )}
                  Create Sample Job Card
                </Button>
                {sampleJobId && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Job Card ID: {sampleJobId}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Or use ID:</span>
                  <Input
                    type="number"
                    placeholder="Job Card ID"
                    value={manualJobId}
                    onChange={(e) => setManualJobId(e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => createResumeMut.mutate()}
                  disabled={createResumeMut.isPending}
                >
                  {createResumeMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Create Sample Resume
                </Button>
                {sampleResumeId && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Resume ID: {sampleResumeId}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Or use ID:</span>
                  <Input
                    type="number"
                    placeholder="Resume ID"
                    value={manualResumeId}
                    onChange={(e) => setManualResumeId(e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Run Evidence Scan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Run Evidence+ATS Scan (Test Mode)</CardTitle>
            <CardDescription>
              Uses Job Card ID: {effectiveJobId ?? "—"} and Resume ID: {effectiveResumeId ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => {
                if (!effectiveJobId || !effectiveResumeId) {
                  toast.error("Please create or specify both a job card and resume first.");
                  return;
                }
                evidenceMut.mutate({ jobCardId: effectiveJobId, resumeId: effectiveResumeId });
              }}
              disabled={evidenceMut.isPending || !effectiveJobId || !effectiveResumeId}
            >
              {evidenceMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Evidence Scan...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Run Evidence+ATS Scan
                </>
              )}
            </Button>

            {evidenceResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Evidence Scan Complete</span>
                  <Badge className="bg-orange-100 text-orange-700">Test Mode</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Run ID</p>
                    <p className="font-bold">{evidenceResult.runId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Score</p>
                    <p className="font-bold text-lg">{evidenceResult.score}/100</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Items</p>
                    <p className="font-bold">{evidenceResult.itemCount}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Generate Outreach Pack */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Generate Outreach Pack (Test Mode)</CardTitle>
            <CardDescription>
              Uses Job Card ID: {effectiveJobId ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Contact Name (optional — for salutation test)</label>
              <Input
                placeholder="e.g. Erick Tran (leave blank to test fallback)"
                value={testContactName}
                onChange={(e) => setTestContactName(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (!effectiveJobId) {
                  toast.error("Please create or specify a job card first.");
                  return;
                }
                outreachMut.mutate({ jobCardId: effectiveJobId, contactName: testContactName.trim() || undefined });
              }}
              disabled={outreachMut.isPending || !effectiveJobId}
            >
              {outreachMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Outreach Pack...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Generate Outreach Pack
                </>
              )}
            </Button>

            {outreachResult && (
              <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!effectiveJobId) {
                    toast.error("Please create or specify a job card first.");
                    return;
                  }
                  outreachMut.mutate({ jobCardId: effectiveJobId });
                }}
                disabled={outreachMut.isPending || !effectiveJobId}
                className="mt-2"
              >
                {outreachMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate (Test Mode)
                  </>
                )}
              </Button>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Outreach Pack Generated</span>
                  <Badge className="bg-orange-100 text-orange-700">Test Mode</Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Recruiter Email</p>
                    <p className="bg-white p-2 rounded border text-xs whitespace-pre-wrap">{outreachResult.recruiter_email}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">LinkedIn DM</p>
                    <p className="bg-white p-2 rounded border text-xs whitespace-pre-wrap">{outreachResult.linkedin_dm}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Follow-up 1</p>
                    <p className="bg-white p-2 rounded border text-xs whitespace-pre-wrap">{outreachResult.follow_up_1}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Follow-up 2</p>
                    <p className="bg-white p-2 rounded border text-xs whitespace-pre-wrap">{outreachResult.follow_up_2}</p>
                  </div>
                </div>
              </div>
              </>  
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
