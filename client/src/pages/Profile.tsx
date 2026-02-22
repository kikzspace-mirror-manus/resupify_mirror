import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, User } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Profile() {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.profile.get.useQuery();

  // Education fields
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [currentlyEnrolled, setCurrentlyEnrolled] = useState(false);

  // Contact info fields
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Work authorization fields
  const [workStatus, setWorkStatus] = useState<"citizen_pr" | "temporary_resident" | "unknown">("unknown");
  const [workStatusDetail, setWorkStatusDetail] = useState<string>("");
  const [needsSponsorship, setNeedsSponsorship] = useState<"true" | "false" | "unknown">("unknown");
  const [countryOfResidence, setCountryOfResidence] = useState("");
  const [willingToRelocate, setWillingToRelocate] = useState<boolean | null>(null);

  useEffect(() => {
    if (profile) {
      setSchool(profile.school ?? "");
      setProgram(profile.program ?? "");
      setGraduationDate(profile.graduationDate ?? "");
      setCurrentlyEnrolled(profile.currentlyEnrolled ?? false);
      setPhone((profile as any).phone ?? "");
      setLinkedinUrl((profile as any).linkedinUrl ?? "");
      setWorkStatus((profile.workStatus as any) ?? "unknown");
      setWorkStatusDetail((profile.workStatusDetail as any) ?? "");
      setNeedsSponsorship((profile.needsSponsorship as any) ?? "unknown");
      setCountryOfResidence(profile.countryOfResidence ?? "");
      setWillingToRelocate(profile.willingToRelocate ?? null);
    }
  }, [profile]);

  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Education profile saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateWorkStatus = trpc.profile.updateWorkStatus.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Work status saved");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your education details and work authorization status.
        </p>
      </div>

      {/* Education Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Education
          </CardTitle>
          <CardDescription>Used for co-op and new grad eligibility checks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school">School / Institution</Label>
              <Input
                id="school"
                placeholder="e.g., University of Waterloo"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program">Program</Label>
              <Input
                id="program"
                placeholder="e.g., Computer Science"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gradDate">Graduation Date</Label>
            <Input
              id="gradDate"
              type="month"
              value={graduationDate}
              onChange={(e) => setGraduationDate(e.target.value)}
              className="w-48"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Currently Enrolled</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Required for co-op eligibility</p>
            </div>
            <Switch checked={currentlyEnrolled} onCheckedChange={setCurrentlyEnrolled} />
          </div>
          <Button
            onClick={() => upsertProfile.mutate({ school: school || undefined, program: program || undefined, graduationDate: graduationDate || undefined, currentlyEnrolled })}
            disabled={upsertProfile.isPending}
            size="sm"
          >
            {upsertProfile.isPending ? "Saving..." : "Save Education"}
          </Button>
        </CardContent>
      </Card>

      {/* Work Authorization Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Work Authorization
          </CardTitle>
          <CardDescription>
            Used to detect eligibility mismatches in job postings. This information stays private and is never shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Work Status</Label>
            <Select value={workStatus} onValueChange={(v) => setWorkStatus(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select work status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="citizen_pr">Citizen / Permanent Resident</SelectItem>
                <SelectItem value="temporary_resident">Temporary Resident</SelectItem>
                <SelectItem value="unknown">Unknown / Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {workStatus === "temporary_resident" && (
            <div className="space-y-2">
              <Label>Work Permit Type (optional)</Label>
              <Select value={workStatusDetail || "none"} onValueChange={(v) => setWorkStatusDetail(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="open_work_permit">Open Work Permit</SelectItem>
                  <SelectItem value="employer_specific_permit">Employer-Specific Permit</SelectItem>
                  <SelectItem value="student_work_authorization">Student Work Authorization (e.g., co-op)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Will you need employer sponsorship?</Label>
            <Select value={needsSponsorship} onValueChange={(v) => setNeedsSponsorship(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes, I will need sponsorship</SelectItem>
                <SelectItem value="false">No, I do not need sponsorship</SelectItem>
                <SelectItem value="unknown">Unknown / Not sure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country of Residence (optional)</Label>
            <Input
              id="country"
              placeholder="e.g., Canada"
              value={countryOfResidence}
              onChange={(e) => setCountryOfResidence(e.target.value)}
              className="w-64"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Willing to Relocate</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Optional — helps with location requirement checks</p>
            </div>
            <Switch
              checked={willingToRelocate ?? false}
              onCheckedChange={(v) => setWillingToRelocate(v)}
            />
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
            <strong>Note:</strong> This information is used only to detect potential eligibility mismatches in job postings (e.g., "must be Citizen/PR", "no sponsorship"). It is framed as guidance, not legal advice. You can always change or clear these fields.
          </p>

          <Button
            onClick={() => updateWorkStatus.mutate({
              workStatus,
              workStatusDetail: workStatusDetail ? (workStatusDetail as any) : null,
              needsSponsorship,
              countryOfResidence: countryOfResidence || null,
              willingToRelocate,
            })}
            disabled={updateWorkStatus.isPending}
            size="sm"
          >
            {updateWorkStatus.isPending ? "Saving..." : "Save Work Status"}
          </Button>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Info</CardTitle>
          <CardDescription>Used in Outreach Pack signatures. Leave blank to omit from generated messages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-64" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL (optional)</Label>
            <Input id="linkedinUrl" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
          </div>
          <Button
            size="sm"
            onClick={() => upsertProfile.mutate({ phone: phone || null, linkedinUrl: linkedinUrl || null })}
            disabled={upsertProfile.isPending}
          >
            {upsertProfile.isPending ? "Saving..." : "Save Contact Info"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
