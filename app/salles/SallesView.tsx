"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Salle, Reservation } from "@/lib/types";
import NavBar from "../NavBar";

interface Props {
  currentProfile: Profile;
  salles: Salle[];
}

// Time slots: 8h to 19h, 30 min increments
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 19; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 19) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
  }
}
// TIME_SLOTS goes from 08:00 to 19:00 (last slot start)

const HOUR_START = 8;
const HOUR_END = 19;
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60; // 660 minutes

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - HOUR_START) * 60 + m;
}

function minutesToPercent(minutes: number): number {
  return (minutes / TOTAL_MINUTES) * 100;
}

interface BookingForm {
  salleId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  titre: string;
}

export default function SallesView({ currentProfile, salles }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [reservations, setReservations] = useState<
    (Reservation & { profiles: Profile })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<BookingForm>({
    salleId: salles[0]?.id ?? "",
    date: format(new Date(), "yyyy-MM-dd"),
    heureDebut: "09:00",
    heureFin: "10:00",
    titre: "",
  });

  const supabase = createClient();

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, profiles(*), salles(*)")
        .eq("date", selectedDate)
        .order("heure_debut");

      if (error) {
        console.error(error);
        return;
      }

      setReservations(
        (data ?? []) as (Reservation & { profiles: Profile })[]
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate, supabase]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  function checkConflict(
    salleId: string,
    date: string,
    debut: string,
    fin: string,
    excludeId?: string
  ): boolean {
    return reservations.some((r) => {
      if (r.salle_id !== salleId) return false;
      if (r.date !== date) return false;
      if (excludeId && r.id === excludeId) return false;
      const rDebut = r.heure_debut.slice(0, 5);
      const rFin = r.heure_fin.slice(0, 5);
      return debut < rFin && fin > rDebut;
    });
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const { salleId, date, heureDebut, heureFin, titre } = form;

    if (!salleId || !date || !heureDebut || !heureFin || !titre.trim()) {
      setFormError("Veuillez remplir tous les champs.");
      return;
    }

    if (heureDebut >= heureFin) {
      setFormError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    if (checkConflict(salleId, date, heureDebut, heureFin)) {
      setFormError(
        "Cette salle est déjà réservée sur ce créneau. Veuillez choisir un autre horaire."
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reservations").insert({
        salle_id: salleId,
        user_id: currentProfile.id,
        date,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        titre: titre.trim(),
      });

      if (error) {
        console.error(error);
        setFormError("Impossible de créer la réservation. Veuillez réessayer.");
        return;
      }

      setShowForm(false);
      setForm((f) => ({ ...f, titre: "" }));
      // Reload
      if (date === selectedDate) {
        await loadReservations();
      } else {
        setSelectedDate(date);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(error);
        return;
      }

      await loadReservations();
    } finally {
      setDeletingId(null);
    }
  }

  const selectedDateObj = parseISO(selectedDate);
  const dateLabel = format(selectedDateObj, "EEEE d MMMM yyyy", { locale: fr });
  const isTodaySelected = isToday(selectedDateObj);
  const sortedSalles = [...salles].sort((a, b) => a.capacite - b.capacite);

  return (
    <div className="min-h-screen bg-brand-surface">
      <NavBar currentProfile={currentProfile} activeTab="salles" />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-brand-text font-title">Réservation de salles</h2>
            <p className="text-sm text-brand-text/50 mt-0.5 capitalize">{dateLabel}</p>
          </div>
          <button
            onClick={() => {
              setForm((f) => ({ ...f, date: selectedDate }));
              setFormError(null);
              setShowForm(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Réserver une salle
          </button>
        </div>

        {/* Date picker row — on mobile, "Aujourd'hui" wraps below */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() =>
                setSelectedDate(format(subDays(selectedDateObj, 1), "yyyy-MM-dd"))
              }
              className="btn-secondary p-2.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field flex-1 max-w-xs"
            />

            <button
              onClick={() =>
                setSelectedDate(format(addDays(selectedDateObj, 1), "yyyy-MM-dd"))
              }
              className="btn-secondary p-2.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {!isTodaySelected && (
            <button
              onClick={() =>
                setSelectedDate(format(new Date(), "yyyy-MM-dd"))
              }
              className="btn-secondary text-xs w-full sm:w-auto"
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>

        {/* Rooms timeline */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : salles.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <p>Aucune salle configurée.</p>
            <p className="text-sm mt-1">
              Ajoutez des salles dans le tableau de bord Supabase.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedSalles.map((salle) => {
              const salleReservations = reservations.filter(
                (r) => r.salle_id === salle.id
              );
              return (
                <RoomTimeline
                  key={salle.id}
                  salle={salle}
                  reservations={salleReservations}
                  currentProfile={currentProfile}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                  onBookSlot={(debut, fin) => {
                    setForm((f) => ({
                      ...f,
                      salleId: salle.id,
                      date: selectedDate,
                      heureDebut: debut,
                      heureFin: fin,
                    }));
                    setFormError(null);
                    setShowForm(true);
                  }}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Booking modal */}
      {showForm && (
        <BookingModal
          form={form}
          salles={sortedSalles}
          submitting={submitting}
          error={formError}
          onChange={(updates) => {
            setForm((f) => ({ ...f, ...updates }));
            setFormError(null);
          }}
          onSubmit={handleBook}
          onClose={() => {
            setShowForm(false);
            setFormError(null);
          }}
          checkConflict={checkConflict}
        />
      )}
    </div>
  );
}

// ─── Room Timeline ────────────────────────────────────────────────────────────

function RoomTimeline({
  salle,
  reservations,
  currentProfile,
  deletingId,
  onDelete,
  onBookSlot,
}: {
  salle: Salle;
  reservations: (Reservation & { profiles: Profile })[];
  currentProfile: Profile;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onBookSlot: (debut: string, fin: string) => void;
}) {
  const hourLabels = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    hourLabels.push(h);
  }

  return (
    <div className="card overflow-hidden">
      {/* Room header */}
      <div className="px-4 py-3 bg-brand-bg border-b border-brand-text/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-brand-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-brand-text text-sm">{salle.nom}</p>
            <p className="text-xs text-brand-text/40">{salle.capacite} personnes max.</p>
          </div>
        </div>
        <span className="text-xs text-brand-text/40">
          {reservations.length}{" "}
          {reservations.length <= 1 ? "réservation" : "réservations"}
        </span>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3">
        {/* Hour markers — absolutely positioned so hiding some doesn't break layout */}
        <div className="relative h-5 mb-1 select-none">
          {hourLabels.map((h) => {
            const pct = minutesToPercent((h - HOUR_START) * 60);
            // On mobile: only show odd hours (9,11,13,15,17,19). Hide even (8,10,12,14,16,18).
            const isEven = h % 2 === 0;
            return (
              <span
                key={h}
                className={`absolute text-xs text-brand-text/30 -translate-x-1/2 ${
                  isEven ? "hidden sm:block" : ""
                }`}
                style={{ left: `${pct}%` }}
              >
                {h}h
              </span>
            );
          })}
        </div>

        {/* Track */}
        <div
          className="relative h-10 bg-brand-bg rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => onBookSlot("09:00", "10:00")}
          title="Cliquez pour réserver"
        >
          {/* Hour grid lines */}
          {hourLabels.slice(1, -1).map((h) => {
            const pct = minutesToPercent((h - HOUR_START) * 60);
            return (
              <div
                key={h}
                className="absolute top-0 bottom-0 w-px bg-brand-text/10"
                style={{ left: `${pct}%` }}
              />
            );
          })}

          {/* Hover hint */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-brand-text/40">
              Cliquez pour réserver
            </span>
          </div>

          {/* Reservations */}
          {reservations.map((r) => {
            const startPct = minutesToPercent(timeToMinutes(r.heure_debut));
            const endPct = minutesToPercent(timeToMinutes(r.heure_fin));
            const widthPct = endPct - startPct;
            const isOwn = r.user_id === currentProfile.id;

            return (
              <div
                key={r.id}
                className={`absolute top-0 h-full flex flex-col justify-center px-1.5 overflow-hidden select-none transition-opacity hover:opacity-90 ${
                  isOwn
                    ? "bg-brand-primary"
                    : "bg-brand-text/40"
                }`}
                style={{
                  left: `${startPct}%`,
                  width: `${widthPct}%`,
                  minWidth: "2px",
                }}
                title={`${r.titre} — ${r.profiles?.prenom} ${r.profiles?.nom} (${r.heure_debut.slice(0, 5)}–${r.heure_fin.slice(0, 5)})`}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-white text-xs font-medium truncate leading-tight">
                  {r.titre}
                </p>
                <p className="text-white/80 text-xs truncate leading-tight">
                  {r.heure_debut.slice(0, 5)}–{r.heure_fin.slice(0, 5)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Reservation list below timeline */}
        {reservations.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {reservations.map((r) => {
              const isOwn = r.user_id === currentProfile.id;
              return (
                <li
                  key={r.id}
                  className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${
                    isOwn
                      ? "bg-brand-primary/10 border border-brand-primary/20"
                      : "bg-brand-bg border border-brand-text/10"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-medium text-brand-text">{r.titre}</span>
                    <span className="text-brand-text/30 mx-1.5">·</span>
                    <span className="text-brand-text/60">
                      {r.heure_debut.slice(0, 5)} – {r.heure_fin.slice(0, 5)}
                    </span>
                    <span className="text-brand-text/30 mx-1.5">·</span>
                    <span className={isOwn ? "text-brand-primary font-medium" : "text-brand-text/60"}>
                      {r.profiles?.prenom} {r.profiles?.nom}
                      {isOwn && " (moi)"}
                    </span>
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => onDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="btn-danger ml-2 flex-shrink-0"
                    >
                      {deletingId === r.id ? "…" : "Supprimer"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

function BookingModal({
  form,
  salles,
  submitting,
  error,
  onChange,
  onSubmit,
  onClose,
  checkConflict,
}: {
  form: BookingForm;
  salles: Salle[];
  submitting: boolean;
  error: string | null;
  onChange: (updates: Partial<BookingForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  checkConflict: (
    salleId: string,
    date: string,
    debut: string,
    fin: string
  ) => boolean;
}) {
  const hasConflict =
    form.salleId &&
    form.date &&
    form.heureDebut &&
    form.heureFin &&
    form.heureDebut < form.heureFin &&
    checkConflict(form.salleId, form.date, form.heureDebut, form.heureFin);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md card p-6 rounded-b-none sm:rounded-xl shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">
            Réserver une salle
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Intitulé de la réunion
            </label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => onChange({ titre: e.target.value })}
              placeholder="Ex: Réunion d'équipe, Entretien…"
              className="input-field"
              required
              autoFocus
            />
          </div>

          {/* Room */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Salle
            </label>
            <select
              value={form.salleId}
              onChange={(e) => onChange({ salleId: e.target.value })}
              className="input-field"
              required
            >
              {salles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.capacite} pers.)
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className="input-field"
              required
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Début
              </label>
              <select
                value={form.heureDebut}
                onChange={(e) => {
                  const newDebut = e.target.value;
                  onChange({ heureDebut: newDebut });
                  // Auto-advance end time if needed
                  if (form.heureFin <= newDebut) {
                    const idx = TIME_SLOTS.indexOf(newDebut);
                    if (idx >= 0 && idx + 1 < TIME_SLOTS.length) {
                      onChange({
                        heureDebut: newDebut,
                        heureFin: TIME_SLOTS[idx + 2] ?? TIME_SLOTS[TIME_SLOTS.length - 1],
                      });
                    }
                  }
                }}
                className="input-field"
                required
              >
                {TIME_SLOTS.filter((t) => t < "19:00").map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fin
              </label>
              <select
                value={form.heureFin}
                onChange={(e) => onChange({ heureFin: e.target.value })}
                className="input-field"
                required
              >
                {TIME_SLOTS.filter((t) => t > form.heureDebut).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflict warning */}
          {hasConflict && !error && (
            <div className="bg-brand-alert/20 border border-brand-alert/40 text-brand-text text-sm px-4 py-3 rounded-lg flex items-start gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-text/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                Ce créneau est déjà occupé. Veuillez choisir un autre horaire.
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-brand-error/10 border border-brand-error/20 text-brand-error text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !!hasConflict}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Réservation…
                </>
              ) : (
                "Confirmer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
