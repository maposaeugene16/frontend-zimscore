import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Mail, Lock, User, Eye, EyeOff, Upload, Camera, ChevronRight, ChevronLeft, Check, X, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Step = 1 | 2 | 3 | 4;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Account info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: National ID
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [idFrontVerified, setIdFrontVerified] = useState<boolean | null>(null);
  const [idBackVerified, setIdBackVerified] = useState<boolean | null>(null);
  const [verifyingFront, setVerifyingFront] = useState(false);
  const [verifyingBack, setVerifyingBack] = useState(false);

  // Step 3: Passport photo (camera)
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const verifyIdDocument = async (file: File, side: "front" | "back"): Promise<{ valid: boolean; reason: string }> => {
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("verify-id-document", {
        body: { imageBase64: base64, side },
      });
      if (error) throw error;
      return { valid: data.valid, reason: data.reason || "" };
    } catch (err) {
      console.error("ID verification error:", err);
      // Don't block on verification failure
      return { valid: true, reason: "Verification unavailable" };
    }
  };

  const handleFileSelect = (type: "front" | "back") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    const url = URL.createObjectURL(file);

    if (type === "front") {
      setIdFront(file);
      setIdFrontPreview(url);
      setIdFrontVerified(null);
      setVerifyingFront(true);
      const result = await verifyIdDocument(file, "front");
      setVerifyingFront(false);
      if (!result.valid) {
        toast.error(`This does not appear to be the front of a Zimbabwean National ID. ${result.reason}`);
        setIdFrontVerified(false);
      } else {
        setIdFrontVerified(true);
        toast.success("ID front side verified ✓");
      }
    } else {
      setIdBack(file);
      setIdBackPreview(url);
      setIdBackVerified(null);
      setVerifyingBack(true);
      const result = await verifyIdDocument(file, "back");
      setVerifyingBack(false);
      if (!result.valid) {
        toast.error(`This does not appear to be the back of a Zimbabwean National ID. ${result.reason}`);
        setIdBackVerified(false);
      } else {
        setIdBackVerified(true);
        toast.success("ID back side verified ✓");
      }
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video metadata to load so dimensions are available
        await new Promise<void>((resolve) => {
          const video = videoRef.current!;
          if (video.readyState >= 2) {
            resolve();
          } else {
            video.onloadeddata = () => resolve();
          }
        });
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      toast.error("Camera not ready yet. Please wait a moment and try again.");
      return;
    }
    const size = Math.min(vw, vh);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const offsetX = (vw - size) / 2;
    const offsetY = (vh - size) / 2;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPassportPhoto(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const dataURLtoBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  };

  const validateStep = (s: Step): boolean => {
    if (s === 1) {
      if (!fullName.trim()) { toast.error("Please enter your full name"); return false; }
      if (!email.trim()) { toast.error("Please enter your email"); return false; }
      if (password.length < 6) { toast.error("Password must be at least 6 characters"); return false; }
      return true;
    }
    if (s === 2) {
      if (!idFront || !idBack) { toast.error("Please upload both sides of your national ID"); return false; }
      if (verifyingFront || verifyingBack) { toast.error("Please wait for ID verification to complete"); return false; }
      if (idFrontVerified === false) { toast.error("The front of your ID was not recognized as a valid Zimbabwean National ID. Please re-upload."); return false; }
      if (idBackVerified === false) { toast.error("The back of your ID was not recognized as a valid Zimbabwean National ID. Please re-upload."); return false; }
      return true;
    }
    if (s === 3) {
      if (!passportPhoto) { toast.error("Please take a passport photo"); return false; }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 4) as Step);
  };

  const prevStep = () => {
    if (step === 3) stopCamera();
    setStep((s) => Math.max(s - 1, 1) as Step);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Signup failed");

      // 2. Upload ID front
      const frontExt = idFront!.name.split(".").pop();
      const { error: frontErr } = await supabase.storage
        .from("kyc-documents")
        .upload(`${userId}/id-front.${frontExt}`, idFront!);
      if (frontErr) throw frontErr;

      // 3. Upload ID back
      const backExt = idBack!.name.split(".").pop();
      const { error: backErr } = await supabase.storage
        .from("kyc-documents")
        .upload(`${userId}/id-back.${backExt}`, idBack!);
      if (backErr) throw backErr;

      // 4. Upload passport photo
      const photoBlob = dataURLtoBlob(passportPhoto!);
      const { error: photoErr } = await supabase.storage
        .from("kyc-documents")
        .upload(`${userId}/passport-photo.jpg`, photoBlob);
      if (photoErr) throw photoErr;

      // 5. Create profile
      const { error: profileErr } = await supabase.from("profiles").insert({
        user_id: userId,
        full_name: fullName,
        national_id_front_url: `${userId}/id-front.${frontExt}`,
        national_id_back_url: `${userId}/id-back.${backExt}`,
        passport_photo_url: `${userId}/passport-photo.jpg`,
        verification_status: "pending",
      });
      if (profileErr) throw profileErr;

      toast.success("Account created successfully! You can now sign in.");
      // Sign out so the user logs in fresh
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Account" },
    { num: 2, label: "National ID" },
    { num: 3, label: "Photo" },
    { num: 4, label: "Review" },
  ];

  return (
    <div className="min-h-screen page-gradient flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold">ZimScore</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete all steps to get verified</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > s.num ? "bg-emerald-500 text-white" : step === s.num ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs mx-1 hidden sm:inline ${step === s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              {i < steps.length - 1 && <div className={`w-6 sm:w-10 h-0.5 ${step > s.num ? "bg-emerald-500" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: Account Info */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Tendai Moyo" className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary transition-colors" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: National ID */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-muted-foreground">Upload clear images of the front and back of your <strong>Zimbabwean National ID</strong>. Our AI will verify the documents automatically.</p>

                {/* Front */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    ID Front Side
                    {verifyingFront && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    {idFrontVerified === true && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    {idFrontVerified === false && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  </label>
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors bg-secondary/50 min-h-[140px] ${idFrontVerified === false ? "border-destructive" : idFrontVerified === true ? "border-emerald-500" : "border-border hover:border-primary"}`}>
                    {idFrontPreview ? (
                      <div className="relative w-full">
                        <img src={idFrontPreview} alt="ID Front" className="w-full h-32 object-cover rounded-md" />
                        {verifyingFront && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-md">
                            <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</div>
                          </div>
                        )}
                        <button type="button" onClick={(e) => { e.preventDefault(); setIdFront(null); setIdFrontPreview(null); setIdFrontVerified(null); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload front of ID</span>
                        <span className="text-xs text-muted-foreground mt-1">JPG, PNG — Max 5MB</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect("front")} />
                  </label>
                  {idFrontVerified === false && (
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Not recognized as a Zimbabwean National ID. Please upload the correct document.</p>
                  )}
                </div>

                {/* Back */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    ID Back Side
                    {verifyingBack && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    {idBackVerified === true && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    {idBackVerified === false && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  </label>
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors bg-secondary/50 min-h-[140px] ${idBackVerified === false ? "border-destructive" : idBackVerified === true ? "border-emerald-500" : "border-border hover:border-primary"}`}>
                    {idBackPreview ? (
                      <div className="relative w-full">
                        <img src={idBackPreview} alt="ID Back" className="w-full h-32 object-cover rounded-md" />
                        {verifyingBack && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-md">
                            <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</div>
                          </div>
                        )}
                        <button type="button" onClick={(e) => { e.preventDefault(); setIdBack(null); setIdBackPreview(null); setIdBackVerified(null); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload back of ID</span>
                        <span className="text-xs text-muted-foreground mt-1">JPG, PNG — Max 5MB</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect("back")} />
                  </label>
                  {idBackVerified === false && (
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Not recognized as a Zimbabwean National ID. Please upload the correct document.</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Passport Photo */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-muted-foreground">Take a clear passport-size photo of your face. This will be matched against your National ID for verification.</p>

                <div className="flex flex-col items-center gap-4">
                  {passportPhoto ? (
                    <div className="relative">
                      <img src={passportPhoto} alt="Passport" className="w-48 h-48 rounded-xl object-cover border-2 border-primary" />
                      <button type="button" onClick={() => setPassportPhoto(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : cameraActive ? (
                    <div className="relative">
                      <video ref={videoRef} autoPlay playsInline muted className="w-48 h-48 rounded-xl object-cover border-2 border-primary" />
                      <div className="flex gap-2 mt-3 justify-center">
                        <Button size="sm" onClick={capturePhoto}><Camera className="w-4 h-4 mr-1" /> Capture</Button>
                        <Button size="sm" variant="outline" onClick={stopCamera}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={startCamera} className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary transition-colors bg-secondary/50 w-48 h-48">
                      <Camera className="w-10 h-10 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground text-center">Tap to open camera</span>
                    </button>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </motion.div>
            )}

            {/* STEP 4: Review */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-muted-foreground">Please review your details before submitting.</p>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{fullName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center">
                    <img src={idFrontPreview!} alt="ID Front" className="w-full h-20 object-cover rounded-md border border-border" />
                    <span className="text-xs text-muted-foreground mt-1 block">ID Front</span>
                  </div>
                  <div className="text-center">
                    <img src={idBackPreview!} alt="ID Back" className="w-full h-20 object-cover rounded-md border border-border" />
                    <span className="text-xs text-muted-foreground mt-1 block">ID Back</span>
                  </div>
                  <div className="text-center">
                    <img src={passportPhoto!} alt="Photo" className="w-full h-20 object-cover rounded-md border border-border" />
                    <span className="text-xs text-muted-foreground mt-1 block">Passport</span>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
                  <strong>Security Notice:</strong> Your documents will be securely stored and used solely for identity verification purposes.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button variant="outline" className="flex-1" onClick={prevStep} disabled={loading}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 4 ? (
              <Button className="flex-1 glow-primary" onClick={nextStep}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button className="flex-1 glow-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
