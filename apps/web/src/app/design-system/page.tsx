"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Label,
  Checkbox,
  Radio,
  Badge,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Skeleton,
  Spinner,
  Separator,
  Container,
  jaamaTokens,
} from "@jaama/ui";

export default function DesignSystemPreviewPage() {
  const [buttonLoading, setButtonLoading] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("orange");

  return (
    <div className="min-h-screen bg-slate-50 py-10 font-sans">
      <Container size="xl">
        {/* Top Header */}
        <header className="mb-10 pb-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="brand" size="md">INTERNAL ENGINEERING PREVIEW</Badge>
              <span className="text-xs text-slate-400 font-mono">v1.0.0</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              JAAMA Design System &amp; UI Primitives QA
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Revue visuelle et validation des contrats d&apos;ingénierie UI <code className="text-xs bg-slate-200 px-1 py-0.5 rounded text-[#002B9A] font-semibold">@jaama/ui</code>.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Retour à l&apos;application
            </Button>
          </Link>
        </header>

        <div className="space-y-12">
          {/* SECTION 1: DESIGN TOKENS (Colors & Typography) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-bold text-slate-900">1. Tokens Sémantiques &amp; Couleurs</h2>
              <Badge variant="neutral">Tokens Contract</Badge>
            </div>

            {/* Colors Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <div className="p-4 rounded-lg bg-[#002B9A] text-white shadow-sm">
                <div className="text-xs font-mono opacity-80">Primary</div>
                <div className="text-sm font-bold mt-1">#002B9A</div>
              </div>
              <div className="p-4 rounded-lg bg-[#00227B] text-white shadow-sm">
                <div className="text-xs font-mono opacity-80">Primary Hover</div>
                <div className="text-sm font-bold mt-1">#00227B</div>
              </div>
              <div className="p-4 rounded-lg bg-[#0B1936] text-white shadow-sm">
                <div className="text-xs font-mono opacity-80">Deep Navy</div>
                <div className="text-sm font-bold mt-1">#0B1936</div>
              </div>
              <div className="p-4 rounded-lg bg-[#F0F4FF] text-[#002B9A] border border-[#C7D7FE]">
                <div className="text-xs font-mono opacity-80">Surface Light</div>
                <div className="text-sm font-bold mt-1">#F0F4FF</div>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <div className="text-xs font-mono opacity-80">Success</div>
                <div className="text-sm font-bold mt-1">#16A34A</div>
              </div>
              <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
                <div className="text-xs font-mono opacity-80">Danger</div>
                <div className="text-sm font-bold mt-1">#DC2626</div>
              </div>
            </div>

            {/* Typography Scale */}
            <Card>
              <CardHeader>
                <CardTitle>Échelle Typographique (Plus Jakarta Sans)</CardTitle>
                <CardDescription>Hiérarchie officielle verrouillée du produit JAAMA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-b pb-2">
                  <span className="text-xs font-mono text-slate-400 block mb-1">Display (36px / 800)</span>
                  <div style={jaamaTokens.typography.scale.display} className="text-slate-900">
                    Gérez, vendez et développez votre entreprise.
                  </div>
                </div>
                <div className="border-b pb-2">
                  <span className="text-xs font-mono text-slate-400 block mb-1">H1 (30px / 700)</span>
                  <div style={jaamaTokens.typography.scale.h1} className="text-slate-900">
                    Tableau de bord des ventes quotidiennes
                  </div>
                </div>
                <div className="border-b pb-2">
                  <span className="text-xs font-mono text-slate-400 block mb-1">H2 (24px / 700)</span>
                  <div style={jaamaTokens.typography.scale.h2} className="text-slate-900">
                    Gestion du stock et produits
                  </div>
                </div>
                <div className="border-b pb-2">
                  <span className="text-xs font-mono text-slate-400 block mb-1">H3 (20px / 600)</span>
                  <div style={jaamaTokens.typography.scale.h3} className="text-slate-900">
                    Facture N° FACT-2026-089
                  </div>
                </div>
                <div className="border-b pb-2">
                  <span className="text-xs font-mono text-slate-400 block mb-1">Body (16px / 400)</span>
                  <div style={jaamaTokens.typography.scale.body} className="text-slate-700">
                    JAAMA permet aux entrepreneurs africains de gérer leurs ventes et paiements Mobile Money.
                  </div>
                </div>
                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-1">Caption / Label (12px - 14px)</span>
                  <div style={jaamaTokens.typography.scale.label} className="text-slate-800">
                    Montant total TTC : 25 000 FCFA
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* SECTION 2: BUTTONS & ICON BUTTONS */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-bold text-slate-900">2. Boutons &amp; Contrôles Tactiles</h2>
              <Badge variant="brand">Boutons Généreux</Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Variantes &amp; Tailles de Boutons</CardTitle>
                <CardDescription>Cibles tactiles généreuses (sm: 40px, md: 44px, lg: 48px)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Variants */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-500 mb-3">Variantes Sémantiques</h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button variant="primary">Primary (Official Blue)</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                  </div>
                </div>

                <Separator />

                {/* Sizes */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-500 mb-3">Tailles de Contrôle</h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button variant="primary" size="sm">Small (40px)</Button>
                    <Button variant="primary" size="md">Medium Default (44px)</Button>
                    <Button variant="primary" size="lg">Large (48px)</Button>
                  </div>
                </div>

                <Separator />

                {/* States & Icons */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-500 mb-3">États &amp; Icônes</h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button
                      variant="primary"
                      isLoading={buttonLoading}
                      onClick={() => {
                        setButtonLoading(true);
                        setTimeout(() => setButtonLoading(false), 2000);
                      }}
                    >
                      {buttonLoading ? "Traitement..." : "Tester l'état de chargement"}
                    </Button>
                    <Button variant="outline" disabled>
                      Bouton Désactivé
                    </Button>
                    <Button
                      variant="secondary"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      }
                    >
                      Nouvelle Vente
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Icon Buttons */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-500 mb-3">Boutons d&apos;icône (IconButton avec aria-label)</h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <IconButton
                      aria-label="Rechercher"
                      variant="primary"
                      icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      }
                    />
                    <IconButton
                      aria-label="Fermer"
                      variant="outline"
                      icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      }
                    />
                    <IconButton
                      aria-label="Supprimer"
                      variant="destructive"
                      size="sm"
                      icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* SECTION 3: FORM CONTROLS */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-bold text-slate-900">3. Contrôles de Formulaire</h2>
              <Badge variant="info">Zero-Trust Inputs</Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Champs de Saisie &amp; Formulaires</CardTitle>
                <CardDescription>Champs aérés avec validation d&apos;erreur et étiquettes explicites</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Standard Input */}
                  <Input
                    label="Nom du Commerce"
                    placeholder="Ex: Pharmacie du Progrès"
                    helperText="Le nom officiel affiché sur vos factures."
                    required
                  />

                  {/* Input with Left Slot */}
                  <Input
                    label="Montant (FCFA)"
                    placeholder="25 000"
                    leftSlot={<span className="text-xs font-bold text-slate-500">FCFA</span>}
                  />

                  {/* Invalid Input */}
                  <Input
                    label="Numéro de Téléphone Mobile Money"
                    defaultValue="+223 70 00 00"
                    isInvalid
                    error="Numéro Mobile Money invalide (Format: +223...)."
                  />

                  {/* Disabled Input */}
                  <Input
                    label="Identifiant Tenant (Immuable)"
                    defaultValue="TNT-ML-8921"
                    disabled
                  />
                </div>

                {/* Textarea */}
                <Textarea
                  label="Notes de Facturation"
                  placeholder="Ajoutez une note ou des instructions de paiement pour votre client..."
                  helperText="Visible par le client sur le document PDF final."
                />

                <Separator />

                {/* Checkbox & Radio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Case à cocher (Checkbox)</Label>
                    <Checkbox
                      label="Recevoir les notifications de vente par SMS"
                      description="Un SMS sera envoyé pour chaque transaction Mobile Money réussie."
                      checked={checkboxChecked}
                      onChange={(e) => setCheckboxChecked(e.target.checked)}
                    />
                    <Checkbox
                      label="Option désactivée"
                      disabled
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Choix unique (Radio Group)</Label>
                    <div className="space-y-2">
                      <Radio
                        name="payment-method"
                        label="Orange Money"
                        description="Paiement instantané par code OTP"
                        checked={radioValue === "orange"}
                        onChange={() => setRadioValue("orange")}
                      />
                      <Radio
                        name="payment-method"
                        label="Wave Mobile Money"
                        description="Scanner le QR Code Wave"
                        checked={radioValue === "wave"}
                        onChange={() => setRadioValue("wave")}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* SECTION 4: BADGES, ALERTS & SKELETONS */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-bold text-slate-900">4. Statuts, Alertes &amp; Chargement</h2>
              <Badge variant="success">Restraint &amp; Clarity</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle>Badges Sémantiques de Statut</CardTitle>
                  <CardDescription>Utilisés pour les états de vente, factures et stocks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="neutral">Neutre / Brouillon</Badge>
                    <Badge variant="info">En cours</Badge>
                    <Badge variant="success">Payé / Validé</Badge>
                    <Badge variant="warning">En attente</Badge>
                    <Badge variant="danger">Annulé / Erreur</Badge>
                    <Badge variant="brand">Boutique Officielle</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Skeletons & Spinners */}
              <Card>
                <CardHeader>
                  <CardTitle>Chargement &amp; Skeletons</CardTitle>
                  <CardDescription>Animation douce respectant prefers-reduced-motion</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Spinner size="sm" className="text-[#002B9A]" />
                    <Spinner size="md" className="text-[#002B9A]" />
                    <Spinner size="lg" className="text-[#002B9A]" />
                    <span className="text-xs text-slate-500 font-mono">Indicateurs inline</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Alertes &amp; Notifications Sémantiques</CardTitle>
                <CardDescription>Présentation retenue sans surcharge visuelle de la page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="info" title="Information Système">
                  Mise à jour planifiée de la plateforme ce soir à 23h00 UTC.
                </Alert>
                <Alert variant="success" title="Paiement Confirmé">
                  La transaction Wave de 15 000 FCFA a été validée avec succès.
                </Alert>
                <Alert variant="warning" title="Alerte de Stock">
                  Le produit &quot;Riz Parfumé 50kg&quot; a atteint le seuil critique (restant: 2).
                </Alert>
                <Alert variant="danger" title="Erreur d'autorisation">
                  Vous n&apos;avez pas les permissions requises pour annuler cette vente.
                </Alert>
              </CardContent>
            </Card>
          </section>
        </div>
      </Container>
    </div>
  );
}
