import { NavLink, Navigate, Outlet, Route, Routes } from "react-router";
import { NativeLifecycle } from "@/app/NativeLifecycle";
import { MyScreen } from "@/features/account";
import { AuthProvider, SignIn, useAuth } from "@/features/auth";
import { TodoScreen } from "@/features/todos";

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-icon-source="lucide"
      className="lucide lucide-house"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-icon-source="lucide"
      className="lucide lucide-user-round"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-canvas text-ink pt-[max(16px,env(safe-area-inset-top))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]">
      <Outlet />
      <nav
        aria-label="주요 메뉴"
        className="flex border-t border-line bg-canvas pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        <NavLink
          to="/"
          end
          aria-label="할 일"
          className={({ isActive }) =>
            `flex min-h-12 min-w-12 flex-1 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              isActive ? "text-brand" : "text-ink"
            }`
          }
        >
          <HomeIcon />
        </NavLink>
        <NavLink
          to="/my"
          aria-label="내 정보"
          className={({ isActive }) =>
            `flex min-h-12 min-w-12 flex-1 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              isActive ? "text-brand" : "text-ink"
            }`
          }
        >
          <UserIcon />
        </NavLink>
      </nav>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] items-center justify-center bg-canvas p-4 text-ink">
        <p role="status" className="text-sm text-muted">
          불러오는 중…
        </p>
      </div>
    );
  }
  return (
    <Routes>
      <Route
        path="/sign-in"
        element={user ? <Navigate to="/" replace /> : <SignIn />}
      />
      <Route element={user ? <Layout /> : <Navigate to="/sign-in" replace />}>
        <Route index element={<TodoScreen />} />
        <Route path="my" element={<MyScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <NativeLifecycle />
      <AppRoutes />
    </AuthProvider>
  );
}
