import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "shutterisland-theme";

function getInitialIsDark() {
  if (typeof window === "undefined") {
    return true;
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark") {
    return true;
  }
  if (stored === "light") {
    return false;
  }

  return true;
}

function useThemePreference() {
  const [isDark, setIsDark] = useState(getInitialIsDark);

  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.add("dark");
      window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    } else {
      root.classList.remove("dark");
      window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    }
  }, [isDark]);

  return { isDark, setIsDark };
}

export default useThemePreference;
