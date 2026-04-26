import homepageData from "./data/homepageData.json";
import AppLayout from "./layouts/AppLayout";
import HomePage from "./pages/HomePage";
import SessionsPage from "./pages/SessionsPage";
import AdminDashboard from "./pages/AdminDashboard";
import SessionDetailsPage from "./pages/SessionDetailsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

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

const ADMIN_TICKER_ITEMS = [
  "ADMIN DASHBOARD ACTIVE",
  "MONITORING SESSIONS LIVE",
  "TRACKING PARTICIPANTS",
  "SYSTEM STATUS NORMAL",
  "ADMIN DASHBOARD ACTIVE",
  "MONITORING SESSIONS LIVE",
  "TRACKING PARTICIPANTS",
  "SYSTEM STATUS NORMAL",
];

const LOGIN_TICKER_ITEMS = [
  "SECURE ACCESS REQUIRED",
  "OPERATOR SIGN-IN OPEN",
  "SESSION GATE LOCKED",
  "AUTHENTICATE TO ENTER",
  "SECURE ACCESS REQUIRED",
  "OPERATOR SIGN-IN OPEN",
  "SESSION GATE LOCKED",
  "AUTHENTICATE TO ENTER",
];

const REGISTER_TICKER_ITEMS = [
  "NEW OPERATOR REGISTRATION",
  "ACCESS REVIEW REQUIRED",
  "SECURE PROFILE CREATION",
  "ARENA ACCOUNT REQUEST",
  "NEW OPERATOR REGISTRATION",
  "ACCESS REVIEW REQUIRED",
  "SECURE PROFILE CREATION",
  "ARENA ACCOUNT REQUEST",
];

function resolvePage(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (/^\/sessions\/[^/]+$/i.test(normalizedPath)) {
    return {
      tickerItems: SESSIONS_TICKER_ITEMS,
      statusBarProps: {
        sessionLabel: "SESSION",
        playersActive: "LIVE",
        round: "DETAILS",
      },
      render: () => <SessionDetailsPage />,
    };
  }

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

    case "/dashboard":
      return {
        tickerItems: ADMIN_TICKER_ITEMS,
        statusBarProps: {
          sessionLabel: "ADMIN",
          playersActive: "—",
          round: "—",
        },
        render: () => <AdminDashboard />,
      };

    case "/login":
      return {
        tickerItems: LOGIN_TICKER_ITEMS,
        statusBarProps: {
          sessionLabel: "ACCESS",
          playersActive: "LOCKED",
          round: "AUTH",
        },
        render: () => <LoginPage />,
      };

    case "/register":
      return {
        tickerItems: REGISTER_TICKER_ITEMS,
        statusBarProps: {
          sessionLabel: "ACCESS",
          playersActive: "REQUEST",
          round: "NEW",
        },
        render: () => <RegisterPage />,
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
