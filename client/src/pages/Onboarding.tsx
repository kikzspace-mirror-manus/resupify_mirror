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
import { ArrowRight, GraduationCap, Briefcase, Zap, Globe, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { CountryPackId } from "@shared/countryPacks";
import { getTracksForCountry, resolveLocale, getTranslatedTrackStepCopy, type TrackCode, type SupportedLocale } from "@shared/trackOptions";

// ─── Country options shown in Step 0 ─────────────────────────────────────────

interface CountryOption {
  id: CountryPackId;
  label: string;
  sublabel: string;
  flag: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  {
    id: "GLOBAL",
    label: "Global",
    sublabel: "International roles",
    flag: "🌍",
  },
  {
    id: "CA",
    label: "Canada",
    sublabel: "Co-op, new grad & early-career roles in Canada",
    flag: "🇨🇦",
  },
  {
    id: "VN",
    label: "Vietnam",
    sublabel: "Internship, new grad & experienced roles in Vietnam",
    flag: "🇻🇳",
  },
  {
    id: "PH",
    label: "Philippines",
    sublabel: "Internship, new grad & experienced roles in the Philippines",
    flag: "🇵🇭",
  },
  {
    id: "US",
    label: "United States",
    sublabel: "Internship, new grad & early-career roles in the US",
    flag: "🇺🇸",
  },
];

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

  // Feature flags from server
  const { data: flags } = trpc.system.featureFlags.useQuery();
  const v2CountryPacksEnabled = flags?.v2CountryPacksEnabled ?? false;
  const enabledCountryPacks = flags?.enabledCountryPacks ?? ["CA"];

  // Determine effective country pack from auth.me user record (preselect if already set)
  const userCountryPackId = (user as any)?.countryPackId as CountryPackId | null | undefined;

  // Step 0: Country selection (local state — only persisted on explicit Continue)
  // Preselect existing countryPackId if set; default to first enabled pack for V2, CA for V1 compat
  const [selectedCountryPackId, setSelectedCountryPackId] = useState<CountryPackId>(
    () => {
      if (v2CountryPacksEnabled) {
        // V2: preselect existing if in enabled list, else first enabled
        if (userCountryPackId && enabledCountryPacks.includes(userCountryPackId)) {
          return userCountryPackId;
        }
        return (enabledCountryPacks[0] ?? "CA") as CountryPackId;
      }
      // V1: preselect existing if valid, else CA
      if (userCountryPackId && (userCountryPackId === "CA" || userCountryPackId === "VN" || userCountryPackId === "PH")) {
        return userCountryPackId;
      }
      return "CA";
    }
  );

  // Step number: when flag ON, step 0 is the country selector; steps 1/2/3 follow
  // When flag OFF, start at step 1 (V1 behaviour unchanged)
  // If only 1 pack is enabled, auto-skip Step 0
  const [step, setStep] = useState(() => {
    if (!v2CountryPacksEnabled) return 1; // V1: skip Step 0
    if (enabledCountryPacks.length === 1) return 1; // Auto-skip if only 1 pack
    return 0; // Show Step 0
  });

  // The effective country pack for track selection:
  // - After Step 0 Continue: uses selectedCountryPackId (local state)
  // - Flag OFF: uses userCountryPackId (V1 behaviour)
  const effectiveCountryPackId = v2CountryPacksEnabled ? selectedCountryPackId : (userCountryPackId ?? "CA");

  // Resolve display locale for VN translation (flag-gated)
  const v2VnTranslationEnabled = flags?.v2VnTranslationEnabled ?? false;
  const userLanguageMode = (user as any)?.languageMode as string | null | undefined;
  const locale: SupportedLocale = useMemo(
    () => resolveLocale({
      countryPackId: effectiveCountryPackId,
      languageMode: userLanguageMode,
      browserLocale: typeof navigator !== "undefined" ? navigator.language : undefined,
      v2VnTranslationEnabled,
    }),
    [effectiveCountryPackId, userLanguageMode, v2VnTranslationEnabled]
  );

  // Compute available tracks based on effective country pack + flag + locale (shared helper)
  const { tracks, defaultTrack, hasTracksForCountry, regionCode: effectiveRegionCode } = useMemo(
    () => getTracksForCountry(effectiveCountryPackId, v2CountryPacksEnabled, locale),
    [effectiveCountryPackId, v2CountryPacksEnabled, locale]
  );

  // Localised copy for the Track step header/helper
  const trackStepCopy = useMemo(() => getTranslatedTrackStepCopy(locale), [locale]);

  // Step 1: Track
  const [trackCode, setTrackCode] = useState<TrackCode>(defaultTrack);

  // Step 2: Education
  const [school, setSchool] = useState("");
  // Pack-aware school placeholder for the Education step
  const schoolPlaceholder = (() => {
    if (effectiveCountryPackId === "US") return "e.g., University of California, Berkeley";
    if (effectiveCountryPackId === "PH") return "e.g., University of the Philippines";
    if (effectiveCountryPackId === "VN") return "e.g., Vietnam National University";
    if (effectiveCountryPackId === "CA") return "e.g., University of Waterloo";
    return "e.g., Your university"; // GLOBAL fallback
  })();
  const [program, setProgram] = useState("");
  const [highestEducationLevel, setHighestEducationLevel] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [currentlyEnrolled, setCurrentlyEnrolled] = useState(true);

  // Step 3: Work Authorization (only shown for CA tracks)
  const [workStatus, setWorkStatus] = useState<"citizen_pr" | "temporary_resident" | "unknown">("unknown");
  const [needsSponsorship, setNeedsSponsorship] = useState<"true" | "false" | "unknown">("unknown");

  const utils = trpc.useUtils();
  const upsertProfile = trpc.profile.upsert.useMutation();
  const updateWorkStatus = trpc.profile.updateWorkStatus.useMutation();
  const skipOnboarding = trpc.profile.skip.useMutation();
  const setCountryPack = trpc.profile.setCountryPack.useMutation();

  if (loading) return null;

  const handleSkip = async () => {
    try {
      await skipOnboarding.mutateAsync();
      setLocation("/dashboard");
    } catch {
      setLocation("/dashboard");
    }
  };

  // Step 0 Continue: persist countryPackId (and optionally set languageMode=vi for VN+unset),
  // then invalidate auth.me so the Track step re-renders with the correct locale immediately.
  const handleCountryPackContinue = async () => {
    try {
      await setCountryPack.mutateAsync({ countryPackId: selectedCountryPackId });
      // Invalidate auth.me so languageMode (potentially just set to "vi") is reflected
      // in the locale computation for the Track step.
      await utils.auth.me.invalidate();
      // Reset trackCode to the default for the newly selected country
      const { defaultTrack: newDefault } = getTracksForCountry(selectedCountryPackId, true);
      setTrackCode(newDefault);
      setStep(1);
    } catch (error: any) {
      toast.error(error.message || "Failed to save country selection");
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
        highestEducationLevel: highestEducationLevel || undefined,
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

  // For CA+COOP track only: show enrollment-related UI and co-op specific copy.
  // Non-CA packs (VN/PH/US/GLOBAL) must never show CA co-op messaging.
  const isCoopCA = selectedCountryPackId === "CA" && trackCode === "COOP";
  // For CA tracks: show work auth step
  const showWorkAuthStep = effectiveRegionCode === "CA";
  // Total steps: flag ON adds Step 0; work auth adds Step 3
  const totalSteps = v2CountryPacksEnabled
    ? (showWorkAuthStep ? 4 : 3)
    : (showWorkAuthStep ? 3 : 2);

  // Display step index for progress bar (0-indexed)
  const progressStep = step;

  const isPending = upsertProfile.isPending || updateWorkStatus.isPending || skipOnboarding.isPending || setCountryPack.isPending;

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
                i <= progressStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 0: Choose Country/Region (flag-gated) */}
        {step === 0 && v2CountryPacksEnabled && (
          <Card data-testid="step0-country-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Where are you applying?
              </CardTitle>
              <CardDescription>
                Choose your main job market so we can personalize the next steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const filteredCountries = COUNTRY_OPTIONS.filter((c) => enabledCountryPacks.includes(c.id));
                const gridClass = filteredCountries.length === 1
                  ? "grid grid-cols-1 justify-center"
                  : filteredCountries.length === 2
                  ? "grid grid-cols-2 gap-4"
                  : filteredCountries.length === 3
                  ? "grid grid-cols-3 gap-4"
                  : filteredCountries.length === 4
                  ? "grid grid-cols-2 sm:grid-cols-4 gap-4"
                  : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4";
                return (
                  <RadioGroup
                    value={selectedCountryPackId}
                    onValueChange={(v) => setSelectedCountryPackId(v as CountryPackId)}
                    className={gridClass}
                    data-testid="country-selector"
                  >
                    {filteredCountries.map((country) => (
                      <Label
                        key={country.id}
                        htmlFor={`country-${country.id}`}
                        className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedCountryPackId === country.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                        data-testid={`country-option-${country.id}`}
                      >
                        <RadioGroupItem value={country.id} id={`country-${country.id}`} className="sr-only" />
                        <span className="text-4xl" role="img" aria-label={country.label}>{country.flag}</span>
                        <div className="text-center">
                          <div className="font-semibold">{country.label}</div>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                );
              })()}

              <Button
                onClick={handleCountryPackContinue}
                className="w-full mt-4"
                disabled={isPending}
                data-testid="country-continue-btn"
              >
                {setCountryPack.isPending ? "Saving..." : "Continue"}
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

        {/* Step 1: Choose Track */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle data-testid="track-step-header">{trackStepCopy.header}</CardTitle>
              <CardDescription data-testid="track-step-helper">
                {trackStepCopy.helper}
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

              <div className="flex gap-3">
                {v2CountryPacksEnabled && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={() => setStep(2)}
                  className={v2CountryPacksEnabled ? "flex-1" : "w-full"}
                  data-testid="track-continue-btn"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
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

        {/* Step 2: Education */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your education</CardTitle>
              <CardDescription>
                {isCoopCA
                  ? "Co-op employers verify enrollment status."
                  : "Optional — helps tailor your recommendations."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="highestEducationLevel">
                  Highest education level <span className="text-muted-foreground ml-1 text-xs">(optional)</span>
                </Label>
                <select
                  id="highestEducationLevel"
                  data-testid="education-level-select"
                  value={highestEducationLevel}
                  onChange={(e) => setHighestEducationLevel(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select level…</option>
                  <option value="high_school">High school</option>
                  <option value="diploma_certificate">Diploma / Certificate</option>
                  <option value="associate_degree">Associate degree</option>
                  <option value="bachelors_degree">{"Bachelor's degree"}</option>
                  <option value="masters_degree">{"Master's degree"}</option>
                  <option value="doctorate">Doctorate (PhD)</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">
                  School / Institution{!isCoopCA && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
                </Label>
                <Input
                  id="school"
                  data-testid="school-input"
                  placeholder={schoolPlaceholder}
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program">
                  Field of study{!isCoopCA && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
                </Label>
                <Input
                  id="program"
                  placeholder="e.g., Computer Science / Business / Marketing"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradDate">
                  {isCoopCA ? "Expected Graduation" : "Graduation Date"}
                  {!isCoopCA && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
                </Label>
                <Input
                  id="gradDate"
                  type="month"
                  value={graduationDate}
                  onChange={(e) => setGraduationDate(e.target.value)}
                />
              </div>
              {isCoopCA && (
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
