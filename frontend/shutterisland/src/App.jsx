import homepageData from "./data/homepageData.json";
import AppLayout from "./layouts/AppLayout";
import HomePage from "./pages/HomePage";
import SessionsPage from "./pages/SessionsPage";

const HOME_TICKER_ITEMS = homepageData.tickerMessages.map((message) =>
  message.replace("{minutes}", "4"),
);

const SESSIONS_TICKER_ITEMS = [
  "SESSION VII LIVE NOW - 5 PLAYERS REMAIN",
  "SESSION VIII BOOKING OPEN - 2 SPOTS LEFT",
  "SESSION IX OPENS APR 22",
  "WATCH LIVE - PLACE YOUR BET",
  "SESSION VII LIVE NOW - 5 PLAYERS REMAIN",
  "SESSION VIII BOOKING OPEN - 2 SPOTS LEFT",
  "SESSION IX OPENS APR 22",
  "WATCH LIVE - PLACE YOUR BET",
];

function resolvePage(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  switch (normalizedPath) {
    case "/sessions":
      return {
        tickerItems: SESSIONS_TICKER_ITEMS,
        statusBarProps: {
          sessionLabel: "VII of XII",
          playersActive: "5",
          round: "3",
        },
        render: (theme) => <SessionsPage {...theme} />,
      };
    case "/":
    default:
      return {
        tickerItems: HOME_TICKER_ITEMS,
        statusBarProps: {
          sessionLabel: "VII of XII",
          playersActive: "5",
          round: "3",
        },
        render: () => <HomePage />,
      };
  }
}

function App() {
  const page = resolvePage(window.location.pathname);

  return (
    <AppLayout
      tickerItems={page.tickerItems}
      statusBarProps={page.statusBarProps}
    >
      {(theme) => page.render(theme)}
    </AppLayout>
  );
}

export default App;
