import { computed, effect, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Availability, DEFAULT_AVAILABILITY } from '../../models/professional';
import { Professionals } from '../../services/professionals';
import { monthDays, startOfDay, startOfMonth } from '../../utils/calendar';
import { INTL_LOCALE } from '../../utils/locale';
import { log } from '../../utils/log';
import { freeStartTimes, isWorkingDay, toDateKey } from '../../utils/slots';

// What the screen knows about the professional and the chosen services
export type BookingContext = {
  professionalId: string;
  availability: Availability;
  durationMinutes: number;
};

type BookingFlowState = {
  context: BookingContext | null;
  today: Date;
  month: Date;
  selectedDay: Date | null;
  selectedTime: string | null;
  // Slots ("HH:mm") already taken on the selected day (null while loading)
  taken: Set<string> | null;
  // Once the user picks a day or changes the month, the day found for them must not take over
  userPickedDay: boolean;
};

// The choice of day and time of a booking: the month being shown, the day, the time, and the times that are
// free on that day. The screen keeps what is about the services, the price and the checkout.
export const BookingFlowStore = signalStore(
  withState<BookingFlowState>(() => {
    const today = startOfDay(new Date());
    return {
      context: null,
      today,
      month: startOfMonth(today),
      selectedDay: null,
      selectedTime: null,
      taken: null,
      userPickedDay: false,
    };
  }),
  withComputed(({ context, today, month, selectedDay, taken }) => {
    const availability = computed(() => context()?.availability ?? DEFAULT_AVAILABILITY);
    return {
      professionalId: computed(() => context()?.professionalId ?? null),
      monthLabel: computed(() =>
        new Intl.DateTimeFormat(INTL_LOCALE, { month: 'long', year: 'numeric' }).format(month()),
      ),
      isCurrentMonth: computed(() => month().getTime() === startOfMonth(today()).getTime()),
      days: computed(() =>
        monthDays(month(), (date) => date < today() || !isWorkingDay(date, availability())),
      ),
      loadingTimes: computed(() => !!selectedDay() && taken() === null),
      times: computed(() => {
        const day = selectedDay();
        const busy = taken();
        if (!day || !busy) return [];
        return freeStartTimes(day, availability(), context()?.durationMinutes ?? 60, busy);
      }),
    };
  }),
  withMethods((store, professionals = inject(Professionals)) => ({
    setContext(context: BookingContext) {
      patchState(store, { context });
    },

    pickDay(date: Date) {
      patchState(store, { userPickedDay: true, selectedDay: date });
    },

    pickTime(time: string) {
      patchState(store, { selectedTime: time });
    },

    changeMonth(delta: number) {
      const month = store.month();
      patchState(store, {
        userPickedDay: true,
        month: new Date(month.getFullYear(), month.getMonth() + delta, 1),
        selectedDay: null,
      });
    },

    // Selects the next day with a free time (looks up to 120 days ahead) and shows its month.
    // Returns the day, or null when there is none or when the user chose a day in the meantime.
    async pickNextAvailableDay() {
      const id = store.professionalId();
      if (!id) return null;

      let busy = new Map<string, Set<string>>();
      try {
        busy = await professionals.busyFrom(id, toDateKey(store.today()));
      } catch (error) {
        log.error('Failed to load busy days', error);
      }
      // The load takes a while: a day the user picked in the meantime must not be taken away
      if (store.userPickedDay()) return null;

      const { availability, durationMinutes } = store.context() ?? {
        availability: DEFAULT_AVAILABILITY,
        durationMinutes: 60,
      };
      const today = store.today();
      for (let offset = 0; offset < 120; offset++) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
        const free = freeStartTimes(
          date,
          availability,
          durationMinutes,
          busy.get(toDateKey(date)) ?? new Set(),
        );
        if (!free.length) continue;

        patchState(store, { month: startOfMonth(date), selectedDay: date });
        return date;
      }
      return null;
    },
  })),
  withHooks({
    onInit(store) {
      const professionals = inject(Professionals);

      // Loads the taken slots whenever the day (or the professional) changes
      effect((onCleanup) => {
        const day = store.selectedDay();
        const id = store.professionalId();
        patchState(store, { selectedTime: null, taken: null });
        if (!day || !id) return;

        let cancelled = false;
        onCleanup(() => (cancelled = true));
        professionals
          .busyTimes(id, toDateKey(day))
          .then((taken) => !cancelled && patchState(store, { taken }))
          .catch((error) => {
            log.error('Failed to load times', error);
            if (!cancelled) patchState(store, { taken: new Set() });
          });
      });
    },
  }),
);
