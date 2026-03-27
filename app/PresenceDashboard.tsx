"use client";

import { useState, useEffect, useCallback } from "react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isBefore,
  startOfDay,
  isSameMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Presence } from "@/lib/types";
import NavBar from "./NavBar";

type View = "week" | "month";

interface Props {
  currentProfile: Profile;
}

interface DayData {
  date: Date;
  dateStr: string;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
  isCurrentMonth: boolean;
  presences: (Presence & { profiles: Profile })[];
  currentUserPresent: boolean;
  presenceId?: string;
}

function getDefaultWeekStart() {
  const today = new Date();
  const day = today.getDay();
  const base = startOfWeek(today, { weekStartsOn: 1 });
  return day === 0 || day === 6 ? addWeeks(base, 1) : base;
}

function getCurrentWeekStart() {
  return getDefaultWeekStart();
}

export default function PresenceDashboard({ currentProfile }: Props) {
  const [view, setView] = useState<View>("week");
  const [weekStart, setWeekStart] = useState<Date>(getDefaultWeekStart);
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async (startDate: Date, endDate: Date, currentMonth?: Date) => {
    setLoading(true);
    try {
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      const { data: presences, error } = await supabase
        .from("presences")
        .select("*, profiles(*)")
        .gte("date", startStr)
        .lte("date", endStr);

      if (error) {
        console.error("Error loading presences:", error);
        return;
      }

      const allDays = eachDayOfInterval({ start: startDate, end: endDate });

      const mapped: DayData[] = allDays.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayPresences = (presences ?? []).filter(
          (p) => p.date === dateStr
        ) as (Presence & { profiles: Profile })[];
        const myPresence = dayPresences.find((p) => p.user_id === currentProfile.id);
        const dow = date.getDay();

        return {
          date,
          dateStr,
          isToday: isToday(date),
          isPast: isBefore(startOfDay(date), startOfDay(new Date())),
          isWeekend: dow === 0 || dow === 6,
          isCurrentMonth: currentMonth ? isSameMonth(date, currentMonth) : true,
          presences: dayPresences,
          currentUserPresent: !!myPresence,
          presenceId: myPresence?.id,
        };
      });

      setDays(mapped);
    } finally {
      setLoading(false);
    }
  }, [currentProfile.id, supabase]);

  // Load week data
  const loadWeek = useCallback(() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    loadData(weekStart, end);
  }, [weekStart, loadData]);

  // Load month data — include surrounding days to fill the calendar grid
  const loadMonth = useCallback(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    loadData(gridStart, gridEnd, monthStart);
  }, [monthStart, loadData]);

  useEffect(() => {
    if (view === "week") loadWeek();
    else loadMonth();
  }, [view, loadWeek, loadMonth]);

  async function togglePresence(day: DayData) {
    if (day.isPast || day.isWeekend || toggling) return;

    setToggling(day.dateStr);
    try {
      if (day.currentUserPresent && day.presenceId) {
        const { error } = await supabase.from("presences").delete().eq("id", day.presenceId);
        if (error) { console.error(error); return; }
      } else {
        const { error } = await supabase.from("presences").insert({
          user_id: currentProfile.id,
          date: day.dateStr,
        });
        if (error) { console.error(error); return; }
      }
      if (view === "week") await loadWeek();
      else await loadMonth();
    } finally {
      setToggling(null);
    }
  }

  // Week view helpers
  const weekDays = days.filter((d) => !d.isWeekend);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "d MMMM", { locale: fr })} – ${format(weekEnd, "d MMMM yyyy", { locale: fr })}`;
  const isCurrentWeek = format(weekStart, "yyyy-MM-dd") === format(getCurrentWeekStart(), "yyyy-MM-dd");

  // Month view helpers — build grid of weeks (rows) x weekdays (cols)
  const monthLabel = format(monthStart, "MMMM yyyy", { locale: fr });
  const isCurrentMonth = isSameMonth(monthStart, new Date());
  const weekRows: DayData[][] = [];
  const weekdaysOnly = days.filter((d) => !d.isWeekend);
  for (let i = 0; i < weekdaysOnly.length; i += 5) {
    weekRows.push(weekdaysOnly.slice(i, i + 5));
  }

  return (
    <div className="min-h-screen bg-brand-surface">
      <NavBar currentProfile={currentProfile} activeTab="presence" />

      <main className="max-w-6xl mx-auto px-4 sm:px-2 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-brand-text font-title">Présences</h2>
            <p className="text-sm text-brand-text/50 mt-0.5 capitalize">
              {view === "week" ? weekLabel : monthLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-brand-bg rounded-lg p-1 mr-1">
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  view === "week"
                    ? "bg-brand-surface text-brand-text shadow-sm"
                    : "text-brand-text/50 hover:text-brand-text"
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setView("month")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  view === "month"
                    ? "bg-brand-surface text-brand-text shadow-sm"
                    : "text-brand-text/50 hover:text-brand-text"
                }`}
              >
                Mois
              </button>
            </div>

            {/* Navigation */}
            <button
              onClick={() => view === "week" ? setWeekStart((w) => subWeeks(w, 1)) : setMonthStart((m) => subMonths(m, 1))}
              className="btn-secondary p-2.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {view === "week" && !isCurrentWeek && (
              <button
                onClick={() => setWeekStart(getCurrentWeekStart())}
                className="btn-secondary text-xs px-3"
              >
                Semaine en cours
              </button>
            )}
            {view === "month" && !isCurrentMonth && (
              <button
                onClick={() => setMonthStart(startOfMonth(new Date()))}
                className="btn-secondary text-xs px-3"
              >
                Mois en cours
              </button>
            )}

            <button
              onClick={() => view === "week" ? setWeekStart((w) => addWeeks(w, 1)) : setMonthStart((m) => addMonths(m, 1))}
              className="btn-secondary p-2.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className={`grid gap-4 ${view === "week" ? "grid-cols-1 md:grid-cols-5" : "grid-cols-5"}`}>
            {[...Array(view === "week" ? 5 : 20)].map((_, i) => (
              <div key={i} className={`card animate-pulse ${view === "week" ? "p-4 min-h-[140px]" : "p-2 h-20"}`}>
                <div className="h-3 bg-brand-text/10 rounded w-1/2 mb-2" />
                <div className="h-3 bg-brand-text/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : view === "week" ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              {weekDays.map((day) => (
                <DayCard
                  key={day.dateStr}
                  day={day}
                  currentProfile={currentProfile}
                  toggling={toggling === day.dateStr}
                  onToggle={() => togglePresence(day)}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="mt-6 flex items-center gap-5 text-xs text-brand-text/40">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-success inline-block" />Au bureau
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-text/20 inline-block" />Télétravail
              </span>
            </div>
          </>
        ) : (
          <MonthGrid
            weekRows={weekRows}
            currentProfile={currentProfile}
            toggling={toggling}
            onToggle={togglePresence}
          />
        )}
      </main>
    </div>
  );
}

