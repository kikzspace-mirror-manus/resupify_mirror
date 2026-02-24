import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Globe, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PackId = "GLOBAL" | "CA" | "VN" | "PH" | "US";

const ALL_PACKS: { id: PackId; label: string; flag: string; description: string }[] = [
  { id: "CA", label: "Canada", flag: "🇨🇦", description: "Co-op, new grad & early-career roles in Canada" },
  { id: "VN", label: "Vietnam", flag: "🇻🇳", description: "Internship, new grad & experienced roles in Vietnam" },
  { id: "PH", label: "Philippines", flag: "🇵🇭", description: "Internship, new grad & experienced roles in the Philippines" },
  { id: "US", label: "United States", flag: "🇺🇸", description: "Internship, new grad & experienced roles in the US" },
  { id: "GLOBAL", label: "Global", flag: "🌐", description: "General job market outside specific regions" },
];

export default function AdminSettings() {
  const { data: flags, isLoading, refetch } = trpc.system.featureFlags.useQuery();
  const setEnabledPacks = trpc.system.setEnabledCountryPacks.useMutation({
    onSuccess: (data) => {
      toast.success(`Enabled packs saved: ${data.enabled.join(", ")}`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Local checkbox state — initialised from featureFlags once loaded
  const [selected, setSelected] = useState<Set<PackId>>(new Set<PackId>(["CA"]));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (flags?.enabledCountryPacks) {
      const validPacks = flags.enabledCountryPacks
        .filter((p): p is PackId => ALL_PACKS.some((pk) => pk.id === p));
      setSelected(new Set<PackId>(validPacks));
      setIsDirty(false);
    }
  }, [flags?.enabledCountryPacks]);

  const toggle = (id: PackId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    const enabled = Array.from(selected) as PackId[];
    if (enabled.length === 0) {
      toast.error("At least one country pack must be enabled.");
      return;
    }
    setEnabledPacks.mutate({ enabled });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Admin-controlled runtime settings for Resupify.</p>
        </div>

        {/* Country Availability */}
        <Card data-testid="admin-settings-country-packs-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Country Availability
            </CardTitle>
            <CardDescription>
              Controls which countries appear in onboarding and profile. Users on a disabled pack are not affected — only the selection UI is hidden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading current settings…
              </div>
            ) : (
              <>
                <div className="space-y-3" data-testid="pack-checkbox-list">
                  {ALL_PACKS.map((pack) => {
                    const isChecked = selected.has(pack.id);
                    return (
                      <div
                        key={pack.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                        data-testid={`pack-checkbox-row-${pack.id}`}
                      >
                        <Checkbox
                          id={`pack-${pack.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggle(pack.id)}
                          data-testid={`pack-checkbox-${pack.id}`}
                        />
                        <Label
                          htmlFor={`pack-${pack.id}`}
                          className="flex flex-col gap-0.5 cursor-pointer flex-1"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <span>{pack.flag}</span>
                            <span>{pack.label}</span>
                            <Badge
                              variant={isChecked ? "default" : "outline"}
                              className="ml-1 text-xs"
                              data-testid={`pack-status-badge-${pack.id}`}
                            >
                              {isChecked ? "Enabled" : "Disabled"}
                            </Badge>
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {pack.description}
                          </span>
                        </Label>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={!isDirty || setEnabledPacks.isPending || selected.size === 0}
                    data-testid="save-enabled-packs-btn"
                  >
                    {setEnabledPacks.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                  {isDirty && (
                    <span className="text-xs text-muted-foreground">Unsaved changes</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
