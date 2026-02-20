import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Eye, Code } from "lucide-react";

export default function AdminPacks() {
  const { data: packs, isLoading } = trpc.admin.packs.list.useQuery();
  const [selectedPack, setSelectedPack] = useState<{ regionCode: string; trackCode: string } | null>(null);

  const { data: packDetail } = trpc.admin.packs.detail.useQuery(
    { regionCode: selectedPack?.regionCode ?? "", trackCode: selectedPack?.trackCode ?? "" },
    { enabled: !!selectedPack }
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Region Packs</h1>
          <p className="text-muted-foreground">View and inspect Region Pack configurations (read-only in V1)</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packs?.map((pack) => (
              <Card key={pack.key} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-500" />
                      {pack.label}
                    </CardTitle>
                    <Badge variant="outline">{pack.regionCode}/{pack.trackCode}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pack.packData && (
                    <>
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Resume sections:</span> {pack.packData.resumeDefaults.sections.join(", ")}</p>
                        <p><span className="text-muted-foreground">Max pages:</span> {pack.packData.resumeDefaults.maxPages}</p>
                        <p><span className="text-muted-foreground">Outreach tone:</span> {pack.packData.templates.outreachTone}</p>
                      </div>

                      {/* Scoring Weights */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Scoring Weights</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(pack.packData.scoringWeights).map(([k, v]) => (
                            <Badge key={k} variant="secondary" className="text-xs">
                              {k}: {(v as number) * 100}%
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Eligibility Checks */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Eligibility Checks ({pack.packData.eligibilityChecks.length})</p>
                        <div className="space-y-1">
                          {pack.packData.eligibilityChecks.map((check) => (
                            <div key={check.field} className="flex items-center gap-2 text-xs">
                              <Badge variant={check.required ? "destructive" : "outline"} className="text-[10px]">
                                {check.required ? "Required" : "Optional"}
                              </Badge>
                              <span>{check.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedPack({ regionCode: pack.regionCode, trackCode: pack.trackCode })}
                  >
                    <Code className="h-4 w-4 mr-2" /> View Raw JSON
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pack Detail Dialog */}
        <Dialog open={!!selectedPack && !!packDetail} onOpenChange={() => setSelectedPack(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {packDetail?.pack?.label ?? "Pack"} — Raw Configuration
              </DialogTitle>
              <DialogDescription>
                Read-only view. Pack editing will be available in a future version.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              <pre className="text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap font-mono">
                {packDetail?.rawJson}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