// ─── Week Day Card ─────────────────────────────────────────────────────────────

const MAX_VISIBLE = 5;
const CAPACITY_WARNING_THRESHOLD = 25;

function DayCard({ day, currentProfile, toggling, onToggle }: {
  day: DayData;
  currentProfile: Profile;
  toggling: boolean;
  onToggle: () => void;
}) {
  const [showAllModal, setShowAllModal] = useState(false);
  const colleagues = day.presences.filter((p) => p.user_id !== currentProfile.id);
  const isOverCapacity = day.presences.length >= CAPACITY_WARNING_THRESHOLD;
  const currentUserSlot = day.currentUserPresent ? 1 : 0;
  const visibleColleagues = colleagues.slice(0, MAX_VISIBLE - currentUserSlot);
  const hiddenCount = day.presences.length - currentUserSlot - visibleColleagues.length;

  return (
    <>
      <div className={`card p-4 flex flex-col gap-3 ${day.isToday ? "ring-2 ring-brand-primary ring-offset-1" : ""} ${day.isPast ? "opacity-60" : ""}`}>
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
          <p className="text-lg font-bold text-brand-text">{format(day.date, "d")}</p>
          <p className="text-xs text-brand-text/40 capitalize">{format(day.date, "MMMM", { locale: fr })}</p>
        </div>

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
            ) : day.currentUserPresent ? (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Je suis là</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Je serai là
              </>
            )}
          </button>
        ) : (
          <div className={`w-full py-2 px-3 rounded-lg text-sm font-medium text-center ${day.currentUserPresent ? "bg-brand-success/20 text-brand-text/70" : "bg-brand-text/5 text-brand-text/30"}`}>
            {day.currentUserPresent ? "Au bureau" : "Télétravail"}
          </div>
        )}

        {isOverCapacity && !day.isPast && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-2.5 py-1.5 mt-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Peu de places disponibles
          </div>
        )}

<div className="border-t border-brand-text/10 pt-3">
          <p className="text-xs text-brand-text/40 mb-1.5">
            {day.presences.length} {day.presences.length <= 1 ? "personne" : "personnes"} au bureau
          </p>
          {day.presences.length === 0 ? (
            <p className="text-xs text-brand-text/25 italic">Personne pour l&apos;instant</p>
          ) : (
            <>
              <ul className="space-y-0.5">
                {day.currentUserPresent && (
                  <li className="text-xs font-semibold text-brand-primary">
                    {currentProfile.prenom} {currentProfile.nom} (moi)
                  </li>
                )}
                {visibleColleagues.map((p) => (
                  <li key={p.id} className="text-xs text-brand-text/70">
                    {p.profiles?.prenom} {p.profiles?.nom}
                  </li>
                ))}
              </ul>
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllModal(true)}
                  className="mt-2 text-xs text-brand-primary hover:underline"
                >
                  Voir les autres ({hiddenCount})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showAllModal && (
        <DayModal
          day={day}
          currentProfile={currentProfile}
          toggling={toggling}
          onToggle={onToggle}
          onClose={() => setShowAllModal(false)}
        />
      )}
    </>
  );
}

