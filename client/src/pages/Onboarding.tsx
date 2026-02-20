import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, GraduationCap, Briefcase, Zap } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Onboarding() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [trackCode, setTrackCode] = useState<"COOP" | "NEW_GRAD">("COOP");
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [currentlyEnrolled, setCurrentlyEnrolled] = useState(true);
  const [resumeText, setResumeText] = useState("");
  const [resumeTitle, setResumeTitle] = useState("Base Resume");

  const upsertProfile = trpc.profile.upsert.useMutation();
  const createResume = trpc.resumes.create.useMutation();

  if (loading) return null;

  const handleComplete = async () => {
    try {
      await upsertProfile.mutateAsync({
        regionCode: "CA",
        trackCode,
        school: school || undefined,
        program: program || undefined,
        graduationDate: graduationDate || undefined,
        currentlyEnrolled,
        onboardingComplete: true,
      });

      if (resumeText.trim()) {
        await createResume.mutateAsync({
          title: resumeTitle || "Base Resume",
          content: resumeText,
        });
      }

      toast.success("Welcome to Resupify!");
      setLocation("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    }
  };

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
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose your track</CardTitle>
              <CardDescription>
                This helps us tailor resume tips and eligibility checks for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={trackCode}
                onValueChange={(v) => setTrackCode(v as "COOP" | "NEW_GRAD")}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="coop"
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    trackCode === "COOP"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <RadioGroupItem value="COOP" id="coop" className="sr-only" />
                  <GraduationCap className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold">Co-op</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Currently enrolled
                    </div>
                  </div>
                </Label>
                <Label
                  htmlFor="newgrad"
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    trackCode === "NEW_GRAD"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <RadioGroupItem
                    value="NEW_GRAD"
                    id="newgrad"
                    className="sr-only"
                  />
                  <Briefcase className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold">New Grad</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Recently graduated
                    </div>
                  </div>
                </Label>
              </RadioGroup>
              <Button onClick={() => setStep(2)} className="w-full mt-4">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your education</CardTitle>
              <CardDescription>
                {trackCode === "COOP"
                  ? "Co-op employers verify enrollment status."
                  : "New grad roles check graduation eligibility."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="gradDate">
                  {trackCode === "COOP"
                    ? "Expected Graduation"
                    : "Graduation Date"}
                </Label>
                <Input
                  id="gradDate"
                  type="month"
                  value={graduationDate}
                  onChange={(e) => setGraduationDate(e.target.value)}
                />
              </div>
              {trackCode === "COOP" && (
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
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload your base resume</CardTitle>
              <CardDescription>
                Paste your resume text below. You can always edit it later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resumeTitle">Resume Title</Label>
                <Input
                  id="resumeTitle"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                  placeholder="e.g., Base Resume"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resumeText">Resume Content</Label>
                <Textarea
                  id="resumeText"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume text here..."
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You can skip this step and add your resume later.
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
                  disabled={upsertProfile.isPending || createResume.isPending}
                >
                  {upsertProfile.isPending || createResume.isPending
                    ? "Saving..."
                    : "Complete Setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
