"use client";

import { useState, useEffect, useCallback } from "react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isToday,
  isBefore,
  startOfDay,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Presence } from "@/lib/types";
import NavBar from "./NavBar";

interface Props {
  currentProfile: Profile;
}

interface DayData {
  date: Date;
  dateStr: string;
  label: string;
  shortLabel: string;
  isToday: boolean;
  isPast: boolean;
  presences: (Presence & { profiles: Profile })[];
  currentUserPresent: boolean;
  presenceId?: string;
}

export default function PresenceDashboard({ currentProfile }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay(); // 0 = dimanche, 6 = samedi
    const base = startOfWeek(today, { weekStartsOn: 1 });
    return day === 0 || day === 6 ? addWeeks(base, 1) : base;
  });
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const supabase = createClient();

  const loadWeekData = useCallback(async () => {
    setLoading(true);
    try {
      const start = weekStart;
      const end = endOfWeek(weekStart, { weekStartsOn: 1 });

      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      const { data: presences, error } = await supabase
        .from("presences")
        .select("*, profiles(*)")
        .gte("date", startStr)
        .lte("date", endStr);

      if (error) {
        console.error("Error loading presences:", error);
        return;
      }

      const weekDays = eachDayOfInterval({ start, end }).slice(0, 5); // Mon-Fri only

      const mapped: DayData[] = weekDays.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayPresences = (presences ?? []).filter(
          (p) => p.date === dateStr
        ) as (Presence & { profiles: Profile })[];

        const myPresence = dayPresences.find(
          (p) => p.user_id === currentProfile.id
        );

        return {
          date,
          dateStr,
          label: format(date, "EEEE d MMMM", { locale: fr }),
          shortLabel: format(date, "EEE d", { locale: fr }),
          isToday: isToday(date),
          isPast: isBefore(startOfDay(date), startOfDay(new Date())),
          presences: dayPresences,
          currentUserPresent: !!myPresence,
          presenceId: myPresence?.id,
        };
      });

      setDays(mapped);
    } finally {
      setLoading(false);
    }
  }, [weekStart, currentProfile.id, supabase]);

  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  async function togglePresence(day: DayData) {
    if (day.isPast || toggling) return;

    setToggling(day.dateStr);
    try {
      if (day.currentUserPresent && day.presenceId) {
        const { error } = await supabase
          .from("presences")
          .delete()
          .eq("id", day.presenceId);

        if (error) {
          console.error("Error removing presence:", error);
          return;
        }
      } else {
        const { error } = await supabase.from("presences").insert({
          user_id: currentProfile.id,
          date: day.dateStr,
        });

        if (error) {
          console.error("Error adding presence:", error);
          return;
        }
      }

      await loadWeekData();
    } finally {
      setToggling(null);
    }
  }

  const weekLabel = (() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    const startFormatted = format(weekStart, "d MMMM", { locale: fr });
    const endFormatted = format(end, "d MMMM yyyy", { locale: fr });
    return `${startFormatted} – ${endFormatted}`;
  })();

  const isCurrentWeek =
    format(weekStart, "yyyy-MM-dd") ===
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-brand-surface">
      <NavBar currentProfile={currentProfile} activeTab="presence" />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Week navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-brand-text font-title">Présences</h2>
            <p className="text-sm text-brand-text/50 mt-0.5 capitalize">
              {weekLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
              className="btn-secondary p-2.5"
              title="Semaine précédente"
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
            {!isCurrentWeek && (
              <button
                onClick={() => {
                  const today = new Date();
                  const day = today.getDay();
                  const base = startOfWeek(today, { weekStartsOn: 1 });
                  setWeekStart(day === 0 || day === 6 ? addWeeks(base, 1) : base);
                }}
                className="btn-secondary text-xs px-3"
              >
                Semaine en cours
              </button>
            )}
            <button
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              className="btn-secondary p-2.5"
              title="Semaine suivante"
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
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse min-h-[140px]">
                <div className="h-4 bg-brand-text/10 rounded w-3/4 mb-3" />
                <div className="h-3 bg-brand-text/10 rounded w-1/2 mb-4" />
                <div className="h-8 bg-brand-text/5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {days.map((day) => (
              <DayCard
                key={day.dateStr}
                day={day}
                currentProfile={currentProfile}
                toggling={toggling === day.dateStr}
                onToggle={() => togglePresence(day)}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex items-center gap-5 text-xs text-brand-text/40">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-brand-success inline-block" />
            Présent(e)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-brand-text/20 inline-block" />
            Absent(e)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-brand-text/10 border border-brand-text/10 inline-block" />
            Passé (lecture seule)
          </span>
        </div>
      </main>
    </div>
  );
}

function DayCard({
  day,
  currentProfile,
  toggling,
  onToggle,
}: {
  day: DayData;
  currentProfile: Profile;
  toggling: boolean;
  onToggle: () => void;
}) {
  const colleagues = day.presences.filter(
    (p) => p.user_id !== currentProfile.id
  );

  return (
    <div
      className={`card p-4 flex flex-col gap-3 ${
        day.isToday ? "ring-2 ring-brand-primary ring-offset-1" : ""
      } ${day.isPast ? "opacity-60" : ""}`}
    >
      {/* Day header */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-brand-text/50 uppercase tracking-wide capitalize">
            {format(day.date, "EEE", { locale: fr })}
          </p>
          {day.isToday && (
            <span className="text-xs bg-brand-primary/10 text-brand-primary font-medium px-1.5 py-0.5 rounded-md">
              Aujourd&apos;hui
            </span>
          )}
        </div>
        <p className="text-lg font-bold text-brand-text">
          {format(day.date, "d", { locale: fr })}
        </p>
        <p className="text-xs text-brand-text/40 capitalize">
          {format(day.date, "MMMM", { locale: fr })}
        </p>
      </div>

      {/* Toggle button */}
      {!day.isPast ? (
        <button
          onClick={onToggle}
          disabled={toggling}
          className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 ${
            day.currentUserPresent
              ? "bg-brand-success text-brand-contrast hover:opacity-90"
              : "bg-brand-bg text-brand-text/60 hover:bg-brand-text/10"
          }`}
        >
          {toggling ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <>
              {day.currentUserPresent ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Je suis là
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Je serai là
                </>
              )}
            </>
          )}
        </button>
      ) : (
        <div
          className={`w-full py-2 px-3 rounded-lg text-sm font-medium text-center ${
            day.currentUserPresent
              ? "bg-brand-success/20 text-brand-text/70"
              : "bg-brand-text/5 text-brand-text/30"
          }`}
        >
          {day.currentUserPresent ? "Présent(e)" : "Absent(e)"}
        </div>
      )}

      {/* Colleagues present */}
      <div className="border-t border-brand-text/10 pt-3">
        <p className="text-xs text-brand-text/40 mb-1.5">
          {day.presences.length}{" "}
          {day.presences.length <= 1 ? "personne" : "personnes"} au bureau
        </p>
        {day.presences.length === 0 ? (
          <p className="text-xs text-brand-text/25 italic">Personne pour l&apos;instant</p>
        ) : (
          <ul className="space-y-0.5">
            {day.currentUserPresent && (
              <li className="text-xs font-semibold text-brand-primary">
                {currentProfile.prenom} {currentProfile.nom} (moi)
              </li>
            )}
            {colleagues.map((p) => (
              <li key={p.id} className="text-xs text-brand-text/70">
                {p.profiles?.prenom} {p.profiles?.nom}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
