"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from "@jaama/ui";
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, X } from "lucide-react";

export interface ImportWizardProps {
  entityType: "products" | "customers";
  entityName: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({
  entityType,
  entityName,
  onSuccess,
  onClose,
}) => {
  const { config, apiFetch } = useWorkspace();
  const [step, setStep] = useState<"upload" | "preview" | "success">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    batchId: string;
    rowCount: number;
    validCount: number;
    invalidCount: number;
    sampleRows: any[];
    validationErrors: { rowNumber: number; reason: string }[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".csv")) {
        setError("Veuillez sélectionner un fichier au format .csv.");
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleUploadPreview = async () => {
    if (!selectedFile || !config) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const data = await apiFetch(`/api/v1/imports/${entityType}/preview`, {
        method: "POST",
        body: formData,
      });

      setPreviewData(data);
      setStep("preview");
    } catch (err: any) {
      setError(err?.message || "Échec de l'analyse du fichier CSV.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !config) return;
    setIsConfirming(true);
    setError(null);

    const idempotencyKey = `import-${entityType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      await apiFetch(`/api/v1/imports/${entityType}/${previewData.batchId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey }),
      });

      setStep("success");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || "Échec de la confirmation de l'importation.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Card className="max-w-2xl w-full mx-auto shadow-xl border-border-subtle bg-surface-raised">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            IMPORT CSV
          </Badge>
          <CardTitle className="text-lg font-bold text-content-primary">
            Importer des {entityName}
          </CardTitle>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === "upload" && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border-subtle hover:border-brand-primary rounded-xl p-8 text-center space-y-4 transition-colors">
              <div className="w-12 h-12 bg-blue-50 text-brand-primary rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-content-primary">
                  Sélectionnez un fichier CSV
                </p>
                <p className="text-xs text-content-secondary mt-1">
                  Format UTF-8, séparateur point-virgule (;) ou virgule (,), max 5 Mo (1000 lignes)
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input">
                <span className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg cursor-pointer transition-colors">
                  Parcourir les fichiers
                </span>
              </label>

              {selectedFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-subtle rounded-lg text-xs font-medium text-content-primary">
                  <FileText className="w-4 h-4 text-brand-primary" />
                  <span>{selectedFile.name}</span>
                  <span className="text-content-muted">
                    ({(selectedFile.size / 1024).toFixed(1)} Base KB)
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              {onClose && (
                <Button variant="ghost" size="md" onClick={onClose}>
                  Annuler
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                disabled={!selectedFile || isUploading}
                onClick={handleUploadPreview}
                leftIcon={isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : undefined}
                rightIcon={!isUploading ? <ArrowRight className="w-4 h-4" /> : undefined}
              >
                {isUploading ? "Analyse en cours..." : "Aperçu de l'import"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === "preview" && previewData && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-surface-subtle rounded-lg border border-border-subtle">
                <div className="text-xs text-content-muted">Total Lignes</div>
                <div className="text-lg font-bold text-content-primary">{previewData.rowCount}</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xs text-green-700">Valides</div>
                <div className="text-lg font-bold text-green-800">{previewData.validCount}</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-xs text-red-700">Invalides</div>
                <div className="text-lg font-bold text-red-800">{previewData.invalidCount}</div>
              </div>
            </div>

            {previewData.validationErrors.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-amber-900">Erreurs de validation détectées :</p>
                <ul className="text-xs text-amber-800 space-y-1 max-h-32 overflow-y-auto">
                  {previewData.validationErrors.map((err, idx) => (
                    <li key={idx}>
                      Ligne {err.rowNumber} : {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-content-secondary mb-2">
                Aperçu des premiers enregistrements valides :
              </p>
              <div className="border border-border-subtle rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-subtle border-b border-border-subtle text-content-muted font-semibold">
                    <tr>
                      {previewData.sampleRows.length > 0 &&
                        Object.keys(previewData.sampleRows[0]).map((key) => (
                          <th key={key} className="px-3 py-2">
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-content-primary">
                    {previewData.sampleRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {Object.values(row).map((val: any, cIdx) => (
                          <td key={cIdx} className="px-3 py-2">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
              <Button variant="ghost" size="md" onClick={() => setStep("upload")}>
                Changer de fichier
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={previewData.validCount === 0 || isConfirming}
                onClick={handleConfirmImport}
                leftIcon={isConfirming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              >
                {isConfirming ? "Importation..." : `Confirmer l'import (${previewData.validCount})`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-content-primary">Importation Réussie !</h3>
            <p className="text-sm text-content-secondary max-w-sm mx-auto">
              Les enregistrements ont été importés et synchronisés dans votre entreprise avec succès.
            </p>
            <div className="pt-4 flex justify-center">
              <Button variant="primary" size="md" onClick={onClose}>
                Terminer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
