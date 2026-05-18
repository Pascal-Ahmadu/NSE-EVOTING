"use client";

import { useEffect, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";

export default function SystemTour() {
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayOpacity: 0.82,
      stagePadding: 8,
      stageRadius: 10,
      doneBtnText: "Done ✓",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      popoverClass: "votamak-tour-popover",
      steps: [
        {
          popover: {
            title: "Welcome to VOTAMAK!",
            description:
              "This is the administration dashboard for the NSE Makurdi Branch election platform. Let's take a quick tour — it'll only take a minute.",
          },
        },
        {
          element: "#tour-admin-elections",
          popover: {
            title: "Manage Elections",
            description:
              "Create and configure branch elections here. Set positions, add candidates, open the poll when you're ready, and close it when voting ends.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-admin-voters",
          popover: {
            title: "Voter Management",
            description:
              "Register eligible voters and assign them to specific elections. Each voter receives a secure one-time password to access the ballot.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-admin-results",
          popover: {
            title: "Live Results",
            description:
              "Watch vote tallies update in real time as members cast their ballots. Generate a certified final report once the election is closed.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-admin-audit",
          popover: {
            title: "Audit Log",
            description:
              "Every administrative action — sign-ins, voter additions, election changes — is recorded here for full transparency and security review.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-header-actions",
          popover: {
            title: "Your Account Controls",
            description:
              "Toggle between light and dark mode, replay this tour any time using the ⓘ button, or sign out securely when you're done.",
            side: "bottom",
            align: "end",
          },
        },
      ],
      onDestroyed: () => {
        // Only mark as completed when not in demo/recording mode
        if (!window.location.search.includes("tour=1")) {
          localStorage.setItem("votamak_admin_tour_completed", "true");
        }
      },
    });

    driverObj.drive();
  }, []);

  useEffect(() => {
    const handleManualStart = () => startTour();
    window.addEventListener("start-admin-tour", handleManualStart);

    // ?tour=1 in the URL forces the tour to start regardless of localStorage.
    // Use this URL when recording a tutorial video: /admin?tour=1
    const forceTour = window.location.search.includes("tour=1");
    const hasCompletedTour = localStorage.getItem("votamak_admin_tour_completed");

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (forceTour || !hasCompletedTour) {
      // Longer delay in force mode so the page fully settles before recording
      timer = setTimeout(startTour, forceTour ? 1800 : 1000);
    }

    return () => {
      window.removeEventListener("start-admin-tour", handleManualStart);
      if (timer !== null) clearTimeout(timer);
    };
  }, [startTour]);

  return null;
}
