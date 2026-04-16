import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, FileText, CheckCircle, XCircle, AlertTriangle,
  Shield, ShieldCheck, ShieldX, Loader2, Eye, Trash2, Info
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

interface StatementRecord {
  id: string;
  file_name: string;
  verification_status: string;
  verification_reason: string | null;
  confidence: number | null;
  extracted_data: any;
  created_at: string;
}

export default function EcoCashUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [statements, setStatements] = useState<StatementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<StatementRecord | null>(null);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      const { data, error } = await supabase
        .from("ecocash_statements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setStatements((data as StatementRecord[]) || []);
    } catch (err) {
      console.error("Failed to fetch statements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    const validTypes = ["application/pdf", "text/csv", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(selected.type)) {
      toast.error("Please upload a PDF, CSV, or image file");
      return;
    }
    setFile(selected);
    setVerificationResult(null);
  };

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleUploadAndVerify = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    // Step 1: Verify with AI
    setVerifying(true);
    setVerificationResult(null);

    try {
      const base64 = await fileToBase64(file);

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "verify-ecocash-statement",
        { body: { imageBase64: base64, fileType: file.type } }
      );

      if (verifyError) throw verifyError;

      setVerificationResult(verifyData);

      if (!verifyData.valid) {
        toast.error("This does not appear to be a genuine EcoCash statement", {
          description: verifyData.reason,
        });
        setVerifying(false);
        return;
      }

      // Step 2: Upload to storage
      setVerifying(false);
      setUploading(true);

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("ecocash-statements")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("ecocash-statements")
        .getPublicUrl(filePath);

      // Step 3: Save record
      const { error: insertError } = await supabase
        .from("ecocash_statements")
        .insert({
          user_id: user.id,
          file_url: filePath,
          file_name: file.name,
          verification_status: verifyData.valid ? "verified" : "rejected",
          verification_reason: verifyData.reason,
          confidence: verifyData.confidence,
          extracted_data: verifyData.extracted_data,
        });

      if (insertError) throw insertError;

      toast.success("EcoCash statement verified and uploaded!", {
        description: `Confidence: ${verifyData.confidence}%`,
      });

      setFile(null);
      fetchStatements();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Failed to process statement", { description: err.message });
    } finally {
      setUploading(false);
      setVerifying(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "verified") return <ShieldCheck className="w-5 h-5 text-success" />;
    if (status === "rejected") return <ShieldX className="w-5 h-5 text-destructive" />;
    return <Shield className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <AppLayout title="EcoCash Statements">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="font-display text-2xl font-bold">EcoCash Statement Upload</h2>
          <p className="text-muted-foreground text-sm">
            Upload your EcoCash transaction history to improve your Zimscore. Our AI verifies authenticity automatically.
          </p>
        </div>

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Upload Statement</h3>
          </div>

          {/* Info box */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How to get your EcoCash statement:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Dial *151# → My Account → Statement</li>
                  <li>Or visit the EcoCash App → Transaction History → Export</li>
                  <li>Or request from any Econet Shop with your ID</li>
                </ol>
                <p className="mt-2 text-xs">Accepted formats: PDF, CSV, or clear photo/screenshot</p>
              </div>
            </div>
          </div>

          {/* File input */}
          <label className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            file ? "border-success/50 bg-success/5" : "border-border hover:border-primary/50 bg-secondary/20"
          }`}>
            {file ? (
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-success" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to select your EcoCash statement</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, CSV, JPG, or PNG (max 10MB)</p>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.csv,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>

          {/* Verification Result */}
          <AnimatePresence>
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className={`p-4 rounded-lg border ${
                  verificationResult.valid
                    ? "bg-success/5 border-success/30"
                    : "bg-destructive/5 border-destructive/30"
                }`}>
                  <div className="flex items-start gap-3">
                    {verificationResult.valid ? (
                      <ShieldCheck className="w-6 h-6 text-success shrink-0" />
                    ) : (
                      <ShieldX className="w-6 h-6 text-destructive shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {verificationResult.valid ? "✅ Genuine EcoCash Statement" : "❌ Not a Genuine EcoCash Statement"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{verificationResult.reason}</p>
                      {verificationResult.confidence > 0 && (
                        <p className="text-xs mt-1">Confidence: <span className="font-bold">{verificationResult.confidence}%</span></p>
                      )}
                      {verificationResult.detected_type && (
                        <p className="text-xs text-muted-foreground">Detected: {verificationResult.detected_type}</p>
                      )}
                      {verificationResult.fraud_indicators?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-destructive">Fraud indicators:</p>
                          {verificationResult.fraud_indicators.map((ind: string, i: number) => (
                            <div key={i} className="flex items-center gap-1 text-xs text-destructive/80">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{ind}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {verificationResult.extracted_data && (
                        <div className="mt-3 p-2 rounded bg-secondary/40 border border-border text-xs space-y-1">
                          <p className="font-medium">Extracted Data:</p>
                          {verificationResult.extracted_data.account_holder && (
                            <p>Account: {verificationResult.extracted_data.account_holder}</p>
                          )}
                          {verificationResult.extracted_data.phone_number && (
                            <p>Phone: {verificationResult.extracted_data.phone_number}</p>
                          )}
                          {verificationResult.extracted_data.transaction_count && (
                            <p>Transactions: {verificationResult.extracted_data.transaction_count}</p>
                          )}
                          {verificationResult.extracted_data.total_credits != null && (
                            <p>Total Credits: ${verificationResult.extracted_data.total_credits}</p>
                          )}
                          {verificationResult.extracted_data.total_debits != null && (
                            <p>Total Debits: ${verificationResult.extracted_data.total_debits}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <div className="flex justify-end gap-2 mt-4">
            {file && (
              <Button variant="outline" onClick={() => { setFile(null); setVerificationResult(null); }}>
                Clear
              </Button>
            )}
            <Button
              onClick={handleUploadAndVerify}
              disabled={!file || uploading || verifying}
              className="glow-primary"
            >
              {verifying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Authenticity...</>
              ) : uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" /> Verify & Upload</>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Previous Uploads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold mb-4">Upload History</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No statements uploaded yet</p>
              <p className="text-xs">Upload your first EcoCash statement to improve your credit score</p>
            </div>
          ) : (
            <div className="space-y-2">
              {statements.map((stmt) => (
                <div
                  key={stmt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(stmt.verification_status)}
                    <div>
                      <p className="text-sm font-medium">{stmt.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(stmt.created_at).toLocaleDateString()} ·{" "}
                        <span className={
                          stmt.verification_status === "verified" ? "text-success" :
                          stmt.verification_status === "rejected" ? "text-destructive" :
                          "text-muted-foreground"
                        }>
                          {stmt.verification_status}
                        </span>
                        {stmt.confidence != null && stmt.confidence > 0 && ` · ${stmt.confidence}% confidence`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedStatement(stmt); setDetailOpen(true); }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Statement Details</DialogTitle>
            <DialogDescription>{selectedStatement?.file_name}</DialogDescription>
          </DialogHeader>
          {selectedStatement && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                {statusIcon(selectedStatement.verification_status)}
                <span className="font-medium capitalize">{selectedStatement.verification_status}</span>
                {selectedStatement.confidence != null && selectedStatement.confidence > 0 && (
                  <span className="text-sm text-muted-foreground">({selectedStatement.confidence}% confidence)</span>
                )}
              </div>
              {selectedStatement.verification_reason && (
                <p className="text-sm text-muted-foreground">{selectedStatement.verification_reason}</p>
              )}
              {selectedStatement.extracted_data && (
                <div className="p-3 rounded-lg bg-secondary/30 border border-border text-sm space-y-1">
                  <p className="font-medium mb-2">Extracted Financial Data</p>
                  {Object.entries(selectedStatement.extracted_data).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Uploaded: {new Date(selectedStatement.created_at).toLocaleString()}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
