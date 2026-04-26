import HomeStatusBar from "../components/topbar/HomeStatusBar";
import HomeTopBar from "../components/topbar/HomeTopBar";
import useThemePreference from "../hooks/useThemePreference";

function AppLayout({
  children,
  tickerItems = [],
  statusBarProps = {},
}) {
  const { isDark, setIsDark } = useThemePreference();

  return (
    <>
      <HomeTopBar
        tickerItems={tickerItems}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />
      {typeof children === "function" ? children({ isDark, setIsDark }) : children}
      <HomeStatusBar {...statusBarProps} />
    </>
  );
}

export default AppLayout;
