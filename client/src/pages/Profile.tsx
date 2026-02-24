import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { MAX_LENGTHS } from "../../../shared/maxLengths";
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
import { Loader2, ShieldCheck, User, Layers, Globe, Languages, CheckCircle } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { CountryPackId } from "@shared/countryPacks";
import { getTracksForCountry, resolveLocale, type TrackCode, type SupportedLocale } from "@shared/trackOptions";

export default function Profile() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { data: profile, isLoading } = trpc.profile.get.useQuery();

  // Feature flags from server
  const { data: flags } = trpc.system.featureFlags.useQuery();
  const v2CountryPacksEnabled = flags?.v2CountryPacksEnabled ?? false;
  const v2VnTranslationEnabled = flags?.v2VnTranslationEnabled ?? false;
  // Enabled country packs from admin_settings (falls back to ["CA"] when not set)
  const enabledCountryPacks: string[] = flags?.enabledCountryPacks ?? ["CA"];

  // Determine effective country pack from auth.me user record
  const userCountryPackId = (user as any)?.countryPackId as CountryPackId | null | undefined;
  const userLanguageMode = (user as any)?.languageMode as string | null | undefined;

  // v2BilingualViewEnabled flag
  const v2BilingualViewEnabled = flags?.v2BilingualViewEnabled ?? false;

  // Local languageMode state — mirrors user.languageMode; updated optimistically on save
  const [localLanguageMode, setLocalLanguageMode] = useState<"en" | "vi" | "bilingual">(
    () => (userLanguageMode as any) ?? "vi"
  );

  // Sync localLanguageMode when user record loads
  useEffect(() => {
    if (userLanguageMode) {
      setLocalLanguageMode(userLanguageMode as any);
    }
  }, [userLanguageMode]);

  // Resolve display locale for VN translation (flag-gated) — uses localLanguageMode for immediate refresh
  const locale: SupportedLocale = useMemo(
    () => resolveLocale({
      countryPackId: userCountryPackId,
      languageMode: localLanguageMode,
      browserLocale: typeof navigator !== "undefined" ? navigator.language : undefined,
      v2VnTranslationEnabled,
    }),
    [userCountryPackId, localLanguageMode, v2VnTranslationEnabled]
  );

  // Compute available tracks based on country pack + flag + locale (shared helper)
  const { tracks, hasTracksForCountry, regionCode: effectiveRegionCode } = useMemo(
    () => getTracksForCountry(userCountryPackId, v2CountryPacksEnabled, locale),
    [userCountryPackId, v2CountryPacksEnabled, locale]
  );

  // Track selector state — initialised from saved profile
  const [trackCode, setTrackCode] = useState<TrackCode>("COOP");
  const [trackDirty, setTrackDirty] = useState(false);

  // Education fields
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [currentlyEnrolled, setCurrentlyEnrolled] = useState(false);
  const [highestEducationLevel, setHighestEducationLevel] = useState("");

  // Contact info fields
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Work authorization fields
  const [workStatus, setWorkStatus] = useState<"citizen_pr" | "temporary_resident" | "unknown">("unknown");
  const [workStatusDetail, setWorkStatusDetail] = useState<string>("");
  const [needsSponsorship, setNeedsSponsorship] = useState<"true" | "false" | "unknown">("unknown");
  const [countryOfResidence, setCountryOfResidence] = useState("");
  const [willingToRelocate, setWillingToRelocate] = useState<boolean | null>(null);

  // ── Saved-state timestamps (null = not saved yet / dirty) ──────────────────
  // Pattern: set to Date.now() on success; isSaved = savedAt && Date.now()-savedAt < SAVED_MS
  // Reset to null on any field change so the button reverts to normal state.
  const SAVED_MS = 2000;
  const [packSavedAt, setPackSavedAt] = useState<number | null>(null);
  const [trackSavedAt, setTrackSavedAt] = useState<number | null>(null);
  const [eduSavedAt, setEduSavedAt] = useState<number | null>(null);
  const [workAuthSavedAt, setWorkAuthSavedAt] = useState<number | null>(null);
  const [contactSavedAt, setContactSavedAt] = useState<number | null>(null);
  // Track which card triggered upsertProfile (Education vs Contact Info share the same mutation)
  const lastSaveCard = useRef<"education" | "contact" | null>(null);

  useEffect(() => {
    if (profile) {
      // Restore saved track code — fall back to first available track for the country
      const savedTrack = (profile.trackCode as TrackCode) ?? "COOP";
      setTrackCode(savedTrack);
      setSchool(profile.school ?? "");
      setProgram(profile.program ?? "");
      setGraduationDate(profile.graduationDate ?? "");
      setCurrentlyEnrolled(profile.currentlyEnrolled ?? false);
      setHighestEducationLevel((profile as any).highestEducationLevel ?? "");
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
      if (lastSaveCard.current === "contact") {
        setContactSavedAt(Date.now());
        toast.success("Contact info saved");
      } else {
        setEduSavedAt(Date.now());
        toast.success("Education profile saved");
      }
      lastSaveCard.current = null;
    },
    onError: (e) => toast.error(e.message),
  });

  const updateWorkStatus = trpc.profile.updateWorkStatus.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setWorkAuthSavedAt(Date.now());
      toast.success("Work status saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveTrack = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setTrackDirty(false);
      setTrackSavedAt(Date.now());
      toast.success("Track saved");
    },
    onError: (e) => toast.error(e.message),
  });

  // Country pack selector state (for switching pack from Profile)
  const [selectedCountryPackId, setSelectedCountryPackId] = useState<CountryPackId>(
    () => (userCountryPackId as CountryPackId) ?? "GLOBAL"
  );
  const [packDirty, setPackDirty] = useState(false);

  // Sync selectedCountryPackId when user record loads
  useEffect(() => {
    if (userCountryPackId) {
      setSelectedCountryPackId(userCountryPackId as CountryPackId);
    }
  }, [userCountryPackId]);

  const setCountryPack = trpc.profile.setCountryPack.useMutation({
    onSuccess: () => {
      setPackDirty(false);
      setPackSavedAt(Date.now());
      utils.auth.me.invalidate();
      toast.success("Country pack saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const setLanguageMode = trpc.profile.setLanguageMode.useMutation({
    onSuccess: (data) => {
      // Immediately update local state so locale refreshes without waiting for auth.me refetch
      setLocalLanguageMode(data.effectiveMode as any);
      utils.auth.me.invalidate();
      toast.success("Language preference saved");
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

  // Show work auth card for CA and US users — gate on countryPackId directly,
  // NOT on effectiveRegionCode (which defaults to "CA" in V1 mode for all users).
  const showWorkAuthCard = userCountryPackId === "CA" || userCountryPackId === "US";

  // CA+COOP guard: Currently Enrolled toggle and co-op note are only relevant for
  // co-op students in Canada. Mirrors the isCoopCA check in Onboarding.tsx.
  const isCoopCA = userCountryPackId === "CA" && trackCode === "COOP";

  // Copy variant: US uses US-specific labels; CA keeps existing labels.
  const workAuthCopy = userCountryPackId === "US"
    ? {
        workStatusLabel: "Work status in the United States",
        sponsorshipLabel: "Will you now or in the future require employer sponsorship?",
        countryPlaceholder: "e.g., United States",
        noteText: "This information is used only to match requirements in job postings (e.g., \"must be authorized to work in the US\", \"no sponsorship\"). It is framed as guidance, not legal advice. You can always change or clear these fields.",
      }
    : {
        workStatusLabel: "Work Status",
        sponsorshipLabel: "Will you need employer sponsorship?",
        countryPlaceholder: "e.g., Canada",
        noteText: "This information is used only to match requirements in job postings (e.g., \"must be Citizen/PR\", \"no sponsorship\"). It is framed as guidance, not legal advice. You can always change or clear these fields.",
      };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Update your job market, career stage, and preferences.
        </p>
      </div>

      {/* DEV-only debug line — never rendered in production builds */}
      {import.meta.env.DEV && (
        <div
          className="text-xs font-mono bg-yellow-50 border border-yellow-200 text-yellow-800 rounded px-3 py-1.5"
          data-testid="profile-debug-line"
        >
          DEBUG: pack={userCountryPackId ?? "null"} | track={trackCode} | locale={locale} | v2CountryPacksEnabled={String(v2CountryPacksEnabled)}
        </div>
      )}

      {/* Country Pack Card — flag-gated, allows switching pack from Profile */}
      {v2CountryPacksEnabled && (
        <Card data-testid="profile-country-pack-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Job market
            </CardTitle>
            <CardDescription>
              This sets defaults for your market, like formatting and requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country-pack-select">Current market</Label>
              {/* Disabled market warning banner */}
              {userCountryPackId && !enabledCountryPacks.includes(userCountryPackId) && (
                <div
                  className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800"
                  data-testid="disabled-market-banner"
                >
                  This job market is not currently offered. Please switch to an available market.
                </div>
              )}
              {/* Read-only display when only 1 pack is enabled */}
              {enabledCountryPacks.length === 1 ? (
                <div className="text-sm text-muted-foreground" data-testid="country-pack-readonly">
                  {enabledCountryPacks[0] === "GLOBAL" ? "🌐 Global" : enabledCountryPacks[0] === "CA" ? "🇨🇦 Canada" : enabledCountryPacks[0] === "VN" ? "🇻🇳 Vietnam" : enabledCountryPacks[0] === "PH" ? "🇵🇭 Philippines" : "🇺🇸 United States"}
                </div>
              ) : (
                <Select
                  value={selectedCountryPackId}
                  onValueChange={(v) => {
                    setSelectedCountryPackId(v as CountryPackId);
                    setPackDirty(true);
                  }}
                >
                  <SelectTrigger id="country-pack-select" data-testid="country-pack-select">
                    <SelectValue placeholder="Select job market" />
                  </SelectTrigger>
                  <SelectContent data-testid="country-pack-select-content">
                    {enabledCountryPacks.includes("GLOBAL") && <SelectItem value="GLOBAL" data-testid="pack-option-GLOBAL">🌐 Global</SelectItem>}
                    {enabledCountryPacks.includes("CA") && <SelectItem value="CA" data-testid="pack-option-CA">🇨🇦 Canada</SelectItem>}
                    {enabledCountryPacks.includes("VN") && <SelectItem value="VN" data-testid="pack-option-VN">🇻🇳 Vietnam</SelectItem>}
                    {enabledCountryPacks.includes("PH") && <SelectItem value="PH" data-testid="pack-option-PH">🇵🇭 Philippines</SelectItem>}
                    {enabledCountryPacks.includes("US") && <SelectItem value="US" data-testid="pack-option-US">🇺🇸 United States</SelectItem>}
                  </SelectContent>
                </Select>
              )}
            </div>
            {enabledCountryPacks.length > 1 && (() => {
              const isSaved = !!(packSavedAt && Date.now() - packSavedAt < SAVED_MS);
              return (
                <Button
                  size="sm"
                  disabled={(!packDirty && !isSaved) || setCountryPack.isPending}
                  onClick={() => setCountryPack.mutate({ countryPackId: selectedCountryPackId })}
                  data-testid="save-country-pack-btn"
                  className={isSaved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  {setCountryPack.isPending ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
                  ) : isSaved ? (
                    <><CheckCircle className="mr-1.5 h-3.5 w-3.5" />Saved</>
                  ) : "Save market"}
                </Button>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Track Card — country-aware, flag-gated */}
      <Card data-testid="profile-track-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Career stage
          </CardTitle>
          <CardDescription>
            This tailors the guidance and templates you see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasTracksForCountry ? (
            <>
              <div className="space-y-2" data-testid="track-select-wrapper">
                <Label htmlFor="track-select">Current career stage</Label>
                <Select
                  value={trackCode}
                  onValueChange={(v) => {
                    setTrackCode(v as TrackCode);
                    setTrackDirty(true);
                  }}
                >
                  <SelectTrigger id="track-select" data-testid="track-select">
                    <SelectValue placeholder="Select career stage" />
                  </SelectTrigger>
                  <SelectContent data-testid="track-select-content">
                    {tracks.map((t) => (
                      <SelectItem key={t.code} value={t.code} data-testid={`track-option-${t.code}`}>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t.sublabel}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(() => {
                const isSaved = !!(trackSavedAt && Date.now() - trackSavedAt < SAVED_MS);
                return (
                  <Button
                    size="sm"
                    disabled={(!trackDirty && !isSaved) || saveTrack.isPending}
                    onClick={() => saveTrack.mutate({ regionCode: effectiveRegionCode, trackCode })}
                    data-testid="save-track-btn"
                    className={isSaved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  >
                    {saveTrack.isPending ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
                    ) : isSaved ? (
                      <><CheckCircle className="mr-1.5 h-3.5 w-3.5" />Saved</>
                    ) : "Save career stage"}
                  </Button>
                );
              })()}
            </>
          ) : (
            /* No tracks for this country yet */
            <div
              className="rounded-xl border-2 border-dashed border-border p-6 text-center"
              data-testid="tracks-coming-soon"
            >
              <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium text-muted-foreground text-sm">
                Tracks coming soon for this region.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll use a general profile for now.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language Card — VN users only, flag-gated */}
      {v2CountryPacksEnabled && v2VnTranslationEnabled && userCountryPackId === "VN" && (
        <Card data-testid="language-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="h-4 w-4" />
              Display language
            </CardTitle>
            <CardDescription>
              Choose the language for labels and guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language-select">Display Language</Label>
              <Select
                value={localLanguageMode}
                onValueChange={(v) => {
                  const mode = v as "en" | "vi" | "bilingual";
                  setLocalLanguageMode(mode);
                  setLanguageMode.mutate({ languageMode: mode });
                }}
              >
                <SelectTrigger id="language-select" data-testid="language-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-testid="language-select-content">
                  <SelectItem value="en" data-testid="lang-option-en">English</SelectItem>
                  <SelectItem value="vi" data-testid="lang-option-vi">Tiếng Việt</SelectItem>
                  {v2BilingualViewEnabled && (
                    <SelectItem value="bilingual" data-testid="lang-option-bilingual">Bilingual</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {setLanguageMode.isPending && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Education Card */}
      <Card data-testid="profile-education-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Education
          </CardTitle>
          <CardDescription>
            {isCoopCA
              ? "Co-op employers verify enrollment status."
              : "Optional — helps tailor your recommendations."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Highest education level dropdown */}
          <div className="space-y-2">
            <Label htmlFor="profile-highestEducationLevel">
              Highest education level{!isCoopCA && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
            </Label>
            <select
              id="profile-highestEducationLevel"
              data-testid="profile-education-level-select"
              value={highestEducationLevel}
              onChange={(e) => { setHighestEducationLevel(e.target.value); setEduSavedAt(null); }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select level...</option>
              <option value="high_school">High school</option>
              <option value="diploma_certificate">Diploma / Certificate</option>
              <option value="associate_degree">Associate degree</option>
              <option value="bachelors_degree">{"Bachelor's degree"}</option>
              <option value="masters_degree">{"Master's degree"}</option>
              <option value="doctorate">Doctorate (PhD)</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school">
                School / Institution{!isCoopCA && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
              </Label>
              <Input
                id="school"
                data-testid="profile-school-input"
                placeholder="e.g., University of Waterloo"
                value={school}
                maxLength={MAX_LENGTHS.PROFILE_SCHOOL}
                onChange={(e) => { setSchool(e.target.value); setEduSavedAt(null); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program">
                Field of study{!isCoopCA && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
              </Label>
              <Input
                id="program"
                data-testid="profile-field-of-study-input"
                placeholder="e.g., Computer Science / Business / Marketing"
                value={program}
                maxLength={MAX_LENGTHS.PROFILE_PROGRAM}
                onChange={(e) => { setProgram(e.target.value); setEduSavedAt(null); }}
              />
            </div>
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
              onChange={(e) => { setGraduationDate(e.target.value); setEduSavedAt(null); }}
              className="w-48"
            />
          </div>
          {/* Currently Enrolled: CA+COOP only */}
          {isCoopCA && (
            <div
              className="flex items-center justify-between rounded-lg border p-4"
              data-testid="profile-currently-enrolled-row"
            >
              <div>
                <Label>Currently Enrolled</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Co-op employers verify enrollment status.</p>
              </div>
              <Switch
                data-testid="profile-currently-enrolled-switch"
                checked={currentlyEnrolled}
                onCheckedChange={(v) => { setCurrentlyEnrolled(v); setEduSavedAt(null); }}
              />
            </div>
          )}
          {(() => {
            const isSaved = !!(eduSavedAt && Date.now() - eduSavedAt < SAVED_MS);
            return (
              <Button
                data-testid="profile-save-education-btn"
                onClick={() => {
                  lastSaveCard.current = "education";
                  upsertProfile.mutate({
                    school: school || undefined,
                    program: program || undefined,
                    graduationDate: graduationDate || undefined,
                    currentlyEnrolled: isCoopCA ? currentlyEnrolled : undefined,
                    highestEducationLevel: highestEducationLevel || undefined,
                  });
                }}
                disabled={upsertProfile.isPending}
                size="sm"
                className={isSaved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {upsertProfile.isPending && lastSaveCard.current === "education" ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
                ) : isSaved ? (
                  <><CheckCircle className="mr-1.5 h-3.5 w-3.5" />Saved</>
                ) : "Save Education"}
              </Button>
            );
          })()}
        </CardContent>
      </Card>

      {/* Work Authorization Card — CA and US */}
      {showWorkAuthCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Work Authorization
            </CardTitle>
            <CardDescription>
              Used to match requirements in job postings. This information stays private and is never shared.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>{workAuthCopy.workStatusLabel}</Label>
              <Select value={workStatus} onValueChange={(v) => { setWorkStatus(v as any); setWorkAuthSavedAt(null); }}>
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
                <Select value={workStatusDetail || "none"} onValueChange={(v) => { setWorkStatusDetail(v === "none" ? "" : v); setWorkAuthSavedAt(null); }}>
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
              <Label>{workAuthCopy.sponsorshipLabel}</Label>
              <Select value={needsSponsorship} onValueChange={(v) => { setNeedsSponsorship(v as any); setWorkAuthSavedAt(null); }}>
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
                placeholder={workAuthCopy.countryPlaceholder}
                value={countryOfResidence}
                maxLength={MAX_LENGTHS.PROFILE_COUNTRY}
                onChange={(e) => { setCountryOfResidence(e.target.value); setWorkAuthSavedAt(null); }}
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
                onCheckedChange={(v) => { setWillingToRelocate(v); setWorkAuthSavedAt(null); }}
              />
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
              <strong>Note:</strong> {workAuthCopy.noteText}
            </p>

            {(() => {
              const isSaved = !!(workAuthSavedAt && Date.now() - workAuthSavedAt < SAVED_MS);
              return (
                <Button
                  data-testid="profile-save-workauth-btn"
                  onClick={() => updateWorkStatus.mutate({
                    workStatus,
                    workStatusDetail: workStatusDetail ? (workStatusDetail as any) : null,
                    needsSponsorship,
                    countryOfResidence: countryOfResidence || null,
                    willingToRelocate,
                  })}
                  disabled={updateWorkStatus.isPending}
                  size="sm"
                  className={isSaved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  {updateWorkStatus.isPending ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
                  ) : isSaved ? (
                    <><CheckCircle className="mr-1.5 h-3.5 w-3.5" />Saved</>
                  ) : "Save Work Status"}
                </Button>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Info</CardTitle>
          <CardDescription>Used in Outreach Pack signatures. Leave blank to omit from generated messages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" value={phone} maxLength={MAX_LENGTHS.PROFILE_PHONE} onChange={(e) => { setPhone(e.target.value); setContactSavedAt(null); }} placeholder="+1 (555) 000-0000" className="w-64" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL (optional)</Label>
            <Input id="linkedinUrl" value={linkedinUrl} maxLength={MAX_LENGTHS.PROFILE_LINKEDIN_URL} onChange={(e) => { setLinkedinUrl(e.target.value); setContactSavedAt(null); }} placeholder="https://linkedin.com/in/yourname" />
          </div>
          {(() => {
            const isSaved = !!(contactSavedAt && Date.now() - contactSavedAt < SAVED_MS);
            return (
              <Button
                size="sm"
                data-testid="profile-save-contact-btn"
                onClick={() => {
                  lastSaveCard.current = "contact";
                  upsertProfile.mutate({ phone: phone || null, linkedinUrl: linkedinUrl || null });
                }}
                disabled={upsertProfile.isPending}
                className={isSaved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {upsertProfile.isPending && lastSaveCard.current === "contact" ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
                ) : isSaved ? (
                  <><CheckCircle className="mr-1.5 h-3.5 w-3.5" />Saved</>
                ) : "Save Contact Info"}
              </Button>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
