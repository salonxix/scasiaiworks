"use client";

import { useEffect } from "react";

export default function CalendarNotifier() {
  useEffect(() => {
    // Request permission on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    const checkReminders = () => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      const rawEvents = localStorage.getItem("scasi_calendar_events");
      if (!rawEvents) return;

      const events = JSON.parse(rawEvents);
      const notified = JSON.parse(localStorage.getItem("scasi_cal_notified") || "[]");

      const now = new Date().getTime();

      events.forEach((event: any) => {
        // If the event doesn't have a specific time, we skip precise reminders
        if (!event.time) return;

        // Construct exact Date object for the event
        const eventDate = new Date(event.date);
        const [hours, minutes] = event.time.split(":");
        eventDate.setHours(parseInt(hours, 10));
        eventDate.setMinutes(parseInt(minutes, 10));
        eventDate.setSeconds(0);
        eventDate.setMilliseconds(0);

        const eventTime = eventDate.getTime();
        const diffMs = eventTime - now;
        const diffMinutes = diffMs / (1000 * 60);

        // Check for 30 minutes reminder (triggers when between 29.5 and 30.5 mins away)
        const id30 = event.id + "_30";
        if (diffMinutes <= 30.2 && diffMinutes > 29 && !notified.includes(id30)) {
          new Notification("Upcoming Event in 30 Mins", {
            body: event.title + "\nStarts at " + event.time,
            icon: "/favicon.ico" // standard notification icon
          });
          notified.push(id30);
        }

        // Check for 5 minutes reminder
        const id5 = event.id + "_5";
        if (diffMinutes <= 5.2 && diffMinutes > 4 && !notified.includes(id5)) {
          new Notification("Event Starting Soon!", {
            body: event.title + " is starting in 5 minutes.",
            icon: "/favicon.ico"
          });
          notified.push(id5);
        }
      });

      localStorage.setItem("scasi_cal_notified", JSON.stringify(notified));
    };

    // Check immediately and then every 30 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, []);

  return null; // Silent global component
}
