import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowRight, GraduationCap, Briefcase, Zap, Globe } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { CountryPackId } from "@shared/countryPacks";
import { getTracksForCountry, type TrackCode } from "@shared/trackOptions";

// ─── Icon map (client-only, not in shared module) ─────────────────────────────

function TrackIcon({ code }: { code: TrackCode }) {
  if (code === "COOP" || code === "INTERNSHIP") {
    return <GraduationCap className="h-8 w-8 text-primary" />;
  }
  if (code === "EXPERIENCED") {
    return <Globe className="h-8 w-8 text-primary" />;
  }
  return <Briefcase className="h-8 w-8 text-primary" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  // Feature flags from server
  const { data: flags } = trpc.system.featureFlags.useQuery();
  const v2CountryPacksEnabled = flags?.v2CountryPacksEnabled ?? false;

  // Determine effective country pack from auth.me user record
  const userCountryPackId = (user as any)?.countryPackId as CountryPackId | null | undefined;

  // Compute available tracks based on country pack + flag (shared helper)
  const { tracks, defaultTrack, hasTracksForCountry, regionCode: effectiveRegionCode } = useMemo(
    () => getTracksForCountry(userCountryPackId, v2CountryPacksEnabled),
    [userCountryPackId, v2CountryPacksEnabled]
  );

  // Step 1: Track
  const [trackCode, setTrackCode] = useState<TrackCode>(defaultTrack);

  // Step 2: Education
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [currentlyEnrolled, setCurrentlyEnrolled] = useState(true);

  // Step 3: Work Authorization (only shown for CA tracks)
  const [workStatus, setWorkStatus] = useState<"citizen_pr" | "temporary_resident" | "unknown">("unknown");
  const [needsSponsorship, setNeedsSponsorship] = useState<"true" | "false" | "unknown">("unknown");

  const upsertProfile = trpc.profile.upsert.useMutation();
  const updateWorkStatus = trpc.profile.updateWorkStatus.useMutation();
  const skipOnboarding = trpc.profile.skip.useMutation();

  if (loading) return null;

  const handleSkip = async () => {
    try {
      await skipOnboarding.mutateAsync();
      setLocation("/dashboard");
    } catch {
      setLocation("/dashboard");
    }
  };

  const handleComplete = async () => {
    try {
      await upsertProfile.mutateAsync({
        regionCode: effectiveRegionCode,
        trackCode,
        school: school || undefined,
        program: program || undefined,
        graduationDate: graduationDate || undefined,
        currentlyEnrolled: trackCode === "COOP" ? currentlyEnrolled : undefined,
        onboardingComplete: true,
      });

      // Only save work auth for CA users (CA-specific eligibility checks)
      if (effectiveRegionCode === "CA" && (workStatus !== "unknown" || needsSponsorship !== "unknown")) {
        await updateWorkStatus.mutateAsync({ workStatus, needsSponsorship });
      }

      toast.success("Welcome to Resupify!");
      setLocation("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    }
  };

  // For CA/COOP track: show enrollment-related UI
  const isStudentTrack = trackCode === "COOP";
  // For CA tracks: show work auth step
  const showWorkAuthStep = effectiveRegionCode === "CA";
  const totalSteps = showWorkAuthStep ? 3 : 2;

  const isPending = upsertProfile.isPending || updateWorkStatus.isPending || skipOnboarding.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Resupify</span>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i + 1 <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Choose Track */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose your track</CardTitle>
              <CardDescription>
                This helps us tailor resume tips and eligibility checks for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Flag ON + country has tracks → show country-aware track selector */}
              {hasTracksForCountry ? (
                <RadioGroup
                  value={trackCode}
                  onValueChange={(v) => setTrackCode(v as TrackCode)}
                  className={`grid gap-4 ${tracks.length <= 2 ? "grid-cols-2" : "grid-cols-1"}`}
                  data-testid="track-selector"
                >
                  {tracks.map((track) => (
                    <Label
                      key={track.code}
                      htmlFor={`track-${track.code}`}
                      className={`flex ${tracks.length <= 2 ? "flex-col items-center gap-3 p-6" : "flex-row items-center gap-4 p-4"} rounded-xl border-2 cursor-pointer transition-all ${
                        trackCode === track.code
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <RadioGroupItem value={track.code} id={`track-${track.code}`} className="sr-only" />
                      <TrackIcon code={track.code} />
                      <div className={tracks.length <= 2 ? "text-center" : ""}>
                        <div className="font-semibold">{track.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{track.sublabel}</div>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              ) : (
                /* Flag ON + no tracks for this country → "Tracks coming soon" */
                <div
                  className="rounded-xl border-2 border-dashed border-border p-8 text-center"
                  data-testid="tracks-coming-soon"
                >
                  <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">Tracks coming soon for this region.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll use a general profile for now. You can update your track later in Settings.
                  </p>
                </div>
              )}

              <Button
                onClick={() => setStep(2)}
                className="w-full mt-4"
                data-testid="track-continue-btn"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleSkip}
                disabled={isPending}
              >
                Skip for now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Education */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your education</CardTitle>
              <CardDescription>
                {isStudentTrack
                  ? "Co-op employers verify enrollment status."
                  : "Optional — helps with eligibility checks."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school">
                  School / Institution{!isStudentTrack && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
                </Label>
                <Input
                  id="school"
                  placeholder="e.g., University of Waterloo"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program">
                  Program{!isStudentTrack && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
                </Label>
                <Input
                  id="program"
                  placeholder="e.g., Computer Science"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradDate">
                  {isStudentTrack ? "Expected Graduation" : "Graduation Date"}
                  {!isStudentTrack && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
                </Label>
                <Input
                  id="gradDate"
                  type="month"
                  value={graduationDate}
                  onChange={(e) => setGraduationDate(e.target.value)}
                />
              </div>
              {isStudentTrack && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label>Currently Enrolled</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Required for co-op eligibility
                    </p>
                  </div>
                  <Switch
                    checked={currentlyEnrolled}
                    onCheckedChange={setCurrentlyEnrolled}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => showWorkAuthStep ? setStep(3) : handleComplete()}
                  className="flex-1"
                  disabled={!showWorkAuthStep && isPending}
                >
                  {!showWorkAuthStep ? (isPending ? "Saving..." : "Complete Setup") : "Continue"}
                  {showWorkAuthStep && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleSkip}
                disabled={isPending}
              >
                Skip for now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Work Authorization (CA only) */}
        {step === 3 && showWorkAuthStep && (
          <Card>
            <CardHeader>
              <CardTitle>Work authorization</CardTitle>
              <CardDescription>
                Optional — helps flag eligibility requirements in job postings. You can always update this later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Work status in Canada</Label>
                <Select
                  value={workStatus}
                  onValueChange={(v) => setWorkStatus(v as typeof workStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen_pr">Citizen / Permanent Resident</SelectItem>
                    <SelectItem value="temporary_resident">Temporary Resident (work/study permit)</SelectItem>
                    <SelectItem value="unknown">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sponsorship needed?</Label>
                <Select
                  value={needsSponsorship}
                  onValueChange={(v) => setNeedsSponsorship(v as typeof needsSponsorship)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No — I do not need sponsorship</SelectItem>
                    <SelectItem value="true">Yes — I need sponsorship</SelectItem>
                    <SelectItem value="unknown">Not sure / prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                This information is only used to improve eligibility checks. It is never shared.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleSkip}
                disabled={isPending}
              >
                Skip for now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