function DayModal({ day, currentProfile, toggling, onToggle, onClose }: {
  day: DayData;
  currentProfile: Profile;
  toggling?: boolean;
  onToggle?: () => void;
  onClose: () => void;
}) {
  const colleagues = day.presences.filter((p) => p.user_id !== currentProfile.id);
  const dateLabel = format(day.date, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm card p-6 rounded-b-none sm:rounded-xl shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-brand-text capitalize">{dateLabel}</h3>
            <p className="text-sm text-brand-text/50 mt-0.5">
              {day.presences.length} {day.presences.length <= 1 ? "personne" : "personnes"} au bureau
            </p>
          </div>
          <button onClick={onClose} className="text-brand-text/40 hover:text-brand-text p-1 rounded-md hover:bg-brand-bg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {day.presences.length === 0 ? (
          <p className="text-sm text-brand-text/40 italic mb-4">Personne de prévu pour ce jour.</p>
        ) : (
          <ul className="space-y-2 overflow-y-auto flex-1 mb-4">
            {day.currentUserPresent && (
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0" />
                <span className="text-sm font-semibold text-brand-primary">
                  {currentProfile.prenom} {currentProfile.nom} (moi)
                </span>
              </li>
            )}
            {colleagues.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-brand-success flex-shrink-0" />
                <span className="text-sm text-brand-text">
                  {p.profiles?.prenom} {p.profiles?.nom}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!day.isPast && onToggle && (
          <button
            onClick={() => { onToggle(); onClose(); }}
            disabled={toggling}
            className={`flex-shrink-0 w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              day.currentUserPresent
                ? "bg-brand-text/10 text-brand-text hover:bg-brand-text/20"
                : "btn-primary"
            }`}
          >
            {toggling ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : day.currentUserPresent ? "Me retirer" : "Je serai là"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Month Grid ────────────────────────────────────────────────────────────────

const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

function MonthGrid({ weekRows, currentProfile, toggling, onToggle }: {
  weekRows: DayData[][];
  currentProfile: Profile;
  toggling: string | null;
  onToggle: (day: DayData) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  return (
    <>
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-5 border-b border-brand-text/10">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="py-2 text-center text-xs font-semibold text-brand-text/40 uppercase tracking-wide">
              {h}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="divide-y divide-brand-text/10">
          {weekRows.map((week, wi) => (
            <div key={wi} className="grid grid-cols-5">
              {week.map((day) => (
                <MonthCell
                  key={day.dateStr}
                  day={day}
                  currentProfile={currentProfile}
                  toggling={toggling === day.dateStr}
                  onClick={() => setSelectedDay(day)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {selectedDay && (
        <DayModal
          day={selectedDay}
          currentProfile={currentProfile}
          toggling={toggling === selectedDay.dateStr}
          onToggle={() => onToggle(selectedDay)}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}

function MonthCell({ day, currentProfile, toggling, onClick }: {
  day: DayData;
  currentProfile: Profile;
  toggling: boolean;
  onClick: () => void;
}) {
  const colleagues = day.presences.filter((p) => p.user_id !== currentProfile.id);
  const total = day.presences.length;

  return (
    <button
      onClick={onClick}
      className={`relative p-2 min-h-[80px] text-left border-r border-brand-text/10 last:border-r-0 transition-colors hover:bg-brand-bg
        ${day.isToday ? "bg-brand-primary/5" : ""}
        ${!day.isCurrentMonth ? "opacity-30" : ""}
        ${day.isPast ? "opacity-50" : ""}
      `}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <span className={`text-sm font-bold leading-none ${
            day.isToday
              ? "w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs"
              : "text-brand-text"
          }`}>
            {format(day.date, "d")}
          </span>
          {day.currentUserPresent && (
            <span className="w-2 h-2 rounded-full bg-brand-success flex-shrink-0 sm:hidden" />
          )}
        </div>
        {toggling && (
          <svg className="animate-spin h-3 w-3 text-brand-text/40" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* My presence indicator — desktop only (mobile shown next to day number) */}
      {day.currentUserPresent && (
        <div className="w-full mb-1 bg-brand-success rounded text-xs text-brand-contrast font-medium px-1.5 py-0.5 text-center leading-tight hidden sm:block">
          Au bureau
        </div>
      )}

      {/* Total count */}
      {total > 0 && (
        <>
          <p className="text-xs font-medium text-brand-text/50 hidden sm:block">
            {total} {total <= 1 ? "personne" : "personnes"}
          </p>
          <p className="text-xs font-medium text-brand-text/50 sm:hidden">
            {total} prsn
          </p>
        </>
      )}
    </button>
  );
}


