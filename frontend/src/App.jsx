import AppRouter from "./router/AppRouter";
import { UserProvider } from "./context/UserContext";

export default function App() {
  return (
    <UserProvider>
      <AppRouter />
    </UserProvider>
  );
}
