import { useEffect, useState } from "react";

export const NOW_TICK_MS = 60_000;

/** The phone's clock, refreshed every minute while the screen is mounted. */
export const useNow = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOW_TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return now;
};
